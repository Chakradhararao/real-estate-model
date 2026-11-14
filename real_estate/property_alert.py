"""Cron entry point: load the current locality sheet, compare it with the
last saved snapshot, send a Telegram alert for every locality that moved
by the threshold or more, then save today's snapshot.

Run:  python -m real_estate.property_alert
Reads TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID; without them it runs in
dry-run mode and only logs the messages.
"""

import json
import logging
import os
from datetime import datetime, timezone

from . import config, feeds
from .analysis import compare_snapshots, format_alert

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("property_alert")


def send_telegram_alert(message: str) -> None:
    token, chat_id = os.getenv("TELEGRAM_BOT_TOKEN", ""), os.getenv("TELEGRAM_CHAT_ID", "")
    if not (token and chat_id):
        logger.info("[DRY RUN - no Telegram credentials set] Would send: %s", message)
        return
    import requests
    try:
        resp = requests.post(f"https://api.telegram.org/bot{token}/sendMessage",
                             data={"chat_id": chat_id, "text": message}, timeout=10)
        if resp.status_code != 200:
            logger.error("Telegram send failed: %s", resp.text)
    except requests.RequestException as e:
        logger.error("Telegram send raised an exception: %s", e)


def log_alert(entry: dict) -> None:
    entry = {"time": datetime.now(timezone.utc).isoformat(), **entry}
    with config.ALERT_LOG_FILE.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def read_alerts() -> list[dict]:
    if not config.ALERT_LOG_FILE.exists():
        return []
    lines = config.ALERT_LOG_FILE.read_text(encoding="utf-8").splitlines()
    return [json.loads(line) for line in lines if line.strip()]


def main() -> None:
    current = feeds.load_current()
    previous = feeds.load_previous_snapshot()
    threshold = config.get_threshold_pct()

    if not previous:
        logger.info("No earlier snapshot — saving a baseline; alerts start next run.")
    else:
        results = compare_snapshots(current, previous, threshold)
        hits = [r for r in results if r["triggered"]]
        logger.info("%d localities compared, %d moved ≥ %.1f%%", len(results), len(hits), threshold)
        for r in hits:
            msg = format_alert(r)
            logger.info(msg)
            send_telegram_alert(msg)
            log_alert({**r, "message": msg})

    path = feeds.save_snapshot(current)
    logger.info("Snapshot saved: %s", path.name)


if __name__ == "__main__":
    main()
