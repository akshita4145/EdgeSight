# EdgeSight

EdgeSight is a developer-facing dashboard that helps teams understand **cost and performance tradeoffs between Edge and Serverless runtimes on Vercel**.

Instead of just showing raw metrics, EdgeSight connects real traffic data to **actionable insights**, helping developers decide *where* Edge makes sense, *where* Serverless is sufficient, and *when* caching changes the equation.

---

## What EdgeSight Does

EdgeSight answers questions like:

- Which routes are slow, and *why*?
- Are Edge functions actually improving latency?
- Where is caching providing real benefits?
- Which endpoints are driving the most cost?

It’s designed to be **interactive and demoable**, so teams can see how architectural decisions affect performance in real time.

---

## How It Works

### 1. Traffic Simulation
The dashboard includes a **Generate Sample Traffic** button that simulates real usage by hitting:
- Serverless endpoints
- Edge endpoints
- Cached endpoints

Each request logs runtime, latency, and cache behavior.

---

### 2. Data Collection
All requests are logged into **Vercel Postgres (Neon)** with:
- route
- runtime (edge / serverless)
- latency
- cache hit/miss
- timestamp

---

### 3. Aggregation & Analysis
A single stats API (`/api/stats`) aggregates the data to compute:
- Total requests
- Average latency
- P95 latency
- Cache hit rate
- Estimated cost units (relative comparison)

Simple heuristics generate **human-readable insights**, such as:
- “Consider Edge for this route”
- “Low cache utilization detected”
- “Latency spikes observed”

---

### 4. Dashboard UI
The UI is built with **Next.js App Router** and components generated using **v0**, then wired to live data.

Key sections:
- **Summary Cards** — high-level metrics
- **Routes Table** — per-route runtime, latency, and cost
- **Insights Panel** — recommendations derived from observed behavior

All UI updates automatically when new traffic is generated.

---

## Why EdgeSight Is Different

Most dashboards show metrics.

EdgeSight focuses on:
- **Decisions**, not just data
- **Runtime comparisons**, not isolated numbers
- **Demo-first design**, making architectural tradeoffs easy to explain

It’s closer to an internal developer tool than a generic analytics page.

---

## What I’d Do Next

If this were extended toward production, the next steps would be:

### 🔐 Authentication & Multi-Project Support
- User auth (Vercel / GitHub OAuth)
- Support multiple projects or environments per user

### 💸 Real Billing Data
- Replace estimated cost units with real Vercel usage APIs
- Break down cost by function invocation, execution time, and data transfer

### ⚡ Deeper Caching Analysis
- Track cache TTL effectiveness
- Identify routes with high recomputation cost
- Recommend ISR, on-demand revalidation, or Edge caching strategies

### 📈 Historical Trends
- Compare time ranges (“vs last 7 days”)
- Show regressions and improvements over time

---

## Tech Stack

- **Next.js (App Router, TypeScript)**
- **Vercel Edge & Serverless Functions**
- **Vercel Postgres (Neon)**
- **v0-generated UI (customized)**
- **Tailwind CSS**

---

## Demo Tip

Click **Generate Sample Traffic**, then watch how:
- latency changes by runtime
- cached routes improve on repeat requests
- insights update automatically

---

## Summary

EdgeSight demonstrates how runtime choices affect real-world performance and cost — and how tooling can guide better architectural decisions.

Built as an exploration of developer experience, observability, and platform design.
