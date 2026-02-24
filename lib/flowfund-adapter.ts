import { generateInsights } from "@/lib/insights";
import type { Runtime } from "@/lib/telemetry";

type FinanceTransaction = {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: "inflow" | "outflow";
  status: "completed" | "pending" | "failed";
};

type FlowFundInsight = {
  title: string;
  message: string;
  recommendation?: string;
};

type FlowFundDashboardSnapshot = {
  mode: "healthy" | "at-risk";
  generatedAt: string;
  transactions: FinanceTransaction[];
  insights: FlowFundInsight[];
};

type FlowFundTransactionsResponse = {
  mode: "healthy" | "at-risk";
  transactions: FinanceTransaction[];
};

export type FlowFundStats = {
  ok: boolean;
  range: string;
  totals: {
    total_requests: number;
    avg_latency_ms: number;
    cache_hit_rate: number;
    est_cost_units: number;
  };
  deltas: {
    total_requests: number;
    avg_latency_ms: number;
    cache_hit_rate: number;
    est_cost_units: number;
  };
  routes: Array<{
    route: string;
    runtime: Runtime;
    requests: number;
    avg_latency_ms: number;
    p95_latency_ms: number;
    cache_hit_rate: number;
    est_cost_units: number;
  }>;
  insights: string[];
};

type WindowInput = {
  range: string;
  curStart: Date;
  curEnd: Date;
  prevStart: Date;
};

type FetchInput = WindowInput & {
  baseUrl: string;
  mode: "healthy" | "at-risk";
  vercelBypassToken?: string;
};

type TxWithSignals = FinanceTransaction & {
  ts: number;
  syntheticLatencyMs: number;
  syntheticCacheHit: boolean;
  syntheticCostUnits: number;
  syntheticRuntime: Runtime;
  routeKey: string;
};

function normalizeBaseUrl(input: string) {
  const url = new URL(input);
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function slug(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function p95(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor(0.95 * (sorted.length - 1));
  return sorted[idx];
}

function synthesizeLatency(tx: FinanceTransaction) {
  const amountWeight = Math.min(180, Math.abs(tx.amount) / 120);
  const typeBase = tx.type === "outflow" ? 85 : 55;
  const statusPenalty =
    tx.status === "failed" ? 120 : tx.status === "pending" ? 50 : 0;
  const categoryWeight = (tx.category.length % 7) * 6;
  return Math.round(typeBase + amountWeight + statusPenalty + categoryWeight);
}

function synthesizeCostUnits(tx: FinanceTransaction) {
  const base = tx.type === "outflow" ? 1.5 : 0.9;
  const amountCost = Math.abs(tx.amount) / 5000;
  const statusPenalty = tx.status === "failed" ? 1.2 : tx.status === "pending" ? 0.4 : 0;
  return base + amountCost + statusPenalty;
}

function summarize(rows: TxWithSignals[]) {
  const total_requests = rows.length;
  const avg_latency_ms = total_requests
    ? Math.round(rows.reduce((sum, row) => sum + row.syntheticLatencyMs, 0) / total_requests)
    : 0;
  const cache_hit_rate = total_requests
    ? rows.reduce((sum, row) => sum + (row.syntheticCacheHit ? 1 : 0), 0) / total_requests
    : 0;
  const est_cost_units = rows.reduce((sum, row) => sum + row.syntheticCostUnits, 0);

  return { total_requests, avg_latency_ms, cache_hit_rate, est_cost_units };
}

function aggregateRoutes(
  rows: TxWithSignals[]
): FlowFundStats["routes"] {
  const grouped = new Map<string, TxWithSignals[]>();

  for (const row of rows) {
    const key = `${row.routeKey}__${row.syntheticRuntime}`;
    const group = grouped.get(key) ?? [];
    group.push(row);
    grouped.set(key, group);
  }

  const routes = [...grouped.entries()].map(([key, group]) => {
    const [route, runtimeRaw] = key.split("__");
    const runtime: Runtime = runtimeRaw === "edge" ? "edge" : "serverless";
    const requests = group.length;
    const latencies = group.map((row) => row.syntheticLatencyMs);
    const avg_latency_ms = requests
      ? Math.round(latencies.reduce((sum, n) => sum + n, 0) / requests)
      : 0;
    const cache_hit_rate =
      requests > 0
        ? group.reduce((sum, row) => sum + (row.syntheticCacheHit ? 1 : 0), 0) / requests
        : 0;

    return {
      route,
      runtime,
      requests,
      avg_latency_ms,
      p95_latency_ms: p95(latencies),
      cache_hit_rate,
      est_cost_units: group.reduce((sum, row) => sum + row.syntheticCostUnits, 0),
    };
  });

  routes.sort((a, b) => b.requests - a.requests || b.est_cost_units - a.est_cost_units);
  return routes;
}

function buildRouteKey(tx: FinanceTransaction) {
  return `/finance/${slug(tx.category || "uncategorized")}`;
}

function withSignals(transactions: FinanceTransaction[]): TxWithSignals[] {
  const completedByCategory = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.status !== "completed") continue;
    completedByCategory.set(tx.category, (completedByCategory.get(tx.category) ?? 0) + 1);
  }

  return transactions
    .map((tx) => {
      const ts = new Date(tx.date).getTime();
      if (Number.isNaN(ts)) return null;

      const categoryRepeats = completedByCategory.get(tx.category) ?? 0;
      const syntheticCacheHit = tx.status === "completed" && categoryRepeats >= 2;

      return {
        ...tx,
        ts,
        syntheticLatencyMs: synthesizeLatency(tx),
        syntheticCacheHit,
        syntheticCostUnits: synthesizeCostUnits(tx),
        syntheticRuntime: tx.type === "inflow" ? "edge" : "serverless",
        routeKey: buildRouteKey(tx),
      };
    })
    .filter((tx): tx is TxWithSignals => tx !== null);
}

export async function fetchFlowFundStats(input: FetchInput): Promise<FlowFundStats> {
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  const txUrl = new URL("/api/transactions", baseUrl);
  txUrl.searchParams.set("mode", input.mode);
  txUrl.searchParams.set("_edgesight_ts", String(Date.now()));
  if (input.vercelBypassToken) {
    // Send as query param too because Vercel supports both, and this makes debugging easier.
    txUrl.searchParams.set("x-vercel-protection-bypass", input.vercelBypassToken);
  }

  const headers = new Headers();
  if (input.vercelBypassToken) {
    headers.set("x-vercel-protection-bypass", input.vercelBypassToken);
    headers.set("x-vercel-set-bypass-cookie", "true");
  }

  const res = await fetch(txUrl.toString(), {
    cache: "no-store",
    headers,
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error(
        "FlowFund request failed (401). Check that the bypass secret is from the FlowFund Vercel project (not EdgeSight), is added to EdgeSight as FLOWFUND_VERCEL_BYPASS_TOKEN for the active environment, and EdgeSight was redeployed after setting it."
      );
    }
    throw new Error(`FlowFund request failed (${res.status})`);
  }

  const txPayload = (await res.json()) as FlowFundTransactionsResponse;
  const rows = withSignals(txPayload.transactions ?? []);

  const current = rows.filter((row) => row.ts >= input.curStart.getTime() && row.ts < input.curEnd.getTime());
  const previous = rows.filter(
    (row) => row.ts >= input.prevStart.getTime() && row.ts < input.curStart.getTime()
  );

  const totals = summarize(current);
  const prevTotals = summarize(previous);
  const routes = aggregateRoutes(current);
  const deltas = {
    total_requests: totals.total_requests - prevTotals.total_requests,
    avg_latency_ms: totals.avg_latency_ms - prevTotals.avg_latency_ms,
    cache_hit_rate: totals.cache_hit_rate - prevTotals.cache_hit_rate,
    est_cost_units: totals.est_cost_units - prevTotals.est_cost_units,
  };

  const adapterInsights = generateInsights(totals, deltas, routes);
  let financeInsights: string[] = [];
  let generatedAtText = `${new Date().toISOString()} (UTC)`;

  try {
    const dashboardUrl = new URL("/api/dashboard", baseUrl);
    dashboardUrl.searchParams.set("mode", input.mode);
    dashboardUrl.searchParams.set("_edgesight_ts", String(Date.now()));
    if (input.vercelBypassToken) {
      dashboardUrl.searchParams.set("x-vercel-protection-bypass", input.vercelBypassToken);
    }

    const dashboardRes = await fetch(dashboardUrl.toString(), {
      cache: "no-store",
      headers,
    });

    if (dashboardRes.ok) {
      const snapshot = (await dashboardRes.json()) as FlowFundDashboardSnapshot;
      financeInsights = (snapshot.insights ?? []).map((insight) => {
        const recommendation = insight.recommendation ? ` ${insight.recommendation}` : "";
        return `${insight.title}: ${insight.message}${recommendation}`;
      });

      const generatedAt = snapshot.generatedAt ? new Date(snapshot.generatedAt) : null;
      generatedAtText =
        generatedAt && !Number.isNaN(generatedAt.getTime())
          ? `${generatedAt.toISOString()} (UTC)`
          : generatedAtText;
    }
  } catch {
    // Keep metrics live even if the secondary dashboard snapshot call fails.
  }
  const granularityHint =
    routes.length <= 1 && (input.range === "1h" || input.range === "6h" || input.range === "24h")
      ? [
          "FlowFund records are currently date-based (not timestamped to the minute), so short windows like 24h may only show one transaction category. Use 7d or 30d for a fuller breakdown."
        ]
      : [];

  return {
    ok: true,
    range: input.range,
    totals,
    deltas,
    routes,
    insights: [
      `FlowFund live mode (${txPayload.mode}) connected. Snapshot generated at ${generatedAtText}.`,
      ...granularityHint,
      ...financeInsights,
      ...adapterInsights,
    ].slice(0, 8),
  };
}
