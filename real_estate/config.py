"""Config for the real estate model: cities, segments, alert threshold,
and assumptions used when a segment has to be derived (model estimate)."""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
SEED_FILE = DATA_DIR / "localities.csv"
METRO_FILE = DATA_DIR / "metro.csv"  # metro access per locality (all segments)
SNAPSHOT_DIR = DATA_DIR / "snapshots"
ALERT_LOG_FILE = DATA_DIR / "alert_log.jsonl"

CITIES = ["Hyderabad", "Bangalore"]
SEGMENTS = ["Plots", "Apartments", "Villas", "Independent Houses"]

# Property prices move slowly and feeds are monthly/quarterly, so the stock
# model's 1% trigger would be noise. 3% between two snapshots is the default.
DEFAULT_THRESHOLD_PCT = 3.0

# Assumptions for deriving Independent House rates from plot rates when no
# direct feed exists: a 30x40 site (1,200 sq ft) with G+1 (2,400 sq ft
# built-up) at a mid-spec construction cost. Price is per built-up sq ft.
HOUSE_SITE_SQFT = 1200
HOUSE_BUILTUP_SQFT = 2400
HOUSE_BUILD_COST_PER_SQFT = 2500

SQFT_PER_SQYD = 9

# operational: a station in the locality; near: running line within ~3 km;
# upcoming: under construction; planned: approved or awaiting approval.
METRO_STATUSES = ("operational", "near", "upcoming", "planned", "none")


def get_threshold_pct() -> float:
    return float(os.getenv("RE_THRESHOLD_PCT", DEFAULT_THRESHOLD_PCT))
