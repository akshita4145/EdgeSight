// lib/insights.ts
import type { Runtime } from "./telemetry";

type RouteAgg = {
  route: string;
  runtime: Runtime;
  requests: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  cache_hit_rate: number;
  est_cost_units: number;
};

type Totals = {
  total_requests: number;
  avg_latency_ms: number;
  cache_hit_rate: number;
  est_cost_units: number;
};

type Deltas = {
  total_requests: number;
  avg_latency_ms: number;
  cache_hit_rate: number;
  est_cost_units: number;
};

export function generateInsights(
  totals: Totals,
  deltas: Deltas,
  routes: RouteAgg[]
): string[] {
  const out: string[] = [];

  // 1) Global regressions / improvements
  if (deltas.avg_latency_ms > 15) {
    out.push(
      `Latency regression: avg latency increased by ${deltas.avg_latency_ms}ms vs previous period. Check top routes by P95 for hotspots.`
    );
  } else if (deltas.avg_latency_ms < -15) {
    out.push(
      `Latency improved: avg latency dropped by ${Math.abs(deltas.avg_latency_ms)}ms vs previous period. Consider locking in recent optimizations with monitoring.`
    );
  }

  if (deltas.total_requests > 0) {
    const pct = totals.total_requests
      ? Math.round((deltas.total_requests / Math.max(1, totals.total_requests - deltas.total_requests)) * 100)
      : 0;
    if (pct >= 30) {
      out.push(
        `Traffic spike: requests are up ~${pct}% vs previous period. Consider pre-scaling or reviewing rate limits.`
      );
    }
  }

  // 2) Route-level: worst P95
  const byP95 = [...routes].sort((a, b) => b.p95_latency_ms - a.p95_latency_ms);
  const worst = byP95[0];
  if (worst && worst.p95_latency_ms >= 200) {
    out.push(
      `${worst.route} has high tail latency (P95 ${worst.p95_latency_ms}ms). Consider caching, query optimization, or moving computation off the request path.`
    );
  }

  // 3) Cache opportunities: high traffic + low cache hit rate
  const cacheOpp = routes
    .filter((r) => r.requests >= 50 && r.cache_hit_rate < 0.25)
    .sort((a, b) => b.requests - a.requests)[0];

  if (cacheOpp) {
    out.push(
      `Cache opportunity: ${cacheOpp.route} has ${cacheOpp.requests} requests but only ${Math.round(
        cacheOpp.cache_hit_rate * 100
      )}% cache hit rate. Add ISR, Edge caching, or memoize expensive lookups.`
    );
  }

  // 4) “Edge candidate”: serverless route with low compute and lots of traffic
  const edgeCandidate = routes
    .filter((r) => r.runtime === "serverless" && r.requests >= 80 && r.avg_latency_ms <= 120)
    .sort((a, b) => b.requests - a.requests)[0];

  if (edgeCandidate) {
    out.push(
      `Edge candidate: ${edgeCandidate.route} is serverless with solid avg latency (${edgeCandidate.avg_latency_ms}ms) and high traffic. Consider moving to Edge for lower tail latency and global performance.`
    );
  }

  // 5) Cost risk: route contributing a lot of cost units
  const totalCost = Math.max(1, totals.est_cost_units);
  const costTop = [...routes].sort((a, b) => b.est_cost_units - a.est_cost_units)[0];
  if (costTop && costTop.est_cost_units / totalCost >= 0.35) {
    out.push(
      `Cost concentration: ${costTop.route} accounts for ~${Math.round(
        (costTop.est_cost_units / totalCost) * 100
      )}% of estimated cost units. Investigate payload size, cold starts, or redundant calls.`
    );
  }

  // 6) Security nudge (demo-friendly)
  out.push(
    `Security: ensure sensitive endpoints use auth checks and consider adding basic rate limiting for burst traffic.`
  );

  return out.slice(0, 8);
}