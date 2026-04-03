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
    {"key": "icehockey_nhl", "name": "NHL"},
]

BOOKMAKERS = ["bet365", "unibet"]


def send_telegram(chat_id, message):
    url = "https://api.telegram.org/bot" + TELEGRAM_TOKEN + "/sendMessage"
    try:
        requests.post(url, json={
            "chat_id": chat_id,
            "text": message,
            "parse_mode": "HTML"
        }, timeout=10)
    except Exception as e:
        print("Telegram error: " + str(e))


def get_updates(offset=None):
    url = "https://api.telegram.org/bot" + TELEGRAM_TOKEN + "/getUpdates"
    params = {"timeout": 30}
    if offset:
        params["offset"] = offset
    try:
        r = requests.get(url, params=params, timeout=35)
        if r.status_code == 200:
            return r.json().get("result", [])
    except Exception as e:
        print("Updates error: " + str(e))
    return []


def get_odds(sport_key):
    try:
        url = "https://api.the-odds-api.com/v4/sports/" + sport_key + "/odds"
        params = {
            "apiKey": ODDS_API_KEY,
            "regions": "eu",
            "markets": "h2h,totals,spreads",
            "oddsFormat": "decimal",
            "bookmakers": ",".join(BOOKMAKERS),
            "commenceTimeTo": (datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%dT%H:%M:%SZ")
        }
        r = requests.get(url, params=params, timeout=10)
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        print("Odds error: " + str(e))
    return []


def extract_opportunities(games, sport_name):
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
                        label = "Total " + name + " " + str(point)
                        market_label = "Total buts/points"
                    elif market_key == "spreads":
                        label = "Handicap " + name + " " + str(point)
                        market_label = "Handicap"
                    else:
                        label = name
                        market_label = "Resultat 1N2"
                    key = market_key + "_" + label
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
        all_odds = []
        for key, info in odds_by_selection.items():
            valid = {b: o for b, o in info["odds"].items() if o >= 1.15}
            if valid:
                all_odds.append({
                    "market": info["market"],
                    "selection": info["selection"],
                    "odds_by_book": valid,
                    "best_odds": info["best_odds"]
                })
        if all_odds:
            opportunities.append({
                "home": home,
                "away": away,
                "sport": sport_name,
                "commence_time": commence_time,
                "all_markets": all_odds
            })
    return opportunities


def build_prompt(home, away, sport, all_markets):
    odds_lines = []
    for m in all_markets:
        odds_str = " | ".join([b.upper() + ": " + str(round(o, 2)) for b, o in m["odds_by_book"].items()])
        odds_lines.append("  [" + m["market"] + "] " + m["selection"] + " -> " + odds_str)
    all_odds_text = "\n".join(odds_lines)
    prompt = "Tu es Team Oracle Bet, assistant d analyse sportive ultra-structure.\n"
    prompt += "Fiabilite minimum : 65%.\n\n"
    prompt += "MATCH : " + home + " vs " + away + "\n"
    prompt += "SPORT : " + sport + "\n\n"
    prompt += "COTES EN TEMPS REEL (Bet365 | Unibet) :\n"
    prompt += all_odds_text + "\n\n"
    prompt += "STRUCTURE OBLIGATOIRE :\n\n"
    prompt += "1. FORME RECENTE (5 a 10 derniers matchs)\n"
    prompt += "- Resultats + performances globales\n"
    prompt += "- Tendances : progression / stagnation / chute\n"
    prompt += "- Stats cles : xG, xGA, buts marques/encaisses, occasions creees\n"
    prompt += "- Lecture factuelle de la dynamique reelle\n\n"
    prompt += "2. H2H CONFRONTATIONS DIRECTES\n"
    prompt += "- Dynamiques reellement significatives uniquement\n"
    prompt += "- Renversements de tendance\n"
    prompt += "- Elements recurrents d un match a l autre\n"
    prompt += "- Si aucune tendance : Aucune tendance H2H exploitable\n\n"
    prompt += "3. STYLE DE JEU + FORCES ET FAIBLESSES\n"
    prompt += "Pour chaque equipe :\n"
    prompt += "- Systeme tactique principal\n"
    prompt += "- Points forts / Points faibles\n"
    prompt += "- Zones ou phases qui peuvent peser sur le match\n\n"
    prompt += "4. ABSENCES ET IMPACT REEL\n"
    prompt += "- Blesses / suspendus / incertains\n"
    prompt += "- Impact reel sur le jeu\n"
    prompt += "- Si inconnu : Aucune source fiable disponible sur ce point\n\n"
    prompt += "5. CALENDRIER ET CONTEXTE PHYSIQUE\n"
    prompt += "- Charge des matchs recents\n"
    prompt += "- Risques de rotation, fatigue probable\n\n"
    prompt += "6. ENJEUX DU MATCH\n"
    prompt += "- Situation au classement\n"
    prompt += "- Objectifs : titre, Europe, maintien, derby\n"
    prompt += "- Niveau de motivation\n\n"
    prompt += "7. STATISTIQUES AVANCEES\n"
    prompt += "- xG, xGA, tirs cadres, occasions franches\n"
    prompt += "- Clean sheets, buts concedes\n\n"
    prompt += "8. RED FLAGS\n"
    prompt += "- Match sans enjeu reel\n"
    prompt += "- Dynamique instable\n"
    prompt += "- Rotation probable\n"
    prompt += "- Fatigue ou gros match avant ou apres\n\n"
    prompt += "9. SYNTHESE FINALE ET PRONOSTICS\n"
    prompt += "- 4 a 6 elements decisifs\n"
    prompt += "- Pour CHAQUE cote listee :\n"
    prompt += "  Probabilite estimee en %\n"
    prompt += "  VALUE BET : oui ou non\n"
    prompt += "  Recommandation : JOUER ou EVITER\n"
    prompt += "- TOP 3 paris classes par ordre de preference\n"
    prompt += "- Classification : GOLD 75pct+ / SILVER 65-74pct / NO BET\n\n"
    prompt += "REGLES ABSOLUES :\n"
    prompt += "- Zero blabla, zero supposition\n"
    prompt += "- Donnees verifiables uniquement\n"
    prompt += "- Si info absente : Aucune source fiable disponible sur ce point\n"
    prompt += "- Rapport 800 a 1200 mots"
    return prompt


def oracle_analyse(home, away, sport, all_markets):
    prompt = build_prompt(home, away, sport, all_markets)
    try:
        url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + GEMINI_API_KEY
        response = requests.post(url, json={
            "contents": [{"parts": [{"text": prompt}]}]
        }, timeout=30)
        if response.status_code == 200:
            return response.json()["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        print("Gemini error: " + str(e))
    return "Analyse indisponible."


def analyse_du_jour(chat_id):
    send_telegram(chat_id,
        "<b>ORACLE - Analyse en cours...</b>\n"
        "Football | NBA | NHL\n"
        "Cotes Bet365 | Unibet en temps reel\n"
        "Patiente 30 secondes..."
    )
    all_opps = []
    for sport in SPORTS:
        games = get_odds(sport["key"])
        if not games:
            continue
        opps = extract_opportunities(games, sport["name"])
        all_opps.extend(opps)
        time.sleep(1)
    if not all_opps:
        send_telegram(chat_id,
            "<b>ORACLE - Aucun match disponible</b>\n\n"
            "Aucun match trouve dans les prochaines 48h.\n"
            "Reessaie dans quelques heures."
        )
        return
    best = max(all_opps, key=lambda x: len(x["all_markets"]))
    analyse = oracle_analyse(best["home"], best["away"], best["sport"], best["all_markets"])
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
        odds_str = " | ".join([b.upper() + ": " + str(round(o, 2)) for b, o in m["odds_by_book"].items()])
        odds_display += "  <b>" + m["selection"] + "</b> (" + m["market"] + ")\n  " + odds_str + "\n"
    header = (
        "<b>ORACLE - ANALYSE DU JOUR</b>\n"
        "-------------------\n"
        "<b>" + best["home"] + " vs " + best["away"] + "</b>\n"
        + best["sport"] + "\n"
        "-------------------\n"
        "<b>COTES DISPONIBLES :</b>\n"
        + odds_display +
        "-------------------\n"
        "<b>ANALYSE ORACLE :</b>\n\n"
    )
    footer = "\n-------------------\nFiabilite: <b>" + str(reliability) + "%</b>\nClassification: <b>" + classification + "</b>"
    full_msg = header + analyse + footer
    if len(full_msg) > 4096:
        send_telegram(chat_id, header + analyse[:3000] + "\n<i>...suite ci-dessous</i>")
        send_telegram(chat_id, analyse[3000:] + footer)
    else:
        send_telegram(chat_id, full_msg)


def main():
    send_telegram(TELEGRAM_CHAT_ID,
        "<b>ORACLE Bot - ONLINE</b>\n"
        "-------------------\n"
        "Football | NBA | NHL\n"
        "Cotes Bet365 | Unibet\n"
        "Marches : 1N2 | Handicap | Totals\n"
        "Cote minimum : 1.15\n"
        "Fiabilite minimum : 65%\n"
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
    main()
