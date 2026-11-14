"""Export the real estate model's data for the web app (web/).

The web app is deployed from web/ on its own, so it can't read
real_estate/data at runtime. Run this after updating localities.csv or
after the weekly alert job, and commit the JSON it writes:

    python -m real_estate.export_web_data
"""

import json
from pathlib import Path

from . import config, feeds
from .analysis import compare_snapshots

WEB_DATA_FILE = config.BASE_DIR.parent / "web" / "lib" / "real-estate" / "data.json"
NUMERIC = ("price_low", "price_high")


def _metro(row: dict, metro: dict) -> dict | None:
    m = metro.get((row["city"], row["locality"]))
    if not m or m["status"] == "none":
        return {"status": "none", "line": "", "station": "", "note": m["note"] if m else "", "source_url": ""} if m else None
    return {k: m[k] for k in ("status", "line", "station", "note", "source_url")}


def _clean(row: dict) -> dict:
    out = {k: row.get(k, "") for k in (
        "city", "segment", "locality", "zone", "unit", "price_low", "price_high",
        "yoy_pct", "basis", "source", "source_url", "as_of")}
    for k in NUMERIC:
        out[k] = int(float(out[k]))
    out["yoy_pct"] = float(out["yoy_pct"]) if str(out["yoy_pct"]).strip() else None
    return out


def build() -> dict:
    current = feeds.load_current()
    metro = feeds.load_metro()
    snaps = feeds.list_snapshots()
    changes: list[dict] = []
    compared = None
    if len(snaps) >= 2:
        prev = json.loads(snaps[-2].read_text(encoding="utf-8"))
        changes = compare_snapshots(current, prev, config.get_threshold_pct())
        compared = {"from": snaps[-2].stem, "to": snaps[-1].stem}
    return {
        "snapshot": snaps[-1].stem if snaps else None,
        "compared": compared,
        "threshold_pct": config.get_threshold_pct(),
        "cities": config.CITIES,
        "segments": config.SEGMENTS,
        "rows": [{**_clean(r), "metro": _metro(r, metro)} for r in current],
        "changes": [{**c, "old_price": round(c["old_price"]), "last_price": round(c["last_price"]),
                     "change_pct": round(c["change_pct"], 2)} for c in changes],
        "feeds": feeds.FEED_CATALOG,
    }


def main(path: Path = WEB_DATA_FILE) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(build(), indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    return path


if __name__ == "__main__":
    print(f"Wrote {main()}")
