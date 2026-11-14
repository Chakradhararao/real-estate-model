# Real Estate Model — Hyderabad & Bangalore

Property-price tracker built on the same pattern as the brokerage (stock alert) model:
locality watchlist → data feeds → %-change alerts on Telegram → dashboard.

```
real_estate/   Python model: locality price sheet, metro access, snapshots, alerts, data export
tests/         pytest suite for the model
web/           Next.js dashboard (deploy on Vercel with Root Directory = web)
.github/       Weekly alert job (Mon 09:00 IST): alert, save snapshot, refresh web data
```

## Run locally
```
pip install -r requirements.txt
python -m real_estate.property_alert      # compare vs last snapshot, Telegram alert, save snapshot
python -m real_estate.export_web_data     # refresh web/lib/real-estate/data.json
python -m pytest tests -q

cd web && npm install && npm run dev      # http://localhost:3000
```

## Deploy the dashboard
1. vercel.com → New Project → import this repo.
2. Set **Root Directory** to `web`. No environment variables are needed.
3. Deploy. Every push to `main` (including the weekly data commit) redeploys it.

## Alerts
Add repo secrets `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` (Settings → Secrets → Actions).
Without them the job runs in dry-run mode and only logs what it would send.

See `real_estate/README.md` for data sources, units, metro tags and the monthly update routine.
