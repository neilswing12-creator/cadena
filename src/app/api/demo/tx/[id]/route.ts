import { one, type Award } from "@/lib/db";
import { txProof, trail, levelOf } from "@/lib/demo";
import { awardFingerprint } from "@/lib/verify";
import { rateLimit, json } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/** GET /api/demo/tx/{recordId} — record, Merkle proof, block, and the budget-to-payment trail. */
export function GET(req: Request, { params }: { params: { id: string } }) {
  const limited = rateLimit(req); if (limited) return limited;
  if (!/^[0-9a-f]{24}$/.test(params.id)) return Response.json({ error: "not_found" }, { status: 404 });
  const a = one<Award>("SELECT * FROM award WHERE id = ?", params.id);
  const p = a ? txProof(a.id) : null;
  if (!a || !p) return Response.json({ error: "not_found" }, { status: 404 });
  const fp = awardFingerprint(a);
  return json({
    demo: true, note: "DEMO for public education. Not an official government ledger.",
    tx_hash: fp.hash, hashed_input: fp.input, level: levelOf(a),
    responsible_agency: a.organization, accountable_officer: null, certified: false,
    from: a.organization, to: a.awardee, amount: a.amount, award_date: a.award_date, reference: a.reference, title: a.title,
    block: p.block, tx_index: p.tx.tx_index, merkle_proof: p.proof,
    trail: trail(a).map(({ href, ...s }) => s),
  });
}
