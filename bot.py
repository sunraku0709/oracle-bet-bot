import requests
import time
import os
from datetime import datetime, timedelta

TELEGRAM_TOKEN = os.environ.get(“TELEGRAM_TOKEN”)
TELEGRAM_CHAT_ID = os.environ.get(“TELEGRAM_CHAT_ID”)
GEMINI_API_KEY = os.environ.get(“GEMINI_API_KEY”)
ODDS_API_KEY = os.environ.get(“ODDS_API_KEY”)

SPORTS = [
{“key”: “soccer_france_ligue_one”, “name”: “Ligue 1”},
{“key”: “soccer_epl”, “name”: “Premier League”},
{“key”: “soccer_spain_la_liga”, “name”: “La Liga”},
{“key”: “soccer_italy_serie_a”, “name”: “Serie A”},
{“key”: “soccer_germany_bundesliga”, “name”: “Bundesliga”},
{“key”: “basketball_nba”, “name”: “NBA”},
{“key”: “tennis_atp_french_open”, “name”: “Tennis ATP”},
]

BOOKMAKERS = [“bet365”, “unibet”]
MIN_ODDS = 1.40
MAX_ODDS = 2.50
MIN_RELIABILITY = 65

def send_telegram(chat_id, message):
url = f”https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage”
try:
requests.post(url, json={
“chat_id”: chat_id,
“text”: message,
“parse_mode”: “HTML”
}, timeout=10)
except Exception as e:
print(f”Telegram error: {e}”)

def get_updates(offset=None):
url = f”https://api.telegram.org/bot{TELEGRAM_TOKEN}/getUpdates”
params = {“timeout”: 30}
if offset:
params[“offset”] = offset
try:
r = requests.get(url, params=params, timeout=35)
if r.status_code == 200:
return r.json().get(“result”, [])
except Exception as e:
print(f”Updates error: {e}”)
return []

def get_odds(sport_key):
try:
url = f”https://api.the-odds-api.com/v4/sports/{sport_key}/odds”
params = {
“apiKey”: ODDS_API_KEY,
“regions”: “eu”,
“markets”: “h2h,totals”,
“oddsFormat”: “decimal”,
“bookmakers”: “,”.join(BOOKMAKERS),
“commenceTimeFrom”: datetime.utcnow().strftime(”%Y-%m-%dT%H:%M:%SZ”),
“commenceTimeTo”: (datetime.utcnow() + timedelta(days=1)).strftime(”%Y-%m-%dT%H:%M:%SZ”)
}
r = requests.get(url, params=params, timeout=10)
if r.status_code == 200:
return r.json()
except Exception as e:
print(f”Odds error: {e}”)
return []

def extract_best_opportunity(games, sport_name):
best_opp = None
for game in games:
home = game.get(“home_team”, “”)
away = game.get(“away_team”, “”)
odds_by_selection = {}

```
    for bookmaker in game.get("bookmakers", []):
        book_key = bookmaker.get("key", "")
        for market in bookmaker.get("markets", []):
            market_key = market.get("key", "")
            for outcome in market.get("outcomes", []):
                name = outcome.get("name", "")
                price = outcome.get("price", 0)
                point = outcome.get("point", "")
                label = f"Total {name} {point}" if market_key == "totals" else name
                key = f"{market_key}_{label}"
                if key not in odds_by_selection:
                    odds_by_selection[key] = {
                        "market": "Resultat" if market_key == "h2h" else "Total buts",
                        "selection": label,
                        "odds": {},
                        "best_odds": 0
                    }
                odds_by_selection[key]["odds"][book_key] = price
                if price > odds_by_selection[key]["best_odds"]:
                    odds_by_selection[key]["best_odds"] = price

    for key, info in odds_by_selection.items():
        best = info["best_odds"]
        if MIN_ODDS <= best <= MAX_ODDS:
            valid_odds = {b: o for b, o in info["odds"].items() if o >= MIN_ODDS}
            if valid_odds:
                opp = {
                    "home": home,
                    "away": away,
                    "sport": sport_name,
                    "market": info["market"],
                    "selection": info["selection"],
                    "odds_by_book": valid_odds,
                    "best_odds": best
                }
                if best_opp is None or best < best_opp["best_odds"]:
                    best_opp = opp
return best_opp
```

def oracle_analyse(home, away, sport, market, selection, odds_by_book):
odds_text = “ | “.join([f”{b.upper()}: {o:.2f}” for b, o in odds_by_book.items()])
best_odds = max(odds_by_book.values())

```
prompt = f"""Tu es ORACLE, analyste de paris sportifs expert.
```

MATCH : {home} vs {away}
SPORT : {sport}
MARCHE : {market}
SELECTION : {selection}
COTES REELLES : {odds_text}
MEILLEURE COTE : {best_odds:.2f}

ANALYSE STRUCTUREE OBLIGATOIRE :

1. FORME RECENTE (5 derniers matchs)

- Resultats V/N/D avec scores
- Buts/points marques et encaisses
- Dynamique : progression / chute / stagnation

1. H2H (5 derniers)

- Tendances reelles uniquement
- Si aucune tendance : Aucune tendance H2H exploitable

1. STYLE DE JEU ET MATCH-UP CLE

- Points forts / points faibles
- Avantage tactique pour ce marche precis

1. ABSENCES ET IMPACT

- Joueurs cles absents avec impact reel
- Si inconnu : Aucune source fiable disponible

1. ENJEUX ET MOTIVATION

- Position classement et objectif du match

1. RED FLAGS

- Fatigue / rotation / match sans enjeu / dynamique negative

1. SYNTHESE

- 3 a 5 facteurs decisifs uniquement - donnees uniquement

1. PRONOSTIC FINAL

- Probabilite estimee en pourcentage
- Niveau de risque : Faible / Moyen / Eleve
- VALUE BET : oui ou non
- GOLD (75% et plus) / SILVER (65 a 74%) / NO BET (moins de 65%)

REGLES : Zero blabla. Zero supposition. Donnees uniquement. Si info absente : Aucune source fiable disponible.”””

```
try:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
    response = requests.post(url, json={
        "contents": [{"parts": [{"text": prompt}]}]
    }, timeout=25)
    if response.status_code == 200:
        return response.json()["candidates"][0]["content"]["parts"][0]["text"]
except Exception as e:
    print(f"Gemini error: {e}")
return "Analyse indisponible."
```

def analyse_du_jour(chat_id):
send_telegram(chat_id,
“<b>ORACLE - Analyse en cours…</b>\n”
“Football | NBA | Tennis\n”
“Cotes Bet365 | Unibet en temps reel\n”
“Patiente 30 secondes…”
)

```
best_opp = None

for sport in SPORTS:
    games = get_odds(sport["key"])
    if not games:
        continue
    opp = extract_best_opportunity(games, sport["name"])
    if opp:
        if best_opp is None or opp["best_odds"] < best_opp["best_odds"]:
            best_opp = opp
    time.sleep(1)

if not best_opp:
    send_telegram(chat_id,
        "<b>ORACLE - Aucun pari disponible</b>\n\n"
        "Aucun match avec cotes entre 1.40 et 2.50 trouve.\n"
        "Reessaie dans quelques heures."
    )
    return

analyse = oracle_analyse(
    best_opp["home"], best_opp["away"], best_opp["sport"],
    best_opp["market"], best_opp["selection"],
    best_opp["odds_by_book"]
)

if "NO BET" in analyse.upper():
    send_telegram(chat_id,
        "<b>ORACLE - NO BET</b>\n"
        "Fiabilite insuffisante. Reessaie ce soir."
    )
    return

reliability = 65
for num in range(99, 64, -1):
    if str(num) in analyse:
        reliability = num
        break

classification = "GOLD" if reliability >= 75 else "SILVER"
gain = round(5 * best_opp["best_odds"], 2)
odds_display = "\n".join([
    f"   {b.upper()}: <b>{o:.2f}</b>"
    for b, o in best_opp["odds_by_book"].items()
])

msg = (
    f"<b>ORACLE - PARI DU JOUR</b>\n"
    f"-------------------\n"
    f"<b>{best_opp['home']} vs {best_opp['away']}</b>\n"
    f"{best_opp['sport']}\n"
    f"Marche: <b>{best_opp['market']}</b>\n"
    f"Selection: <b>{best_opp['selection']}</b>\n"
    f"-------------------\n"
    f"<b>COTES EN TEMPS REEL:</b>\n"
    f"{odds_display}\n"
    f"-------------------\n"
    f"<b>ANALYSE ORACLE:</b>\n\n"
    f"{analyse}\n\n"
    f"-------------------\n"
    f"Fiabilite: <b>{reliability}%</b>\n"
    f"Mise: <b>5 euros</b> - Gains: <b>{gain} euros</b>\n"
    f"Classification: <b>{classification}</b>"
)

send_telegram(chat_id, msg)
```

def main():
send_telegram(TELEGRAM_CHAT_ID,
“<b>ORACLE Bot - ONLINE</b>\n”
“—————––\n”
“Football | NBA | Tennis\n”
“Cotes Bet365 | Unibet\n”
“Fiabilite minimum 65%\n”
“—————––\n”
“Ecris <b>analyse</b> pour le pari du jour”
)

```
offset = None
while True:
    updates = get_updates(offset)
    for update in updates:
        offset = update["update_id"] + 1
        message = update.get("message", {})
        chat_id = message.get("chat", {}).get("id")
        text = message.get("text", "").lower().strip()
        if chat_id and any(w in text for w in ["analyse", "pari", "oracle", "start"]):
            analyse_du_jour(chat_id)
    time.sleep(2)
```

if **name** == “**main**”:
main()
