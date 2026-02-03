import { sql } from "@vercel/postgres";

type RouteRow = {
  route: string;
  runtime: string;
  requests: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  cache_hit_rate: number; // 0..1
  est_cost_units: number;
};

function percentile(sorted: number[], p: number) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil(p * sorted.length) - 1;
  return sorted[Math.min(Math.max(idx, 0), sorted.length - 1)];
}

function costUnits(runtime: string, requests: number, avgLatencyMs: number) {
  // Simple demo model: serverless slightly "costlier" than edge, and latency adds weight.
  const runtimeFactor = runtime === "edge" ? 0.8 : 1.0;
  const latencyFactor = 1 + avgLatencyMs / 500; // mild penalty for slow endpoints
  return Math.round(requests * runtimeFactor * latencyFactor * 100) / 100;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const range = url.searchParams.get("range") ?? "24h";

  // Time window
  const hours =
    range === "1h" ? 1 : range === "7d" ? 24 * 7 : range === "30d" ? 24 * 30 : 24;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  // Pull raw rows for the time window (small project; simple approach is fine)
  const { rows } = await sql<{
    route: string;
    runtime: string;
    latency_ms: number;
    cache_hit: boolean;
  }>`
    SELECT route, runtime, latency_ms, cache_hit
    FROM request_logs
    WHERE created_at >= ${since}
  `;

  const totalRequests = rows.length;
  const avgLatency =
    totalRequests === 0
      ? 0
      : Math.round(rows.reduce((sum, r) => sum + r.latency_ms, 0) / totalRequests);

  const cacheHits = rows.filter((r) => r.cache_hit).length;
  const cacheHitRate = totalRequests === 0 ? 0 : cacheHits / totalRequests;

  // Group by route+runtime
  const group = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = `${r.route}|||${r.runtime}`;
    const arr = group.get(key) ?? [];
    arr.push(r);
    group.set(key, arr);
  }

  const routeStats: RouteRow[] = [];
  for (const [key, arr] of group.entries()) {
    const [route, runtime] = key.split("|||");
    const requests = arr.length;

    const latencies = arr.map((x) => x.latency_ms).sort((a, b) => a - b);
    const avg_latency_ms = Math.round(latencies.reduce((a, b) => a + b, 0) / requests);
    const p95_latency_ms = percentile(latencies, 0.95);

    const hits = arr.filter((x) => x.cache_hit).length;
    const cache_hit_rate = hits / requests;

    const est_cost_units = costUnits(runtime, requests, avg_latency_ms);

    routeStats.push({
      route,
      runtime,
      requests,
      avg_latency_ms,
      p95_latency_ms,
      cache_hit_rate,
      est_cost_units,
    });
  }

  // Sort “most expensive” first
  routeStats.sort((a, b) => b.est_cost_units - a.est_cost_units);

  // Simple insight rules
  const insights: string[] = [];
  const slow = routeStats.filter((r) => r.p95_latency_ms >= 250);
  if (slow.length) {
    insights.push(`Latency spikes detected on ${slow[0].route} (p95 ${slow[0].p95_latency_ms}ms).`);
  }
  const lowCache = routeStats.filter((r) => r.cache_hit_rate < 0.2 && r.requests >= 5);
  if (lowCache.length) {
    insights.push(`Low cache utilization on ${lowCache[0].route}. Consider caching or precomputing.`);
  }
  const serverlessSlow = routeStats.find((r) => r.runtime === "serverless" && r.avg_latency_ms >= 180);
  if (serverlessSlow) {
    insights.push(`Consider Edge for ${serverlessSlow.route} if logic is lightweight.`);
  }
  if (!insights.length) insights.push("No major issues detected in this time window.");

  return Response.json({
    ok: true,
    range,
    totals: {
      total_requests: totalRequests,
      avg_latency_ms: avgLatency,
      cache_hit_rate: Math.round(cacheHitRate * 1000) / 1000,
      est_cost_units: Math.round(routeStats.reduce((s, r) => s + r.est_cost_units, 0) * 100) / 100,
    },
    routes: routeStats,
    insights,
  });
}
