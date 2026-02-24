// app/api/stats/route.ts

import { NextResponse } from "next/server";
import { computeStats } from "@/lib/telemetry";
import { generateInsights } from "@/lib/insights";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const range = url.searchParams.get("range") ?? "24h";

  const { totals, deltas, routes } = computeStats(range);
  const insights = generateInsights(totals, deltas, routes);

  return NextResponse.json({
    ok: true,
    range,
    totals,
    deltas,
    routes,
    insights,
  });
}

