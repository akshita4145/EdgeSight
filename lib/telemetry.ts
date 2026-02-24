// lib/telemetry.ts
export type Runtime = "edge" | "serverless";

export type TelemetryEvent = {
  ts: number;
  route: string;
  runtime: Runtime;
  latencyMs: number;
  cached: boolean;
  status: number;
  // a fake-but-consistent “cost units” model
  costUnits: number;
};

type RouteAgg = {
  route: string;
  runtime: Runtime;
  requests: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  cache_hit_rate: number; // 0..1
  est_cost_units: number;
};

const MAX_EVENTS = 25_000;

// Keep a singleton across hot reloads in dev
const g = globalThis as unknown as {
  __edgesight_events?: TelemetryEvent[];
};

function events(): TelemetryEvent[] {
  if (!g.__edgesight_events) g.__edgesight_events = [];
  return g.__edgesight_events;
}

export function recordEvent(e: TelemetryEvent) {
  const arr = events();
  arr.push(e);
  if (arr.length > MAX_EVENTS) arr.splice(0, arr.length - MAX_EVENTS);
}

export function parseRangeToMs(range: string): number {
  // supports: 1h, 6h, 24h, 7d, 30d
  const m = range.match(/^(\d+)(h|d)$/);
  if (!m) return 24 * 60 * 60 * 1000;
  const n = Number(m[1]);
  const unit = m[2];
  return unit === "h" ? n * 60 * 60 * 1000 : n * 24 * 60 * 60 * 1000;
}

function p95(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor(0.95 * (sorted.length - 1));
  return sorted[idx];
}

export function computeStats(range: string) {
  const now = Date.now();
  const windowMs = parseRangeToMs(range);

  const curStart = now - windowMs;
  const prevStart = now - 2 * windowMs;
  const prevEnd = curStart;

  const all = events();

  const current = all.filter((e) => e.ts >= curStart);
  const previous = all.filter((e) => e.ts >= prevStart && e.ts < prevEnd);

  const summarize = (evs: TelemetryEvent[]) => {
    const total_requests = evs.length;
    const latencies = evs.map((e) => e.latencyMs);
    const avg_latency_ms = total_requests
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / total_requests)
      : 0;

    const cache_hits = evs.reduce((acc, e) => acc + (e.cached ? 1 : 0), 0);
    const cache_hit_rate = total_requests ? cache_hits / total_requests : 0;

    const est_cost_units = evs.reduce((acc, e) => acc + e.costUnits, 0);

    return { total_requests, avg_latency_ms, cache_hit_rate, est_cost_units };
  };

  const totals = summarize(current);
  const prevTotals = summarize(previous);

  // Per-route aggregation
  const map = new Map<string, TelemetryEvent[]>();
  for (const e of current) {
    const key = `${e.route}__${e.runtime}`;
    const arr = map.get(key) ?? [];
    arr.push(e);
    map.set(key, arr);
  }

  const routes: RouteAgg[] = [];
  for (const [key, evs] of map.entries()) {
    const [route, runtime] = key.split("__") as [string, Runtime];
    const requests = evs.length;
    const latencies = evs.map((e) => e.latencyMs);
    const avg_latency_ms = requests
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / requests)
      : 0;

    const cache_hits = evs.reduce((acc, e) => acc + (e.cached ? 1 : 0), 0);
    const cache_hit_rate = requests ? cache_hits / requests : 0;

    routes.push({
      route,
      runtime,
      requests,
      avg_latency_ms,
      p95_latency_ms: p95(latencies),
      cache_hit_rate,
      est_cost_units: evs.reduce((acc, e) => acc + e.costUnits, 0),
    });
  }

  routes.sort((a, b) => b.requests - a.requests);

  const deltas = {
    total_requests: totals.total_requests - prevTotals.total_requests,
    avg_latency_ms: totals.avg_latency_ms - prevTotals.avg_latency_ms,
    cache_hit_rate: totals.cache_hit_rate - prevTotals.cache_hit_rate,
    est_cost_units: totals.est_cost_units - prevTotals.est_cost_units,
  };

  return { totals, deltas, routes };
}