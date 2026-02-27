"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { RoutesTable } from "@/components/dashboard/routes-table";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type DataSource = "edgesight" | "flowfund";
const FLOWFUND_BASE_URL = "https://v0-flowfund-cashflow.vercel.app";

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
  const [dataSource, setDataSource] = useState<DataSource>("edgesight");
  const [flowfundMode, setFlowfundMode] = useState<"healthy" | "at-risk">("healthy");
  const [flowfundSidebarCollapsed, setFlowfundSidebarCollapsed] = useState(false);
  const [timeRange, setTimeRange] = useState("24h");
  const [customStart, setCustomStart] = useState(() =>
    formatForDateTimeLocal(new Date(Date.now() - 24 * 60 * 60 * 1000))
  );
  const [customEnd, setCustomEnd] = useState(() => formatForDateTimeLocal(new Date()));
  const [refreshTick, setRefreshTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoMessage, setDemoMessage] = useState<string | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [deltas, setDeltas] = useState<Deltas | null>(null);
  const [routes, setRoutes] = useState<RouteStat[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<RouteStat | null>(null);

  useEffect(() => {
    if (dataSource !== "flowfund") return;

    const interval = window.setInterval(() => {
      setRefreshTick((n) => n + 1);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [dataSource]);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      //refetch whenever the range changes or we manually trigger a refresh.
      const hasExistingData = totals !== null || routes.length > 0 || insights.length > 0;
      if (hasExistingData) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        const params = new URLSearchParams();
        params.set("range", timeRange);
        params.set("source", dataSource);
        if (dataSource === "flowfund") {
          params.set("flowfundMode", flowfundMode);
          params.set("flowfundBaseUrl", FLOWFUND_BASE_URL);
        }
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
        if (!cancelled) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, [timeRange, customStart, customEnd, refreshTick, dataSource, flowfundMode]);

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

  const showInsightsSidebar = !(dataSource === "flowfund" && flowfundSidebarCollapsed);

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
        <Card className="flex flex-col gap-4 border-border/80 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-semibold">Data Source</div>
              <div className="text-xs text-muted-foreground">
                Switch between EdgeSight demo telemetry and a live FlowFund connection.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={dataSource}
                onValueChange={(value) => setDataSource(value as DataSource)}
              >
                <SelectTrigger className="w-[220px] border-border bg-secondary">
                  <SelectValue placeholder="Select data source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="edgesight">EdgeSight Demo</SelectItem>
                  <SelectItem value="flowfund">FlowFund Live</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={() => setRefreshTick((n) => n + 1)}>
                {isRefreshing ? "Refreshing..." : "Refresh now"}
              </Button>
            </div>
          </div>

          {dataSource === "edgesight" ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="text-xs text-muted-foreground">
                  Auto-refresh every 5s while in FlowFund Live mode. FlowFund transactions are
                  date-based, so `7d` or `30d` is usually more representative than `24h`.
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <div className="min-w-[180px]">
                    <div className="mb-1 text-xs text-muted-foreground">FlowFund Mode</div>
                    <Select
                      value={flowfundMode}
                      onValueChange={(value) => setFlowfundMode(value as "healthy" | "at-risk")}
                    >
                      <SelectTrigger className="w-full border-border bg-secondary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="healthy">healthy</SelectItem>
                        <SelectItem value="at-risk">at-risk</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setFlowfundSidebarCollapsed((v) => !v)}
                    className="self-end"
                  >
                    {flowfundSidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() => setRefreshTick((n) => n + 1)}
                    className="self-end"
                  >
                    Reconnect
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Connected FlowFund URL: {FLOWFUND_BASE_URL}
              </div>
            </div>
          )}
        </Card>

        <SummaryCards totals={totals} deltas={deltas} loading={loading} />

        <div
          className={`grid gap-6 ${
            showInsightsSidebar ? "xl:grid-cols-[1.2fr_0.8fr]" : "xl:grid-cols-1"
          }`}
        >
          <RoutesTable routes={routes} loading={loading} onOpenRoute={handleOpenRoute} />
          {showInsightsSidebar ? (
            <InsightsPanel
              insights={insights}
              routes={routes}
              loading={loading}
              onOpenRoute={handleOpenRoute}
            />
          ) : null}
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
