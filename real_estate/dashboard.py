"""Streamlit dashboard for the Real Estate model.

Run locally:  streamlit run real_estate/dashboard.py   (from the repo root)
City switch in the sidebar; one tab per segment, plus Alerts and Data feeds.
"""

import sys
from pathlib import Path

import pandas as pd
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from real_estate import config, feeds  # noqa: E402
from real_estate.analysis import midpoint, per_sqft  # noqa: E402
from real_estate.property_alert import read_alerts  # noqa: E402

st.set_page_config(page_title="Real Estate Dashboard", page_icon="🏠", layout="wide")
st.title("🏠 Real Estate Price Dashboard — Hyderabad & Bangalore")

city = st.sidebar.radio("City", config.CITIES)
threshold = st.sidebar.slider("Alert threshold (%)", 1.0, 15.0, config.get_threshold_pct(), 0.5)
zones_filter = st.sidebar.text_input("Filter locality / zone", "")
st.sidebar.caption("Prices are indicative asking ranges, not registered deal values.")


@st.cache_data(ttl=3600)
def load() -> pd.DataFrame:
    df = pd.DataFrame(feeds.load_current())
    for c in ("price_low", "price_high"):
        df[c] = pd.to_numeric(df[c])
    df["yoy_pct"] = pd.to_numeric(df["yoy_pct"], errors="coerce")
    df["mid"] = df.apply(lambda r: midpoint(r), axis=1)
    df["per_sqft"] = df.apply(lambda r: per_sqft(r), axis=1)
    return df


df = load()
city_df = df[df["city"] == city]
if zones_filter:
    q = zones_filter.lower()
    city_df = city_df[city_df["locality"].str.lower().str.contains(q) | city_df["zone"].str.lower().str.contains(q)]

tabs = st.tabs(config.SEGMENTS + ["🔔 Alerts", "📡 Data feeds"])

for tab, segment in zip(tabs, config.SEGMENTS):
    with tab:
        seg = city_df[city_df["segment"] == segment].sort_values("mid", ascending=False)
        if seg.empty:
            st.info(f"No {segment.lower()} data for {city} yet.")
            continue
        unit = "sq yd" if seg["unit"].iloc[0] == "sqyd" else "sq ft"
        c1, c2, c3 = st.columns(3)
        c1.metric("Localities tracked", len(seg))
        c2.metric(f"Median (₹/{unit})", f"{seg['mid'].median():,.0f}")
        yoy = seg["yoy_pct"].dropna()
        c3.metric("Avg YoY (where reported)", f"{yoy.mean():.1f}%" if len(yoy) else "—")
        st.bar_chart(seg.set_index("locality")["mid"], horizontal=True)
        st.dataframe(
            seg[["locality", "zone", "price_low", "price_high", "yoy_pct", "basis", "source", "as_of", "source_url"]],
            column_config={
                "price_low": st.column_config.NumberColumn(f"Low ₹/{unit}", format="%d"),
                "price_high": st.column_config.NumberColumn(f"High ₹/{unit}", format="%d"),
                "yoy_pct": st.column_config.NumberColumn("YoY %", format="%.1f"),
                "source_url": st.column_config.LinkColumn("Link"),
            },
            hide_index=True, use_container_width=True,
        )

with tabs[len(config.SEGMENTS)]:
    alerts = [a for a in read_alerts() if a.get("city") == city]
    snaps = feeds.list_snapshots()
    st.caption(f"{len(snaps)} snapshot(s) saved. Alerts compare each run against the previous snapshot.")
    if alerts:
        st.dataframe(pd.DataFrame(alerts)[["time", "segment", "locality", "change_pct", "message"]], hide_index=True)
    else:
        st.info("No alerts yet. Run `python -m real_estate.property_alert` after updating localities.csv.")

with tabs[len(config.SEGMENTS) + 1]:
    st.dataframe(pd.DataFrame(feeds.FEED_CATALOG), hide_index=True, use_container_width=True)
