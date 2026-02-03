import {
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Zap,
  Shield,
  ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type InsightType = "warning" | "opportunity" | "optimization" | "security" | "default";

function classifyInsight(text: string): InsightType {
  const t = text.toLowerCase();
  if (t.includes("latency") || t.includes("spike") || t.includes("slow")) return "warning";
  if (t.includes("cache") || t.includes("caching")) return "optimization";
  if (t.includes("rate") || t.includes("security") || t.includes("auth")) return "security";
  if (t.includes("consider") || t.includes("could") || t.includes("opportunity")) return "opportunity";
  return "default";
}

function iconFor(type: InsightType) {
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

const getTypeStyles = (type: InsightType) => {
  switch (type) {
    case "warning":
      return {
        bg: "bg-warning/10",
        border: "border-warning/20",
        icon: "text-warning",
      };
    case "opportunity":
      return {
        bg: "bg-chart-1/10",
        border: "border-chart-1/20",
        icon: "text-chart-1",
      };
    case "optimization":
      return {
        bg: "bg-success/10",
        border: "border-success/20",
        icon: "text-success",
      };
    case "security":
      return {
        bg: "bg-chart-4/10",
        border: "border-chart-4/20",
        icon: "text-chart-4",
      };
    default:
      return {
        bg: "bg-muted",
        border: "border-border",
        icon: "text-muted-foreground",
      };
  }
};

export function InsightsPanel({
  insights,
  loading,
}: {
  insights: string[];
  loading: boolean;
}) {
  const items = (loading ? Array.from({ length: 4 }).map(() => "…") : insights).slice(0, 6);

  return (
    <Card className="h-fit border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border p-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
          <Lightbulb className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">Insights</h2>
          <p className="text-xs text-muted-foreground">
            AI-powered recommendations
          </p>
        </div>
      </div>

      <div className="divide-y divide-border">
        {items.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No insights yet.</div>
        ) : (
          items.map((text, index) => {
            const type = text === "…" ? "default" : classifyInsight(text);
            const Icon = iconFor(type);
            const styles = getTypeStyles(type);

            const title =
              text === "…"
                ? "Loading insight…"
                : type === "warning"
                ? "Potential issue"
                : type === "optimization"
                ? "Optimization"
                : type === "security"
                ? "Security"
                : type === "opportunity"
                ? "Opportunity"
                : "Insight";

            const description = text === "…" ? "—" : text;

            return (
              <div
                key={index}
                className="group p-4 transition-colors hover:bg-secondary/30"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${styles.bg}`}
                  >
                    <Icon className={`h-4 w-4 ${styles.icon}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-foreground">
                      {title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {description}
                    </p>

                    <Button
                      variant="link"
                      disabled={text === "…"}
                      className="mt-2 h-auto p-0 text-xs text-chart-1 hover:text-chart-1/80 disabled:opacity-50"
                    >
                      View details
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-border p-4">
        <Button
          variant="ghost"
          className="w-full justify-center text-sm text-muted-foreground hover:text-foreground"
        >
          View all insights
        </Button>
      </div>
    </Card>
  );
}
