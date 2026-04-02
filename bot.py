import requests
import time
import os

TELEGRAM_TOKEN = os.environ.get("TELEGRAM_TOKEN")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")
ODDS_API_KEY = os.environ.get("ODDS_API_KEY")

SPORTS = [
    "soccer_france_ligue_one",
    "soccer_epl",
    "soccer_spain_la_liga",
    "basketball_nba",
    "icehockey_nhl",
    "tennis_atp_french_open",
]

previous_odds = {}

def send_telegram(message):
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    requests.post(url, json={"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "HTML"})

def get_odds(sport):
    url = f"https://api.the-odds-api.com/v4/sports/{sport}/odds"
    params = {"apiKey": ODDS_API_KEY, "regions": "eu", "markets": "h2h", "oddsFormat": "decimal"}
    r = requests.get(url, params=params)
    if r.status_code == 200:
        return r.json()
    return []

def check_drops():
    for sport in SPORTS:
        games = get_odds(sport)
        for game in games:
            game_id = game["id"]
            home = game["home_team"]
            away = game["away_team"]
            for bookmaker in game.get("bookmakers", [])[:1]:
                for market in bookmaker.get("markets", []):
                    if market["key"] == "h2h":
                        for outcome in market["outcomes"]:
                            key = f"{game_id}_{outcome['name']}"
                            current = outcome["price"]
                            if key in previous_odds:
                                old = previous_odds[key]
                                drop_pct = ((old - current) / old) * 100
                                if drop_pct >= 8 and current >= 1.40:
                                    msg = (
                                        f"🚨 <b>ALERTE ORACLE</b>\n"
                                        f"⚽ {home} vs {away}\n"
                                        f"🎯 Sélection: <b>{outcome['name']}</b>\n"
                                        f"📉 Cote: {old:.2f} → <b>{current:.2f}</b>\n"
                                        f"⚡ Chute: <b>-{drop_pct:.1f}%</b>\n"
                                        f"✅ Sharp money détecté !"
                                    )
                                    send_telegram(msg)
                            previous_odds[key] = current

def get_chat_id():
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/getUpdates"
    r = requests.get(url)
    print(r.json())

if __name__ == "__main__":
    send_telegram("🟢 <b>Oracle Bet Bot démarré</b>\nSurveillance des cotes en cours...")
    while True:
        check_drops()
        time.sleep(300)
