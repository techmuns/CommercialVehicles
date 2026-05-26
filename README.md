# Auto Industry Dashboard — PV & 2W

Buy-side research dashboard for the Indian auto industry, covering two sectors
in one app, switchable from the header brand-pill dropdown:

- **Passenger Vehicles (PV)** — Maruti Suzuki, Hyundai, Mahindra & Mahindra,
  Tata Motors (PV), and a PV industry aggregate.
- **Two-Wheeler (2W)** — TVS Motor, Bajaj Auto, Hero MotoCorp,
  Eicher / Royal Enfield, Ola Electric, and a 2W industry aggregate.

Each sector shares the same UI: header with sector + company selectors, KPI
strip, performance charts (growth vs industry + volume mix), product-level
drivers, supporting-data table + trend chart, governance/network row, data-
quality roll-up, source panel, and CSV export.

## Stack

- Vite + React 18
- Tailwind CSS 3
- Recharts

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The static output is written to `dist/`.

## Data architecture

Two sectors, two data sources, unified into one company-object shape that all
the React components consume (`src/data.js` exports `SECTORS`).

- **2W** data lives in `src/data/companies/*.json` + `src/data/industry/*.json`
  and is built by `src/data/buildFromActuals.js` / `buildIndustry.js`.
- **PV** data lives in `data/config/*.json` (the original PV data layer) and is
  mapped into the same shape by `src/data/sectors/pv/`. These files are imported
  at build time, so a data refresh + rebuild flows straight through.

### Refresh pipeline

`.github/workflows/refresh-data.yml` runs daily (and on demand). It runs the PV
fetchers (`scripts/fetch-stock`, `fetch-maruti-press`, `fetch-hyundai`,
`fetch-mm`, `fetch-tata`) which write `data/config/`, plus the 2W fetchers
(`scripts/fetch-screener` per ticker, `fetch-vahan`, `fetch-fada`) which write
`src/data/companies/` and `src/data/industry/`. Every step is
`continue-on-error`, and the run commits any changed data.

## Deploy (Cloudflare — Git integration)

Cloudflare rebuilds on every push to `main`. Configure the project once:

- Framework preset: **Vite**
- Build command: `npm run build`
- Build output directory: `dist`

`wrangler.toml` serves `./dist` as static assets with SPA fallback, so a Worker
deploy (`npm run deploy`) works too.

## Legacy

- `legacy-pv/` — the original vanilla-JS PV dashboard (pre-merge), kept for
  reference. Not built or served.
- `legacy-2w-workflows/` — the standalone 2W repo's GitHub workflows, kept inert
  (their fetch logic is folded into `refresh-data.yml`).
- `external/two-wheeler-dashboard/` — the raw annual-report PDFs the 2W
  `src/data/source-text/*.txt` extracts were sourced from.
