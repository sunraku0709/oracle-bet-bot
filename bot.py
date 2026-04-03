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


def get_odds(sport_key):
    try:
        url = f"https://api.the-odds-api.com/v4/sports/{sport_key}/odds"
        params = {
            "apiKey": ODDS_API_KEY,
            "regions": "eu",
            "markets": "h2h,totals",
            "oddsFormat": "decimal",
            "bookmakers": ",".join(BOOKMAKERS),
            "commenceTimeFrom": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "commenceTimeTo": (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
        }
        r = requests.get(url, params=params, timeout=10)
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        print(f"Odds error: {e}")
    return []


def extract_best_opportunity(games, sport_name):
    best_opp = None
    for game in games:
        home = game.get("home_team", "")
        away = game.get("away_team", "")
        odds_by_selection = {}
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


def oracle_analyse(home, away, sport, market, selection, odds_by_book):
    odds_text = " | ".join([f"{b.upper()}: {o:.2f}" for b, o in odds_by_book.items()])
    best_odds = max(odds_by_book.values())

    prompt = (
        f"Tu es Team Oracle Bet, un assistant d'analyse sportive ultra-structure et professionnel.\n"
        f"Fiabilite minimum exigee : 65%.\n\n"
        f"MATCH : {home} vs {away}\n"
        f"SPORT : {sport}\n"
        f"MARCHE : {market}\n"
        f"SELECTION : {selection}\n"
        f"COTES EN TEMPS REEL : {odds_text}\n"
        f"MEILLEURE COTE : {best_odds:.2f}\n\n"
        f"Produis un rapport d'analyse complet en respectant exactement cette structure :\n\n"

        f"1. FORME RECENTE (5 a 10 derniers matchs/rencontres)\n"
        f"- Resultats + performances globales\n"
        f"- Tendances : progression / stagnation / chute\n"
        f"- Statistiques cles selon le sport (xG/xGA pour foot, points/rebounds/assists pour basket, aces/double-fautes pour tennis, strikes/takedowns pour MMA, buts/+- pour NHL)\n"
        f"- Lecture factuelle de la dynamique reelle\n\n"

        f"2. CONFRONTATIONS DIRECTES H2H (pertinent uniquement)\n"
        f"- Dynamiques reellement significatives uniquement\n"
        f"- Renversements de tendance\n"
        f"- Elements recurrents d'une rencontre a l'autre\n"
        f"- Si aucune tendance exploitable : Aucune tendance H2H exploitable\n\n"

        f"3. STYLE DE JEU + FORCES ET FAIBLESSES\n"
        f"Pour chaque equipe/joueur :\n"
        f"- Systeme/style principal\n"
        f"- Points forts / Points faibles\n"
        f"- Zones ou phases qui peuvent peser sur ce marche precis\n\n"

        f"4. ABSENCES, EFFECTIFS ET IMPACT REEL\n"
        f"- Joueurs blesses / suspendus / incertains\n"
        f"- Impact reel : titulaire cle ? poste non double ? forme physique ?\n"
        f"- Fiabilite : confirme / probable / a confirmer\n"
        f"- Si inconnu : Aucune source fiable disponible sur ce point\n\n"

        f"5. CALENDRIER ET CONTEXTE PHYSIQUE\n"
        f"- Charge des matchs recents et a venir\n"
        f"- Deplacements / matchs europeens / fatigue probable\n"
        f"- Risques de rotation\n"
        f"- Saison en cours uniquement\n\n"

        f"6. ENJEUX DU MATCH\n"
        f"- Situation au classement\n"
        f"- Objectifs : titre, playoffs, maintien, derby, match charniere\n"
        f"- Niveau de motivation / pression attendue\n\n"

        f"7. DECLARATIONS OFFICIELLES\n"
        f"- Informations concretes uniquement (composition, blessures annoncees, strategie)\n"
        f"- Ignore les declarations vagues\n"
        f"- Cite la source si disponible\n"
        f"- Si absent : Aucune source fiable disponible\n\n"

        f"8. STATISTIQUES AVANCEES CLES\n"
        f"- Indicateurs pertinents selon le sport\n"
        f"- Football : xG, xGA, tirs cadres, possession utile, clean sheets\n"
        f"- Basket : offensive/defensive rating, pace, rebonds, turnovers\n"
        f"- Tennis : 1er service %, points gagnés sur 2e service, break points\n"
        f"- MMA : striking accuracy, takedown defense, finish rate\n"
        f"- NHL : Corsi, PDO, power play %, shots on goal\n"
        f"- Uniquement ce qui peut faire basculer ce marche precis\n\n"

        f"9. RED FLAGS A VERIFIER\n"
        f"Indique clairement si present :\n"
        f"- Match sans enjeu reel\n"
        f"- Dynamique instable ou incoherente\n"
        f"- Rotation probable\n"
        f"- Gros match juste avant ou juste apres\n"
        f"- Baisse de forme non expliquee\n"
        f"- Contexte externe (fatigue, pression mediatique, conflits internes)\n\n"

        f"10. SYNTHESE FINALE ET PRONOSTIC\n"
        f"- 4 a 6 elements decisifs uniquement\n"
        f"- Probabilite estimee en pourcentage\n"
        f"- Niveau de risque : Faible / Moyen / Eleve\n"
        f"- VALUE BET : oui ou non (edge positif obligatoire)\n"
        f"- Classification : GOLD (75%+) / SILVER (65-74%) / NO BET\n\n"

        f"REGLES ABSOLUES :\n"
        f"- Zero blabla, zero supposition, zero narration emotionnelle\n"
        f"- Donnees verifiables uniquement\n"
        f"- Si info absente : Aucune source fiable disponible sur ce point\n"
        f"- Marches autorises uniquement : victoire / double chance / under / over\n"
        f"- Cote minimum : 1.40 | Edge positif obligatoire\n"
        f"- Rapport entre 800 et 1200 mots"
    )

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


def analyse_du_jour(chat_id):
    send_telegram(chat_id,
        "<b>ORACLE - Analyse en cours...</b>\n"
        "Football | Basket | Tennis | MMA | NHL\n"
        "Cotes Bet365 | Unibet en temps reel\n"
        "Patiente 30 secondes..."
    )
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
            "Aucun match trouve entre 1.40 et 2.50.\n"
            "Reessaie dans quelques heures."
        )
        return

    analyse = oracle_analyse(
        best_opp["home"], best_opp["away"], best_opp["sport"],
        best_opp["market"], best_opp["selection"],
        best_opp["odds_by_book"]
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
    gain = round(5 * best_opp["best_odds"], 2)
    odds_display = "\n".join([f"   {b.upper()}: <b>{o:.2f}</b>" for b, o in best_opp["odds_by_book"].items()])

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


def main():
    send_telegram(TELEGRAM_CHAT_ID,
        "<b>ORACLE Bot - ONLINE</b>\n"
        "-------------------\n"
        "Football | Basket | Tennis | MMA | NHL\n"
        "Cotes Bet365 | Unibet\n"
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
    main()
