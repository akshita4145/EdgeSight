"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { RoutesTable } from "@/components/dashboard/routes-table";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import {
  RouteDetailsDrawer,
  type RouteStat,
} from "@/components/ui/route-details-drawer";

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

type StatsResponse = {
  ok: boolean;
  range: string;
  totals: Totals;
  deltas: Deltas;
  routes: RouteStat[];
  insights: string[];
};

export default function HomePage() {
  const [timeRange, setTimeRange] = useState("24h");
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [deltas, setDeltas] = useState<Deltas | null>(null);
  const [routes, setRoutes] = useState<RouteStat[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<RouteStat | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);
      try {
        const res = await fetch(`/api/stats?range=${encodeURIComponent(timeRange)}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`Failed to load stats (${res.status})`);
        }

        const data = (await res.json()) as StatsResponse;
        if (cancelled) return;

        setTotals(data.totals);
        setDeltas(data.deltas);
        setRoutes(data.routes ?? []);
        setInsights(data.insights ?? []);
      } catch {
        if (cancelled) return;
        setTotals(null);
        setDeltas(null);
        setRoutes([]);
        setInsights(["Unable to load stats right now. Check the demo API routes and try again."]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, [timeRange]);

  function handleOpenRoute(target: { route: string; runtime: string }) {
    const match =
      routes.find((r) => r.route === target.route && String(r.runtime) === target.runtime) ??
      routes.find((r) => r.route === target.route) ??
      null;

    setSelectedRoute(match);
    setDrawerOpen(true);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardHeader timeRange={timeRange} onTimeRangeChange={setTimeRange} />

      <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-6 py-6">
        <SummaryCards totals={totals} deltas={deltas} loading={loading} />

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <RoutesTable routes={routes} loading={loading} onOpenRoute={handleOpenRoute} />
          <InsightsPanel
            insights={insights}
            routes={routes}
            loading={loading}
            onOpenRoute={handleOpenRoute}
          />
        </div>
      </main>

      <RouteDetailsDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        route={selectedRoute}
      />
    </div>
  );
}
