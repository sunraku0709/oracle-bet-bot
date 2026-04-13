import requests
import time
import os
from datetime import datetime
from bs4 import BeautifulSoup

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "8421493972:AAE78oHf4y_WTtfmuiC-0kR_B-VGQbJADGA")
CHAT_ID = "@OracleBetAlert_bot"
INTERVAL = 300
MOVEMENT_THRESHOLD = 0.15

LEAGUES = [
    {"name": "J-League",               "country": "japan",       "slug": "j-league"},
    {"name": "Chinese Super League",   "country": "china",       "slug": "super-league"},
    {"name": "Indian Super League",    "country": "india",       "slug": "super-league"},
    {"name": "K-League 1",             "country": "south-korea", "slug": "k-league-1"},
    {"name": "Thai League 1",          "country": "thailand",    "slug": "thai-league-1"},
    {"name": "Polish Ekstraklasa",     "country": "poland",      "slug": "ekstraklasa"},
    {"name": "Romanian Liga 1",        "country": "romania",     "slug": "liga-1"},
    {"name": "Serbian SuperLiga",      "country": "serbia",      "slug": "super-liga"},
    {"name": "Bulgarian First League", "country": "bulgaria",    "slug": "first-league"},
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}

previous_odds = {}


def log(msg):
    ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    print("[" + ts + " UTC] " + msg)


def send_telegram(message):
    url = "https://api.telegram.org/bot" + BOT_TOKEN + "/sendMessage"
    try:
        resp = requests.post(
            url,
            json={
                "chat_id": CHAT_ID,
                "text": message,
                "parse_mode": "HTML",
            },
            timeout=10,
        )
        if resp.status_code != 200:
            log("Telegram error " + str(resp.status_code) + ": " + resp.text[:200])
    except Exception as exc:
        log("Telegram send failed: " + str(exc))


def parse_odd(raw):
    try:
        return float(raw.strip())
    except Exception:
        return None


def extract_odds_from_row(row):
    """
    Try multiple strategies to pull 1 / X / 2 odds from a table row.
    Returns (odd1, oddx, odd2) floats or (None, None, None) on failure.
    """
    # Strategy 1: td elements carrying a data-odd attribute
    cells = row.find_all("td", attrs={"data-odd": True})
    if len(cells) >= 3:
        return parse_odd(cells[0].get_text()), parse_odd(cells[1].get_text()), parse_odd(cells[2].get_text())

    # Strategy 2: span elements carrying a data-odd attribute
    spans = row.find_all("span", attrs={"data-odd": True})
    if len(spans) >= 3:
        return parse_odd(spans[0].get_text()), parse_odd(spans[1].get_text()), parse_odd(spans[2].get_text())

    # Strategy 3: td elements with class containing "table-main__detail-odds"
    all_td = row.find_all("td")
    odd_tds = [
        td for td in all_td
        if "table-main__detail-odds" in " ".join(td.get("class", []))
    ]
    if len(odd_tds) >= 3:
        return parse_odd(odd_tds[0].get_text()), parse_odd(odd_tds[1].get_text()), parse_odd(odd_tds[2].get_text())

    # Strategy 4: last three numeric-looking td cells
    numeric_tds = []
    for td in all_td:
        txt = td.get_text(strip=True)
        try:
            float(txt)
            numeric_tds.append(txt)
        except ValueError:
            pass
    if len(numeric_tds) >= 3:
        return parse_odd(numeric_tds[0]), parse_odd(numeric_tds[1]), parse_odd(numeric_tds[2])

    return None, None, None


def scrape_league(league):
    base_url = (
        "https://www.betexplorer.com/soccer/"
        + league["country"] + "/"
        + league["slug"] + "/"
    )
    try:
        resp = requests.get(base_url, headers=HEADERS, timeout=20)
    except Exception as exc:
        log("Request failed for " + league["name"] + ": " + str(exc))
        return []

    if resp.status_code != 200:
        log("HTTP " + str(resp.status_code) + " for " + league["name"])
        return []

    soup = BeautifulSoup(resp.text, "lxml")
    matches = []

    # Locate the main match table - try several known selectors
    table = (
        soup.find("table", class_="table-main")
        or soup.find("table", id="nr-all")
        or soup.find("table", class_="sortable")
    )
    if not table:
        log("No match table found for " + league["name"])
        return []

    for row in table.find_all("tr"):
        # Find the match link (teams)
        link = row.find("a", class_="in-match") or row.find("a", href=lambda h: h and "/soccer/" in h and "-" in h)
        if not link:
            continue

        raw_teams = link.get_text(strip=True)
        if " - " not in raw_teams:
            continue
        parts = raw_teams.split(" - ", 1)
        home = parts[0].strip()
        away = parts[1].strip()
        if not home or not away:
            continue

        odd1, oddx, odd2 = extract_odds_from_row(row)
        if not (odd1 and oddx and odd2):
            continue
        # Sanity-check: valid football odds are between 1.01 and 50.0
        if not all(1.01 <= o <= 50.0 for o in (odd1, oddx, odd2)):
            continue

        matches.append({"home": home, "away": away, "odd1": odd1, "oddx": oddx, "odd2": odd2})

    log("Scraped " + str(len(matches)) + " match(es) from " + league["name"])
    return matches


def pct_change(old_val, new_val):
    if old_val and old_val > 0:
        return abs(new_val - old_val) / old_val
    return 0.0


def build_alert(league_name, home, away, old, new):
    lines = []
    pairs = [
        ("Home (1)", "odd1"),
        ("Draw (X)", "oddx"),
        ("Away (2)", "odd2"),
    ]
    for label, key in pairs:
        chg = pct_change(old[key], new[key])
        if chg >= MOVEMENT_THRESHOLD:
            direction = "DOWN" if new[key] < old[key] else "UP"
            lines.append(
                label + ": "
                + str(old[key]) + " -> " + str(new[key])
                + "  [" + direction + " " + str(round(chg * 100, 1)) + "%]"
            )
    if not lines:
        return None

    ts = datetime.utcnow().strftime("%H:%M UTC")
    msg = (
        "<b>ORACLE ALERT - Suspicious Odds Movement</b>\n"
        "------------------------------\n"
        "<b>League:</b> " + league_name + "\n"
        "<b>Match:</b> " + home + " vs " + away + "\n"
        "------------------------------\n"
        + "\n".join(lines) + "\n"
        "------------------------------\n"
        "<i>Source: BetExplorer | " + ts + "</i>"
    )
    return msg


def check_movements():
    alerts_sent = 0
    for league in LEAGUES:
        matches = scrape_league(league)
        time.sleep(2)

        for match in matches:
            key = league["name"] + "|" + match["home"] + "|" + match["away"]
            current = {"odd1": match["odd1"], "oddx": match["oddx"], "odd2": match["odd2"]}

            if key in previous_odds:
                alert_msg = build_alert(
                    league["name"], match["home"], match["away"],
                    previous_odds[key], current
                )
                if alert_msg:
                    send_telegram(alert_msg)
                    log("Alert: " + match["home"] + " vs " + match["away"] + " (" + league["name"] + ")")
                    alerts_sent += 1
                    time.sleep(1)

            previous_odds[key] = current

    log("Cycle complete. Alerts sent: " + str(alerts_sent))


def send_startup_message():
    league_lines = "\n".join(["- " + lg["name"] for lg in LEAGUES])
    msg = (
        "<b>ORACLE Odds Alert Bot - ONLINE</b>\n"
        "------------------------------\n"
        "Monitoring for suspicious odds shifts\n"
        "Scan interval : every 5 minutes\n"
        "Alert threshold: 15%+ movement\n"
        "------------------------------\n"
        "<b>Leagues monitored:</b>\n"
        + league_lines + "\n"
        "------------------------------\n"
        "<i>Data source: BetExplorer.com</i>"
    )
    send_telegram(msg)


def main():
    log("Oracle Odds Alert Bot starting")
    send_startup_message()
    cycle = 0
    while True:
        cycle += 1
        log("--- Cycle " + str(cycle) + " ---")
        try:
            check_movements()
        except Exception as exc:
            log("Unhandled error in cycle " + str(cycle) + ": " + str(exc))
        log("Sleeping " + str(INTERVAL) + "s until next cycle")
        time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
