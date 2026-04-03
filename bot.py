import requests
import time
import os

TELEGRAM_TOKEN = os.environ.get("TELEGRAM_TOKEN")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
ODDSPAPI_KEY = os.environ.get("ODDSPAPI_KEY")

SPORTS = [
    {"id": 10, "name": "Football"},
    {"id": 1, "name": "Basketball"},
    {"id": 13, "name": "Tennis"},
]

TARGET_BOOKS = ["pinnacle", "bet365", "unibet", "betclic"]
MIN_ODDS = 1.40
MAX_ODDS = 2.50
MIN_RELIABILITY = 65

def send_telegram(chat_id, message):
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    try:
        requests.post(url, json={
            "chat_id": chat_id,
            "text": message,
            "parse_mode": "HTML"
        }, timeout=10)
    except Exception as e:
        print(f"Telegram error: {e}")

def get_updates(offset=None):
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/getUpdates"
    params = {"timeout": 30}
    if offset:
        params["offset"] = offset
    try:
        r = requests.get(url, params=params, timeout=35)
        if r.status_code == 200:
            return r.json().get("result", [])
    except Exception as e:
        print(f"Updates error: {e}")
    return []

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
        print(f"Fixtures error: {e}")
    return []

def get_odds(fixture_id):
    try:
        url = "https://api.oddspapi.io/v4/odds"
        params = {"apiKey": ODDSPAPI_KEY, "fixtureId": fixture_id}
        r = requests.get(url, params=params, timeout=10)
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        print(f"Odds error: {e}")
    return {}

def extract_best_odds(odds_data):
    best = {}
    bookmaker_odds = odds_data.get("bookmakerOdds", {})
    for book in TARGET_BOOKS:
        if book not in bookmaker_odds:
            continue
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
    odds_text = " | ".join([f"{b.upper()}: {o:.2f}" for b, o in odds_by_book.items()])
    best_odds = max(odds_by_book.values())

    prompt = f"""Tu es ORACLE, analyste de paris sportifs expert en football, basketball et tennis.

MATCH : {home} vs {away}
SPORT : {sport}
MARCHÉ : {market}
SÉLECTION : {selection}
COTES RÉELLES : {odds_text}
MEILLEURE COTE : {best_odds:.2f}

ANALYSE ULTRA-STRUCTURÉE OBLIGATOIRE :

1. FORME RÉCENTE (5 derniers matchs)
- Résultats V/N/D
- Buts marqués/encaissés ou points/sets
- Dynamique : progression / chute / stagnation

2. H2H
- Tendances tactiques réelles uniquement
- Si aucune tendance : "Aucune tendance H2H exploitable"

3. STYLE DE JEU & MATCH-UP CLÉ
- Points forts / Points faibles
- Avantage tactique pour ce marché précis

4. ABSENCES & IMPACT
- Joueurs clés absents et impact réel
- Si inconnu : "Aucune source fiable disponible"

5. ENJEUX
- Classement et objectif réel
- Niveau de motivation

6. RED FLAGS
- Fatigue / rotation / match sans enjeu
- Dynamique instable

7. SYNTHÈSE
- 3 à 5 facteurs décisifs uniquement
- Données uniquement, aucune supposition

8. PRONOSTIC FINAL
- Justification data uniquement
- Probabilité estimée en %
- Niveau de risque : Faible / Moyen / Élevé
- Classification : GOLD ✅ (75%+) / SILVER ⚡ (65-74%) / NO BET ❌ (moins de 65%)

RÈGLES ABSOLUES :
- Aucun blabla
- Aucune supposition
- Données uniquement
- Si info absente : "Aucune source fiable disponible"
- Toujours donner un verdict final clair"""

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
        response = requests.post(url, json={
            "contents": [{"parts": [{"text": prompt}]}]
        }, timeout=20)
        if response.status_code == 200:
            return response.json()["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        print(f"Gemini error: {e}")
    return "⚠️ Analyse indisponible."

def analyse_du_jour(chat_id):
    send_telegram(chat_id,
        "🔍 <b>ORACLE — Analyse en cours...</b>\n"
        "Je scanne Football, Basketball et Tennis\n"
        "Cotes Pinnacle | Bet365 | Unibet | Betclic\n"
        "⏳ Patiente 30 secondes..."
    )

    results = []

    for sport in SPORTS:
        fixtures = get_fixtures(sport["id"])
        if not fixtures:
            continue

        for fixture in fixtures[:4]:
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

                    reliability = 65
                    for num in range(99, 64, -1):
                        if str(num) in analyse:
                            reliability = num
                            break

                    if reliability < MIN_RELIABILITY:
                        continue

                    results.append({
                        "home": home,
                        "away": away,
                        "sport": sport["name"],
                        "market": info["market"],
                        "selection": info["selection"],
                        "odds_by_book": odds_by_book,
                        "best_odds": info["best_odds"],
                        "best_book": info["best_book"],
                        "analyse": analyse,
                        "reliability": reliability
                    })

                    if len(results) >= 3:
                        break

            except Exception as e:
                print(f"Error: {e}")
                continue

        if len(results) >= 3:
            break

        time.sleep(1)

    if not results:
        send_telegram(chat_id,
            "⚠️ <b>ORACLE — Aucun pari disponible</b>\n\n"
            "Pas d'opportunité fiable trouvée pour le moment.\n"
            "Réessaie dans quelques heures quand les cotes se stabilisent 🎯"
        )
        return

    results.sort(key=lambda x: x["reliability"], reverse=True)
    best = results[0]

    odds_display = "\n".join([
        f"   📌 {b.upper()}: <b>{o:.2f}</b>"
        for b, o in best["odds_by_book"].items()
    ])

    classification = "GOLD ✅" if best["reliability"] >= 75 else "SILVER ⚡"
    gain = round(5 * best["best_odds"], 2)

    msg = (
        f"🎯 <b>ORACLE — PARI DU JOUR</b>\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"🏟 <b>{best['home']} vs {best['away']}</b>\n"
        f"{best['sport']}\n"
        f"📊 Marché: <b>{best['market']}</b>\n"
        f"🎯 Sélection: <b>{best['selection']}</b>\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"💰 <b>COTES EN TEMPS RÉEL :</b>\n"
        f"{odds_display}\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"🤖 <b>ANALYSE ORACLE :</b>\n\n"
        f"{best['analyse']}\n\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"📈 Fiabilité: <b>{best['reliability']}%</b>\n"
        f"💵 Mise: <b>5€</b> → Gains potentiels: <b>{gain}€</b>\n"
        f"🏆 Classification: <b>{classification}</b>"
    )

    send_telegram(chat_id, msg)

def main():
    send_telegram(TELEGRAM_CHAT_ID,
        "🟢 <b>ORACLE Bot — ONLINE</b>\n"
        "━━━━━━━━━━━━━━━━━━\n"
        "✅ Sports: ⚽ Football | 🏀 Basketball | 🎾 Tennis\n"
        "✅ Cotes: Pinnacle | Bet365 | Unibet | Betclic\n"
        "✅ Analyse ultra-structurée\n"
        "✅ Fiabilité minimum 65%\n"
        "✅ Cote min 1.40 — max 2.50\n"
        "━━━━━━━━━━━━━━━━━━\n"
        "💬 Écris <b>analyse</b> pour le pari du jour 🎯"
    )

    offset = None
    while True:
        updates = get_updates(offset)
        for update in updates:
            offset = update["update_id"] + 1
            message = update.get("message", {})
            chat_id = message.get("chat", {}).get("id")
            text = message.get("text", "").lower().strip()

            if not chat_id or not text:
                continue

            if any(word in text for word in ["analyse", "pari", "oracle", "start", "bonjour", "salut", "today", "aujourd"]):
                analyse_du_jour(chat_id)

        time.sleep(2)

if __name__ == "__main__":
    main()
