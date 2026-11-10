import { all } from "@/lib/db";
import { tipHeight, type Block } from "@/lib/demo";
import { rateLimit, csv, json } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
const NOTE = "DEMO for public education. Built by PisoScan from published PhilGEPS records; not an official government ledger.";

/** GET /api/demo/blocks?page=1&limit=25&format=json|csv — newest first. */
export function GET(req: Request) {
  const limited = rateLimit(req); if (limited) return limited;
  const u = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(u.searchParams.get("limit")) || 25));
  const page = Math.max(1, Number(u.searchParams.get("page")) || 1);
  const tip = tipHeight();
  const rows = all<Block>("SELECT * FROM demo_block WHERE height <= ? ORDER BY height DESC LIMIT ?", tip - (page - 1) * limit, limit);
  if (u.searchParams.get("format") === "csv") return csv(rows as unknown as Record<string, unknown>[], `pisoscan-demo-blocks-p${page}.csv`);
  return json({ demo: true, note: NOTE, tip, page, limit, pages: Math.ceil(tip / limit), blocks: rows });
}
