import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from real_estate import config, feeds
from real_estate.analysis import (
    compare_snapshots,
    derive_independent_houses,
    format_alert,
    pct_change,
    per_sqft,
)


def _row(locality, low, high, unit="sqft", segment="Apartments", city="Hyderabad"):
    return {"city": city, "segment": segment, "locality": locality, "unit": unit,
            "price_low": low, "price_high": high, "source": "test"}


def test_pct_change():
    assert pct_change(103, 100) == 3.0
    assert pct_change(5, 0) == 0.0


def test_sqyd_normalised_to_sqft():
    assert per_sqft(_row("X", 9000, 9000, unit="sqyd")) == 1000


def test_compare_flags_move_at_threshold():
    prev = [_row("Kokapet", 10000, 12000)]
    cur = [_row("Kokapet", 10500, 12500)]  # mid 11000 -> 11500 = +4.5%
    [r] = compare_snapshots(cur, prev, threshold_pct=3.0)
    assert r["triggered"] is True
    assert round(r["change_pct"], 1) == 4.5
    assert "up 4.5%" in format_alert(r)


def test_compare_ignores_small_moves_and_new_localities():
    prev = [_row("Kokapet", 10000, 12000)]
    cur = [_row("Kokapet", 10100, 12100), _row("Kollur", 6000, 7000)]
    results = compare_snapshots(cur, prev, threshold_pct=3.0)
    assert len(results) == 1 and results[0]["triggered"] is False


def test_derive_houses_only_where_missing():
    rows = [
        _row("HSR", 14000, 14000, segment="Plots", city="Bangalore"),
        _row("Kollur", 45000, 45000, unit="sqyd", segment="Plots"),
        _row("Bachupally", 5000, 8000, segment="Independent Houses"),
    ]
    derived = derive_independent_houses(rows)
    assert [d["city"] for d in derived] == ["Bangalore"]
    # (14000*1200 + 2500*2400) / 2400 = 9500
    assert derived[0]["price_low"] == 9500


def test_seed_file_covers_both_cities_and_all_segments():
    rows = feeds.load_current()
    for city in config.CITIES:
        segs = {r["segment"] for r in rows if r["city"] == city}
        assert segs == set(config.SEGMENTS), (city, segs)
    for r in rows:
        assert float(r["price_low"]) <= float(r["price_high"]), r["locality"]


def test_every_locality_has_valid_metro_info():
    metro = feeds.load_metro()
    for r in feeds.load_current():
        m = metro.get((r["city"], r["locality"]))
        assert m, f"no metro row for {r['city']} / {r['locality']}"
        assert m["status"] in config.METRO_STATUSES, m
        if m["status"] != "none":
            assert m["line"] and m["station"], m
