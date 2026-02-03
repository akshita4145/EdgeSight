"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { RoutesTable } from "@/components/dashboard/routes-table";
import { InsightsPanel } from "@/components/dashboard/insights-panel";

type StatsResponse = {
  ok: boolean;
  range: string;
  totals: {
    total_requests: number;
    avg_latency_ms: number;
    cache_hit_rate: number; // 0..1
    est_cost_units: number;
  };
  routes: Array<{
    route: string;
    runtime: string;
    requests: number;
    avg_latency_ms: number;
    p95_latency_ms: number;
    cache_hit_rate: number; // 0..1
    est_cost_units: number;
  }>;
  insights: string[];
};

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState("24h");

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadStats(range: string) {
    const res = await fetch(`/api/stats?range=${encodeURIComponent(range)}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Stats API failed: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as StatsResponse;
    setStats(data);
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/stats?range=${encodeURIComponent(timeRange)}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`Stats API failed: ${res.status} ${res.statusText}`);
        }

        const data = (await res.json()) as StatsResponse;

        if (!cancelled) {
          setStats(data);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setStats(null);
          setError(e instanceof Error ? e.message : "Unknown error loading stats");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [timeRange]);

  async function generateTraffic() {
    try {
      setGenerating(true);
      setError(null);

      // 10 requests to each endpoint
      const endpoints = ["/api/serverless", "/api/edge", "/api/cached"];
      const requests: Promise<Response>[] = [];

      for (const endpoint of endpoints) {
        for (let i = 0; i < 10; i++) {
          requests.push(fetch(endpoint, { method: "GET" }));
        }
      }

      await Promise.all(requests);

      // Refresh stats after generating traffic
      await loadStats(timeRange);
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

        {/* Next step: pass real data into these components as props */}
        <SummaryCards totals={stats?.totals ?? null} loading={loading} />


        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <RoutesTable />
          <InsightsPanel />
        </div>

        {/* Optional debug block (remove later) */}
        <div className="mt-6 text-xs opacity-70">
          <div>Loading: {String(loading)}</div>
          <div>Generating: {String(generating)}</div>
          <div>Stats loaded: {String(!!stats)}</div>
        </div>
      </main>
    </div>
  );
}
