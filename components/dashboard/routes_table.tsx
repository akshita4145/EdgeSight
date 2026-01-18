"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const routesData = [
  {
    route: "/api/v1/users",
    requests: 842500,
    avgLatency: 32,
    p95Latency: 89,
    cost: 324.5,
  },
  {
    route: "/api/v1/auth/login",
    requests: 456200,
    avgLatency: 45,
    p95Latency: 120,
    cost: 182.48,
  },
  {
    route: "/api/v1/products",
    requests: 389100,
    avgLatency: 28,
    p95Latency: 65,
    cost: 155.64,
  },
  {
    route: "/api/v1/orders",
    requests: 234800,
    avgLatency: 67,
    p95Latency: 180,
    cost: 140.88,
  },
  {
    route: "/api/v1/analytics",
    requests: 198400,
    avgLatency: 125,
    p95Latency: 340,
    cost: 198.4,
  },
  {
    route: "/api/v1/search",
    requests: 156300,
    avgLatency: 89,
    p95Latency: 210,
    cost: 125.04,
  },
  {
    route: "/api/v1/webhooks",
    requests: 89200,
    avgLatency: 15,
    p95Latency: 35,
    cost: 35.68,
  },
  {
    route: "/api/v1/notifications",
    requests: 67500,
    avgLatency: 22,
    p95Latency: 55,
    cost: 27.0,
  },
];

type SortKey = "route" | "requests" | "avgLatency" | "p95Latency" | "cost";

export function RoutesTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("requests");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  const filteredAndSortedRoutes = routesData
    .filter((route) =>
      route.route.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      return sortOrder === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return null;
    return sortOrder === "asc" ? (
      <ChevronUp className="ml-1 inline h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 inline h-4 w-4" />
    );
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 50) return "text-success";
    if (latency < 100) return "text-warning";
    return "text-destructive";
  };

  return (
    <Card className="border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="text-base font-semibold text-foreground">
          Routes Overview
        </h2>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search routes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead
                className="cursor-pointer text-muted-foreground hover:text-foreground"
                onClick={() => handleSort("route")}
              >
                Route
                <SortIcon column="route" />
              </TableHead>
              <TableHead
                className="cursor-pointer text-right text-muted-foreground hover:text-foreground"
                onClick={() => handleSort("requests")}
              >
                Requests
                <SortIcon column="requests" />
              </TableHead>
              <TableHead
                className="cursor-pointer text-right text-muted-foreground hover:text-foreground"
                onClick={() => handleSort("avgLatency")}
              >
                Avg Latency (ms)
                <SortIcon column="avgLatency" />
              </TableHead>
              <TableHead
                className="cursor-pointer text-right text-muted-foreground hover:text-foreground"
                onClick={() => handleSort("p95Latency")}
              >
                P95 Latency (ms)
                <SortIcon column="p95Latency" />
              </TableHead>
              <TableHead
                className="cursor-pointer text-right text-muted-foreground hover:text-foreground"
                onClick={() => handleSort("cost")}
              >
                Est. Cost
                <SortIcon column="cost" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedRoutes.map((route) => (
              <TableRow
                key={route.route}
                className="border-border transition-colors hover:bg-secondary/50"
              >
                <TableCell className="font-mono text-sm text-foreground">
                  {route.route}
                </TableCell>
                <TableCell className="text-right tabular-nums text-foreground">
                  {formatNumber(route.requests)}
                </TableCell>
                <TableCell
                  className={`text-right tabular-nums ${getLatencyColor(route.avgLatency)}`}
                >
                  {route.avgLatency}
                </TableCell>
                <TableCell
                  className={`text-right tabular-nums ${getLatencyColor(route.p95Latency)}`}
                >
                  {route.p95Latency}
                </TableCell>
                <TableCell className="text-right tabular-nums text-foreground">
                  ${route.cost.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="border-t border-border p-3">
        <p className="text-xs text-muted-foreground">
          Showing {filteredAndSortedRoutes.length} of {routesData.length} routes
        </p>
      </div>
    </Card>
  );
}
