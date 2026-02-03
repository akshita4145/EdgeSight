import { sql } from "@vercel/postgres";

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

// Simple in-memory cache (persists while the server instance lives)
const globalForCache = globalThis as unknown as {
  __edgesight_cache?: Map<string, { value: unknown; expiresAt: number }>;
};

const cache =
  globalForCache.__edgesight_cache ??
  (globalForCache.__edgesight_cache = new Map());

export async function GET(request: Request) {
  const start = performance.now();

  const url = new URL(request.url);
  const route = url.pathname; // "/api/cached"

  // Cache key can depend on time range or user, but keep it simple:
  const key = "cached:demo";
  const now = Date.now();

  const cached = cache.get(key);
  const isHit = !!cached && cached.expiresAt > now;

  if (!isHit) {
    // Simulate expensive compute only on cache MISS
    const workMs = 120 + Math.floor(Math.random() * 200); // 120–320ms
    await sleep(workMs);

    cache.set(key, {
      value: { message: "fresh data", generatedAt: new Date().toISOString() },
      expiresAt: now + 15_000, // 15s TTL
    });
  }

  const latencyMs = Math.round(performance.now() - start);

  const runtime = "serverless"; // keep as serverless for comparison
  await sql`
    INSERT INTO request_logs (route, runtime, latency_ms, cache_hit)
    VALUES (${route}, ${runtime}, ${latencyMs}, ${isHit})
  `;

  // These headers mimic cache behavior for demos (not required)
  const headers = new Headers();
  headers.set("Cache-Control", "public, max-age=15");
  headers.set("X-EdgeSight-Cache", isHit ? "HIT" : "MISS");

  return new Response(
    JSON.stringify({
      ok: true,
      route,
      runtime,
      cache_hit: isHit,
      latency_ms: latencyMs,
      ttl_seconds: 15,
    }),
    { headers }
  );
}
