import requests
import time
import os
from datetime import datetime, timedelta

TELEGRAM_TOKEN = os.environ.get("TELEGRAM_TOKEN")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
ODDS_API_KEY = os.environ.get("ODDS_API_KEY")

SPORTS = [
    {"key": "soccer_france_ligue_one", "name": "Ligue 1"},
    {"key": "soccer_epl", "name": "Premier League"},
    {"key": "soccer_spain_la_liga", "name": "La Liga"},
    {"key": "soccer_italy_serie_a", "name": "Serie A"},
    {"key": "soccer_germany_bundesliga", "name": "Bundesliga"},
    {"key": "soccer_uefa_champs_league", "name": "Champions League"},
    {"key": "basketball_nba", "name": "NBA"},
    {"key": "basketball_euroleague", "name": "EuroLeague"},
    {"key": "tennis_atp_french_open", "name": "Tennis ATP"},
    {"key": "tennis_wta_french_open", "name": "Tennis WTA"},
    {"key": "icehockey_nhl", "name": "NHL"},
    {"key": "mma_mixed_martial_arts", "name": "MMA"},
]

BOOKMAKERS = ["bet365", "unibet"]
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


def get_odds(sport_key):
    try:
        url = f"https://api.the-odds-api.com/v4/sports/{sport_key}/odds"
        params = {
            "apiKey": ODDS_API_KEY,
            "regions": "eu",
            "markets": "h2h,totals,spreads",
            "oddsFormat": "decimal",
            "bookmakers": ",".join(BOOKMAKERS),
            "commenceTimeFrom": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "commenceTimeTo": (datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%dT%H:%M:%SZ")
        }
        r = requests.get(url, params=params, timeout=10)
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        print(f"Odds error: {e}")
    return []


def extract_all_opportunities(games, sport_name):
    opportunities = []
    for game in games:
        home = game.get("home_team", "")
        away = game.get("away_team", "")
        commence_time = game.get("commence_time", "")

        odds_by_selection = {}
        for bookmaker in game.get("bookmakers", []):
            book_key = bookmaker.get("key", "")
            for market in bookmaker.get("markets", []):
                market_key = market.get("key", "")
                for outcome in market.get("outcomes", []):
                    name = outcome.get("name", "")
                    price = outcome.get("price", 0)
                    point = outcome.get("point", "")

                    if market_key == "totals":
                        label = f"Total {name} {point}"
                        market_label = "Total buts/points"
                    elif market_key == "spreads":
                        label = f"Handicap {name} {point}"
                        market_label = "Handicap"
                    else:
                        label = name
                        market_label = "Resultat 1N2"

                    key = f"{market_key}_{label}"
                    if key not in odds_by_selection:
                        odds_by_selection[key] = {
                            "market": market_label,
                            "selection": label,
                            "odds": {},
                            "best_odds": 0
                        }
                    odds_by_selection[key]["odds"][book_key] = price
                    if price > odds_by_selection[key]["best_odds"]:
                        odds_by_selection[key]["best_odds"] = price

        all_odds_for_game = []
        for key, info in odds_by_selection.items():
            valid_odds = {b: o for b, o in info["odds"].items() if o >= 1.18}
            if valid_odds:
                all_odds_for_game.append({
                    "market": info["market"],
                    "selection": info["selection"],
                    "odds_by_book": valid_odds,
                    "best_odds": info["best_odds"]
                })

        if all_odds_for_game:
            opportunities.append({
                "home": home,
                "away": away,
                "sport": sport_name,
                "commence_time": commence_time,
                "all_markets": all_odds_for_game
            })

    return opportunities


def oracle_analyse(home, away, sport, all_markets):
    odds_lines = []
    for m in all_markets:
        odds_str = " | ".join([f"{b.upper()}: {o:.2f}" for b, o in m["odds_by_book"].items()])
        odds_lines.append(f"  [{m['market']}] {m['selection']} -> {odds_str}")
    all_odds_text = "\n".join(odds_lines)

    prompt = (
        f"Tu es Team Oracle Bet, un assistant d'analyse sportive ultra-structure et professionnel.\n"
        f"Fiabilite minimum exigee : 65%.\n\n"
        f"MATCH : {home} vs {away}\n"
        f"SPORT : {sport}\n\n"
        f"TOUTES LES COTES DISPONIBLES EN TEMPS REEL :\n"
        f"{all_odds_text}\n\n"
        f"Produis un rapport d'analyse complet en respectant exactement cette structure :\n\n"

        f"1. FORME RECENTE (5 a 10 derniers matchs)\n"
        f"- Resultats + performances globales\n"
        f"- Tendances : progression / stagnation / chute\n"
        f"- Stats cles selon sport : xG/xGA foot | pts/reb basket | aces tennis | strikes MMA | buts NHL\n\n"

        f"2. H2H CONFRONTATIONS DIRECTES\n"
        f"- Dynamiques significatives uniquement\n"
        f"- Renversements de tendance\n"
        f"- Si aucune tendance : Aucune tendance H2H exploitable\n\n"

        f"3. STYLE DE JEU + FORCES ET FAIBLESSES\n"
        f"- Systeme/style principal de chaque equipe\n"
        f"- Points forts / faibles\n"
        f"- Zones qui peuvent peser sur ce match\n\n"

        f"4. ABSENCES ET IMPACT REEL\n"
        f"- Blesses / suspendus / incertains\n"
        f"- Impact : titulaire cle ? poste non double ?\n"
        f"- Fiabilite : confirme / probable / a confirmer\n"
        f"- Si inconnu : Aucune source fiable disponible\n\n"

        f"5. CALENDRIER ET CONTEXTE PHYSIQUE\n"
        f"- Charge recente / matchs a venir\n"
        f"- Fatigue probable / rotation\n\n"

        f"6. ENJEUX DU MATCH\n"
        f"- Classement et objectifs\n"
        f"- Motivation / pression\n\n"

        f"7. DECLARATIONS OFFICIELLES\n"
        f"- Infos concretes uniquement (blessures, compo, strategie)\n"
        f"- Source citee ou : Aucune source fiable disponible\n\n"

        f"8. STATISTIQUES AVANCEES\n"
        f"- Foot : xG, xGA, tirs cadres, possession, clean sheets\n"
        f"- Basket : off/def rating, pace, rebonds, turnovers\n"
        f"- Tennis : 1er service %, break points, points sur 2e service\n"
        f"- MMA : striking accuracy, takedown defense, finish rate\n"
        f"- NHL : Corsi, PDO, power play %, shots on goal\n\n"

        f"9. RED FLAGS\n"
        f"- Match sans enjeu / rotation / fatigue\n"
        f"- Dynamique instable / contexte negatif\n\n"

        f"10. SYNTHESE ET PRONOSTICS SUR TOUTES LES COTES\n"
        f"- 4 a 6 elements decisifs\n"
        f"- Pour CHAQUE marche disponible liste ci-dessus :\n"
        f"  * Probabilite estimee (%)\n"
        f"  * VALUE BET : oui / non\n"
        f"  * Recommandation : JOUER / EVITER\n"
        f"- TOP 3 paris classes par ordre de preference\n"
        f"- Classification : GOLD (75%+) / SILVER (65-74%) / NO BET\n\n"

        f"REGLES ABSOLUES :\n"
        f"- Zero blabla, zero supposition, zero narration emotionnelle\n"
        f"- Donnees verifiables uniquement\n"
        f"- Si info absente : Aucune source fiable disponible\n"
        f"- Edge positif obligatoire pour recommander\n"
        f"- Rapport 800 a 1200 mots"
    )

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
        response = requests.post(url, json={
            "contents": [{"parts": [{"text": prompt}]}]
        }, timeout=30)
        if response.status_code == 200:
            return response.json()["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        print(f"Gemini error: {e}")
    return "Analyse indisponible."


def analyse_du_jour(chat_id):
    send_telegram(chat_id,
        "<b>ORACLE - Analyse en cours...</b>\n"
        "Football | Basket | Tennis | MMA | NHL\n"
        "Toutes cotes Bet365 | Unibet\n"
        "Patiente 30 secondes..."
    )

    all_opps = []
    for sport in SPORTS:
        games = get_odds(sport["key"])
        if not games:
            continue
        opps = extract_all_opportunities(games, sport["name"])
        all_opps.extend(opps)
        time.sleep(1)

    if not all_opps:
        send_telegram(chat_id,
            "<b>ORACLE - Aucun match disponible</b>\n\n"
            "Aucun match trouve dans les prochaines 48h.\n"
            "Reessaie dans quelques heures."
        )
        return

    # Match avec le plus de marches disponibles
    best = max(all_opps, key=lambda x: len(x["all_markets"]))

    analyse = oracle_analyse(
        best["home"], best["away"], best["sport"], best["all_markets"]
    )

    if "NO BET" in analyse.upper():
        send_telegram(chat_id, "<b>ORACLE - NO BET</b>\nFiabilite insuffisante. Reessaie ce soir.")
        return

    reliability = 65
    for num in range(99, 64, -1):
        if str(num) in analyse:
            reliability = num
            break

    classification = "GOLD" if reliability >= 75 else "SILVER"

    odds_display = ""
    for m in best["all_markets"]:
        odds_str = " | ".join([f"{b.upper()}: {o:.2f}" for b, o in m["odds_by_book"].items()])
        odds_display += f"  <b>{m['selection']}</b> ({m['market']})\n  {odds_str}\n"

    msg = (
        f"<b>ORACLE - ANALYSE DU JOUR</b>\n"
        f"-------------------\n"
        f"<b>{best['home']} vs {best['away']}</b>\n"
        f"{best['sport']}\n"
        f"-------------------\n"
        f"<b>TOUTES LES COTES :</b>\n"
        f"{odds_display}"
        f"-------------------\n"
        f"<b>ANALYSE ORACLE :</b>\n\n"
        f"{analyse}\n\n"
        f"-------------------\n"
        f"Fiabilite: <b>{reliability}%</b>\n"
        f"Classification: <b>{classification}</b>"
    )

    # Telegram limite a 4096 caracteres - on envoie en 2 messages si besoin
    if len(msg) > 4096:
        send_telegram(chat_id, msg[:4090] + "\n<i>...suite ci-dessous</i>")
        send_telegram(chat_id, msg[4090:])
    else:
        send_telegram(chat_id, msg)


def main():
    send_telegram(TELEGRAM_CHAT_ID,
        "<b>ORACLE Bot - ONLINE</b>\n"
        "-------------------\n"
        "Football | Basket | Tennis | MMA | NHL\n"
        "Toutes cotes Bet365 | Unibet\n"
        "Marches : 1N2 | Handicap | Totals\n"
        "Fiabilite minimum 65%\n"
        "-------------------\n"
        "Ecris analyse pour le pari du jour"
    )
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


if __name__ == "__main__":
    main(
