"""Data feeds for the real estate model.

There is no free real-time API for Indian property prices (unlike Yahoo
Finance for stocks), so the model combines:
  * a locality price sheet (data/localities.csv) refreshed monthly from the
    sources in FEED_CATALOG, and
  * snapshots of that sheet over time, which is what the alert compares.

To plug in a real feed later (e.g. a paid PropEquity / Square Yards data
API, or an IGRS / Kaveri guidance-value scraper), add a loader returning
rows with the same columns as localities.csv and add it to LOADERS.
"""

from __future__ import annotations

import csv
import json
from datetime import date
from pathlib import Path

from . import config
from .analysis import derive_independent_houses

# Supporting data feeds, ordered from most to least "live".
FEED_CATALOG = [
    {
        "name": "Listing portals — 99acres, MagicBricks, Housing.com, Square Yards price trends",
        "covers": "Locality ₹/sq ft asking prices for all 4 segments, both cities",
        "cadence": "Monthly (pages refresh ~monthly)",
        "access": "Public pages, no official API; scraping restricted by ToS — snapshot manually or via a paid data partner",
        "use_for": "Primary locality price sheet",
    },
    {
        "name": "Telangana IGRS — registration.telangana.gov.in",
        "covers": "Govt guidance (market) value per sq yd for every Hyderabad village/locality",
        "cadence": "On revision (last major hike 5 Jun 2026)",
        "access": "Free public portal",
        "use_for": "Price floor for Hyderabad plots; stamp duty base",
    },
    {
        "name": "Karnataka Kaveri Online — kaverionline.karnataka.gov.in",
        "covers": "Guidance values for Bengaluru localities; encumbrance and registration records",
        "cadence": "On revision",
        "access": "Free public portal",
        "use_for": "Price floor for Bangalore plots/houses",
    },
    {
        "name": "Knight Frank monthly Hyderabad registrations",
        "covers": "Monthly registered home sales (units + value) by ticket size, Hyderabad",
        "cadence": "Monthly",
        "access": "Free press release",
        "use_for": "Demand signal — volume momentum",
    },
    {
        "name": "TG-RERA (rera.telangana.gov.in) / K-RERA (rera.karnataka.gov.in)",
        "covers": "New project registrations, launch pipeline, declared carpet areas",
        "cadence": "Daily (as projects register)",
        "access": "Free public portals",
        "use_for": "Supply signal + vetting projects before buying",
    },
    {
        "name": "HMDA / BDA land auctions",
        "covers": "Price discovery on large land parcels (e.g. Kokapet ₹115–151 cr/acre)",
        "cadence": "Event-driven",
        "access": "Public notices / news",
        "use_for": "Leading indicator for plot prices nearby",
    },
    {
        "name": "RBI House Price Index (DBIE) + NHB RESIDEX",
        "covers": "City-level house price index incl. Hyderabad and Bengaluru",
        "cadence": "Quarterly",
        "access": "Free download (RBI DBIE / NHB website)",
        "use_for": "Benchmark: is a locality beating its city?",
    },
    {
        "name": "Anarock / PropEquity / JLL / Cushman & Wakefield quarterly reports",
        "covers": "Launches, sales, unsold inventory, avg price by micro-market",
        "cadence": "Quarterly",
        "access": "Free PDFs (PropEquity data API is paid)",
        "use_for": "Supply–demand and inventory overhang",
    },
    {
        "name": "RBI repo rate + bank home-loan rates",
        "covers": "Cost of borrowing",
        "cadence": "Bi-monthly policy",
        "access": "Free",
        "use_for": "Affordability / EMI driver",
    },
]


def _read_csv(path: Path) -> list[dict]:
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def load_seed() -> list[dict]:
    return _read_csv(config.SEED_FILE)


def load_metro() -> dict[tuple[str, str], dict]:
    """Metro access by (city, locality); applies to every segment there."""
    if not config.METRO_FILE.exists():
        return {}
    return {(r["city"], r["locality"]): r for r in _read_csv(config.METRO_FILE)}


LOADERS = [load_seed]


def load_current() -> list[dict]:
    rows: list[dict] = []
    for loader in LOADERS:
        rows.extend(loader())
    return rows + derive_independent_houses(rows)


# ── Snapshot store (history the alert compares against) ──────────────────
def save_snapshot(rows: list[dict], on: date | None = None) -> Path:
    config.SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    path = config.SNAPSHOT_DIR / f"{(on or date.today()).isoformat()}.json"
    path.write_text(json.dumps(rows, indent=1, ensure_ascii=False), encoding="utf-8")
    return path


def list_snapshots() -> list[Path]:
    if not config.SNAPSHOT_DIR.exists():
        return []
    return sorted(config.SNAPSHOT_DIR.glob("*.json"))


def load_previous_snapshot(before: date | None = None) -> list[dict]:
    cutoff = (before or date.today()).isoformat()
    older = [p for p in list_snapshots() if p.stem < cutoff]
    if not older:
        return []
    return json.loads(older[-1].read_text(encoding="utf-8"))
