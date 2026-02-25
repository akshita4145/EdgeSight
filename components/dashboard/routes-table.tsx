"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RouteStat } from "@/components/ui/route-details-drawer";

function formatCompact(num: number) {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

export function RoutesTable({
  routes,
  loading,
  onOpenRoute,
}: {
  routes: RouteStat[];
  loading: boolean;
  onOpenRoute: (route: { route: string; runtime: string }) => void;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Routes</div>
        <div className="text-xs text-muted-foreground">Click a row to drill in</div>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading routes…</div>
        ) : routes.length === 0 ? (
          <div className="text-sm text-muted-foreground">No route stats yet — generate traffic.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead>Runtime</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Avg</TableHead>
                  <TableHead className="text-right">P95</TableHead>
                  <TableHead className="text-right">GB-ms</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {/*use route+runtime to preserve uniqueness across deployment targets.*/}
                {routes.map((r) => (
                  <TableRow
                    key={`${r.route}__${r.runtime}`}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onOpenRoute({ route: r.route, runtime: String(r.runtime) })}
                    title="Click to view details"
                  >
                    <TableCell className="font-mono text-xs">{r.route}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{String(r.runtime).toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCompact(r.requests)}</TableCell>
                    <TableCell className="text-right">{Math.round(r.avg_latency_ms)}ms</TableCell>
                    <TableCell className="text-right">{Math.round(r.p95_latency_ms)}ms</TableCell>
                    <TableCell className="text-right">{r.est_cost_units.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-2 text-xs text-muted-foreground">
              Tip: click any row to open the route details drawer.
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
