"use client";

import { useEffect, useRef, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { RoutesTable } from "@/components/dashboard/routes-table";
import { InsightsPanel } from "@/components/dashboard/insights-panel";

type Totals = {
  total_requests: number;
  avg_latency_ms: number;
  cache_hit_rate: number; // 0..1
  est_cost_units: number;
};

type RouteAgg = {
  route: string;
  runtime: "edge" | "serverless" | string;
  requests: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  cache_hit_rate: number; // 0..1
  est_cost_units: number;
};

type Deltas = {
  total_requests: number;
  avg_latency_ms: number;
  cache_hit_rate: number; // delta in 0..1
  est_cost_units: number;
};

type StatsResponse = {
  ok: boolean;
  range: string;
  totals: Totals;
  deltas: Deltas;
  routes: RouteAgg[];
  insights: string[];
};

async function fetchStats(range: string, signal?: AbortSignal): Promise<StatsResponse> {
  const res = await fetch(`/api/stats?range=${encodeURIComponent(range)}`, {
    cache: "no-store",
    signal,
  });

  if (!res.ok) {
    throw new Error(`Stats API failed: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as StatsResponse;
}

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState("24h");
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // helps ignore stale responses if multiple fetches race
  const loadSeq = useRef(0);

  async function loadStats(range: string, opts?: { showLoading?: boolean }) {
    const seq = ++loadSeq.current;
    const showLoading = opts?.showLoading ?? true;

    const controller = new AbortController();

    try {
      if (showLoading) setLoading(true);
      setError(null);

      const data = await fetchStats(range, controller.signal);

      // ignore stale responses
      if (seq !== loadSeq.current) return;

      setStats(data);
    } catch (e: unknown) {
      if (seq !== loadSeq.current) return;

      // AbortError is expected during rapid range switching
      const msg =
        e instanceof Error
          ? e.name === "AbortError"
            ? null
            : e.message
          : "Unknown error loading stats";

      if (msg) {
        setStats(null);
        setError(msg);
      }
    } finally {
      if (seq === loadSeq.current && showLoading) setLoading(false);
    }

    return () => controller.abort();
  }

  useEffect(() => {
    // kick off load when timeRange changes
    loadStats(timeRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  async function generateTraffic() {
    try {
      setGenerating(true);
      setError(null);

      // More demo-realistic: mixed volumes + bursty cached route
      const endpoints = [
        { path: "/api/serverless", count: 14 },
        { path: "/api/edge", count: 18 },
        { path: "/api/cached", count: 26 }, // ensures HIT/MISS behavior shows up
      ];

      const requests: Promise<Response>[] = [];
      for (const e of endpoints) {
        for (let i = 0; i < e.count; i++) {
          requests.push(fetch(e.path, { method: "GET" }));
        }
      }

      await Promise.all(requests);

      // Refresh stats after generating traffic (don’t show full loading skeleton again)
      await loadStats(timeRange, { showLoading: false });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error generating traffic");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader timeRange={timeRange} onTimeRangeChange={setTimeRange} />

      <main className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-sm opacity-70">
            {loading ? "Loading stats..." : stats ? `Showing: ${stats.range}` : "No stats loaded"}
          </div>

          <button
            onClick={generateTraffic}
            disabled={generating || loading}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating ? "Generating..." : "Generate Sample Traffic"}
          </button>
        </div>

        {error ? (
          <div className="mb-6 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm">
            <div className="font-medium">Something went wrong</div>
            <div className="mt-1 opacity-80">{error}</div>
          </div>
        ) : null}

        <SummaryCards
          totals={stats?.totals ?? null}
          deltas={stats?.deltas ?? null}
          loading={loading}
        />

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <RoutesTable routes={stats?.routes ?? []} loading={loading} />
          <InsightsPanel insights={stats?.insights ?? []} loading={loading} />
        </div>

        <div className="mt-6 text-xs opacity-70">
          <div>Loading: {String(loading)}</div>
          <div>Generating: {String(generating)}</div>
          <div>Stats loaded: {String(!!stats)}</div>
        </div>
      </main>
    </div>
  );
}