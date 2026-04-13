#!/usr/bin/env python3
"""
Oracle Bet Alert Bot
Detects suspicious odds movements on football matches and
sends real-time alerts to a Telegram channel.

Leagues: J-League, Chinese SL, Indian SL, K-League, Thai League,
         Polish Ekstraklasa, Romanian Liga 1, Serbian SuperLiga,
         Bulgarian First League

Source:  betexplorer.com (scraped)
"""

import asyncio
import json
import logging
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import requests
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from telegram import Update
from telegram.error import TelegramError
from telegram.ext import Application, CommandHandler, ContextTypes

load_dotenv()

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    level=logging.INFO,
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── Credentials ───────────────────────────────────────────────────────────────
BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
CHANNEL_ID = os.environ.get("TELEGRAM_CHANNEL", "@OracleBetAlert_bot")

# ── Leagues ───────────────────────────────────────────────────────────────────
LEAGUES: Dict[str, Dict[str, str]] = {
    "J-League":               {"country": "Japon",        "path": "/soccer/japan/j-league/"},
    "Chinese Super League":   {"country": "Chine",         "path": "/soccer/china/super-league/"},
    "Indian Super League":    {"country": "Inde",          "path": "/soccer/india/super-league/"},
    "K-League":               {"country": "Coree du Sud",  "path": "/soccer/south-korea/k-league-1/"},
    "Thai League":            {"country": "Thailande",     "path": "/soccer/thailand/thai-league/"},
    "Polish Ekstraklasa":     {"country": "Pologne",       "path": "/soccer/poland/ekstraklasa/"},
    "Romanian Liga 1":        {"country": "Roumanie",      "path": "/soccer/romania/liga-1/"},
    "Serbian SuperLiga":      {"country": "Serbie",        "path": "/soccer/serbia/superliga/"},
    "Bulgarian First League": {"country": "Bulgarie",      "path": "/soccer/bulgaria/first-league/"},
}

# ── Bookmakers ────────────────────────────────────────────────────────────────
TARGET_BK: set = {"bet365", "pinnacle", "unibet", "williamhill", "bwin"}

BK_LABEL: Dict[str, str] = {
    "bet365":      "Bet365",
    "pinnacle":    "Pinnacle",
    "unibet":      "Unibet",
    "williamhill": "William Hill",
    "bwin":        "Bwin",
}

# Raw name → canonical key (betexplorer uses various spellings)
BK_ALIASES: Dict[str, str] = {
    "bet365":          "bet365",
    "pinnacle":        "pinnacle",
    "pinnacle sports": "pinnacle",
    "unibet":          "unibet",
    "william hill":    "williamhill",
    "williamhill":     "williamhill",
    "bwin":            "bwin",
}

# ── Thresholds ────────────────────────────────────────────────────────────────
DROP_PCT       = 8.0    # % single-interval drop → CHUTE BRUTALE
DIVERGE_PCT    = 12.0   # % vs market average → DIVERGENCE
MIN_ODDS       = 1.20   # ignore cotes below this value
COOLDOWN_MIN   = 15     # minutes between alerts for the same match
WINDOW_HRS     = 48     # only matches kicking off within this window
POLL_MIN       = 5      # scheduler interval (minutes)
REQUEST_DELAY  = 0.8    # seconds between per-match HTTP requests

BASE_URL = "https://www.betexplorer.com"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
    "Referer":         "https://www.betexplorer.com/",
}

# ── In-memory state ───────────────────────────────────────────────────────────
#
# odds_store[match_id] = {
#     "home": str, "away": str, "league": str, "country": str,
#     "match_time": datetime,
#     "bookmakers": {
#         bk_key: {"home": float, "draw": float, "away": float, "ts": datetime}
#     },
#     "suspended": bool,
# }
odds_store:    Dict[str, Dict] = {}
alert_sent:    Dict[str, datetime] = {}   # match_id → last alert timestamp
alerts_today:  int = 0
today_date:    Optional[Any] = None
last_scan:     Optional[datetime] = None
paused:        bool = False
pause_until:   Optional[datetime] = None

http = requests.Session()
http.headers.update(HEADERS)


# ═══════════════════════════════════════════════════════════════════════════════
# SCRAPER
# ═══════════════════════════════════════════════════════════════════════════════

def fetch_league_matches(league: str, info: Dict) -> List[Dict]:
    """Return a list of upcoming match dicts for one league."""
    url = BASE_URL + info["path"]
    try:
        r = http.get(url, timeout=20)
        r.raise_for_status()
    except requests.RequestException as exc:
        logger.warning("[%s] fetch failed: %s", league, exc)
        return []

    soup   = BeautifulSoup(r.text, "lxml")
    now    = datetime.now(timezone.utc)
    cutoff = now + timedelta(hours=WINDOW_HRS)
    out: List[Dict] = []

    # betexplorer: match rows are <tr data-id="...">
    for row in soup.select("tr[data-id]"):
        mid = row.get("data-id", "").strip()
        if not mid:
            continue

        link = row.find("a", href=re.compile(r"/soccer/"))
        if not link:
            continue

        txt = link.get_text(" ", strip=True)
        if " - " not in txt:
            continue
        home_team, away_team = (t.strip() for t in txt.split(" - ", 1))

        match_time = _parse_match_time(row, now)
        if match_time is None:
            continue
        if not (now <= match_time <= cutoff):
            continue

        out.append({
            "id":         mid,
            "home":       home_team,
            "away":       away_team,
            "league":     league,
            "country":    info["country"],
            "match_time": match_time,
        })

    logger.info("[%s] %d upcoming match(es)", league, len(out))
    return out


def _parse_match_time(row: Any, now: datetime) -> Optional[datetime]:
    """Extract match datetime from a betexplorer table row."""
    # Preferred: Unix timestamp in data-blockstart
    bs = row.get("data-blockstart")
    if bs:
        try:
            return datetime.fromtimestamp(int(bs), tz=timezone.utc)
        except (ValueError, OSError):
            pass

    # Fallback: HH:MM text in the time cell
    td = row.find("td", class_=re.compile(r"table-time|h-text-center"))
    if td:
        m = re.search(r"(\d{1,2}):(\d{2})", td.get_text())
        if m:
            dt = now.replace(
                hour=int(m.group(1)), minute=int(m.group(2)),
                second=0, microsecond=0,
            )
            if dt < now:
                dt += timedelta(days=1)
            return dt
    return None


def fetch_odds(match_id: str) -> Optional[Dict[str, Dict]]:
    """
    Fetch 1X2 odds for one match from betexplorer.
    Returns {bk_key: {home, draw, away, ts}} or None on failure / no data.
    """
    url = f"{BASE_URL}/match-odds/{match_id}/1x2/"
    try:
        r = http.get(url, timeout=15, headers={
            **HEADERS,
            "X-Requested-With": "XMLHttpRequest",
            "Accept": "application/json, */*; q=0.01",
        })
        r.raise_for_status()
    except requests.RequestException as exc:
        logger.debug("[odds:%s] %s", match_id, exc)
        return None

    # betexplorer returns JSON from this endpoint in most cases
    try:
        data = r.json()
        result = _parse_json_odds(data)
        if result is not None:
            return result
    except (json.JSONDecodeError, ValueError):
        pass

    # Fallback: parse HTML fragment
    return _parse_html_odds(r.text)


def _norm_bk(name: str) -> Optional[str]:
    return BK_ALIASES.get(name.lower().strip())


def _safe_float(val: Any) -> Optional[float]:
    try:
        f = float(val)
        return f if f >= MIN_ODDS else None
    except (TypeError, ValueError):
        return None


def _parse_json_odds(data: Any) -> Optional[Dict[str, Dict]]:
    """
    betexplorer JSON schema (observed):
      { "odds": [ {"b": "bet365", "o": ["1.85","3.40","4.50"], ...} ] }
    or nested under "d".
    """
    if not isinstance(data, dict):
        return None

    odds_list = data.get("odds") or (data.get("d") or {}).get("odds") or []
    result: Dict[str, Dict] = {}
    ts = datetime.now(timezone.utc)

    for entry in odds_list:
        bk = _norm_bk(entry.get("b", ""))
        if not bk:
            continue
        o = entry.get("o", [])
        if len(o) < 3:
            continue
        h, d, a = _safe_float(o[0]), _safe_float(o[1]), _safe_float(o[2])
        if h and d and a:
            result[bk] = {"home": h, "draw": d, "away": a, "ts": ts}

    return result or None


def _parse_html_odds(html: str) -> Optional[Dict[str, Dict]]:
    """Fallback HTML parser for betexplorer odds fragment."""
    soup   = BeautifulSoup(html, "lxml")
    result: Dict[str, Dict] = {}
    ts     = datetime.now(timezone.utc)

    for row in soup.select("tr"):
        a_tag = row.find("a")
        if not a_tag:
            continue
        bk = _norm_bk(a_tag.get_text())
        if not bk:
            continue
        spans = row.select("td span")
        if len(spans) < 3:
            continue
        vals = [_safe_float(s.get_text()) for s in spans[:3]]
        if all(vals):
            result[bk] = {
                "home": vals[0], "draw": vals[1], "away": vals[2], "ts": ts,
            }

    return result or None


# ═══════════════════════════════════════════════════════════════════════════════
# MOVEMENT DETECTION
# ═══════════════════════════════════════════════════════════════════════════════

def _market_favorite(bks: Dict) -> Optional[str]:
    """Return 'home' or 'away' based on averaged odds across bookmakers."""
    h_vals = [v["home"] for v in bks.values() if v.get("home")]
    a_vals = [v["away"] for v in bks.values() if v.get("away")]
    if not h_vals or not a_vals:
        return None
    return "home" if (sum(h_vals) / len(h_vals)) < (sum(a_vals) / len(a_vals)) else "away"


def _sel_label(sel: str, meta: Dict) -> str:
    return {"home": meta["home"], "draw": "Nul", "away": meta["away"]}[sel]


def detect_alerts(match_id: str, meta: Dict, new_bks: Dict) -> List[Dict]:
    """
    Compare new odds snapshot against stored snapshot.
    Returns a (possibly empty) list of alert dicts.
    Also updates odds_store in place.
    """
    alerts: List[Dict] = []

    # ── First observation: store and return ───────────────────────────────────
    if match_id not in odds_store:
        odds_store[match_id] = {
            **meta,
            "bookmakers": new_bks,
            "suspended":  not bool(new_bks),
        }
        return []

    old_bks = odds_store[match_id].get("bookmakers", {})

    # ── 1. Market suspension (had odds, now empty) ────────────────────────────
    if old_bks and not new_bks:
        alerts.append({
            "type": "RETRAIT MARCHE",
            "bookmaker": None, "selection": None,
            "old": None, "new": None, "pct": None,
        })

    else:
        # ── 2. Per-bookmaker drop > DROP_PCT ──────────────────────────────────
        for bk, nd in new_bks.items():
            if bk not in old_bks:
                continue
            od = old_bks[bk]
            for sel in ("home", "draw", "away"):
                ov, nv = od.get(sel), nd.get(sel)
                if ov is None or nv is None:
                    continue
                pct = (nv - ov) / ov * 100
                if pct < -DROP_PCT:
                    alerts.append({
                        "type":      "CHUTE BRUTALE",
                        "bookmaker": bk,
                        "selection": _sel_label(sel, meta),
                        "old": ov, "new": nv, "pct": pct,
                    })

        # ── 3. Divergence from market average > DIVERGE_PCT ──────────────────
        if len(new_bks) >= 2:
            for sel in ("home", "draw", "away"):
                vals = {
                    bk: v[sel]
                    for bk, v in new_bks.items()
                    if v.get(sel) and v[sel] >= MIN_ODDS
                }
                if len(vals) < 2:
                    continue
                avg = sum(vals.values()) / len(vals)

                for bk, val in vals.items():
                    div = abs(val - avg) / avg * 100
                    if div <= DIVERGE_PCT:
                        continue
                    # Only fire if this divergence is *newly* above the threshold
                    if bk in old_bks:
                        old_val = old_bks[bk].get(sel, avg)
                        old_div = abs(old_val - avg) / avg * 100
                        if old_div > DIVERGE_PCT:
                            continue   # already divergent last scan

                    ov  = old_bks.get(bk, {}).get(sel)
                    pct = (val - ov) / ov * 100 if ov else 0.0
                    alerts.append({
                        "type":      "DIVERGENCE",
                        "bookmaker": bk,
                        "selection": _sel_label(sel, meta),
                        "old": ov, "new": val, "pct": pct,
                        "avg": avg, "div": div,
                    })

        # ── 4. Favourite / underdog flip ──────────────────────────────────────
        prev_fav = _market_favorite(old_bks)
        new_fav  = _market_favorite(new_bks)
        if prev_fav and new_fav and prev_fav != new_fav:
            alerts.append({
                "type":      "RETOURNEMENT FAVORI",
                "prev_fav":  prev_fav,
                "new_fav":   new_fav,
                "bookmaker": None, "selection": None,
                "old": None, "new": None, "pct": None,
            })

    # ── Update store ──────────────────────────────────────────────────────────
    odds_store[match_id].update({
        "bookmakers": new_bks,
        "suspended":  not bool(new_bks),
    })
    return alerts


# ═══════════════════════════════════════════════════════════════════════════════
# ALERT FORMATTING
# ═══════════════════════════════════════════════════════════════════════════════

def format_alert(meta: Dict, alert: Dict, bks: Dict) -> str:
    now  = datetime.now(timezone.utc)
    mt   = meta.get("match_time")
    diff = (mt - now) if mt else timedelta()
    hrs  = int(diff.total_seconds() // 3600)
    mins = int((diff.total_seconds() % 3600) // 60)
    time_str = f"{hrs}h{mins:02d}min" if diff.total_seconds() > 0 else "en cours"

    atype = alert["type"]

    # ── Movement line ─────────────────────────────────────────────────────────
    if alert.get("bookmaker") and alert.get("old") is not None and alert.get("new") is not None:
        bk_lbl = BK_LABEL.get(alert["bookmaker"], alert["bookmaker"].title())
        sign   = "+" if alert["pct"] >= 0 else ""
        mov = (
            f"{bk_lbl}: {alert['selection']} "
            f"{alert['old']:.2f} → {alert['new']:.2f} "
            f"({sign}{alert['pct']:.1f}%)"
        )
    elif atype == "RETRAIT MARCHE":
        mov = "Marche suspendu / retire"
    elif atype == "RETOURNEMENT FAVORI":
        fmap = {"home": meta["home"], "away": meta["away"]}
        pf   = fmap.get(alert.get("prev_fav", ""), "?")
        nf   = fmap.get(alert.get("new_fav",  ""), "?")
        mov  = f"Favori: {pf} → {nf}"
    else:
        mov = "—"

    # ── Market odds table ─────────────────────────────────────────────────────
    lines = []
    for bk in ("bet365", "pinnacle", "unibet", "williamhill", "bwin"):
        if bk in bks:
            d = bks[bk]
            lines.append(
                f"• {BK_LABEL[bk]}: "
                f"{d['home']:.2f} / {d['draw']:.2f} / {d['away']:.2f}"
            )
    market = "\n".join(lines) if lines else "• Aucune cote disponible"

    return (
        f"🚨 *MOUVEMENT SUSPECT*\n\n"
        f"⚽ *{meta['home']}* vs *{meta['away']}*\n"
        f"🏆 {meta['league']} — {meta['country']}\n"
        f"⏰ Match dans {time_str}\n\n"
        f"📊 *MOUVEMENT:*\n"
        f"{mov}\n\n"
        f"📈 *COTES MARCHE:*\n"
        f"{market}\n\n"
        f"⚡ Type: `{atype}`\n"
        f"🕐 {now.strftime('%H:%M')}"
    )


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN SCAN LOOP
# ═══════════════════════════════════════════════════════════════════════════════

async def run_scan(bot: Any) -> None:
    global last_scan, paused, pause_until, alerts_today, today_date

    # ── Pause check ───────────────────────────────────────────────────────────
    if paused:
        if pause_until and datetime.now(timezone.utc) > pause_until:
            paused = False
            pause_until = None
            logger.info("Pause expired — resuming alerts")
        else:
            logger.info("Bot is paused, skipping scan")
            return

    last_scan = datetime.now(timezone.utc)

    # ── Daily counter reset ───────────────────────────────────────────────────
    if today_date != last_scan.date():
        alerts_today = 0
        today_date   = last_scan.date()

    logger.info("─── Scan starting ───────────────────────────────────")

    for league, info in LEAGUES.items():
        try:
            matches = fetch_league_matches(league, info)
            for m in matches:
                mid = m["id"]
                bks = fetch_odds(mid)

                # Possible market suspension (had odds, now None)
                if bks is None:
                    stored = odds_store.get(mid, {})
                    if stored.get("bookmakers"):
                        for a in detect_alerts(mid, m, {}):
                            await _maybe_send(bot, mid, m, a, {})
                else:
                    for a in detect_alerts(mid, m, bks):
                        await _maybe_send(bot, mid, m, a, bks)

                await asyncio.sleep(REQUEST_DELAY)

        except Exception as exc:
            logger.error("[%s] scan error: %s", league, exc, exc_info=True)

    logger.info(
        "─── Scan done — alerts today: %d, matches tracked: %d ───",
        alerts_today, len(odds_store),
    )


async def _maybe_send(
    bot: Any,
    match_id: str,
    meta: Dict,
    alert: Dict,
    bks: Dict,
) -> None:
    global alerts_today

    now = datetime.now(timezone.utc)

    # Cooldown guard
    if match_id in alert_sent:
        if now - alert_sent[match_id] < timedelta(minutes=COOLDOWN_MIN):
            logger.debug("Cooldown active for %s — skipping", match_id)
            return

    text = format_alert(meta, alert, bks)
    try:
        await bot.send_message(
            chat_id=CHANNEL_ID,
            text=text,
            parse_mode="Markdown",
        )
        alert_sent[match_id] = now
        alerts_today += 1
        logger.info(
            "Alert sent → %s vs %s [%s]",
            meta["home"], meta["away"], alert["type"],
        )
    except TelegramError as exc:
        logger.error("Telegram send error: %s", exc)


# ═══════════════════════════════════════════════════════════════════════════════
# BOT COMMANDS
# ═══════════════════════════════════════════════════════════════════════════════

async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "🤖 *Oracle Bet Alert Bot*\n\n"
        "Je surveille les mouvements suspects de cotes sur 9 ligues.\n\n"
        "*Ligues surveilles:*\n"
        "• J-League (Japon)\n"
        "• Chinese Super League (Chine)\n"
        "• Indian Super League (Inde)\n"
        "• K-League (Coree du Sud)\n"
        "• Thai League (Thailande)\n"
        "• Polish Ekstraklasa (Pologne)\n"
        "• Romanian Liga 1 (Roumanie)\n"
        "• Serbian SuperLiga (Serbie)\n"
        "• Bulgarian First League (Bulgarie)\n\n"
        "*Bookmakers:* Bet365 · Pinnacle · Unibet · William Hill · Bwin\n\n"
        "*/status* — Etat du bot + heure du dernier scan\n"
        "*/stats* — Alertes envoyees aujourd'hui\n"
        "*/pause* — Pause alertes 1 heure\n"
        "*/resume* — Reprendre alertes",
        parse_mode="Markdown",
    )


async def cmd_status(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    now = datetime.now(timezone.utc)

    if paused:
        if pause_until:
            rem = max(0, int((pause_until - now).total_seconds() / 60))
            state = f"⏸ En pause ({rem} min restantes)"
        else:
            state = "⏸ En pause"
    else:
        state = "✅ Actif"

    ls = last_scan.strftime("%H:%M:%S UTC") if last_scan else "Jamais"

    await update.message.reply_text(
        f"🤖 *Oracle Bet Bot — Statut*\n\n"
        f"Etat : {state}\n"
        f"Dernier scan : {ls}\n"
        f"Matchs suivis : {len(odds_store)}\n"
        f"Scan toutes les {POLL_MIN} minutes",
        parse_mode="Markdown",
    )


async def cmd_stats(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    date_str = datetime.now(timezone.utc).strftime("%d/%m/%Y")
    await update.message.reply_text(
        f"📊 *Stats — {date_str}*\n\n"
        f"Alertes envoyees : *{alerts_today}*\n"
        f"Matchs en memoire : *{len(odds_store)}*\n"
        f"Cooldowns actifs : *{len(alert_sent)}*",
        parse_mode="Markdown",
    )


async def cmd_pause(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    global paused, pause_until
    paused      = True
    pause_until = datetime.now(timezone.utc) + timedelta(hours=1)
    await update.message.reply_text(
        "⏸ Alertes en pause pendant 1 heure.\n/resume pour reprendre."
    )


async def cmd_resume(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    global paused, pause_until
    paused      = False
    pause_until = None
    await update.message.reply_text("▶️ Alertes reprises !")


# ═══════════════════════════════════════════════════════════════════════════════
# SCHEDULER LIFECYCLE
# ═══════════════════════════════════════════════════════════════════════════════

scheduler = AsyncIOScheduler(timezone="UTC")


async def on_startup(app: Application) -> None:
    scheduler.add_job(
        run_scan,
        trigger="interval",
        minutes=POLL_MIN,
        args=[app.bot],
        id="odds_scanner",
        # First run 15 seconds after startup so the bot is fully ready
        next_run_time=datetime.now(timezone.utc) + timedelta(seconds=15),
    )
    scheduler.start()
    logger.info("Scheduler started — first scan in 15 s")


async def on_shutdown(app: Application) -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
    logger.info("Bot shutdown complete")


# ═══════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

def main() -> None:
    if not BOT_TOKEN:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not set")

    app = (
        Application.builder()
        .token(BOT_TOKEN)
        .post_init(on_startup)
        .post_shutdown(on_shutdown)
        .build()
    )

    app.add_handler(CommandHandler("start",  cmd_start))
    app.add_handler(CommandHandler("status", cmd_status))
    app.add_handler(CommandHandler("stats",  cmd_stats))
    app.add_handler(CommandHandler("pause",  cmd_pause))
    app.add_handler(CommandHandler("resume", cmd_resume))

    logger.info("Starting Oracle Bet Alert Bot …")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
