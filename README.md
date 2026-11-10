# PisoScan — Philippine Public Funds Explorer

An independent, Etherscan-style explorer for Philippine public money: the national budget (GAA, NEP, budget cycle),
PhilGEPS construction awards, DPWH infrastructure contracts, contractors, procuring entities, places and COA audit opinions.

> **Not a government website** and not the official CADENA portal (Senate Bill No. 1506). Every page links its source.

## What's inside

| Page | What it shows |
|---|---|
| `/` | Search, headline stats, latest awards and DPWH projects, biggest departments, top contractors |
| `/awards`, `/award/[id]` | 844,626 PhilGEPS construction awards. Each record has a SHA-256 fingerprint, a "Source record" tab and an OCDS release |
| `/projects`, `/project/[id]` | 267,292 DPWH contracts with status, progress, location, contractor and an OC4IDS export |
| `/contractor/[id]` | Address-style profile: awards, DPWH contracts, government clients, where they work, yearly charts |
| `/agency/[id]` | Procuring entity / DPWH office: records, top contractors, share of the largest contractor |
| `/lgu`, `/lgu/[psgc]` | Regions → provinces → cities/municipalities, with awards, projects and COA opinions |
| `/budget`, `/budget/[dept]`, `/budget/program/[id]` | GAA FY2020–2026 by department and program |
| `/budget/cycle` | **Follow the money**: NEP → GAA → allotment → obligations → disbursements |
| `/budget/stages` | NEP vs House vs Senate vs GAA for flood control, BIP, school and health facilities, etc. |
| `/budget/nep-2027` | FY2027 proposal vs FY2026 GAA |
| `/audits` | COA CY2024 audit opinions for 1,683 LGUs (no ranking; COA says opinions are not scores) |
| `/api/ocds/award/[id]`, `/api/oc4ids/project/[id]` | Open Contracting exports, the formats used by OpenGovChain |

## Run it (Windows, macOS or Linux; Node 20+)

```bash
npm install
npm run import      # builds data/pisoscan.db (~760 MB, about 1 minute)
npm run dev         # http://localhost:3000 (or double-click start-pisoscan.bat → http://localhost:4100)
```

Production: `npm run build && npm start`.

### Data files (in `data/`)

| File | Source |
|---|---|
| `philgeps-construction.json.gz` | Open PhilGEPS data (BetterGov.ph, CC0) — same file as `Pilipiknow/prisma/data` |
| `dpwh-projects.json.gz` | DPWH contract list via BetterGov.ph — same file as `Pilipiknow/prisma/data` |
| `coa-audits.json.gz` | COA CY2024 executive summaries (from Pilipiknow) |
| `budget-api.json.gz` | Snapshot of the Philippine Budget Data API (CC BY 4.0). Refresh with `npm run fetch:budget` (~400 polite requests) |
| `budget.json` | BetterGov budget aggregates incl. NEP/House/Senate/GAA stage history |
| `geo-index.json`, `barangays.json` | PSGC places (philippines-json-maps) |

Re-run `npm run import` after replacing any data file. Set `DATA_DIR` or `DB_PATH` to use other locations.

## Fingerprints

Each award/project row is hashed as canonical JSON (`src/lib/canon.mjs`). The award record ID is the first 24 hex
characters of that SHA-256. Pages re-hash the stored fields on every view and show *Matches source fingerprint*.
This proves the copy is unchanged since import — it is not a blockchain entry and does not prove the source is accurate.

## Stack

Next.js 14 (App Router, server components) · TypeScript · Tailwind · better-sqlite3 (read-only, FTS5 search) ·
Roboto + Roboto Mono (self-hosted via @fontsource) · no client-side data fetching.

## Production (Linux server)

```bash
# one-time setup (as root)
useradd --system --home /var/www/cadena --shell /usr/sbin/nologin cadena
git clone https://github.com/neilswing12-creator/cadena.git /var/www/cadena && chown -R cadena:cadena /var/www/cadena
cd /var/www/cadena && sudo -u cadena -H npm ci && sudo -u cadena -H npm run import && sudo -u cadena -H npx next build
pm2 start deploy/ecosystem.config.cjs && pm2 save
cp deploy/cadena-proxy.conf /etc/nginx/snippets/ && cp deploy/nginx-cadena.conf /etc/nginx/sites-available/cadena.pilipiknow.online
ln -s /etc/nginx/sites-available/cadena.pilipiknow.online /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx
certbot --nginx -d cadena.pilipiknow.online --redirect

# every later update
bash /var/www/cadena/deploy/deploy.sh
```

The server creates its own demo signing key (`data/demo-signing-key.pem`) on first import; it is never committed.
