"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { RoutesTable } from "@/components/dashboard/routes-table";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

function formatForDateTimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function parseLocalDateTimeToIso(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export default function HomePage() {
  const [timeRange, setTimeRange] = useState("24h");
  const [customStart, setCustomStart] = useState(() =>
    formatForDateTimeLocal(new Date(Date.now() - 24 * 60 * 60 * 1000))
  );
  const [customEnd, setCustomEnd] = useState(() => formatForDateTimeLocal(new Date()));
  const [refreshTick, setRefreshTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoMessage, setDemoMessage] = useState<string | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [deltas, setDeltas] = useState<Deltas | null>(null);
  const [routes, setRoutes] = useState<RouteStat[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<RouteStat | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      //refetch whenever the range changes or we manually trigger a refresh.
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("range", timeRange);
        if (timeRange === "custom") {
          const startIso = parseLocalDateTimeToIso(customStart);
          const endIso = parseLocalDateTimeToIso(customEnd);
          if (startIso) params.set("start", startIso);
          if (endIso) params.set("end", endIso);
        }

        const res = await fetch(`/api/stats?${params.toString()}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`Failed to load stats (${res.status})`);
        }

        const data = (await res.json()) as StatsResponse;
        //ignore late responses after unmount or dependency changes.
        if (cancelled) return;

        setTotals(data.totals);
        setDeltas(data.deltas);
        setRoutes(data.routes ?? []);
        setInsights(data.insights ?? []);
      } catch {
        if (cancelled) return;
        //show a safe empty state while keeping the page interactive.
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
  }, [timeRange, customStart, customEnd, refreshTick]);

  function handleOpenRoute(target: { route: string; runtime: string }) {
    //prefer an exact route+runtime match, then fall back to route-only.
    const match =
      routes.find((r) => r.route === target.route && String(r.runtime) === target.runtime) ??
      routes.find((r) => r.route === target.route) ??
      null;

    setSelectedRoute(match);
    setDrawerOpen(true);
  }

  async function hitEndpoint(path: string, count: number) {
    //fire a small burst in parallel so demo data appears quickly.
    const requests = Array.from({ length: count }, () =>
      fetch(path, { method: "GET", cache: "no-store" })
    );
    await Promise.all(requests);
  }

  async function handleGenerateDemoTraffic() {
    setDemoLoading(true);
    setDemoMessage("Generating demo traffic...");

    try {
      const initRes = await fetch("/api/db/init", { method: "POST" });
      if (!initRes.ok) {
        throw new Error(`DB init failed (${initRes.status})`);
      }

      //mix runtimes and cached/non-cached traffic so insights have variety.
      await hitEndpoint("/api/edge", 12);
      await hitEndpoint("/api/serverless", 12);
      await hitEndpoint("/api/cached", 12);
      await hitEndpoint("/api/cached", 12);

      setDemoMessage("Demo traffic generated. Refreshing dashboard...");
      //bump a counter to reuse the existing stats effect.
      setRefreshTick((n) => n + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setDemoMessage(`Failed to generate demo traffic: ${message}`);
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardHeader
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        customStart={customStart}
        customEnd={customEnd}
        onCustomStartChange={setCustomStart}
        onCustomEndChange={setCustomEnd}
      />

      <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-6 py-6">
        <Card className="flex flex-col gap-3 border-border/80 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold">Demo Data Generator</div>
            <div className="text-xs text-muted-foreground">
              Initializes the DB table and sends sample requests to demo endpoints.
            </div>
          </div>

          <div className="flex items-center gap-3">
            {demoMessage ? (
              <div className="max-w-[320px] text-xs text-muted-foreground">{demoMessage}</div>
            ) : null}
            <Button onClick={handleGenerateDemoTraffic} disabled={demoLoading}>
              {demoLoading ? "Generating..." : "Generate Demo Traffic"}
            </Button>
          </div>
        </Card>

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
