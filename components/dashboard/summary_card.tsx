import {
  Activity,
  Clock,
  DollarSign,
  Zap,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";

const stats = [
  {
    label: "Total Requests",
    value: "2.4M",
    change: "+12.5%",
    trend: "up",
    icon: Activity,
    description: "vs last period",
  },
  {
    label: "Avg Latency",
    value: "45ms",
    change: "-8.2%",
    trend: "down",
    icon: Clock,
    description: "vs last period",
  },
  {
    label: "Estimated Cost",
    value: "$1,284",
    change: "+4.1%",
    trend: "up",
    icon: DollarSign,
    description: "vs last period",
  },
  {
    label: "Cache Hit Rate",
    value: "94.2%",
    change: "+2.8%",
    trend: "up",
    icon: Zap,
    description: "vs last period",
  },
];

export function SummaryCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card
          key={stat.label}
          className="group relative overflow-hidden border-border bg-card p-5 transition-all hover:border-muted-foreground/20"
        >
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
              <stat.icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div
              className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                stat.trend === "up" && stat.label !== "Estimated Cost"
                  ? "bg-success/10 text-success"
                  : stat.trend === "down" && stat.label === "Avg Latency"
                    ? "bg-success/10 text-success"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {stat.trend === "up" ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {stat.change}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-2xl font-semibold tracking-tight text-foreground">
              {stat.value}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
          </div>

          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        </Card>
      ))}
    </div>
  );
}
