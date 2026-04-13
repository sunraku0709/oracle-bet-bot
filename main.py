"""
Oracle Alert Bot
Scrapes betexplorer.com every 5 minutes.
Sends a Telegram alert when any 1X2 odd moves more than 8 percent.
"""

import asyncio
import functools
import logging
import os

import requests
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from bs4 import BeautifulSoup
from telegram import Bot

logging.basicConfig(
    format="%(asctime)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
CHANNEL = os.environ.get("TELEGRAM_CHANNEL", "@OracleBetAlert_bot")
MOVE_THRESHOLD = 0.08

LEAGUES = {
    "J-League": "https://www.betexplorer.com/football/japan/j-league/",
    "Chinese Super League": "https://www.betexplorer.com/football/china/super-league/",
    "Indian Super League": "https://www.betexplorer.com/football/india/super-league/",
    "K-League": "https://www.betexplorer.com/football/south-korea/k-league-1/",
    "Thai League": "https://www.betexplorer.com/football/thailand/thai-league/",
    "Polish Ekstraklasa": "https://www.betexplorer.com/football/poland/ekstraklasa/",
    "Romanian Liga 1": "https://www.betexplorer.com/football/romania/liga-1/",
    "Serbian SuperLiga": "https://www.betexplorer.com/football/serbia/superliga/",
    "Bulgarian First League": "https://www.betexplorer.com/football/bulgaria/first-professional-league/",
}

REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# Odds from the previous scan: {league: {match: {home, draw, away}}}
previous_odds = {}


# ---------------------------------------------------------------------------
# Scraping helpers (blocking, run in executor)
# ---------------------------------------------------------------------------

def _fetch_html(url):
    try:
        resp = requests.get(url, headers=REQUEST_HEADERS, timeout=30)
        resp.raise_for_status()
        return resp.text
    except requests.RequestException as exc:
        logger.error("HTTP error fetching %s: %s", url, exc)
        return None


def _parse_odds(html):
    """
    Parse 1X2 odds from a BetExplorer league page.
    Returns {match_name: {home: float, draw: float, away: float}}.

    BetExplorer renders match rows as <tr class="valign-middle">.
    Odds are stored in <td data-odd="X.XX"> attributes (average odds column).
    A fallback checks <span> text inside odds cells.
    """
    result = {}
    if not html:
        return result

    try:
        soup = BeautifulSoup(html, "lxml")

        rows = soup.select("table.table-main tr.valign-middle")
        if not rows:
            rows = soup.find_all("tr", class_="valign-middle")

        for row in rows:
            try:
                name_cell = row.find("td", class_="table-main__tt")
                if not name_cell:
                    continue
                link = name_cell.find("a")
                if not link:
                    continue
                match_name = link.get_text(strip=True)
                if not match_name:
                    continue

                # Strategy 1: data-odd attributes on td elements
                odd_tds = row.find_all("td", attrs={"data-odd": True})
                if len(odd_tds) >= 3:
                    try:
                        home = float(odd_tds[0]["data-odd"])
                        draw = float(odd_tds[1]["data-odd"])
                        away = float(odd_tds[2]["data-odd"])
                        if home > 1.0 and draw > 1.0 and away > 1.0:
                            result[match_name] = {
                                "home": home,
                                "draw": draw,
                                "away": away,
                            }
                            continue
                    except (ValueError, KeyError):
                        pass

                # Strategy 2: span text inside odds cells
                spans = row.select(
                    "td.table-main__odds span, td.odds span"
                )
                if len(spans) >= 3:
                    try:
                        home = float(spans[0].get_text(strip=True))
                        draw = float(spans[1].get_text(strip=True))
                        away = float(spans[2].get_text(strip=True))
                        if home > 1.0 and draw > 1.0 and away > 1.0:
                            result[match_name] = {
                                "home": home,
                                "draw": draw,
                                "away": away,
                            }
                    except (ValueError, IndexError):
                        pass

            except Exception as row_err:
                logger.debug("Skipped row: %s", row_err)

    except Exception as parse_err:
        logger.error("Parse error: %s", parse_err)

    return result


def scrape_league(league_name, url):
    logger.info("Scraping %s", league_name)
    html = _fetch_html(url)
    odds = _parse_odds(html)
    logger.info("Found %d matches in %s", len(odds), league_name)
    return odds


# ---------------------------------------------------------------------------
# Alert logic
# ---------------------------------------------------------------------------

def _pct_move(old_val, new_val):
    if old_val <= 0:
        return 0.0
    return abs(new_val - old_val) / old_val


def _format_alert(league_name, match_name, changes):
    lines = [
        "[ORACLE ALERT] Odds movement > 8%",
        "League : " + league_name,
        "Match  : " + match_name,
    ]
    lines.extend(changes)
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Main scheduled job
# ---------------------------------------------------------------------------

async def check_and_alert(bot):
    global previous_odds

    loop = asyncio.get_running_loop()
    alerts = []

    for league_name, url in LEAGUES.items():
        try:
            fn = functools.partial(scrape_league, league_name, url)
            current = await loop.run_in_executor(None, fn)
        except Exception as exc:
            logger.error("Scrape failed for %s: %s", league_name, exc)
            current = {}

        if league_name in previous_odds:
            prev = previous_odds[league_name]
            for match_name, curr_odds in current.items():
                if match_name not in prev:
                    continue
                prev_odds = prev[match_name]
                changes = []
                for side in ("home", "draw", "away"):
                    old = prev_odds.get(side)
                    new = curr_odds.get(side)
                    if old is None or new is None:
                        continue
                    move = _pct_move(old, new)
                    if move >= MOVE_THRESHOLD:
                        direction = "UP" if new > old else "DOWN"
                        changes.append(
                            "  {side}: {old:.2f} -> {new:.2f}"
                            " ({pct:.1f}% {dir})".format(
                                side=side.upper(),
                                old=old,
                                new=new,
                                pct=move * 100,
                                dir=direction,
                            )
                        )
                if changes:
                    alerts.append(
                        _format_alert(league_name, match_name, changes)
                    )

        previous_odds[league_name] = current
        # Polite delay between league requests
        await asyncio.sleep(2)

    if alerts:
        logger.info("Dispatching %d alert(s)", len(alerts))
        for msg in alerts:
            try:
                await bot.send_message(chat_id=CHANNEL, text=msg)
                await asyncio.sleep(0.5)
            except Exception as exc:
                logger.error("Telegram send error: %s", exc)
    else:
        logger.info("Scan complete. No moves above threshold.")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

async def _run():
    if not BOT_TOKEN:
        raise RuntimeError("TELEGRAM_BOT_TOKEN environment variable is not set")

    bot = Bot(token=BOT_TOKEN)

    try:
        me = await bot.get_me()
        logger.info("Authenticated as @%s", me.username)
    except Exception as exc:
        logger.error("Telegram auth failed: %s", exc)
        raise

    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        check_and_alert,
        trigger="interval",
        minutes=5,
        args=[bot],
        id="odds_scan",
        misfire_grace_time=60,
    )
    scheduler.start()

    logger.info("Running initial scan...")
    await check_and_alert(bot)

    logger.info("Scheduler active. Next scan in 5 minutes.")
    try:
        while True:
            await asyncio.sleep(30)
    except (KeyboardInterrupt, SystemExit):
        logger.info("Shutdown signal received.")
    finally:
        scheduler.shutdown(wait=False)
        logger.info("Bot stopped.")


if __name__ == "__main__":
    asyncio.run(_run())
