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
  const previousRequests = Math.max(0, totals.total_requests - deltas.total_requests);
  const hasMeaningfulVolume = totals.total_requests >= 20 && previousRequests >= 20;
  const formatPct = (value: number) => `${Math.round(value * 100)}%`;

  // 1) Global regressions / improvements
  if (
    hasMeaningfulVolume &&
    deltas.avg_latency_ms > 10 &&
    deltas.avg_latency_ms / Math.max(1, totals.avg_latency_ms - deltas.avg_latency_ms) >= 0.1
  ) {
    out.push(
      `Latency regression: avg latency increased by ${deltas.avg_latency_ms}ms vs previous period. Check top routes by P95 for hotspots.`
    );
  } else if (
    hasMeaningfulVolume &&
    deltas.avg_latency_ms < -10 &&
    Math.abs(deltas.avg_latency_ms) / Math.max(1, totals.avg_latency_ms - deltas.avg_latency_ms) >= 0.1
  ) {
    out.push(
      `Latency improved: avg latency dropped by ${Math.abs(deltas.avg_latency_ms)}ms vs previous period. Consider locking in recent optimizations with monitoring.`
    );
  }

  if (deltas.total_requests > 0 && previousRequests >= 20) {
    const pct = (deltas.total_requests / previousRequests) * 100;
    if (pct >= 20 && pct <= 300) {
      out.push(
        `Traffic increase: requests rose from ${previousRequests} to ${totals.total_requests} (${Math.round(
          pct
        )}% vs previous period). Consider pre-scaling or reviewing rate limits.`
      );
    }
  } else if (deltas.total_requests >= 25 && totals.total_requests >= 30) {
    out.push(
      `Traffic increase: ${deltas.total_requests} more requests than the previous period. Watch concurrency and downstream limits if this trend continues.`
    );
  }

  // 2) Route-level: worst P95
  const byP95 = [...routes].sort((a, b) => b.p95_latency_ms - a.p95_latency_ms);
  const worst = byP95[0];
  if (worst && worst.requests >= 10 && worst.p95_latency_ms >= 180) {
    out.push(
      `${worst.route} shows elevated tail latency (P95 ${worst.p95_latency_ms}ms across ${worst.requests} requests). Consider caching, query optimization, or moving computation off the request path.`
    );
  }

  // 3) Cache opportunities: high traffic + low cache hit rate
  const cacheOpp = routes
    .filter((r) => r.requests >= 20 && r.cache_hit_rate < 0.4)
    .sort((a, b) => b.requests - a.requests)[0];

  if (cacheOpp) {
    out.push(
      `Cache opportunity: ${cacheOpp.route} handled ${cacheOpp.requests} requests with a ${formatPct(
        cacheOpp.cache_hit_rate
      )} cache hit rate. Add ISR, edge caching, or memoize expensive lookups.`
    );
  }

  // 4) “Edge candidate”: serverless route with low compute and lots of traffic
  const edgeCandidate = routes
    .filter((r) => r.runtime === "serverless" && r.requests >= 30 && r.avg_latency_ms <= 120)
    .sort((a, b) => b.requests - a.requests)[0];

  if (edgeCandidate) {
    out.push(
      `Edge candidate: ${edgeCandidate.route} is serverless with ${edgeCandidate.requests} requests and ${edgeCandidate.avg_latency_ms}ms average latency. Consider moving it to Edge for lower tail latency and better global performance.`
    );
  }

  // 5) Compute-load risk: route contributing a lot of estimated GB-ms in the window
  const totalCost = Math.max(1, totals.est_cost_units);
  const costTop = [...routes].sort((a, b) => b.est_cost_units - a.est_cost_units)[0];
  if (costTop && totals.est_cost_units >= 25 && costTop.requests >= 10 && costTop.est_cost_units / totalCost >= 0.35) {
    out.push(
      `Compute concentration: ${costTop.route} accounts for ${Math.round(
        (costTop.est_cost_units / totalCost) * 100
      )}% of the estimated compute usage (GB-ms) in this window. Investigate payload size, cold starts, or redundant calls.`
    );
  }

  // 6) Security nudge (demo-friendly)
  out.push(
    `Security: ensure sensitive endpoints use auth checks and consider adding basic rate limiting for burst traffic.`
  );

  return out.slice(0, 8);
}
