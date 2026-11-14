# Real Estate Price Trigger — Hyderabad & Bangalore

Built on the same pattern as the stock alert (brokerage) model:

| Stock model | Real estate model |
|---|---|
| `watchlist.json` (tickers) | `data/localities.csv` (city × segment × locality) |
| Yahoo Finance feed | Locality price sheet from the feeds below, refreshed monthly |
| 1% daily/weekly/monthly move | ≥3% move vs the previous snapshot (`RE_THRESHOLD_PCT`) |
| Telegram alert | Telegram bot + chat ID (repo secrets) |
| `dashboard.py` | `web/` Next.js dashboard, plus `real_estate/dashboard.py` (Streamlit) |
| `check_alerts.yml` (hourly) | `check_property_alerts.yml` (weekly, Mon 09:00 IST) |

## Run
```
python -m real_estate.property_alert        # compare vs last snapshot, alert, save snapshot
streamlit run real_estate/dashboard.py      # dashboard
python -m pytest tests/test_real_estate.py
```

## Web app
The dashboard (`web/components/RealEstatePanel.tsx`) reads `web/lib/real-estate/data.json`. Regenerate it with `python -m real_estate.export_web_data`
(the weekly workflow does this and commits it).

## Metro access
`data/metro.csv` tags each locality: **operational** (station in the locality), **near** (running line
within ~3 km), **upcoming** (under construction), **planned** (approved or awaiting approval) or **none**.
It applies across all segments for that locality. Update it as lines open.

## Monthly update routine
1. Refresh the price ranges in `data/localities.csv` from the portals and update `as_of`.
2. Run `property_alert` (or let the weekly workflow do it). Anything that moved ≥3% is sent to Telegram.

## Units
* Hyderabad plots: ₹ per **sq yd** (how they're traded locally). Everything else: ₹ per sq ft.
* Bangalore independent houses have no clean public feed, so they're a **model estimate** from plot rates:
  (land rate × 1,200 sq ft site + ₹2,500 × 2,400 sq ft G+1) ÷ 2,400. Tune it in `config.py`.

## Supporting data feeds
See `FEED_CATALOG` in `feeds.py`. In short:
* **Listing portals** (99acres, MagicBricks, Housing.com, Square Yards): locality asking prices, monthly. No public API.
* **Telangana IGRS** and **Karnataka Kaveri**: govt guidance values (the legal price floor).
* **Knight Frank monthly Hyderabad registrations**: demand momentum.
* **TG-RERA / K-RERA**: new launches and supply; also for checking a project before you buy.
* **HMDA / BDA auctions**: land price discovery.
* **RBI HPI / NHB RESIDEX** (quarterly): city benchmark.
* **Anarock / PropEquity / JLL / Cushman** (quarterly): inventory and launches.
* **RBI repo / home-loan rates**: affordability.

Prices are indicative asking ranges from public sources, not registered transaction values.
