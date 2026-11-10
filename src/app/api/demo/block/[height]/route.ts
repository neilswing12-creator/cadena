import { all, type Award } from "@/lib/db";
import { getBlock, levelOf } from "@/lib/demo";
import { awardFingerprint } from "@/lib/verify";
import { rateLimit, csv, json } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/** GET /api/demo/block/{height}?format=json|csv — block header, signature and every record with its exact hashed input. */
export function GET(req: Request, { params }: { params: { height: string } }) {
  const limited = rateLimit(req); if (limited) return limited;
  const h = Number(params.height);
  const b = Number.isInteger(h) ? getBlock(h) : undefined;
  if (!b) return Response.json({ error: "not_found" }, { status: 404 });
  const awards = all<Award & { tx_index: number }>("SELECT a.*, t.tx_index FROM demo_tx t JOIN award a ON a.id = t.award_id WHERE t.height = ? ORDER BY t.tx_index", h);
  const txs = awards.map((a) => {
    const fp = awardFingerprint(a);
    return { tx_index: a.tx_index, tx_hash: fp.hash, record_id: a.id, level: levelOf(a), from: a.organization, to: a.awardee, amount: a.amount, award_date: a.award_date, reference: a.reference, title: a.title, hashed_input: fp.input };
  });
  if (new URL(req.url).searchParams.get("format") === "csv") return csv(txs, `pisoscan-demo-block-${h}.csv`);
  return json({ demo: true, note: "DEMO for public education. Not an official government ledger.", block: b, hashing: { leaf: "sha256(hashed_input)", merkle_parent: "sha256(left_hex + right_hex), odd last node paired with itself", block_hash: 'sha256(JSON.stringify(["pisoscan-demo", height, date, prev_hash, merkle_root, tx_count]))', signature: "Ed25519 over the block hash (UTF-8), demo key at /api/demo/public-key" }, transactions: txs });
}
