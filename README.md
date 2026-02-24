# EdgeSight

EdgeSight is a demoable observability dashboard for comparing **Edge vs Serverless** behavior on Vercel.

It generates traffic, stores request logs in **Vercel Postgres**, aggregates runtime metrics, and surfaces **actionable insights** (latency, caching, cost concentration, and runtime migration opportunities).

## What It Shows

- total requests
- average latency
- cache hit rate
- estimated cost units (relative metric for comparison)
- per-route breakdown (requests, avg latency, p95, cache hit rate, estimated cost)
- insight cards derived from recent traffic patterns

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
- estimated cost units (heuristic)

### 4. Insights

`lib/insights.ts` generates human-readable recommendations from aggregated data, such as:

- latency regressions
- traffic spikes
- cache opportunities
- edge migration candidates
- cost concentration
- security reminders

## Project Structure

- `app/page.tsx` - dashboard page, data fetching, demo traffic button, route drawer state
- `app/api/stats/route.ts` - Postgres-backed aggregation endpoint for dashboard metrics + insights
- `app/api/db/init/route.ts` - creates `request_logs` table
- `app/api/edge/route.ts` - edge runtime demo endpoint
- `app/api/serverless/route.ts` - serverless runtime demo endpoint
- `app/api/cached/route.ts` - serverless endpoint with in-memory cache behavior for demo hits/misses
- `components/dashboard/*` - dashboard UI sections (header, summary cards, routes table, insights)
- `components/ui/route-details-drawer.tsx` - route details panel
- `lib/insights.ts` - insight generation heuristics
- `lib/telemetry.ts` - shared range parsing and earlier in-memory telemetry helpers

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

## Deployment (Vercel)

### Required setup

1. connect a Vercel Postgres database to the project
2. ensure the generated Postgres env vars are available in the deployment environment
3. deploy normally

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

- estimated cost units are heuristic and meant for comparisons, not billing
- `/api/cached` cache is in-memory and instance-local (demo behavior only)
- insight generation is rule-based heuristics, not a production ml/recommendation system

## Future Improvements

- authentication and multi-project support
- real vercel usage/billing integrations
- richer cache analytics (ttl effectiveness, revalidation recommendations)
- historical trend charts
- filtering by route groups / environment
