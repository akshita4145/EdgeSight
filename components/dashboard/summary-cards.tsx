import { Activity, Clock, Gauge, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";

type Totals = {
  total_requests: number;
  avg_latency_ms: number;
  cache_hit_rate: number; // 0..1
  est_cost_units: number;
};

type Deltas = {
  total_requests: number;
  avg_latency_ms: number;
  cache_hit_rate: number; // delta in 0..1 units
  est_cost_units: number;
};

function formatCompact(n: number) {
  return n.toLocaleString(undefined, { notation: "compact", maximumFractionDigits: 1 });
}

function formatSigned(n: number, opts?: { decimals?: number; suffix?: string }) {
  const decimals = opts?.decimals ?? 0;
  const suffix = opts?.suffix ?? "";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(decimals)}${suffix}`;
}

function pillStyles(tone: "good" | "bad" | "neutral") {
  //keep pill colors subtle and consistent with the current theme.
  if (tone === "neutral") return "bg-muted text-muted-foreground";
  if (tone === "good") return "bg-secondary text-foreground";
  return "bg-destructive/10 text-destructive";
}

export function SummaryCards({
  totals,
  deltas,
  loading,
}: {
  totals: Totals | null;
  deltas: Deltas | null;
  loading: boolean;
}) {
  const totalRequests = totals?.total_requests ?? 0;
  const avgLatency = totals?.avg_latency_ms ?? 0;
  const cacheHitPct = totals ? Math.round(totals.cache_hit_rate * 1000) / 10 : 0; // one decimal
  const estCost = totals?.est_cost_units ?? 0;

  //precompute delta values once so each card only handles display logic.
  const requestDelta = deltas?.total_requests ?? 0;
  const latencyDelta = deltas?.avg_latency_ms ?? 0;
  const costDelta = deltas?.est_cost_units ?? 0;
  const cacheDeltaPct = deltas ? Math.round(deltas.cache_hit_rate * 1000) / 10 : 0; //delta in percent points

  const cards = [
    {
      key: "requests",
      label: "Total Requests",
      value: loading ? "—" : formatCompact(totalRequests),
      icon: Activity,
      description: "in selected range",
      pill: () => {
        if (loading || !deltas) return { text: "—", tone: "neutral" as const };
        const tone = requestDelta === 0 ? "neutral" : requestDelta > 0 ? "good" : "bad";
        return { text: formatSigned(requestDelta), tone } as const;
      },
    },
    {
      key: "latency",
      label: "Avg Latency",
      value: loading ? "—" : `${avgLatency}ms`,
      icon: Clock,
      description: "overall",
      pill: () => {
        if (loading || !deltas) return { text: "—", tone: "neutral" as const };
        //higher latency is worse.
        const tone =
          latencyDelta === 0 ? "neutral" : latencyDelta < 0 ? "good" : "bad";
        return { text: formatSigned(latencyDelta, { decimals: 0, suffix: "ms" }), tone } as const;
      },
    },
    {
      key: "cost",
      label: "Compute Usage",
      value: loading ? "—" : `${estCost.toFixed(1)} GB-ms`,
      icon: Gauge,
      description: "estimated as memory x duration",
      pill: () => {
        if (loading || !deltas) return { text: "—", tone: "neutral" as const };
        //higher cost is worse.
        const tone = costDelta === 0 ? "neutral" : costDelta < 0 ? "good" : "bad";
        return { text: formatSigned(costDelta, { decimals: 1, suffix: " GB-ms" }), tone } as const;
      },
    },
    {
      key: "cache",
      label: "Cache Hit Rate",
      value: loading ? "—" : `${cacheHitPct}%`,
      icon: Zap,
      description: "cache hits / total",
      pill: () => {
        if (loading || !deltas) return { text: "—", tone: "neutral" as const };
        //higher cache hit rate is better.
        const tone =
          cacheDeltaPct === 0 ? "neutral" : cacheDeltaPct > 0 ? "good" : "bad";
        return { text: formatSigned(cacheDeltaPct, { decimals: 1, suffix: "%" }), tone } as const;
      },
    },
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const pill = card.pill();
        return (
          <Card
            key={card.key}
            className="group relative overflow-hidden border-border bg-card p-5 transition-all hover:border-muted-foreground/20"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <card.icon className="h-5 w-5 text-muted-foreground" />
              </div>

              <div
                className={`rounded-full px-2 py-1 text-xs font-medium ${pillStyles(
                  pill.tone
                )}`}
                title="Change vs previous period"
              >
                {pill.text}
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
        );
      })}
    </div>
  );
}
