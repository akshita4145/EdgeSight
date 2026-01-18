import {
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Zap,
  Shield,
  ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";

const insights = [
  {
    type: "warning",
    icon: AlertTriangle,
    title: "High latency detected",
    description:
      "/api/v1/analytics has P95 latency of 340ms. Consider adding caching or optimizing database queries.",
    action: "View details",
  },
  {
    type: "opportunity",
    icon: TrendingUp,
    title: "Traffic spike incoming",
    description:
      "Based on patterns, expect 40% more traffic tomorrow. Consider pre-scaling infrastructure.",
    action: "Configure auto-scale",
  },
  {
    type: "optimization",
    icon: Zap,
    title: "Cache optimization",
    description:
      "/api/v1/search could benefit from response caching. Potential 60% latency reduction.",
    action: "Enable caching",
  },
  {
    type: "security",
    icon: Shield,
    title: "Rate limiting recommended",
    description:
      "Unusual traffic patterns on /api/v1/auth/login. Consider implementing stricter rate limits.",
    action: "Configure limits",
  },
];

const getTypeStyles = (type: string) => {
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

export function InsightsPanel() {
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
        {insights.map((insight, index) => {
          const styles = getTypeStyles(insight.type);
          return (
            <div
              key={index}
              className="group p-4 transition-colors hover:bg-secondary/30"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${styles.bg}`}
                >
                  <insight.icon className={`h-4 w-4 ${styles.icon}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-foreground">
                    {insight.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {insight.description}
                  </p>
                  <Button
                    variant="link"
                    className="mt-2 h-auto p-0 text-xs text-chart-1 hover:text-chart-1/80"
                  >
                    {insight.action}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
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
