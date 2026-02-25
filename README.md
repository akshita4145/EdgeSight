# EdgeSight

EdgeSight is a demoable observability dashboard for comparing **Edge vs Serverless** behavior on Vercel.

It now supports two data sources:

- `EdgeSight Demo` (its own API traffic telemetry in Vercel Postgres)
- `FlowFund Live` (live transaction-backed metrics pulled from `flowfund-cashflow`)

It generates traffic, stores request logs in **Vercel Postgres**, aggregates runtime metrics, and surfaces **actionable insights** (latency, caching, compute-load concentration, and runtime migration opportunities).

## What It Shows

- total requests
- average latency
- cache hit rate
- estimated compute units (relative metric / compute-power proxy for comparison)
- per-route breakdown (requests, avg latency, p95, cache hit rate, estimated compute load)
- insight cards derived from recent traffic patterns
- a switchable live source mode for FlowFund transaction telemetry (mapped into the same dashboard model)

## How The App Works

### 1. Demo traffic generation

The dashboard includes a **Generate Demo Traffic** button that:

1. calls `POST /api/db/init` to create the `request_logs` table (if missing)
2. sends batches of requests to:
   - `GET /api/edge`
   - `GET /api/serverless`
   - `GET /api/cached` (twice to create hits/misses)
3. refreshes dashboard stats automatically

### 2. Logging

The demo endpoints write rows to `request_logs` in Postgres with:

- `route`
- `runtime`
- `latency_ms`
- `cache_hit`
- `created_at`

### 3. Aggregation

`GET /api/stats` reads from Postgres and computes:

- totals for the selected range
- previous-period totals (for deltas)
- per-route aggregates
- p95 latency per route
- estimated compute units (heuristic compute-power proxy)

### 3b. FlowFund live adapter mode

When the dashboard is switched to **FlowFund Live**, `GET /api/stats` can proxy to a FlowFund deployment and adapt finance transactions into the same EdgeSight response shape (`totals`, `deltas`, `routes`, `insights`).

- source selector: `source=edgesight | flowfund`
- FlowFund mode selector: `flowfundMode=healthy | at-risk`
- FlowFund base URL can be passed from the UI or via `FLOWFUND_BASE_URL`
- Vercel deployment protection can be bypassed server-to-server with `FLOWFUND_VERCEL_BYPASS_TOKEN`

### 4. Insights

`lib/insights.ts` generates human-readable recommendations from aggregated data, such as:

- latency regressions
- traffic spikes
- cache opportunities
- edge migration candidates
- compute-load concentration
- security reminders

## Project Structure

- `app/page.tsx` - dashboard page, data-source switch, FlowFund connection controls, polling, demo traffic button
- `app/api/stats/route.ts` - Postgres-backed stats plus FlowFund proxy/adapter entrypoint
- `app/api/db/init/route.ts` - creates `request_logs` table
- `app/api/edge/route.ts` - edge runtime demo endpoint
- `app/api/serverless/route.ts` - serverless runtime demo endpoint
- `app/api/cached/route.ts` - serverless endpoint with in-memory cache behavior for demo hits/misses
- `components/dashboard/*` - dashboard UI sections (header, summary cards, routes table, insights)
- `components/ui/route-details-drawer.tsx` - route details panel
- `lib/insights.ts` - insight generation heuristics
- `lib/telemetry.ts` - shared range parsing and earlier in-memory telemetry helpers
- `lib/flowfund-adapter.ts` - maps FlowFund transactions/dashboard into EdgeSight stats format

## Local Development

### Prerequisites

- node.js 18+ (prefer current lts)
- npm
- a Vercel Postgres database connected to this project (or equivalent env vars set)

### Install

```bash
npm install
```

### Run

```bash
npm run dev
```

Open `http://localhost:3000`.

### Optional: Run FlowFund integration locally

If you want to demo the FlowFund-connected mode locally:

1. run `flowfund-cashflow` separately (for example on `http://localhost:3001`)
2. open EdgeSight and switch **Data Source** to **FlowFund Live**
3. set the FlowFund Base URL in the UI (or set `FLOWFUND_BASE_URL`)

### Initialize the database (first run)

You can either:

- click **Generate Demo Traffic** in the UI (it initializes the table automatically), or
- call the init route manually:

```bash
curl -X POST http://localhost:3000/api/db/init
```

## Generate Demo Data

The easiest way is the in-app button:

- open the dashboard
- click **Generate Demo Traffic**
- wait a few seconds
- the cards, routes table, and insights panel will refresh

Manual traffic generation (optional):

```bash
for i in {1..10}; do curl -s http://localhost:3000/api/edge > /dev/null; done
for i in {1..10}; do curl -s http://localhost:3000/api/serverless > /dev/null; done
for i in {1..20}; do curl -s http://localhost:3000/api/cached > /dev/null; done
```

## API Endpoints

### `POST /api/db/init`

Creates the `request_logs` table if it does not exist.

### `GET /api/edge`

- runs in edge runtime
- simulates faster work
- logs request latency to Postgres

### `GET /api/serverless`

- runs in node/serverless runtime
- simulates heavier work
- logs request latency to Postgres

### `GET /api/cached`

- simulates a cacheable serverless endpoint
- uses an in-memory cache with a short ttl (demo-only)
- logs cache hit/miss behavior to Postgres

### `GET /api/stats?range=24h`

Returns dashboard data:

- `totals`
- `deltas`
- `routes`
- `insights`

Supported ranges:

- `1h`
- `6h`
- `24h`
- `7d`
- `30d`

Additional optional query params for FlowFund mode:

- `source=flowfund`
- `flowfundMode=healthy` or `flowfundMode=at-risk`
- `flowfundBaseUrl=https://...`

## Deployment (Vercel)

### Required setup

1. connect a Vercel Postgres database to the project
2. ensure the generated Postgres env vars are available in the deployment environment
3. (optional) set `FLOWFUND_BASE_URL` to your deployed FlowFund app URL
4. (optional) if FlowFund uses Vercel deployment protection, set `FLOWFUND_VERCEL_BYPASS_TOKEN`
5. deploy normally

### Running EdgeSight + FlowFund together on Vercel

Recommended setup:

1. deploy `flowfund-cashflow` as its own Vercel project
2. deploy `EdgeSight` as a separate Vercel project
3. point EdgeSight to the FlowFund deployment URL via the UI or `FLOWFUND_BASE_URL`

If you use a protected FlowFund preview deployment:

- generate the bypass token in the **FlowFund** Vercel project
- add it to the **EdgeSight** Vercel project as `FLOWFUND_VERCEL_BYPASS_TOKEN`
- redeploy EdgeSight after adding the env var

### Common build issues

- missing `default` export in `app/page.tsx`
  - Next.js app router pages must export a default component
- missing dependency for `components/ui/sheet.tsx`
  - `@radix-ui/react-dialog` must exist in `dependencies`

If you add a dependency locally, commit both:

- `package.json`
- `package-lock.json`

## Tech Stack

- next.js 16 (app router, typescript)
- react 19
- tailwind css
- lucide-react
- radix ui primitives
- @vercel/postgres

## Notes / Limitations

- estimated compute units are heuristic and meant for comparisons, not billing
- `/api/cached` cache is in-memory and instance-local (demo behavior only)
- insight generation is rule-based heuristics, not a production ml/recommendation system
- FlowFund live mode adapts finance transactions into EdgeSight-style metrics (latency/cache/cost are synthetic demo metrics)
- FlowFund short windows (`1h`, `6h`, `24h`) can look sparse because FlowFund demo transactions are date-based

## Future Improvements

- authentication and multi-project support
- real vercel usage/billing integrations
- richer cache analytics (ttl effectiveness, revalidation recommendations)
- historical trend charts
- filtering by route groups / environment
