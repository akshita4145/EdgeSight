"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, ArrowRight, Database, Shield, X, Zap } from "lucide-react";

export type RouteStat = {
  route: string;
  runtime: "edge" | "serverless" | string;
  requests: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  cache_hit_rate: number; // 0..1
  est_cost_units: number;
};

function formatPct01(n: number) {
  return `${Math.round(n * 100)}%`;
}

function scoreRoute(r: RouteStat) {
  const latencyScore = Math.min(100, r.p95_latency_ms / 6);
  const trafficScore = Math.min(100, r.requests / 3);
  const cachePenalty = (1 - r.cache_hit_rate) * 40;
  return Math.round(latencyScore * 0.5 + trafficScore * 0.3 + cachePenalty * 0.2);
}

function recommendedActions(r: RouteStat) {
  const actions: Array<{ icon: any; title: string; detail: string }> = [];

  if (r.p95_latency_ms >= 200) {
    actions.push({
      icon: Activity,
      title: "Reduce tail latency",
      detail: "Inspect upstream calls, add caching, and move heavy work off the request path.",
    });
  }

  if (r.cache_hit_rate < 0.25 && r.requests >= 30) {
    actions.push({
      icon: Database,
      title: "Improve caching / ISR",
      detail: "Cache responses at the edge, use ISR for pages, and memoize DB-heavy lookups.",
    });
  }

  if (r.runtime === "serverless" && r.avg_latency_ms <= 120 && r.requests >= 80) {
    actions.push({
      icon: Zap,
      title: "Consider Edge runtime",
      detail: "Looks like an Edge candidate for lower tail latency and fewer cold-start spikes.",
    });
  }

  actions.push({
    icon: Shield,
    title: "Security guardrails",
    detail: "Add auth checks, basic rate limiting, and validate inputs for this endpoint.",
    },
  );

  return actions.slice(0, 4);
}

export function RouteDetailsDrawer({
  open,
  onOpenChange,
  route,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  route: RouteStat | null;
}) {
  if (!open) return null;

  const impact = route ? scoreRoute(route) : 0;
  const actions = route ? recommendedActions(route) : [];

  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* drawer */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md border-l bg-background p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Route details</div>
            <div className="text-sm text-muted-foreground">
              Drill into performance, cache behavior, and recommended actions.
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="mt-5">
          {!route ? (
            <div className="text-sm text-muted-foreground">
              Select an insight or route to view details.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold">{route.route}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="secondary">{String(route.runtime).toUpperCase()}</Badge>
                    <Badge variant="outline">Impact score: {impact}</Badge>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(route.route)}
                >
                  Copy
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Requests</div>
                  <div className="mt-1 text-lg font-semibold">{route.requests}</div>
                </Card>

                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Cache hit rate</div>
                  <div className="mt-1 text-lg font-semibold">{formatPct01(route.cache_hit_rate)}</div>
                </Card>

                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Avg latency</div>
                  <div className="mt-1 text-lg font-semibold">{Math.round(route.avg_latency_ms)}ms</div>
                </Card>

                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">P95 latency</div>
                  <div className="mt-1 text-lg font-semibold">{Math.round(route.p95_latency_ms)}ms</div>
                </Card>

                <Card className="p-3 col-span-2">
                  <div className="text-xs text-muted-foreground">Estimated cost units</div>
                  <div className="mt-1 text-lg font-semibold">{route.est_cost_units.toFixed(2)}</div>
                </Card>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold">Recommended actions</div>
                <div className="space-y-2">
                  {actions.map((a, i) => (
                    <Card key={i} className="p-3">
                      <div className="flex gap-3">
                        <a.icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{a.title}</div>
                          <div className="text-xs text-muted-foreground">{a.detail}</div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <Button className="w-full" onClick={() => alert("Demo: connect to tracing/logs here")}>
                  View traces <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <div className="mt-2 text-xs text-muted-foreground">
                  Demo tip: later deep-link this to Vercel Logs / Sentry / Datadog.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}