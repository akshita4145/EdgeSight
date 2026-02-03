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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
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

    load();
    return () => {
      cancelled = true;
    };
  }, [timeRange]);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader timeRange={timeRange} onTimeRangeChange={setTimeRange} />

      <main className="mx-auto max-w-[1600px] px-6 py-6">
        {error ? (
          <div className="mb-6 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm">
            <div className="font-medium">Couldn’t load stats</div>
            <div className="mt-1 opacity-80">{error}</div>
          </div>
        ) : null}

        {/* Temporary: still renders your components as-is.
            Next step: pass stats down as props. */}
        <SummaryCards />

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <RoutesTable />
          <InsightsPanel />
        </div>

        {/* Optional debugging (remove later) */}
        <div className="mt-6 text-xs opacity-70">
          <div>Loading: {String(loading)}</div>
          <div>Range: {timeRange}</div>
          <div>Stats loaded: {String(!!stats)}</div>
        </div>
      </main>
    </div>
  );
}
