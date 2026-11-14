"""Pure logic (no network): price midpoints, snapshot comparison, alerts,
and the Independent House model estimate. Mirrors core/analysis.py."""

from __future__ import annotations

from . import config

KEY_FIELDS = ("city", "segment", "locality")


def pct_change(new: float, old: float) -> float:
    if not old:
        return 0.0
    return (new - old) / old * 100.0


def midpoint(row: dict) -> float:
    lo, hi = float(row["price_low"]), float(row["price_high"])
    return (lo + hi) / 2.0


def per_sqft(row: dict) -> float:
    """Normalise to ₹/sq ft so plots in sq yd compare with everything else."""
    mid = midpoint(row)
    return mid / config.SQFT_PER_SQYD if row["unit"] == "sqyd" else mid


def row_key(row: dict) -> tuple:
    return tuple(row[k] for k in KEY_FIELDS)


def derive_independent_houses(rows: list[dict]) -> list[dict]:
    """For any city with plot rates but no Independent House feed, estimate
    house value per built-up sq ft = (land cost + construction) / built-up."""
    have_houses = {r["city"] for r in rows if r["segment"] == "Independent Houses"}
    out = []
    for r in rows:
        if r["segment"] != "Plots" or r["city"] in have_houses:
            continue
        factor = 1 / config.SQFT_PER_SQYD if r["unit"] == "sqyd" else 1

        def est(land_rate: float) -> int:
            land = land_rate * factor * config.HOUSE_SITE_SQFT
            build = config.HOUSE_BUILD_COST_PER_SQFT * config.HOUSE_BUILTUP_SQFT
            return round((land + build) / config.HOUSE_BUILTUP_SQFT, -1)

        out.append({
            **r,
            "segment": "Independent Houses",
            "unit": "sqft",
            "price_low": est(float(r["price_low"])),
            "price_high": est(float(r["price_high"])),
            "yoy_pct": "",
            "basis": "Model estimate (30x40 site, G+1, ₹2,500/sqft build)",
            "source": f"Derived from plot rate — {r['source']}",
        })
    return out


def compare_snapshots(current: list[dict], previous: list[dict], threshold_pct: float) -> list[dict]:
    """Return one result per locality present in both snapshots, flagging
    moves at or above the threshold (same shape as the stock analyze_*)."""
    prev = {row_key(r): r for r in previous}
    results = []
    for r in current:
        old = prev.get(row_key(r))
        if not old:
            continue
        new_mid, old_mid = midpoint(r), midpoint(old)
        change = pct_change(new_mid, old_mid)
        results.append({
            "city": r["city"],
            "segment": r["segment"],
            "locality": r["locality"],
            "unit": r["unit"],
            "old_price": old_mid,
            "last_price": new_mid,
            "change_pct": change,
            "triggered": abs(change) >= threshold_pct,
        })
    return results


def format_alert(result: dict) -> str:
    direction = "up" if result["change_pct"] > 0 else "down"
    unit = "sq yd" if result["unit"] == "sqyd" else "sq ft"
    return (
        f"[{result['city']} · {result['segment']}] {result['locality']} is {direction} "
        f"{abs(result['change_pct']):.1f}% (₹{result['old_price']:,.0f} → "
        f"₹{result['last_price']:,.0f} per {unit})"
    )
