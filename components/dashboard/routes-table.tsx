"use client";

import { useMemo, useState } from "react";
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

type RouteStat = {
  route: string;
  runtime: string; // "edge" | "serverless"
  requests: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  est_cost_units: number;
  cache_hit_rate: number; // 0..1
};

type SortKey =
  | "route"
  | "runtime"
  | "requests"
  | "avg_latency_ms"
  | "p95_latency_ms"
  | "est_cost_units";

function formatCompact(num: number) {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

function getLatencyColor(latency: number) {
  if (latency < 50) return "text-success";
  if (latency < 100) return "text-warning";
  return "text-destructive";
}

function runtimeBadge(runtime: string) {
  const isEdge = runtime === "edge";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        isEdge ? "bg-secondary text-foreground" : "bg-muted text-muted-foreground"
      }`}
    >
      {isEdge ? "Edge" : "Serverless"}
    </span>
  );
}

export function RoutesTable({
  routes,
  loading,
}: {
  routes: RouteStat[];
  loading: boolean;
}) {
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

  const filteredAndSortedRoutes = useMemo(() => {
    const filtered = routes.filter((r) =>
      r.route.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sorted = filtered.sort((a, b) => {
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

    return sorted;
  }, [routes, searchQuery, sortKey, sortOrder]);

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return null;
    return sortOrder === "asc" ? (
      <ChevronUp className="ml-1 inline h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 inline h-4 w-4" />
    );
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
            className="bg-secondary pl-9 border-border"
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
                className="cursor-pointer text-muted-foreground hover:text-foreground"
                onClick={() => handleSort("runtime")}
              >
                Runtime
                <SortIcon column="runtime" />
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
                onClick={() => handleSort("avg_latency_ms")}
              >
                Avg Latency (ms)
                <SortIcon column="avg_latency_ms" />
              </TableHead>

              <TableHead
                className="cursor-pointer text-right text-muted-foreground hover:text-foreground"
                onClick={() => handleSort("p95_latency_ms")}
              >
                P95 Latency (ms)
                <SortIcon column="p95_latency_ms" />
              </TableHead>

              <TableHead
                className="cursor-pointer text-right text-muted-foreground hover:text-foreground"
                onClick={() => handleSort("est_cost_units")}
              >
                Est. Cost
                <SortIcon column="est_cost_units" />
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              // Lightweight loading state
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i} className="border-border">
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    —
                  </TableCell>
                  <TableCell className="text-muted-foreground">—</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    —
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    —
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    —
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    —
                  </TableCell>
                </TableRow>
              ))
            ) : filteredAndSortedRoutes.length === 0 ? (
              <TableRow className="border-border">
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No routes found.
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedRoutes.map((r) => (
                <TableRow
                  key={`${r.route}:${r.runtime}`}
                  className="border-border transition-colors hover:bg-secondary/50"
                >
                  <TableCell className="font-mono text-sm text-foreground">
                    {r.route}
                  </TableCell>

                  <TableCell>{runtimeBadge(r.runtime)}</TableCell>

                  <TableCell className="text-right tabular-nums text-foreground">
                    {formatCompact(r.requests)}
                  </TableCell>

                  <TableCell
                    className={`text-right tabular-nums ${getLatencyColor(
                      r.avg_latency_ms
                    )}`}
                  >
                    {r.avg_latency_ms}
                  </TableCell>

                  <TableCell
                    className={`text-right tabular-nums ${getLatencyColor(
                      r.p95_latency_ms
                    )}`}
                  >
                    {r.p95_latency_ms}
                  </TableCell>

                  <TableCell className="text-right tabular-nums text-foreground">
                    {r.est_cost_units.toFixed(2)} units
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="border-t border-border p-3">
        <p className="text-xs text-muted-foreground">
          Showing {filteredAndSortedRoutes.length} of {routes.length} routes
        </p>
      </div>
    </Card>
  );
}
