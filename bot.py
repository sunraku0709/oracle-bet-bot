import requests
import time
import os
from datetime import datetime, timezone, timedelta

TELEGRAM_TOKEN   = os.environ.get("TELEGRAM_TOKEN")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")
GEMINI_API_KEY   = os.environ.get("GEMINI_API_KEY")
ODDSPAPI_KEY     = os.environ.get("ODDSPAPI_KEY")

ODDS_API_BASE = "https://api.the-odds-api.com/v4"
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.0-flash:generateContent?key=" + (GEMINI_API_KEY or "")
)

SPORTS = [
    {"key": "soccer_epl",                "name": "Premier League"},
    {"key": "soccer_france_ligue_one",   "name": "Ligue 1"},
    {"key": "soccer_spain_la_liga",      "name": "La Liga"},
    {"key": "soccer_italy_serie_a",      "name": "Serie A"},
    {"key": "soccer_germany_bundesliga", "name": "Bundesliga"},
    {"key": "soccer_uefa_champs_league", "name": "Champions League"},
    {"key": "soccer_uefa_europa_league", "name": "Europa League"},
    {"key": "basketball_nba",            "name": "NBA"},
]


# ─── Telegram ────────────────────────────────────────────────────────────────

def send_telegram(chat_id, text):
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    try:
        r = requests.post(url, json={
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML",
        }, timeout=10)
        if r.status_code != 200:
            print(f"[TG] {r.status_code}: {r.text[:150]}")
    except Exception as e:
        print(f"[TG] {e}")


def get_updates(offset=None):
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/getUpdates"
    try:
        r = requests.get(url, params={"timeout": 30, **({"offset": offset} if offset else {})}, timeout=35)
        if r.status_code == 200:
            return r.json().get("result", [])
    except Exception as e:
        print(f"[Updates] {e}")
    return []


# ─── Odds API ────────────────────────────────────────────────────────────────

def find_match_via_odds():
    """Retourne (home, away, competition, match_time, odds_text) ou None."""
    if not ODDSPAPI_KEY:
        return None
    now = datetime.now(timezone.utc)
    for sport in SPORTS:
        try:
            r = requests.get(f"{ODDS_API_BASE}/sports/{sport['key']}/odds", params={
                "apiKey": ODDSPAPI_KEY,
                "regions": "eu",
                "markets": "h2h,totals",
                "oddsFormat": "decimal",
                "dateFormat": "iso",
            }, timeout=10)
            if r.status_code != 200:
                continue
            events = r.json()
            # Filtrer matchs dans les 48h
            for e in sorted(events, key=lambda x: x.get("commence_time", "")):
                try:
                    ct = datetime.fromisoformat(e["commence_time"].replace("Z", "+00:00"))
                except Exception:
                    continue
                if not (now <= ct <= now + timedelta(hours=48)):
                    continue

                home = e.get("home_team", "?")
                away = e.get("away_team", "?")
                match_time = ct.strftime("%d/%m/%Y %H:%M UTC")

                # Extraire les meilleures cotes
                bookmakers = e.get("bookmakers", [])
                chosen = None
                for pref in ["bet365", "unibet", "pinnacle", "williamhill"]:
                    for bk in bookmakers:
                        if pref in bk.get("key", "").lower():
                            chosen = bk
                            break
                    if chosen:
                        break
                if not chosen and bookmakers:
                    chosen = bookmakers[0]

                h, d, a, o25, u25 = None, None, None, None, None
                bk_name = ""
                if chosen:
                    bk_name = chosen.get("title") or chosen.get("key", "")
                    for market in chosen.get("markets", []):
                        if market["key"] == "h2h":
                            for o in market.get("outcomes", []):
                                n = o["name"].lower()
                                p = round(float(o["price"]), 2)
                                if n == home.lower():
                                    h = p
                                elif n == away.lower():
                                    a = p
                                elif n == "draw":
                                    d = p
                        elif market["key"] == "totals":
                            for o in market.get("outcomes", []):
                                if abs(float(o.get("point", 0)) - 2.5) < 0.01:
                                    if o.get("name", "").lower() == "over":
                                        o25 = round(float(o["price"]), 2)
                                    elif o.get("name", "").lower() == "under":
                                        u25 = round(float(o["price"]), 2)

                is_nba = "nba" in sport["key"]
                odds_lines = [f"Bookmaker : {bk_name}"]
                if is_nba:
                    odds_lines.append(f"1 {home} : {h or '—'}")
                    odds_lines.append(f"2 {away} : {a or '—'}")
                else:
                    odds_lines.append(f"1 ({home}) : {h or '—'}")
                    odds_lines.append(f"X Nul : {d or '—'}")
                    odds_lines.append(f"2 ({away}) : {a or '—'}")
                if o25:
                    odds_lines.append(f"Over 2.5 : {o25}")
                if u25:
                    odds_lines.append(f"Under 2.5 : {u25}")

                print(f"[Match] {home} vs {away} ({sport['name']})")
                return home, away, sport["name"], match_time, "\n".join(odds_lines)
        except Exception as ex:
            print(f"[OddsAPI] {sport['key']}: {ex}")
        time.sleep(0.2)
    return None


# ─── Gemini ──────────────────────────────────────────────────────────────────

def call_gemini(prompt, use_search=True):
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
    }
    if use_search:
        payload["tools"] = [{"google_search": {}}]
    try:
        r = requests.post(GEMINI_URL, json=payload, timeout=90)
        if r.status_code == 200:
            candidates = r.json().get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                return "".join(p.get("text", "") for p in parts)
        print(f"[Gemini] {r.status_code}: {r.text[:300]}")
    except Exception as e:
        print(f"[Gemini] {e}")
    return None


def analyse_match(home, away, competition, match_time, odds_text):
    today = datetime.now(timezone.utc).strftime("%d/%m/%Y")
    prompt = f"""Tu es Team Oracle Bet, pronostiqueur sportif expert. Fiabilité minimum : 65%.
Utilise Google Search pour collecter toutes les données en temps réel sur ce match.
Données vérifiables uniquement. Source citée pour chaque info clé.
Si info absente : "Aucune source fiable disponible sur ce point."
Degré de certitude : ✅ confirmé / ⚠️ probable / ❓ à confirmer

MATCH : {home} vs {away}
COMPETITION : {competition}
DATE : {match_time or today}

COTES EN TEMPS REEL :
{odds_text}

---
Rédige le rapport complet (800 à 1200 mots) selon cette structure OBLIGATOIRE :

1. FORME RÉCENTE (5 à 10 derniers matchs)
- Résultats + performances globales des deux équipes
- Tendances : progression / stagnation / chute
- Statistiques clés : xG, xGA, buts marqués/encaissés, occasions créées

2. CONFRONTATIONS DIRECTES (H2H)
- Dynamiques significatives uniquement (pas de liste basique)
- Renversements de tendance, éléments récurrents

3. STYLE DE JEU + FORCES & FAIBLESSES
Pour chaque équipe :
- Système tactique, pressing, transitions, points forts, points faibles

4. ABSENCES, EFFECTIFS & IMPACT RÉEL
- Blessés / suspendus / incertains avec impact concret (titulaire clé ? poste non doublé ?)
- Compositions probables si disponibles
- ✅ confirmé / ⚠️ probable / ❓ à confirmer

5. CALENDRIER & CONTEXTE PHYSIQUE
- Charge récente, match européen avant/après, risques de rotation, fatigue

6. ENJEUX DU MATCH
- Classement actuel, objectifs (titre / Europe / maintien / derby)

7. DÉCLARATIONS D'ENTRAÎNEURS
- Infos concrètes uniquement (composition, stratégie, blessures évoquées)
- Source citée obligatoirement

8. STATISTIQUES AVANCÉES CLÉS
- xG / xGA, tirs cadrés, possession utile, duels, clean sheets

9. RED FLAGS
- Match sans enjeu, rotation probable, fatigue, tension interne, contexte externe

10. SYNTHÈSE FINALE
- 4 à 6 éléments décisifs, facteurs à surveiller
- Ton factuel, zéro narration émotionnelle

---
PRONOSTIC FINAL :
- TOP 3 paris recommandés avec probabilité %
- VALUE BET : oui ou non (compare la probabilité aux cotes fournies ci-dessus)
- Classification : GOLD (75%+) / SILVER (65–74%) / NO BET (< 65%)

RÈGLES ABSOLUES :
❌ Zéro supposition ("ils voudront...", "on peut imaginer...")
❌ Zéro phrase narrative ou vague
❌ Aucun pronostic en dessous de 65% de fiabilité"""

    return call_gemini(prompt, use_search=True)


def find_match_via_gemini():
    """Fallback : Gemini cherche lui-même le meilleur match du jour."""
    today = datetime.now(timezone.utc).strftime("%d/%m/%Y")
    prompt = f"""Aujourd'hui c'est le {today}.
Utilise Google Search pour trouver LE meilleur match de football à analyser aujourd'hui
parmi : Premier League, Ligue 1, La Liga, Serie A, Bundesliga, Champions League, Europa League.
Si aucun match football, prend le meilleur match NBA du jour.

Réponds UNIQUEMENT avec ce format exact (rien d'autre) :
HOME: [nom équipe domicile]
AWAY: [nom équipe extérieure]
COMPETITION: [nom de la compétition]
TIME: [heure et date du match]
ODDS_BET365: 1=[cote domicile] X=[cote nul] 2=[cote extérieur] Over2.5=[cote] Under2.5=[cote]"""

    result = call_gemini(prompt, use_search=True)
    if not result:
        return None
    print(f"[GeminiMatch] {result[:200]}")

    home, away, competition, match_time = None, None, None, None
    odds_text = "Cotes indisponibles"
    for line in result.strip().splitlines():
        line = line.strip()
        if line.startswith("HOME:"):
            home = line.split(":", 1)[1].strip()
        elif line.startswith("AWAY:"):
            away = line.split(":", 1)[1].strip()
        elif line.startswith("COMPETITION:"):
            competition = line.split(":", 1)[1].strip()
        elif line.startswith("TIME:"):
            match_time = line.split(":", 1)[1].strip()
        elif line.startswith("ODDS_BET365:"):
            odds_text = "Source : Bet365 (via Gemini Search)\n" + line.split(":", 1)[1].strip()

    if home and away:
        return home, away, competition or "Football", match_time or today, odds_text
    return None


# ─── Commande /debug ──────────────────────────────────────────────────────────

def run_debug(chat_id):
    lines = ["<b>ORACLE DEBUG</b>\n"]

    lines.append("<b>Variables :</b>")
    for var in ["TELEGRAM_TOKEN", "TELEGRAM_CHAT_ID", "GEMINI_API_KEY", "ODDSPAPI_KEY"]:
        lines.append(f"  {var}: {'OK' if os.environ.get(var) else 'MANQUANT'}")

    lines.append("\n<b>Gemini (sans search) :</b>")
    result = call_gemini("Réponds uniquement: OK", use_search=False)
    lines.append(f"  {'OK' if result else 'ECHEC'}")

    lines.append("\n<b>Gemini (avec Google Search) :</b>")
    result = call_gemini(
        f"Quel est le score du dernier match du PSG ? (date du jour: {datetime.now(timezone.utc).strftime('%d/%m/%Y')})",
        use_search=True
    )
    lines.append(f"  {'OK → ' + result[:80] if result else 'ECHEC'}")

    if ODDSPAPI_KEY:
        lines.append("\n<b>Odds API :</b>")
        try:
            r = requests.get(f"{ODDS_API_BASE}/sports/soccer_epl/odds", params={
                "apiKey": ODDSPAPI_KEY, "regions": "eu", "markets": "h2h",
            }, timeout=8)
            if r.status_code == 200:
                events = r.json()
                lines.append(f"  Premier League: {len(events)} matchs disponibles")
                if events:
                    e = events[0]
                    lines.append(f"  Ex: {e.get('home_team')} vs {e.get('away_team')}")
            else:
                lines.append(f"  HTTP {r.status_code}: {r.text[:100]}")
        except Exception as ex:
            lines.append(f"  ERREUR: {ex}")
    else:
        lines.append("\n<b>Odds API :</b> ODDSPAPI_KEY manquant")

    send_telegram(chat_id, "\n".join(lines))


# ─── Analyse du jour ──────────────────────────────────────────────────────────

def analyse_du_jour(chat_id):
    send_telegram(chat_id,
        "<b>ORACLE - Analyse en cours...</b>\n"
        "Recherche du match + données temps réel\n"
        "Patiente 45 secondes..."
    )

    # 1. Trouver le match
    match_data = find_match_via_odds()
    if not match_data:
        send_telegram(chat_id, "Odds API indisponible. Recherche via Gemini Search...")
        match_data = find_match_via_gemini()

    if not match_data:
        send_telegram(chat_id,
            "<b>ORACLE - Impossible de trouver un match.</b>\n"
            "Vérifie tes clés API avec /debug"
        )
        return

    home, away, competition, match_time, odds_text = match_data

    # 2. Analyser
    analyse = analyse_match(home, away, competition, match_time, odds_text)
    if not analyse:
        send_telegram(chat_id, "<b>ORACLE - Gemini indisponible.</b>\nVérifie GEMINI_API_KEY avec /debug")
        return

    if "NO BET" in analyse.upper():
        send_telegram(chat_id, "<b>ORACLE - NO BET</b>\nFiabilite insuffisante.")
        return

    # 3. Extraire la fiabilité
    reliability = 65
    for num in range(99, 64, -1):
        if str(num) in analyse:
            reliability = num
            break
    classification = "GOLD" if reliability >= 75 else "SILVER"

    header = (
        "<b>ORACLE - ANALYSE DU JOUR</b>\n"
        "-------------------\n"
        f"<b>{home} vs {away}</b>\n"
        f"{competition}\n"
        f"Heure : {match_time}\n"
        "-------------------\n"
        "<b>COTES :</b>\n"
        f"{odds_text}\n"
        "-------------------\n"
        "<b>ANALYSE :</b>\n\n"
    )
    footer = (
        "\n-------------------\n"
        f"Fiabilite : <b>{reliability}%</b>\n"
        f"Classification : <b>{classification}</b>"
    )

    full = header + analyse + footer
    if len(full) > 4096:
        send_telegram(chat_id, header + analyse[:3000] + "\n<i>...suite ci-dessous</i>")
        send_telegram(chat_id, analyse[3000:] + footer)
    else:
        send_telegram(chat_id, full)


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    print("=== ORACLE Bot ===")
    for var in ["TELEGRAM_TOKEN", "TELEGRAM_CHAT_ID", "GEMINI_API_KEY", "ODDSPAPI_KEY"]:
        print(f"  {var}: {'OK' if os.environ.get(var) else 'MISSING'}")

    # Reconstruire l'URL Gemini avec la clé chargée
    global GEMINI_URL
    GEMINI_URL = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.0-flash:generateContent?key={GEMINI_API_KEY or ''}"
    )

    send_telegram(TELEGRAM_CHAT_ID,
        "<b>ORACLE Bot - ONLINE</b>\n"
        "-------------------\n"
        "Commandes :\n"
        "  <b>analyse</b> — pari du jour\n"
        "  <b>/debug</b>  — tester les APIs"
    )

    offset = None
    while True:
        updates = get_updates(offset)
        for update in updates:
            offset = update["update_id"] + 1
            msg = update.get("message", {})
            chat_id = msg.get("chat", {}).get("id")
            text = msg.get("text", "").lower().strip()
            if not chat_id:
                continue
            if text in ["/debug", "debug"]:
                run_debug(chat_id)
            elif any(w in text for w in ["analyse", "pari", "oracle", "/start", "start"]):
                analyse_du_jour(chat_id)
        time.sleep(2)


if __name__ == "__main__":
    main()
