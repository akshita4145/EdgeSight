import { Activity, Clock, DollarSign, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";

type Totals = {
  total_requests: number;
  avg_latency_ms: number;
  cache_hit_rate: number; // 0..1
  est_cost_units: number;
};

function formatCompact(n: number) {
  return n.toLocaleString(undefined, { notation: "compact", maximumFractionDigits: 1 });
}

export function SummaryCards({
  totals,
  loading,
}: {
  totals: Totals | null;
  loading: boolean;
}) {
  const totalRequests = totals?.total_requests ?? 0;
  const avgLatency = totals?.avg_latency_ms ?? 0;
  const cacheHitPct = totals ? Math.round(totals.cache_hit_rate * 1000) / 10 : 0; // one decimal
  const estCost = totals?.est_cost_units ?? 0;

  const cards = [
    {
      label: "Total Requests",
      value: loading ? "—" : formatCompact(totalRequests),
      icon: Activity,
      description: "in selected range",
    },
    {
      label: "Avg Latency",
      value: loading ? "—" : `${avgLatency}ms`,
      icon: Clock,
      description: "overall",
    },
    {
      label: "Estimated Cost",
      value: loading ? "—" : `${estCost.toFixed(2)} units`,
      icon: DollarSign,
      description: "relative estimate",
    },
    {
      label: "Cache Hit Rate",
      value: loading ? "—" : `${cacheHitPct}%`,
      icon: Zap,
      description: "cache hits / total",
    },
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.label}
          className="group relative overflow-hidden border-border bg-card p-5 transition-all hover:border-muted-foreground/20"
        >
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
              <card.icon className="h-5 w-5 text-muted-foreground" />
            </div>

            {/* Placeholder for “change vs last period” (we’ll wire this later) */}
            <div className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
              —
            </div>
          </div>

          <div className="mt-4">
            <p className="text-2xl font-semibold tracking-tight text-foreground">
              {card.value}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
          </div>

          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        </Card>
      ))}
    </div>
  );
}
