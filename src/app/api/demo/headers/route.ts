import { all } from "@/lib/db";
import { demoPublicKeyPem, type Block } from "@/lib/demo";
import { rateLimit, csv, json } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/** GET /api/demo/headers?format=json|csv — every block header and signature, for mirrors. */
export function GET(req: Request) {
  const limited = rateLimit(req); if (limited) return limited;
  const rows = all<Block>("SELECT * FROM demo_block ORDER BY height");
  if (new URL(req.url).searchParams.get("format") === "csv") return csv(rows as unknown as Record<string, unknown>[], "pisoscan-demo-headers.csv");
  return json({ demo: true, note: "DEMO for public education. Not an official government ledger.", public_key: demoPublicKeyPem(), count: rows.length, headers: rows }, "pisoscan-demo-headers.json");
}
