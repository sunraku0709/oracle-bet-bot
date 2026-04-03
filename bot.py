import requests
import time
import os
from datetime import datetime, timezone

TELEGRAM_TOKEN = os.environ.get("TELEGRAM_TOKEN")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
RAPIDAPI_KEY = os.environ.get("RAPIDAPI_KEY")

RAPIDAPI_HOST = "allsportsapi2.p.rapidapi.com"

TOURNAMENTS = [
    {"id": "17", "season": "76986", "name": "Premier League"},
    {"id": "34", "season": "76932", "name": "Ligue 1"},
    {"id": "8", "season": "76946", "name": "La Liga"},
    {"id": "23", "season": "76976", "name": "Serie A"},
    {"id": "35", "season": "76938", "name": "Bundesliga"},
    {"id": "7", "season": "76953", "name": "Champions League"},
    {"id": "132", "season": "76768", "name": "NBA"},
]

HEADERS = {
    "x-rapidapi-host": RAPIDAPI_HOST,
    "x-rapidapi-key": RAPIDAPI_KEY,
    "Content-Type": "application/json"
}


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


def get_today_matches(tournament_id, season_id):
    try:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        url = "https://" + RAPIDAPI_HOST + "/api/tournament/" + tournament_id + "/season/" + season_id + "/matches/last/0"
        r = requests.get(url, headers=HEADERS, timeout=10)
        if r.status_code == 200:
            data = r.json()
            events = data.get("events", [])
            upcoming = []
            for e in events:
                status = e.get("status", {}).get("type", "")
                if status == "notstarted":
                    upcoming.append(e)
            return upcoming
    except Exception as e:
        print("Matches error: " + str(e))
    return []


def get_next_matches(tournament_id, season_id):
    try:
        url = "https://" + RAPIDAPI_HOST + "/api/tournament/" + tournament_id + "/season/" + season_id + "/matches/next/0"
        r = requests.get(url, headers=HEADERS, timeout=10)
        if r.status_code == 200:
            data = r.json()
            return data.get("events", [])
    except Exception as e:
        print("Next matches error: " + str(e))
    return []


def get_team_stats(team_id, tournament_id, season_id):
    try:
        url = "https://" + RAPIDAPI_HOST + "/api/team/" + str(team_id) + "/tournament/" + tournament_id + "/season/" + season_id + "/statistics"
        r = requests.get(url, headers=HEADERS, timeout=10)
        if r.status_code == 200:
            return r.json().get("statistics", {})
    except Exception as e:
        print("Team stats error: " + str(e))
    return {}


def get_h2h(team1_id, team2_id):
    try:
        url = "https://" + RAPIDAPI_HOST + "/api/team/" + str(team1_id) + "/team/" + str(team2_id) + "/h2h/events"
        r = requests.get(url, headers=HEADERS, timeout=10)
        if r.status_code == 200:
            data = r.json()
            events = data.get("events", [])
            return events[:5]
    except Exception as e:
        print("H2H error: " + str(e))
    return []


def build_prompt(home, away, sport, home_stats, away_stats, h2h_events):
    h2h_text = ""
    if h2h_events:
        for e in h2h_events:
            ht = e.get("homeTeam", {}).get("name", "")
            at = e.get("awayTeam", {}).get("name", "")
            hs = e.get("homeScore", {}).get("current", "?")
            as_ = e.get("awayScore", {}).get("current", "?")
            h2h_text += "  " + ht + " " + str(hs) + " - " + str(as_) + " " + at + "\n"
    else:
        h2h_text = "  Aucune tendance H2H exploitable\n"

    def fmt_stats(stats):
        if not stats:
            return "  Aucune source fiable disponible\n"
        lines = ""
        goals = stats.get("goals", None)
        if goals is not None:
            lines += "  Buts marques: " + str(goals) + "\n"
        goals_against = stats.get("goalsAgainst", None)
        if goals_against is not None:
            lines += "  Buts encaisses: " + str(goals_against) + "\n"
        wins = stats.get("wins", None)
        if wins is not None:
            lines += "  Victoires: " + str(wins) + "\n"
        losses = stats.get("losses", None)
        if losses is not None:
            lines += "  Defaites: " + str(losses) + "\n"
        draws = stats.get("draws", None)
        if draws is not None:
            lines += "  Nuls: " + str(draws) + "\n"
        if not lines:
            lines = "  Aucune source fiable disponible\n"
        return lines

    prompt = "Tu es Team Oracle Bet, assistant d analyse sportive ultra-structure.\n"
    prompt += "Fiabilite minimum : 65%.\n\n"
    prompt += "MATCH : " + home + " vs " + away + "\n"
    prompt += "SPORT : " + sport + "\n\n"
    prompt += "STATISTIQUES " + home + " :\n"
    prompt += fmt_stats(home_stats)
    prompt += "\nSTATISTIQUES " + away + " :\n"
    prompt += fmt_stats(away_stats)
    prompt += "\nH2H (5 derniers) :\n"
    prompt += h2h_text
    prompt += "\nSTRUCTURE OBLIGATOIRE :\n\n"
    prompt += "1. FORME RECENTE\n"
    prompt += "- Analyse des stats ci-dessus\n"
    prompt += "- Dynamique : progression / stagnation / chute\n\n"
    prompt += "2. H2H\n"
    prompt += "- Tendances significatives uniquement\n\n"
    prompt += "3. FORCES ET FAIBLESSES\n"
    prompt += "- Points forts / Points faibles de chaque equipe\n\n"
    prompt += "4. ABSENCES ET IMPACT\n"
    prompt += "- Si inconnu : Aucune source fiable disponible\n\n"
    prompt += "5. ENJEUX\n"
    prompt += "- Motivation et objectifs\n\n"
    prompt += "6. RED FLAGS\n"
    prompt += "- Match sans enjeu, fatigue, rotation probable\n\n"
    prompt += "7. SYNTHESE ET PRONOSTIC\n"
    prompt += "- 3 a 5 facteurs decisifs\n"
    prompt += "- TOP 3 paris recommandes avec probabilite %\n"
    prompt += "- VALUE BET : oui ou non\n"
    prompt += "- GOLD (75%+) / SILVER (65-74%) / NO BET\n\n"
    prompt += "REGLES : Zero blabla. Zero supposition. Donnees uniquement.\n"
    prompt += "Rapport 600 a 1000 mots."
    return prompt


def oracle_analyse(home, away, sport, home_stats, away_stats, h2h_events):
    prompt = build_prompt(home, away, sport, home_stats, away_stats, h2h_events)
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
        "Football | NBA\n"
        "Stats et H2H en temps reel\n"
        "Patiente 30 secondes..."
    )

    best_match = None
    best_sport = ""

    for tournament in TOURNAMENTS:
        tid = tournament["id"]
        sid = tournament["season"]
        name = tournament["name"]

        matches = get_next_matches(tid, sid)
        if not matches:
            matches = get_today_matches(tid, sid)

        if matches:
            best_match = matches[0]
            best_sport = name
            break

        time.sleep(1)

    if not best_match:
        send_telegram(chat_id,
            "<b>ORACLE - Aucun match disponible</b>\n\n"
            "Aucun match a venir trouve.\n"
            "Reessaie dans quelques heures."
        )
        return

    home = best_match.get("homeTeam", {}).get("name", "Equipe 1")
    away = best_match.get("awayTeam", {}).get("name", "Equipe 2")
    home_id = best_match.get("homeTeam", {}).get("id", "")
    away_id = best_match.get("awayTeam", {}).get("id", "")

    tid = TOURNAMENTS[0]["id"]
    sid = TOURNAMENTS[0]["season"]
    for t in TOURNAMENTS:
        if t["name"] == best_sport:
            tid = t["id"]
            sid = t["season"]
            break

    home_stats = get_team_stats(home_id, tid, sid)
    away_stats = get_team_stats(away_id, tid, sid)
    h2h = get_h2h(home_id, away_id)

    analyse = oracle_analyse(home, away, best_sport, home_stats, away_stats, h2h)

    if "NO BET" in analyse.upper():
        send_telegram(chat_id, "<b>ORACLE - NO BET</b>\nFiabilite insuffisante. Reessaie ce soir.")
        return

    reliability = 65
    for num in range(99, 64, -1):
        if str(num) in analyse:
            reliability = num
            break

    classification = "GOLD" if reliability >= 75 else "SILVER"

    header = (
        "<b>ORACLE - ANALYSE DU JOUR</b>\n"
        "-------------------\n"
        "<b>" + home + " vs " + away + "</b>\n"
        + best_sport + "\n"
        "-------------------\n"
        "<b>ANALYSE ORACLE :</b>\n\n"
    )
    footer = (
        "\n-------------------\n"
        "Fiabilite: <b>" + str(reliability) + "%</b>\n"
        "Classification: <b>" + classification + "</b>"
    )

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
        "Football | NBA\n"
        "Stats et H2H en temps reel\n"
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
