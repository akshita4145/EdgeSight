"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Zap, Shield, Activity, Database } from "lucide-react";

type Runtime = "edge" | "serverless";

export type RouteAgg = {
  route: string;
  runtime: Runtime;
  requests: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  cache_hit_rate: number; // 0..1
  est_cost_units: number;
};

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function ms(n: number) {
  return `${Math.round(n)}ms`;
}

function scoreRoute(r: RouteAgg) {
  // quick “impact score” for demo narrative
  const latencyScore = Math.min(100, r.p95_latency_ms / 6);
  const trafficScore = Math.min(100, r.requests / 3);
  const cachePenalty = (1 - r.cache_hit_rate) * 40;
  return Math.round(latencyScore * 0.5 + trafficScore * 0.3 + cachePenalty * 0.2);
}

function recommendedActions(r: RouteAgg) {
  const actions: Array<{ icon: any; title: string; detail: string }> = [];

  if (r.p95_latency_ms >= 200) {
    actions.push({
      icon: Activity,
      title: "Reduce tail latency",
      detail: "Audit upstream calls, add caching, and move heavy work off the request path.",
    });
  }

  if (r.cache_hit_rate < 0.25 && r.requests >= 30) {
    actions.push({
      icon: Database,
      title: "Add caching / ISR",
      detail: "Cache expensive responses at the edge, use ISR for pages, and memoize DB-heavy calls.",
    });
  }

  if (r.runtime === "serverless" && r.avg_latency_ms <= 120 && r.requests >= 80) {
    actions.push({
      icon: Zap,
      title: "Consider Edge runtime",
      detail: "This looks like a good Edge candidate for lower global latency and fewer cold start spikes.",
    });
  }

  actions.push({
    icon: Shield,
    title: "Security guardrails",
    detail: "Add auth checks, rate limiting for bursts, and validate inputs for this endpoint.",
  });

  return actions.slice(0, 4);
}

export function RouteDetailsDrawer({
  open,
  onOpenChange,
  route,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  route: RouteAgg | null;
}) {
  const impact = route ? scoreRoute(route) : 0;
  const actions = route ? recommendedActions(route) : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Route details</SheetTitle>
          <SheetDescription>Drill into performance, cache behavior, and actions.</SheetDescription>
        </SheetHeader>

        {!route ? (
          <div className="text-sm text-muted-foreground">Select an insight or route to view details.</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-base font-semibold">{route.route}</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge variant="secondary">{route.runtime.toUpperCase()}</Badge>
                  <Badge variant="outline">Impact score: {impact}</Badge>
                </div>
              </div>

              <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(route.route)}>
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
                <div className="mt-1 text-lg font-semibold">{pct(route.cache_hit_rate)}</div>
              </Card>

              <Card className="p-3">
                <div className="text-xs text-muted-foreground">Avg latency</div>
                <div className="mt-1 text-lg font-semibold">{ms(route.avg_latency_ms)}</div>
              </Card>

              <Card className="p-3">
                <div className="text-xs text-muted-foreground">P95 latency</div>
                <div className="mt-1 text-lg font-semibold">{ms(route.p95_latency_ms)}</div>
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
                Demo tip: swap this button to deep-link to Sentry/Datadog/Vercel Logs later.
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}