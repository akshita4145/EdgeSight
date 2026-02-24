"use client";

import { AlertTriangle, ArrowRight, Lightbulb, Shield, TrendingUp, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { RouteStat } from "@/components/ui/route-details-drawer";

type InsightType = "warning" | "opportunity" | "optimization" | "security" | "default";

function extractRouteHint(text: string): string | null {
  const m = text.match(/(\/api\/[a-zA-Z0-9/_-]+)/);
  return m?.[1] ?? null;
}

function classifyInsight(text: string): InsightType {
  const t = text.toLowerCase();
  if (t.includes("latency") || t.includes("slow") || t.includes("p95")) return "warning";
  if (t.includes("cache") || t.includes("caching") || t.includes("isr")) return "optimization";
  if (t.includes("security") || t.includes("auth") || t.includes("rate limit")) return "security";
  if (t.includes("opportunity") || t.includes("consider") || t.includes("candidate")) return "opportunity";
  return "default";
}

function iconForInsight(type: InsightType) {
  switch (type) {
    case "warning":
      return AlertTriangle;
    case "opportunity":
      return TrendingUp;
    case "optimization":
      return Zap;
    case "security":
      return Shield;
    default:
      return Lightbulb;
  }
}

function badgeForInsight(type: InsightType) {
  switch (type) {
    case "warning":
      return { label: "Warning", variant: "destructive" as const };
    case "opportunity":
      return { label: "Opportunity", variant: "secondary" as const };
    case "optimization":
      return { label: "Optimization", variant: "outline" as const };
    case "security":
      return { label: "Security", variant: "outline" as const };
    default:
      return { label: "Insight", variant: "outline" as const };
  }
}

export function InsightsPanel({
  insights,
  routes,
  loading,
  onOpenRoute,
}: {
  insights: string[];
  routes: RouteStat[];
  loading: boolean;
  onOpenRoute: (route: { route: string; runtime: string }) => void;
}) {
  const worst =
    routes.length > 0 ? [...routes].sort((a, b) => b.p95_latency_ms - a.p95_latency_ms)[0] : null;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Insights</div>
        <div className="text-xs text-muted-foreground">Actionable recommendations</div>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading insights…</div>
        ) : insights.length === 0 ? (
          <div className="text-sm text-muted-foreground">No insights yet — generate traffic.</div>
        ) : (
          insights.map((text, idx) => {
            const type = classifyInsight(text);
            const Icon = iconForInsight(type);
            const badge = badgeForInsight(type);
            const routeHint = extractRouteHint(text);

            return (
              <Card key={idx} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-md border p-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={badge.variant}>{badge.label}</Badge>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => {
                          if (routeHint) {
                            const match =
                              routes.find((r) => r.route === routeHint) ??
                              routes.find((r) => r.route.includes(routeHint)) ??
                              null;

                            if (match) {
                              onOpenRoute({ route: match.route, runtime: String(match.runtime) });
                              return;
                            }
                          }

                          if (worst) onOpenRoute({ route: worst.route, runtime: String(worst.runtime) });
                        }}
                      >
                        View details <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mt-2 text-sm text-foreground">{text}</div>

                    {routeHint ? (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Related route: <span className="font-mono">{routeHint}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </Card>
  );
}