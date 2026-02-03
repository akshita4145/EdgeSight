export const runtime = "edge";

import { sql } from "@vercel/postgres";

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

export async function GET(request: Request) {
  const start = performance.now();

  // Simulate lighter/faster work (edge-friendly)
  const workMs = 15 + Math.floor(Math.random() * 60); // 15–75ms
  await sleep(workMs);

  const latencyMs = Math.round(performance.now() - start);

  const route = new URL(request.url).pathname; // "/api/edge"
  const runtimeName = "edge";
  const cacheHit = false;

  await sql`
    INSERT INTO request_logs (route, runtime, latency_ms, cache_hit)
    VALUES (${route}, ${runtimeName}, ${latencyMs}, ${cacheHit})
  `;

  return Response.json({
    ok: true,
    route,
    runtime: runtimeName,
    cache_hit: cacheHit,
    latency_ms: latencyMs,
  });
}
