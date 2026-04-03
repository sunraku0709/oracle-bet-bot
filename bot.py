import requests
import time
import os

TELEGRAM_TOKEN = os.environ.get("TELEGRAM_TOKEN")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID")
ODDSPAPI_KEY = os.environ.get("ODDSPAPI_KEY")

def send_telegram(chat_id, message):
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    requests.post(url, json={"chat_id": chat_id, "text": message, "parse_mode": "HTML"}, timeout=10)

def get_updates(offset=None):
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/getUpdates"
    params = {"timeout": 30}
    if offset:
        params["offset"] = offset
    try:
        r = requests.get(url, params=params, timeout=35)
        if r.status_code == 200:
            return r.json().get("result", [])
    except:
        pass
    return []

def test_api(chat_id):
    send_telegram(chat_id, "🔍 Test OddsPapi en cours...")
    
    # Test 1 — Liste des sports
    try:
        r = requests.get("https://api.oddspapi.io/v4/sports", 
            params={"apiKey": ODDSPAPI_KEY}, timeout=10)
        send_telegram(chat_id, f"Sports status: {r.status_code}\n{r.text[:500]}")
    except Exception as e:
        send_telegram(chat_id, f"Sports error: {e}")

    time.sleep(2)

    # Test 2 — Fixtures football
    try:
        r = requests.get("https://api.oddspapi.io/v4/fixtures",
            params={"apiKey": ODDSPAPI_KEY, "sportId": 10}, timeout=10)
        send_telegram(chat_id, f"Fixtures status: {r.status_code}\n{r.text[:500]}")
    except Exception as e:
        send_telegram(chat_id, f"Fixtures error: {e}")

if __name__ == "__main__":
    send_telegram(TELEGRAM_CHAT_ID, "🟢 Bot diagnostic ONLINE\nÉcris <b>test</b> pour diagnostiquer OddsPapi")
    offset = None
    while True:
        updates = get_updates(offset)
        for update in updates:
            offset = update["update_id"] + 1
            message = update.get("message", {})
            chat_id = message.get("chat", {}).get("id")
            text = message.get("text", "").lower().strip()
            if chat_id and "test" in text:
                test_api(chat_id)
        time.sleep(2)
