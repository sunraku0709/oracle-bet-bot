import requests
import time
import os
from datetime import datetime, timezone, timedelta

TELEGRAM_TOKEN   = os.environ.get("TELEGRAM_TOKEN")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")
GEMINI_API_KEY   = os.environ.get("GEMINI_API_KEY")
ODDSPAPI_KEY     = os.environ.get("ODDSPAPI_KEY")

ODDS_API_BASE = "https://api.the-odds-api.com/v4"

# Sports à surveiller dans l'ordre de priorité
SPORTS = [
    {"key": "soccer_epl",                 "name": "Premier League"},
    {"key": "soccer_france_ligue_one",    "name": "Ligue 1"},
    {"key": "soccer_spain_la_liga",       "name": "La Liga"},
    {"key": "soccer_italy_serie_a",       "name": "Serie A"},
    {"key": "soccer_germany_bundesliga",  "name": "Bundesliga"},
    {"key": "soccer_uefa_champs_league",  "name": "Champions League"},
    {"key": "soccer_uefa_europa_league",  "name": "Europa League"},
    {"key": "basketball_nba",             "name": "NBA"},
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
            print(f"[Telegram] {r.status_code}: {r.text[:200]}")
    except Exception as e:
        print(f"[Telegram] {e}")


def get_updates(offset=None):
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/getUpdates"
    params = {"timeout": 30}
    if offset:
        params["offset"] = offset
    try:
        r = requests.get(url, params=params, timeout=35)
        if r.status_code == 200:
            return r.json().get("result", [])
        print(f"[getUpdates] {r.status_code}")
    except Exception as e:
        print(f"[getUpdates] {e}")
    return []


# ─── The Odds API – trouver les matchs ───────────────────────────────────────

def get_upcoming_events(sport_key):
    """Retourne les événements à venir dans les prochaines 48h."""
    if not ODDSPAPI_KEY:
        return []
    try:
        url = f"{ODDS_API_BASE}/sports/{sport_key}/events"
        r = requests.get(url, params={
            "apiKey": ODDSPAPI_KEY,
            "dateFormat": "iso",
        }, timeout=10)
        if r.status_code == 200:
            events = r.json()
            now = datetime.now(timezone.utc)
            horizon = now + timedelta(hours=48)
            upcoming = []
            for e in events:
                try:
                    ct = datetime.fromisoformat(
                        e["commence_time"].replace("Z", "+00:00")
                    )
                    if now <= ct <= horizon:
                        upcoming.append(e)
                except Exception:
                    pass
            return upcoming
        print(f"[Events] {sport_key} HTTP {r.status_code}: {r.text[:150]}")
    except Exception as e:
        print(f"[Events] {e}")
    return []


def get_odds_for_event(sport_key, event_id):
    """Récupère les cotes h2h + totals pour un événement précis."""
    if not ODDSPAPI_KEY:
        return None
    try:
        url = f"{ODDS_API_BASE}/sports/{sport_key}/events/{event_id}/odds"
        r = requests.get(url, params={
            "apiKey": ODDSPAPI_KEY,
            "regions": "eu",
            "markets": "h2h,totals",
            "oddsFormat": "decimal",
        }, timeout=10)
        if r.status_code != 200:
            print(f"[Odds] HTTP {r.status_code}: {r.text[:150]}")
            return None

        data = r.json()
        bookmakers = data.get("bookmakers", [])
        if not bookmakers:
            return None

        result = {
            "home_team": data.get("home_team"),
            "away_team": data.get("away_team"),
            "bookmaker": None,
            "home_win": None, "draw": None, "away_win": None,
            "over25": None,   "under25": None,
        }

        chosen = None
        for pref in ["bet365", "unibet", "pinnacle", "williamhill"]:
            for bk in bookmakers:
                if pref in bk.get("key", "").lower():
                    chosen = bk
                    break
            if chosen:
                break
        if not chosen:
            chosen = bookmakers[0]

        result["bookmaker"] = chosen.get("title") or chosen.get("key")
        for market in chosen.get("markets", []):
            if market["key"] == "h2h":
                for o in market.get("outcomes", []):
                    n = o["name"].lower()
                    p = round(float(o["price"]), 2)
                    if n == data.get("home_team", "").lower():
                        result["home_win"] = p
                    elif n == data.get("away_team", "").lower():
                        result["away_win"] = p
                    elif n == "draw":
                        result["draw"] = p
            elif market["key"] == "totals":
                for o in market.get("outcomes", []):
                    pt = float(o.get("point", 0))
                    name = o.get("name", "").lower()
                    if abs(pt - 2.5) < 0.01:
                        if name == "over":
                            result["over25"] = round(float(o["price"]), 2)
                        elif name == "under":
                            result["under25"] = round(float(o["price"]), 2)
        return result
    except Exception as e:
        print(f"[Odds] {e}")
    return None


def find_best_match():
    """
    Parcourt les sports dans l'ordre de priorité et retourne
    (event, sport_dict, odds) pour le premier match trouvé.
    """
    for sport in SPORTS:
        events = get_upcoming_events(sport["key"])
        if events:
            # Trier par heure de début, prendre le plus proche
            events.sort(key=lambda e: e.get("commence_time", ""))
            event = events[0]
            odds = get_odds_for_event(sport["key"], event["id"])
            print(f"[Match] {event['home_team']} vs {event['away_team']} ({sport['name']})")
            return event, sport, odds
        time.sleep(0.3)
    return None, None, None


def format_odds_section(odds, sport_name):
    if not odds:
        return "Cotes indisponibles\n"
    is_nba = "nba" in sport_name.lower()
    bk = odds.get("bookmaker") or "Bookmaker"
    out = f"Source : {bk}\n"
    if is_nba:
        out += f"1 {odds.get('home_team','Domicile')} : {odds.get('home_win') or '—'}\n"
        out += f"2 {odds.get('away_team','Exterieur')} : {odds.get('away_win') or '—'}\n"
    else:
        out += f"1 ({odds.get('home_team','Domicile')}) : {odds.get('home_win') or '—'}\n"
        out += f"X Nul : {odds.get('draw') or '—'}\n"
        out += f"2 ({odds.get('away_team','Exterieur')}) : {odds.get('away_win') or '—'}\n"
    if odds.get("over25") or odds.get("under25"):
        out += f"Over 2.5 : {odds.get('over25') or '—'}\n"
        out += f"Under 2.5 : {odds.get('under25') or '—'}\n"
    return out


# ─── Gemini avec Google Search grounding ─────────────────────────────────────

SYSTEM_PROMPT = """Tu es Team Oracle Bet, assistant d'analyse sportive ultra-structuré et pronostiqueur.
Fiabilité minimum exigée : 65%.
Tu collectes, filtres et structures toutes les informations pertinentes pour analyser un match.
Tu utilises uniquement des sources reconnues et fiables (presse sportive de référence, sites statistiques établis, organismes officiels, conférences de presse).
Si une donnée est absente ou non vérifiable : "Aucune source fiable disponible sur ce point."
Ton factuel, neutre et professionnel. Zéro supposition. Zéro narration émotionnelle.
Indique toujours le degré de certitude : ✅ confirmé / ⚠️ probable / ❓ à confirmer"""


def build_prompt(home, away, competition, match_datetime, odds):
    odds_text = ""
    if odds:
        bk = odds.get("bookmaker") or "Bookmaker"
        odds_text = f"Source : {bk}\n"
        if odds.get("home_win"):
            odds_text += f"1 ({home}) : {odds['home_win']}\n"
        if odds.get("draw"):
            odds_text += f"X Nul : {odds['draw']}\n"
        if odds.get("away_win"):
            odds_text += f"2 ({away}) : {odds['away_win']}\n"
        if odds.get("over25"):
            odds_text += f"Over 2.5 buts : {odds['over25']}\n"
        if odds.get("under25"):
            odds_text += f"Under 2.5 buts : {odds['under25']}\n"
    else:
        odds_text = "Cotes indisponibles"

    return f"""MATCH À ANALYSER : {home} vs {away}
COMPÉTITION : {competition}
DATE : {match_datetime}

COTES EN TEMPS RÉEL (Bet365 / Unibet) :
{odds_text}

Effectue une recherche web en temps réel pour collecter toutes les données ci-dessous, puis rédige le rapport complet selon la structure suivante :

---

1. FORME RÉCENTE (5 à 10 derniers matchs)
- Résultats + performances globales
- Tendances : progression / stagnation / chute
- Statistiques clés : xG, xGA, occasions créées, buts marqués/encaissés
- Lecture factuelle de la dynamique réelle

2. CONFRONTATIONS DIRECTES (H2H pertinent)
- Dynamiques réellement significatives uniquement
- Renversements de tendance
- Éléments récurrents d'un match à l'autre
Ne fais jamais de H2H basique.

3. STYLE DE JEU + FORCES & FAIBLESSES
Pour chaque équipe :
- Système tactique principal
- Tendances : pressing, bloc, transitions, ailes, jeu axial, jeu aérien
- Points forts / Points faibles
- Zones ou phases qui peuvent réellement peser sur le match

4. ABSENCES, EFFECTIFS & IMPACT RÉEL
- Joueurs blessés / suspendus / incertains
- Impact réel (titulaire clé ? poste non doublé ? remplaçant important ?)
- Compositions probables si disponibles et fiables
Fiabilité : ✅ confirmé / ⚠️ probable / ❓ à confirmer

5. CALENDRIER & CONTEXTE PHYSIQUE
- Charge des matchs récents et à venir
- Déplacements compliqués
- Match européen avant/après
- Risques de rotation / fatigue probable
(Données saison en cours uniquement)

6. ENJEUX DU MATCH
- Situation au classement
- Objectifs : titre, Europe, maintien, derby, match charnière
- Niveau de motivation / pression attendue

7. DÉCLARATIONS D'ENTRAÎNEURS
- Informations concrètes uniquement (composition, stratégie, blessures évoquées)
- Ignore toute déclaration vague
- Cite systématiquement la source

8. STATISTIQUES AVANCÉES CLÉS
- xG / xGA, tirs cadrés, occasions franches
- Possession utile, duels gagnés, clean sheets
Analyse uniquement ce qui peut faire basculer la rencontre

9. RED FLAGS À VÉRIFIER
- Match sans enjeu réel
- Rotation probable / gros match avant ou après
- Dynamique instable / conflits internes
- Contexte externe (fatigue, pression médiatique, climat)

10. SYNTHÈSE FINALE
- 4 à 6 éléments décisifs
- Facteurs à surveiller de près
Style factuel, sans narration ni interprétation émotionnelle

---

PRONOSTIC FINAL
- TOP 3 paris recommandés avec probabilité %
- VALUE BET : oui ou non (compare la probabilité estimée aux cotes fournies)
- Classification : GOLD (75%+) / SILVER (65–74%) / NO BET (< 65%)

⚠️ RÈGLES ABSOLUES :
❌ Zéro supposition ("ils voudront...", "on peut imaginer...")
❌ Zéro phrase narrative ou vague
➡️ Si info absente : "Aucune source fiable disponible sur ce point."

Rapport : 800 à 1200 mots. Priorité : pertinence > exhaustivité."""


def oracle_analyse(home, away, competition, match_datetime, odds):
    prompt = build_prompt(home, away, competition, match_datetime, odds)
    try:
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
        )
        # Google Search grounding pour données en temps réel
        payload = {
            "system_instruction": {
                "parts": [{"text": SYSTEM_PROMPT}]
            },
            "contents": [{"parts": [{"text": prompt}]}],
            "tools": [{"google_search": {}}],
        }
        r = requests.post(url, json=payload, timeout=60)
        if r.status_code == 200:
            candidates = r.json().get("candidates", [])
            if candidates:
                return candidates[0]["content"]["parts"][0]["text"]
        print(f"[Gemini] HTTP {r.status_code}: {r.text[:300]}")
    except Exception as e:
        print(f"[Gemini] {e}")
    return "Analyse indisponible."


# ─── Debug ────────────────────────────────────────────────────────────────────

def run_debug(chat_id):
    lines = ["<b>ORACLE DEBUG</b>\n"]

    # Env vars
    lines.append("<b>Variables d'env :</b>")
    for var in ["TELEGRAM_TOKEN", "TELEGRAM_CHAT_ID", "GEMINI_API_KEY", "ODDSPAPI_KEY"]:
        val = os.environ.get(var)
        lines.append(f"  {var}: {'OK' if val else 'MANQUANT'}")

    # Odds API – events
    lines.append("\n<b>Odds API – matchs a venir :</b>")
    if not ODDSPAPI_KEY:
        lines.append("  ODDSPAPI_KEY manquant")
    else:
        for sport in SPORTS[:4]:
            try:
                events = get_upcoming_events(sport["key"])
                if events:
                    e = events[0]
                    lines.append(f"  {sport['name']}: {len(events)} matchs")
                    lines.append(f"    Prochain : {e['home_team']} vs {e['away_team']}")
                else:
                    lines.append(f"  {sport['name']}: 0 match dans 48h")
            except Exception as ex:
                lines.append(f"  {sport['name']}: ERREUR {ex}")
            time.sleep(0.2)

    # Gemini
    lines.append("\n<b>Gemini API :</b>")
    try:
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
        )
        r = requests.post(url, json={
            "contents": [{"parts": [{"text": "Réponds uniquement: OK"}]}]
        }, timeout=15)
        if r.status_code == 200:
            txt = r.json()["candidates"][0]["content"]["parts"][0]["text"]
            lines.append(f"  OK → {txt.strip()[:40]}")
        else:
            lines.append(f"  HTTP {r.status_code}: {r.text[:100]}")
    except Exception as e:
        lines.append(f"  ERREUR: {e}")

    send_telegram(chat_id, "\n".join(lines))


# ─── Analyse du jour ─────────────────────────────────────────────────────────

def analyse_du_jour(chat_id):
    send_telegram(chat_id,
        "<b>ORACLE - Analyse en cours...</b>\n"
        "Recherche du meilleur match...\n"
        "Collecte des données en temps reel (Gemini Search)\n"
        "Patiente 45 secondes..."
    )

    event, sport, odds = find_best_match()

    if not event:
        # Fallback : demander directement à Gemini de trouver le match du jour
        send_telegram(chat_id,
            "<b>Aucun match via Odds API.</b>\n"
            "Analyse en cours via Gemini Search..."
        )
        analyse = oracle_analyse(
            "Meilleure equipe domicile du jour",
            "Meilleure equipe exterieure du jour",
            "Top 5 Europeen",
            datetime.now(timezone.utc).strftime("%d/%m/%Y"),
            None,
        )
        send_telegram(chat_id,
            "<b>ORACLE - ANALYSE DU JOUR</b>\n"
            "-------------------\n" + analyse
        )
        return

    home = event.get("home_team", "Equipe 1")
    away = event.get("away_team", "Equipe 2")
    competition = sport["name"]

    ts = event.get("commence_time", "")
    match_datetime = ""
    if ts:
        try:
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            match_datetime = dt.strftime("%d/%m/%Y %H:%M UTC")
        except Exception:
            match_datetime = ts

    analyse = oracle_analyse(home, away, competition, match_datetime, odds)

    # Détecter NO BET
    if "NO BET" in analyse.upper():
        send_telegram(chat_id,
            "<b>ORACLE - NO BET</b>\n"
            "Fiabilite insuffisante. Reessaie ce soir."
        )
        return

    # Extraire la fiabilité
    reliability = 65
    for num in range(99, 64, -1):
        if str(num) in analyse:
            reliability = num
            break
    classification = "GOLD" if reliability >= 75 else "SILVER"

    odds_section = format_odds_section(odds, competition)
    time_line = f"Heure : {match_datetime}\n" if match_datetime else ""

    header = (
        "<b>ORACLE - ANALYSE DU JOUR</b>\n"
        "-------------------\n"
        f"<b>{home} vs {away}</b>\n"
        f"{competition}\n"
        f"{time_line}"
        "-------------------\n"
        "<b>COTES EN TEMPS REEL :</b>\n"
        f"{odds_section}"
        "-------------------\n"
        "<b>ANALYSE ORACLE :</b>\n\n"
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


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    print("=== ORACLE Bot starting ===")
    for var in ["TELEGRAM_TOKEN", "TELEGRAM_CHAT_ID", "GEMINI_API_KEY", "ODDSPAPI_KEY"]:
        print(f"  {var}: {'SET' if os.environ.get(var) else 'MISSING'}")

    send_telegram(TELEGRAM_CHAT_ID,
        "<b>ORACLE Bot - ONLINE</b>\n"
        "-------------------\n"
        "Football | NBA\n"
        "Analyse ultra-structuree avec donnees en temps reel\n"
        "Fiabilite minimum : 65%\n"
        "-------------------\n"
        "Commandes :\n"
        "  <b>analyse</b> — analyse + prono du jour\n"
        "  <b>/debug</b>  — tester les APIs"
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
            if text in ["/debug", "debug"]:
                run_debug(chat_id)
            elif any(w in text for w in ["analyse", "pari", "oracle", "/start", "start"]):
                analyse_du_jour(chat_id)
        time.sleep(2)


if __name__ == "__main__":
    main()
