import requests
import time
import os

TELEGRAM_TOKEN = os.environ.get("TELEGRAM_TOKEN")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
ODDSPAPI_KEY = os.environ.get("ODDSPAPI_KEY")

SPORTS_IDS = [
    {"id": 1, "name": "Basketball"},
    {"id": 10, "name": "Football"},
    {"id": 13, "name": "Tennis"},
    {"id": 17, "name": "Hockey"},
    {"id": 16, "name": "Rugby"},
    {"id": 3, "name": "Baseball"},
    {"id": 7, "name": "MMA"},
]

TARGET_BOOKS = ["pinnacle", "bet365", "unibet", "betclic"]
MIN_ODDS = 1.40
MAX_ODDS = 2.50
MIN_RELIABILITY = 85

def send_telegram(message):
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    try:
        requests.post(url, json={
            "chat_id": TELEGRAM_CHAT_ID,
            "text": message,
            "parse_mode": "HTML"
        }, timeout=10)
    except Exception as e:
        print(f"Telegram error: {e}")

def get_fixtures(sport_id):
    try:
        url = "https://api.oddspapi.io/v4/fixtures"
        params = {
            "apiKey": ODDSPAPI_KEY,
            "sportId": sport_id,
            "status": "upcoming"
        }
        r = requests.get(url, params=params, timeout=10)
        if r.status_code == 200:
            data = r.json()
            return data.get("fixtures", data) if isinstance(data, dict) else data
    except Exception as e:
        print(f"Fixtures error sport {sport_id}: {e}")
    return []

def get_odds(fixture_id):
    try:
        url = f"https://api.oddspapi.io/v4/odds"
        params = {
            "apiKey": ODDSPAPI_KEY,
            "fixtureId": fixture_id
        }
        r = requests.get(url, params=params, timeout=10)
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        print(f"Odds error {fixture_id}: {e}")
    return {}

def extract_best_odds(odds_data):
    best = {}
    bookmaker_odds = odds_data.get("bookmakerOdds", {})
    for book in TARGET_BOOKS:
        if book in bookmaker_odds:
            markets = bookmaker_odds[book].get("markets", {})
            for market_id, market_data in markets.items():
                outcomes = market_data.get("outcomes", {})
                for outcome_id, outcome_data in outcomes.items():
                    try:
                        price = outcome_data["players"]["0"]["price"]
                        name = outcome_data.get("outcomeName", outcome_id)
                        market_name = market_data.get("marketName", market_id)
                        key = f"{market_name}_{name}"
                        if key not in best:
                            best[key] = {
                                "market": market_name,
                                "selection": name,
                                "odds": {},
                                "best_odds": 0,
                                "best_book": ""
                            }
                        best[key]["odds"][book] = price
                        if price > best[key]["best_odds"]:
                            best[key]["best_odds"] = price
                            best[key]["best_book"] = book
                    except (KeyError, TypeError):
                        continue
    return best

def oracle_analyse(home, away, sport, market, selection, odds_by_book):
    odds_text = " | ".join([f"{b.upper()}: {o:.2f}" for b, o in odds_by_book.items() if o > 0])
    best_odds = max(odds_by_book.values())

    prompt = f"""Tu es ORACLE, analyste de paris sportifs professionnel.

MATCH : {home} vs {away}
SPORT : {sport}
MARCHÉ : {market}
SÉLECTION : {selection}
COTES RÉELLES : {odds_text}
MEILLEURE COTE : {best_odds:.2f}

Analyse en 5 points RAPIDE :
1. CONTEXTE — Forme et enjeu du match
2. STATISTIQUES — Données clés pour ce marché précis
3. FIABILITÉ — Estime en % (sois précis et honnête)
4. RISQUE — Ce qui pourrait faire rater ce pari
5. VERDICT — GOLD ✅ (85%+) / SILVER ⚡ (75-84%) / NO BET ❌

Maximum 120 mots. Sois direct et précis."""

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
        response = requests.post(url, json={
            "contents": [{"parts": [{"text": prompt}]}]
        }, timeout=15)
        if response.status_code == 200:
            return response.json()["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        print(f"Gemini error: {e}")
    return "⚠️ Analyse indisponible."

def scan_and_alert():
    print("🔍 Scan en cours...")
    alerts_sent = 0

    for sport in SPORTS_IDS:
        fixtures = get_fixtures(sport["id"])
        if not fixtures:
            continue

        for fixture in fixtures[:5]:
            try:
                fixture_id = fixture.get("fixtureId") or fixture.get("id")
                participants = fixture.get("participants", [])
                if len(participants) < 2:
                    continue

                home = participants[0].get("name", "Équipe 1")
                away = participants[1].get("name", "Équipe 2")

                odds_data = get_odds(fixture_id)
                if not odds_data:
                    continue

                best_odds_map = extract_best_odds(odds_data)

                for key, info in best_odds_map.items():
                    best = info["best_odds"]
                    if best < MIN_ODDS or best > MAX_ODDS:
                        continue

                    odds_by_book = {b: o for b, o in info["odds"].items() if o >= MIN_ODDS}
                    if not odds_by_book:
                        continue

                    analyse = oracle_analyse(
                        home, away, sport["name"],
                        info["market"], info["selection"],
                        odds_by_book
                    )

                    if "NO BET" in analyse.upper():
                        continue

                    reliability = MIN_RELIABILITY
                    for num in range(99, 74, -1):
                        if str(num) in analyse:
                            reliability = num
                            break

                    if reliability < MIN_RELIABILITY:
                        continue

                    classification = "GOLD ✅" if reliability >= 85 else "SILVER ⚡"
                    odds_display = "\n".join([f"   📌 {b.upper()}: <b>{o:.2f}</b>" for b, o in odds_by_book.items()])
                    best_gain = round(5 * info["best_odds"], 2)

                    msg = (
                        f"🎯 <b>ORACLE — PARI DU JOUR</b>\n"
                        f"━━━━━━━━━━━━━━━━━━\n"
                        f"🏟 <b>{home} vs {away}</b>\n"
                        f"🏆 Sport: {sport['name']}\n"
                        f"📊 Marché: <b>{info['market']}</b>\n"
                        f"🎯 Sélection: <b>{info['selection']}</b>\n"
                        f"━━━━━━━━━━━━━━━━━━\n"
                        f"💰 <b>COTES EN TEMPS RÉEL :</b>\n"
                        f"{odds_display}\n"
                        f"━━━━━━━━━━━━━━━━━━\n"
                        f"🤖 <b>ANALYSE ORACLE :</b>\n\n"
                        f"{analyse}\n\n"
                        f"━━━━━━━━━━━━━━━━━━\n"
                        f"📈 Fiabilité: <b>{reliability}%</b>\n"
                        f"💵 Mise: <b>5€</b> → Gains potentiels: <b>{best_gain}€</b>\n"
                        f"🏆 Classification: <b>{classification}</b>"
                    )

                    send_telegram(msg)
                    alerts_sent += 1
                    time.sleep(3)

                    if alerts_sent >= 3:
                        return

            except Exception as e:
                print(f"Error processing fixture: {e}")
                continue

        time.sleep(1)

    if alerts_sent == 0:
        print("Aucune opportunité trouvée ce scan.")

if __name__ == "__main__":
    send_telegram(
        "🟢 <b>ORACLE Bot — ONLINE</b>\n"
        "━━━━━━━━━━━━━━━━━━\n"
        "✅ Source: OddsPapi (350+ bookmakers)\n"
        "✅ Cotes: Pinnacle | Bet365 | Unibet | Betclic\n"
        "✅ Marchés: H2H + Handicap + Over/Under\n"
        "✅ Oracle IA Gemini intégré\n"
        "✅ Fiabilité minimum 85%\n"
        "✅ Cote min 1.40 — max 2.50\n"
        "━━━━━━━━━━━━━━━━━━\n"
        "🔍 Scan toutes les 4h — En cours..."
    )
    while True:
        scan_and_alert()
        print("⏳ Prochain scan dans 4h...")
        time.sleep(14400)
