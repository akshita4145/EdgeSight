import { sql } from "@vercel/postgres";

export async function POST() {
  await sql`
    CREATE TABLE IF NOT EXISTS request_logs (
      id SERIAL PRIMARY KEY,
      route TEXT NOT NULL,
      runtime TEXT NOT NULL,
      latency_ms INT NOT NULL,
      cache_hit BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  return Response.json({ ok: true });
}
