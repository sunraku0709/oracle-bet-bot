import requests
import time
import os

TELEGRAM_TOKEN = os.environ.get("TELEGRAM_TOKEN")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")
ODDS_API_KEY = os.environ.get("ODDS_API_KEY")

SPORTS = [
    # Europe
    "soccer_france_ligue_one",
    "soccer_epl",
    "soccer_spain_la_liga",
    "soccer_italy_serie_a",
    "soccer_germany_bundesliga",
    "soccer_france_ligue_two",
    # Asie
    "soccer_china_superleague",
    "soccer_japan_j_league",
    "soccer_south_korea_kleague1",
    "soccer_australia_aleague",
    "soccer_india_superleague",
    # Autres sports
    "basketball_nba",
    "icehockey_nhl",
    "basketball_euroleague",
]

BOOKMAKERS = "pinnacle"
previous_odds = {}

def send_telegram(message):
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    requests.post(url, json={
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": "HTML"
    })

def get_odds(sport):
    url = f"https://api.the-odds-api.com/v4/sports/{sport}/odds"
    params = {
        "apiKey": ODDS_API_KEY,
        "regions": "eu",
        "markets": "h2h,asian_handicap",
        "oddsFormat": "decimal",
        "bookmakers": BOOKMAKERS,
        "commenceTimeFrom": time.strftime(
            "%Y-%m-%dT%H:%M:%SZ", time.gmtime()
        )
    }
    r = requests.get(url, params=params)
    if r.status_code == 200:
        return r.json()
    return []

def oracle_analyse(home, away, sport, market, selection, cote_old, cote_new, drop_pct):
    prompt = f"""Tu es ORACLE, analyste de paris sportifs d'élite.

ALERTE SHARP MONEY DÉTECTÉE SUR PINNACLE :
- Match : {home} vs {away}
- Sport/Championnat : {sport}
- Marché : {market}
- Sélection : {selection}
- Cote Pinnacle : {cote_old:.2f} → {cote_new:.2f} (chute -{drop_pct:.1f}%)

Analyse express en 5 points :
1. SHARP MONEY — Ce que cette chute signifie
2. CONTEXTE — Force des équipes, forme récente
3. EDGE — Prob estimée × Cote - 1 = ?
4. RISQUE — Principal danger
5. VERDICT — GOLD ✅ / SILVER ⚡ / NO BET ❌ + mise recommandée % bankroll

Sois direct, maximum 150 mots."""

    response = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "Content-Type": "application/json",
            "x-api-key": os.environ.get("ANTHROPIC_API_KEY"),
            "anthropic-version": "2023-06-01"
        },
        json={
            "model": "claude-sonnet-4-20250514",
            "max_tokens": 400,
            "messages": [{"role": "user", "content": prompt}]
        }
    )
    if response.status_code == 200:
        return response.json()["content"][0]["text"]
    return "⚠️ Analyse Oracle indisponible."

def check_drops():
    for sport in SPORTS:
        games = get_odds(sport)
        for game in games:
            game_id = game["id"]
            home = game["home_team"]
            away = game["away_team"]
            for bookmaker in game.get("bookmakers", []):
                for market in bookmaker.get("markets", []):
                    market_key = market["key"]
                    for outcome in market["outcomes"]:
                        key = f"{game_id}_{market_key}_{outcome['name']}"
                        current = outcome["price"]
                        if current < 1.40:
                            continue
                        if key in previous_odds:
                            old = previous_odds[key]
                            if old <= 0:
                                continue
                            drop_pct = ((old - current) / old) * 100
                            if drop_pct >= 7:
                                analyse = oracle_analyse(
                                    home, away, sport,
                                    market_key, outcome['name'],
                                    old, current, drop_pct
                                )
                                msg = (
                                    f"🚨 <b>ALERTE ORACLE v2.0 — PINNACLE</b>\n"
                                    f"━━━━━━━━━━━━━━━━━━\n"
                                    f"🏟 <b>{home} vs {away}</b>\n"
                                    f"🌍 Compétition: {sport}\n"
                                    f"🎯 Sélection: <b>{outcome['name']}</b>\n"
                                    f"📊 Marché: {market_key}\n"
                                    f"📉 Cote: {old:.2f} → <b>{current:.2f}</b>\n"
                                    f"⚡ Chute: <b>-{drop_pct:.1f}%</b>\n"
                                    f"━━━━━━━━━━━━━━━━━━\n"
                                    f"🤖 <b>ANALYSE ORACLE :</b>\n\n"
                                    f"{analyse}"
                                )
                                send_telegram(msg)
                        previous_odds[key] = current

if __name__ == "__main__":
    send_telegram(
        "🟢 <b>Oracle Bot v2.0 — ONLINE</b>\n"
        "━━━━━━━━━━━━━━━━━━\n"
        "✅ Source: Pinnacle\n"
        "✅ Marchés: H2H + Asian Handicap\n"
        "✅ Championnats asiatiques ajoutés\n"
        "✅ Oracle IA intégré\n"
        "✅ Pre-match uniquement\n"
        "✅ Filtre cote min 1.40\n"
        "━━━━━━━━━━━━━━━━━━\n"
        "🔍 Surveillance 24h/24 en cours..."
    )
    while True:
        check_drops()
        time.sleep(300)
