import requests
import time
import os
from datetime import datetime, timezone

TELEGRAM_TOKEN   = os.environ.get("TELEGRAM_TOKEN")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")
GEMINI_API_KEY   = os.environ.get("GEMINI_API_KEY")
RAPIDAPI_KEY     = os.environ.get("RAPIDAPI_KEY")
ODDSPAPI_KEY     = os.environ.get("ODDSPAPI_KEY")

RAPIDAPI_HOST = "allsportsapi2.p.rapidapi.com"
ODDS_API_BASE = "https://api.the-odds-api.com/v4"

TOURNAMENTS = [
    {"id": "17",  "name": "Premier League",   "odds_key": "soccer_epl"},
    {"id": "34",  "name": "Ligue 1",          "odds_key": "soccer_france_ligue_one"},
    {"id": "8",   "name": "La Liga",          "odds_key": "soccer_spain_la_liga"},
    {"id": "23",  "name": "Serie A",          "odds_key": "soccer_italy_serie_a"},
    {"id": "35",  "name": "Bundesliga",       "odds_key": "soccer_germany_bundesliga"},
    {"id": "7",   "name": "Champions League", "odds_key": "soccer_uefa_champs_league"},
    {"id": "132", "name": "NBA",              "odds_key": "basketball_nba"},
]

_season_cache = {}


def rapidapi_headers():
    return {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": RAPIDAPI_KEY or "",
    }


# ─── Telegram ────────────────────────────────────────────────────────────────

def send_telegram(chat_id, message):
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    try:
        r = requests.post(url, json={
            "chat_id": chat_id,
            "text": message,
            "parse_mode": "HTML",
        }, timeout=10)
        if r.status_code != 200:
            print(f"[Telegram] {r.status_code}: {r.text[:200]}")
    except Exception as e:
        print(f"[Telegram] exception: {e}")


def get_updates(offset=None):
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/getUpdates"
    params = {"timeout": 30}
    if offset:
        params["offset"] = offset
    try:
        r = requests.get(url, params=params, timeout=35)
        if r.status_code == 200:
            return r.json().get("result", [])
        print(f"[getUpdates] {r.status_code}: {r.text[:100]}")
    except Exception as e:
        print(f"[getUpdates] exception: {e}")
    return []


# ─── AllSportsAPI ─────────────────────────────────────────────────────────────

def get_current_season_id(tournament_id):
    if tournament_id in _season_cache:
        return _season_cache[tournament_id]
    try:
        url = f"https://{RAPIDAPI_HOST}/api/tournament/{tournament_id}/seasons"
        r = requests.get(url, headers=rapidapi_headers(), timeout=10)
        if r.status_code == 200:
            data = r.json()
            seasons = data.get("seasons", [])
            if seasons:
                sid = str(seasons[0].get("id", ""))
                if sid:
                    _season_cache[tournament_id] = sid
                    print(f"[Season] tournament {tournament_id} → season {sid}")
                    return sid
            print(f"[Season] tournament {tournament_id} → empty seasons list. Raw: {str(data)[:200]}")
        else:
            print(f"[Season] tournament {tournament_id} → HTTP {r.status_code}: {r.text[:200]}")
    except Exception as e:
        print(f"[Season] exception for {tournament_id}: {e}")
    return None


def get_next_matches(tournament_id, season_id):
    try:
        url = f"https://{RAPIDAPI_HOST}/api/tournament/{tournament_id}/season/{season_id}/matches/next/0"
        r = requests.get(url, headers=rapidapi_headers(), timeout=10)
        if r.status_code == 200:
            events = r.json().get("events", [])
            print(f"[Matches] {tournament_id}/{season_id} next/0 → {len(events)} events")
            return events
        print(f"[Matches] {tournament_id}/{season_id} next/0 → HTTP {r.status_code}: {r.text[:150]}")
    except Exception as e:
        print(f"[Matches] exception: {e}")
    return []


def get_team_stats(team_id, tournament_id, season_id):
    try:
        url = f"https://{RAPIDAPI_HOST}/api/team/{team_id}/tournament/{tournament_id}/season/{season_id}/statistics"
        r = requests.get(url, headers=rapidapi_headers(), timeout=10)
        if r.status_code == 200:
            return r.json().get("statistics", {})
        print(f"[Stats] team {team_id} → HTTP {r.status_code}")
    except Exception as e:
        print(f"[Stats] exception: {e}")
    return {}


def get_h2h(team1_id, team2_id):
    try:
        url = f"https://{RAPIDAPI_HOST}/api/team/{team1_id}/team/{team2_id}/h2h/events"
        r = requests.get(url, headers=rapidapi_headers(), timeout=10)
        if r.status_code == 200:
            return r.json().get("events", [])[:5]
        print(f"[H2H] HTTP {r.status_code}")
    except Exception as e:
        print(f"[H2H] exception: {e}")
    return []


# ─── The Odds API ─────────────────────────────────────────────────────────────

def normalize(name):
    return name.lower().strip()


def match_team(target, candidates):
    t = normalize(target)
    for c in candidates:
        if normalize(c) == t:
            return c
    for c in candidates:
        if t in normalize(c) or normalize(c) in t:
            return c
    t_words = set(t.split())
    best, best_score = None, 0
    for c in candidates:
        score = len(t_words & set(normalize(c).split()))
        if score > best_score:
            best, best_score = c, score
    return best if best_score > 0 else None


def get_odds(home_team, away_team, odds_key):
    if not ODDSPAPI_KEY:
        return None
    try:
        url = f"{ODDS_API_BASE}/sports/{odds_key}/odds"
        params = {
            "apiKey": ODDSPAPI_KEY,
            "regions": "eu",
            "markets": "h2h,totals",
            "oddsFormat": "decimal",
            "dateFormat": "iso",
        }
        r = requests.get(url, params=params, timeout=12)
        if r.status_code == 422:
            print(f"[Odds] sport '{odds_key}' not active")
            return None
        if r.status_code != 200:
            print(f"[Odds] HTTP {r.status_code}: {r.text[:200]}")
            return None

        events = r.json()
        if not events:
            return None

        all_teams = list({e.get("home_team", "") for e in events} |
                         {e.get("away_team", "") for e in events})
        matched_home = match_team(home_team, all_teams)
        matched_away = match_team(away_team, all_teams)

        target_event = None
        for e in events:
            eh = normalize(e.get("home_team", ""))
            ea = normalize(e.get("away_team", ""))
            if (eh == normalize(matched_home or "") and
                    ea == normalize(matched_away or "")):
                target_event = e
                break
        if not target_event:
            for e in events:
                names = {normalize(e.get("home_team", "")), normalize(e.get("away_team", ""))}
                if normalize(home_team) in names or normalize(away_team) in names:
                    target_event = e
                    break
        if not target_event:
            return None

        result = {
            "bookmaker": None,
            "home_win": None, "draw": None, "away_win": None,
            "over25": None, "under25": None,
            "home_team": target_event.get("home_team"),
            "away_team": target_event.get("away_team"),
        }
        bookmakers = target_event.get("bookmakers", [])
        chosen = None
        for pref in ["bet365", "unibet", "pinnacle", "betfair", "williamhill"]:
            for bk in bookmakers:
                if pref in bk.get("key", "").lower():
                    chosen = bk
                    break
            if chosen:
                break
        if not chosen and bookmakers:
            chosen = bookmakers[0]

        if chosen:
            result["bookmaker"] = chosen.get("title") or chosen.get("key")
            for market in chosen.get("markets", []):
                if market["key"] == "h2h":
                    for outcome in market.get("outcomes", []):
                        n = normalize(outcome["name"])
                        price = round(float(outcome["price"]), 2)
                        if n == normalize(target_event.get("home_team", "")):
                            result["home_win"] = price
                        elif n == normalize(target_event.get("away_team", "")):
                            result["away_win"] = price
                        elif n == "draw":
                            result["draw"] = price
                elif market["key"] == "totals":
                    for outcome in market.get("outcomes", []):
                        pt = outcome.get("point", 0)
                        name = outcome.get("name", "").lower()
                        if abs(float(pt) - 2.5) < 0.01:
                            if name == "over":
                                result["over25"] = round(float(outcome["price"]), 2)
                            elif name == "under":
                                result["under25"] = round(float(outcome["price"]), 2)
        return result
    except Exception as e:
        print(f"[Odds] exception: {e}")
    return None


def format_odds_block(odds, sport):
    if not odds:
        return "Cotes indisponibles\n"
    is_nba = "nba" in sport.lower()
    bk = odds.get("bookmaker") or "Bookmaker"
    lines = f"Source : {bk}\n"
    if is_nba:
        lines += f"1 {odds.get('home_team','Domicile')} : {odds.get('home_win') or '—'}\n"
        lines += f"2 {odds.get('away_team','Exterieur')} : {odds.get('away_win') or '—'}\n"
    else:
        lines += f"1 ({odds.get('home_team','Domicile')}) : {odds.get('home_win') or '—'}\n"
        lines += f"X Nul : {odds.get('draw') or '—'}\n"
        lines += f"2 ({odds.get('away_team','Exterieur')}) : {odds.get('away_win') or '—'}\n"
    if odds.get("over25") or odds.get("under25"):
        lines += f"Over 2.5 : {odds.get('over25') or '—'}\n"
        lines += f"Under 2.5 : {odds.get('under25') or '—'}\n"
    return lines


# ─── Debug command ────────────────────────────────────────────────────────────

def run_debug(chat_id):
    """Test every API and report status directly to Telegram."""
    lines = ["<b>ORACLE DEBUG</b>\n"]

    # 1. Env vars
    lines.append("<b>1. Variables d'env :</b>")
    for var in ["TELEGRAM_TOKEN", "TELEGRAM_CHAT_ID", "GEMINI_API_KEY",
                "RAPIDAPI_KEY", "ODDSPAPI_KEY"]:
        val = os.environ.get(var)
        status = "OK" if val else "MANQUANT"
        lines.append(f"  {var}: {status}")

    # 2. RapidAPI seasons
    lines.append("\n<b>2. RapidAPI - Saisons :</b>")
    for t in TOURNAMENTS[:3]:  # test first 3 only to save quota
        tid = t["id"]
        try:
            url = f"https://{RAPIDAPI_HOST}/api/tournament/{tid}/seasons"
            r = requests.get(url, headers=rapidapi_headers(), timeout=8)
            if r.status_code == 200:
                seasons = r.json().get("seasons", [])
                sid = seasons[0].get("id") if seasons else "?"
                lines.append(f"  {t['name']}: HTTP 200 → saison {sid}")
            else:
                lines.append(f"  {t['name']}: HTTP {r.status_code}")
        except Exception as e:
            lines.append(f"  {t['name']}: ERREUR {e}")
        time.sleep(0.3)

    # 3. RapidAPI matches (Premier League)
    lines.append("\n<b>3. RapidAPI - Matchs a venir :</b>")
    try:
        sid = get_current_season_id("17")
        if sid:
            url = f"https://{RAPIDAPI_HOST}/api/tournament/17/season/{sid}/matches/next/0"
            r = requests.get(url, headers=rapidapi_headers(), timeout=8)
            if r.status_code == 200:
                events = r.json().get("events", [])
                if events:
                    e = events[0]
                    home = e.get("homeTeam", {}).get("name", "?")
                    away = e.get("awayTeam", {}).get("name", "?")
                    lines.append(f"  Premier League: {len(events)} matchs")
                    lines.append(f"  Prochain: {home} vs {away}")
                else:
                    lines.append("  Premier League: 0 match trouve")
            else:
                lines.append(f"  Premier League: HTTP {r.status_code}: {r.text[:80]}")
        else:
            lines.append("  Impossible de trouver la saison courante")
    except Exception as e:
        lines.append(f"  ERREUR: {e}")

    # 4. Gemini
    lines.append("\n<b>4. Gemini API :</b>")
    try:
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
        )
        r = requests.post(url, json={
            "contents": [{"parts": [{"text": "Dis juste OK"}]}]
        }, timeout=15)
        if r.status_code == 200:
            txt = r.json()["candidates"][0]["content"]["parts"][0]["text"]
            lines.append(f"  Gemini: OK → {txt[:40]}")
        else:
            lines.append(f"  Gemini: HTTP {r.status_code}: {r.text[:100]}")
    except Exception as e:
        lines.append(f"  Gemini: ERREUR {e}")

    # 5. Odds API
    lines.append("\n<b>5. Odds API :</b>")
    if not ODDSPAPI_KEY:
        lines.append("  ODDSPAPI_KEY manquant, skip")
    else:
        try:
            url = f"{ODDS_API_BASE}/sports/soccer_epl/odds"
            r = requests.get(url, params={
                "apiKey": ODDSPAPI_KEY, "regions": "eu",
                "markets": "h2h", "oddsFormat": "decimal",
            }, timeout=10)
            if r.status_code == 200:
                events = r.json()
                lines.append(f"  Odds EPL: OK → {len(events)} matchs disponibles")
            else:
                lines.append(f"  Odds EPL: HTTP {r.status_code}: {r.text[:100]}")
        except Exception as e:
            lines.append(f"  Odds EPL: ERREUR {e}")

    send_telegram(chat_id, "\n".join(lines))


# ─── Gemini analysis ──────────────────────────────────────────────────────────

def fmt_stats(stats):
    if not stats:
        return "  Aucune source fiable disponible\n"
    lines = ""
    for key, label in [
        ("goals", "Buts marques"),
        ("goalsAgainst", "Buts encaisses"),
        ("wins", "Victoires"),
        ("draws", "Nuls"),
        ("losses", "Defaites"),
    ]:
        v = stats.get(key)
        if v is not None:
            lines += f"  {label}: {v}\n"
    return lines or "  Aucune source fiable disponible\n"


def build_prompt(home, away, sport, home_stats, away_stats, h2h_events, odds):
    h2h_text = ""
    if h2h_events:
        for e in h2h_events:
            ht  = e.get("homeTeam", {}).get("name", "?")
            at  = e.get("awayTeam", {}).get("name", "?")
            hs  = e.get("homeScore", {}).get("current", "?")
            as_ = e.get("awayScore", {}).get("current", "?")
            h2h_text += f"  {ht} {hs} - {as_} {at}\n"
    else:
        h2h_text = "  Aucune tendance H2H exploitable\n"

    odds_text = ""
    if odds:
        bk = odds.get("bookmaker") or "Bookmaker"
        odds_text += f"  Source : {bk}\n"
        if odds.get("home_win"):
            odds_text += f"  1 ({home}) : {odds['home_win']}\n"
        if odds.get("draw"):
            odds_text += f"  X (Nul) : {odds['draw']}\n"
        if odds.get("away_win"):
            odds_text += f"  2 ({away}) : {odds['away_win']}\n"
        if odds.get("over25"):
            odds_text += f"  Over 2.5 buts : {odds['over25']}\n"
        if odds.get("under25"):
            odds_text += f"  Under 2.5 buts : {odds['under25']}\n"
    else:
        odds_text = "  Cotes indisponibles\n"

    return (
        "Tu es Team Oracle Bet, assistant d'analyse sportive ultra-structure.\n"
        "Fiabilite minimum : 65%.\n\n"
        f"MATCH : {home} vs {away}\n"
        f"SPORT : {sport}\n\n"
        f"STATISTIQUES {home} :\n{fmt_stats(home_stats)}\n"
        f"STATISTIQUES {away} :\n{fmt_stats(away_stats)}\n"
        f"H2H (5 derniers) :\n{h2h_text}\n"
        f"COTES EN TEMPS REEL :\n{odds_text}\n"
        "STRUCTURE OBLIGATOIRE :\n\n"
        "1. FORME RECENTE\n"
        "- Analyse des stats ci-dessus\n"
        "- Dynamique : progression / stagnation / chute\n\n"
        "2. H2H\n"
        "- Tendances significatives uniquement\n\n"
        "3. FORCES ET FAIBLESSES\n"
        "- Points forts / Points faibles de chaque equipe\n\n"
        "4. ABSENCES ET IMPACT\n"
        "- Si inconnu : Aucune source fiable disponible\n\n"
        "5. ENJEUX\n"
        "- Motivation et objectifs\n\n"
        "6. RED FLAGS\n"
        "- Match sans enjeu, fatigue, rotation probable\n\n"
        "7. SYNTHESE ET PRONOSTIC\n"
        "- 3 a 5 facteurs decisifs\n"
        "- TOP 3 paris recommandes avec probabilite %\n"
        "- VALUE BET : oui ou non (compare ta probabilite aux cotes fournies)\n"
        "- GOLD (75%+) / SILVER (65-74%) / NO BET\n\n"
        "REGLES : Zero blabla. Zero supposition. Donnees uniquement.\n"
        "Rapport 600 a 1000 mots."
    )


def oracle_analyse(home, away, sport, home_stats, away_stats, h2h_events, odds):
    prompt = build_prompt(home, away, sport, home_stats, away_stats, h2h_events, odds)
    try:
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
        )
        r = requests.post(url, json={
            "contents": [{"parts": [{"text": prompt}]}]
        }, timeout=40)
        if r.status_code == 200:
            return r.json()["candidates"][0]["content"]["parts"][0]["text"]
        print(f"[Gemini] HTTP {r.status_code}: {r.text[:300]}")
    except Exception as e:
        print(f"[Gemini] exception: {e}")
    return "Analyse indisponible."


# ─── Match finder ─────────────────────────────────────────────────────────────

def find_best_match():
    for tournament in TOURNAMENTS:
        tid  = tournament["id"]
        name = tournament["name"]
        print(f"[FindMatch] Checking {name} (id={tid})")

        sid = get_current_season_id(tid)
        if not sid:
            print(f"[FindMatch] No season for {name}, skipping.")
            continue

        matches = get_next_matches(tid, sid)
        if matches:
            t = dict(tournament)
            t["season"] = sid
            return matches[0], t

        time.sleep(0.5)

    return None, None


# ─── analyse_du_jour ──────────────────────────────────────────────────────────

def analyse_du_jour(chat_id):
    send_telegram(chat_id,
        "<b>ORACLE - Analyse en cours...</b>\n"
        "Football | NBA\n"
        "Stats, H2H et cotes en temps reel\n"
        "Patiente 30 secondes..."
    )

    match_event, tournament = find_best_match()

    if not match_event:
        send_telegram(chat_id,
            "<b>ORACLE - Aucun match disponible</b>\n\n"
            "Aucun match trouve dans les competitions surveillees.\n"
            "Reessaie dans quelques heures ou tape /debug pour diagnostiquer."
        )
        return

    home     = match_event.get("homeTeam", {}).get("name", "Equipe 1")
    away     = match_event.get("awayTeam", {}).get("name", "Equipe 2")
    home_id  = match_event.get("homeTeam", {}).get("id", "")
    away_id  = match_event.get("awayTeam", {}).get("id", "")
    sport    = tournament["name"]
    tid      = tournament["id"]
    sid      = tournament["season"]
    odds_key = tournament["odds_key"]

    print(f"[Match] {home} vs {away} ({sport}, tid={tid}, sid={sid})")

    home_stats = get_team_stats(home_id, tid, sid)
    away_stats = get_team_stats(away_id, tid, sid)
    h2h        = get_h2h(home_id, away_id)
    odds       = get_odds(home, away, odds_key)

    ts = match_event.get("startTimestamp")
    match_time = ""
    if ts:
        dt = datetime.fromtimestamp(ts, tz=timezone.utc)
        match_time = dt.strftime("%d/%m/%Y %H:%M UTC")

    analyse = oracle_analyse(home, away, sport, home_stats, away_stats, h2h, odds)

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
    odds_block = format_odds_block(odds, sport)
    time_line  = f"Heure : {match_time}\n" if match_time else ""

    header = (
        "<b>ORACLE - ANALYSE DU JOUR</b>\n"
        "-------------------\n"
        f"<b>{home} vs {away}</b>\n"
        f"{sport}\n"
        f"{time_line}"
        "-------------------\n"
        "<b>COTES EN TEMPS REEL :</b>\n"
        f"{odds_block}"
        "-------------------\n"
        "<b>ANALYSE ORACLE :</b>\n\n"
    )
    footer = (
        "\n-------------------\n"
        f"Fiabilite : <b>{reliability}%</b>\n"
        f"Classification : <b>{classification}</b>"
    )

    full_msg = header + analyse + footer
    if len(full_msg) > 4096:
        send_telegram(chat_id, header + analyse[:3000] + "\n<i>...suite ci-dessous</i>")
        send_telegram(chat_id, analyse[3000:] + footer)
    else:
        send_telegram(chat_id, full_msg)


# ─── Entry point ──────────────────────────────────────────────────────────────

def main():
    print("=== ORACLE Bot starting ===")
    for var in ["TELEGRAM_TOKEN", "TELEGRAM_CHAT_ID", "GEMINI_API_KEY",
                "RAPIDAPI_KEY", "ODDSPAPI_KEY"]:
        val = os.environ.get(var)
        print(f"  {var}: {'SET' if val else 'MISSING !!!'}")

    send_telegram(TELEGRAM_CHAT_ID,
        "<b>ORACLE Bot - ONLINE</b>\n"
        "-------------------\n"
        "Football | NBA\n"
        "Stats, H2H et cotes en temps reel\n"
        "Fiabilite minimum : 65%\n"
        "-------------------\n"
        "Commandes :\n"
        "  <b>analyse</b> - pari du jour\n"
        "  <b>/debug</b>  - tester les APIs"
    )

    offset = None
    while True:
        updates = get_updates(offset)
        for update in updates:
            offset = update["update_id"] + 1
            message = update.get("message", {})
            chat_id = message.get("chat", {}).get("id")
            text    = message.get("text", "").lower().strip()
            if not chat_id:
                continue
            if "/debug" in text or "debug" == text:
                run_debug(chat_id)
            elif any(w in text for w in ["analyse", "pari", "oracle", "/start", "start"]):
                analyse_du_jour(chat_id)
        time.sleep(2)


if __name__ == "__main__":
    main()
