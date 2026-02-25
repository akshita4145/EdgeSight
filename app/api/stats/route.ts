import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { generateInsights } from "@/lib/insights";
import { fetchFlowFundStats } from "@/lib/flowfund-adapter";
import { parseRangeToMs, type Runtime } from "@/lib/telemetry";

export const runtime = "nodejs";

type DbLogRow = {
  route: string;
  runtime: string;
  latency_ms: number;
  cache_hit: boolean;
  created_at: string;
};

type Totals = {
  total_requests: number;
  avg_latency_ms: number;
  cache_hit_rate: number;
  est_cost_units: number;
};

type RouteAgg = {
  route: string;
  runtime: Runtime;
  requests: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  cache_hit_rate: number;
  est_cost_units: number;
};

function p95(values: number[]) {
  if (values.length === 0) return 0;
  //sort a copy so we do not mutate the original latency list.
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor(0.95 * (sorted.length - 1));
  return sorted[idx];
}

function runtimeMemoryGb(runtime: string) {
  // Assumed memory sizes for demo workloads so usage can be expressed in GB-ms.
  return runtime === "edge" ? 0.128 : 0.512;
}

function estimateComputeGbMs(runtime: string, latencyMs: number) {
  return runtimeMemoryGb(runtime) * Math.max(0, latencyMs);
}

function summarizeLogs(rows: DbLogRow[]): Totals {
  //derive dashboard cards from raw rows in the selected window.
  const total_requests = rows.length;
  const avg_latency_ms = total_requests
    ? Math.round(rows.reduce((sum, r) => sum + Number(r.latency_ms), 0) / total_requests)
    : 0;
  const cache_hit_rate = total_requests
    ? rows.reduce((sum, r) => sum + (r.cache_hit ? 1 : 0), 0) / total_requests
    : 0;
  // Legacy response key name; values now represent estimated compute usage in GB-ms.
  const est_cost_units = rows.reduce(
    (sum, r) => sum + estimateComputeGbMs(String(r.runtime), Number(r.latency_ms)),
    0
  );

  return { total_requests, avg_latency_ms, cache_hit_rate, est_cost_units };
}

function aggregateRoutes(rows: DbLogRow[]): RouteAgg[] {
  const byRoute = new Map<string, DbLogRow[]>();

  for (const row of rows) {
    //group by route+runtime so the same path can appear in both runtimes.
    const key = `${row.route}__${row.runtime}`;
    const group = byRoute.get(key) ?? [];
    group.push(row);
    byRoute.set(key, group);
  }

  const routes: RouteAgg[] = [];
  for (const [key, group] of byRoute.entries()) {
    const [route, runtimeRaw] = key.split("__");
    const runtime: Runtime = runtimeRaw === "edge" ? "edge" : "serverless";
    const requests = group.length;
    const latencies = group.map((r) => Number(r.latency_ms));
    const avg_latency_ms = requests
      ? Math.round(latencies.reduce((sum, n) => sum + n, 0) / requests)
      : 0;
    const cache_hits = group.reduce((sum, r) => sum + (r.cache_hit ? 1 : 0), 0);
    const cache_hit_rate = requests ? cache_hits / requests : 0;
    const est_cost_units = group.reduce(
      (sum, r) => sum + estimateComputeGbMs(String(r.runtime), Number(r.latency_ms)),
      0
    );

    routes.push({
      route,
      runtime,
      requests,
      avg_latency_ms,
      p95_latency_ms: p95(latencies),
      cache_hit_rate,
      est_cost_units,
    });
  }

  routes.sort((a, b) => b.requests - a.requests);
  return routes;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const now = Date.now();
  const rangeParam = url.searchParams.get("range") ?? "24h";
  const source = url.searchParams.get("source") ?? "edgesight";
  const startParam = url.searchParams.get("start");
  const endParam = url.searchParams.get("end");

  let range = rangeParam;
  let curStart: Date;
  let curEnd: Date;
  let prevStart: Date;

  if (rangeParam === "custom" && startParam && endParam) {
    const parsedStart = new Date(startParam);
    const parsedEnd = new Date(endParam);
    const startMs = parsedStart.getTime();
    const endMs = parsedEnd.getTime();

    if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs > startMs) {
      const windowMs = endMs - startMs;
      curStart = parsedStart;
      curEnd = parsedEnd;
      prevStart = new Date(startMs - windowMs);
    } else {
      range = "24h";
      const windowMs = parseRangeToMs(range);
      curEnd = new Date(now);
      curStart = new Date(now - windowMs);
      prevStart = new Date(now - 2 * windowMs);
    }
  } else {
    const windowMs = parseRangeToMs(range);
    curEnd = new Date(now);
    curStart = new Date(now - windowMs);
    prevStart = new Date(now - 2 * windowMs);
  }

  if (source === "flowfund") {
    const flowfundMode =
      url.searchParams.get("flowfundMode") === "at-risk" ? "at-risk" : "healthy";
    const flowfundBaseUrl =
      url.searchParams.get("flowfundBaseUrl") ||
      process.env.FLOWFUND_BASE_URL ||
      "http://localhost:3001";

    try {
      const data = await fetchFlowFundStats({
        baseUrl: flowfundBaseUrl,
        mode: flowfundMode,
        range,
        curStart,
        curEnd,
        prevStart,
        vercelBypassToken: process.env.FLOWFUND_VERCEL_BYPASS_TOKEN,
      });

      return NextResponse.json(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch FlowFund dashboard";

      return NextResponse.json(
        {
          ok: false,
          range,
          totals: {
            total_requests: 0,
            avg_latency_ms: 0,
            cache_hit_rate: 0,
            est_cost_units: 0,
          },
          deltas: {
            total_requests: 0,
            avg_latency_ms: 0,
            cache_hit_rate: 0,
            est_cost_units: 0,
          },
          routes: [],
          insights: [
            `FlowFund connection failed: ${message}. Start flowfund-cashflow (for example on http://localhost:3001) and retry.`,
          ],
        },
        { status: 200 }
      );
    }
  }

  let rows: DbLogRow[] = [];
  try {
    //load both current and previous windows in one query for delta calculations.
    const result = await sql<DbLogRow>`
      SELECT route, runtime, latency_ms, cache_hit, created_at
      FROM request_logs
      WHERE created_at >= ${prevStart.toISOString()}::timestamptz
      ORDER BY created_at DESC
    `;
    rows = result.rows;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to query request_logs";

    return NextResponse.json(
      {
        ok: false,
        range,
        totals: {
          total_requests: 0,
          avg_latency_ms: 0,
          cache_hit_rate: 0,
          est_cost_units: 0,
        },
        deltas: {
          total_requests: 0,
          avg_latency_ms: 0,
          cache_hit_rate: 0,
          est_cost_units: 0,
        },
        routes: [],
        insights: [`Stats unavailable: ${message}. Initialize DB via POST /api/db/init.`],
      },
      { status: 200 }
    );
  }

  //split rows into current and previous windows using the selected range size.
  const current = rows.filter((r) => {
    const ts = new Date(r.created_at).getTime();
    return ts >= curStart.getTime() && ts < curEnd.getTime();
  });
  const previous = rows.filter((r) => {
    const ts = new Date(r.created_at).getTime();
    return ts >= prevStart.getTime() && ts < curStart.getTime();
  });

  const totals = summarizeLogs(current);
  const prevTotals = summarizeLogs(previous);
  const routes = aggregateRoutes(current);
  const deltas = {
    //deltas drive the change pills in the summary cards.
    total_requests: totals.total_requests - prevTotals.total_requests,
    avg_latency_ms: totals.avg_latency_ms - prevTotals.avg_latency_ms,
    cache_hit_rate: totals.cache_hit_rate - prevTotals.cache_hit_rate,
    est_cost_units: totals.est_cost_units - prevTotals.est_cost_units,
  };
  const insights = generateInsights(totals, deltas, routes);

  return NextResponse.json({
    ok: true,
    range,
    totals,
    deltas,
    routes,
    insights,
  });
}
