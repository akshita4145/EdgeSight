import { sql } from "@vercel/postgres";

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

export async function GET(request: Request) {
  const start = performance.now();

  // Simulate "work" (e.g., DB query / business logic)
  const workMs = 80 + Math.floor(Math.random() * 220); // 80–300ms
  await sleep(workMs);

  const latencyMs = Math.round(performance.now() - start);

  const route = new URL(request.url).pathname; // "/api/serverless"
  const runtime = "serverless";
  const cacheHit = false;

  await sql`
    INSERT INTO request_logs (route, runtime, latency_ms, cache_hit)
    VALUES (${route}, ${runtime}, ${latencyMs}, ${cacheHit})
  `;

  return Response.json({
    ok: true,
    route,
    runtime,
    cache_hit: cacheHit,
    latency_ms: latencyMs,
  });
}
