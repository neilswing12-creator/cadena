import Link from "next/link";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { verifyChain, checkBlock, getBlock } from "@/lib/demo";
import { Card, TableWrap } from "@/components/ui";
import { num, short } from "@/lib/format";

export const metadata = { title: "Verify the chain" };

export default function Verify({ searchParams }: { searchParams: { deep?: string } }) {
  const t0 = Date.now();
  const v = verifyChain();
  const ms = Date.now() - t0;
  // Deep check: rebuild the Merkle roots of the 20 latest blocks from their records.
  const deep = searchParams.deep === "1"
    ? Array.from({ length: Math.min(20, v.blocks) }, (_, i) => { const b = getBlock(v.tip.height - i)!; const c = checkBlock(b); return { b, ok: c.rootOk && c.hashOk && c.linked }; })
    : null;
  return (
    <div className="wrap max-w-[960px] space-y-5 pb-4 pt-6">
      <h1 className="text-xl font-semibold">Verify the chain</h1>
      <Card bodyClass="p-4">
        {v.problems.length ? (
          <div className="flex items-start gap-2 text-bad"><AlertTriangle size={20} className="mt-0.5 shrink-0" /><div><div className="font-medium">{num(v.problems.length)} problems found</div><ul className="mt-1 text-sm">{v.problems.slice(0, 20).map((p) => <li key={p.height + p.issue}>Block <Link href={`/demo/block/${p.height}`}>#{p.height}</Link> {p.issue}</li>)}</ul></div></div>
        ) : (
          <div className="flex items-start gap-2"><CheckCircle2 size={20} className="mt-0.5 shrink-0 text-ok" /><div><div className="font-medium">All {num(v.blocks)} blocks check out</div><p className="text-sm text-ink-mute">Every block header was re-hashed and every block points to the hash of the one before it, from #1 to <Link href={`/demo/block/${v.tip.height}`} className="mono">#{num(v.tip.height)}</Link> (tip <span className="mono">{short(v.tip.hash, 10, 6)}</span>). Took {num(ms)} ms on this server.</p></div></div>
        )}
      </Card>
      <Card title="Deep check" bodyClass="p-4 text-sm">
        <p className="text-ink-mute">The quick check above trusts each block&apos;s stored Merkle root. The deep check rebuilds it from the actual records, re-hashing every award in the 20 latest blocks.</p>
        {deep ? (
          <TableWrap>
            <table className="tbl mt-3"><thead><tr><th>Block</th><th className="text-right">Records re-hashed</th><th>Result</th></tr></thead>
              <tbody>{deep.map(({ b, ok }) => <tr key={b.height}><td><Link href={`/demo/block/${b.height}`} className="mono">#{b.height}</Link></td><td className="text-right">{num(b.tx_count)}</td><td>{ok ? <span className="badge badge-ok">Matches</span> : <span className="badge badge-bad">Mismatch</span>}</td></tr>)}</tbody>
            </table>
          </TableWrap>
        ) : <Link href="/demo/verify?deep=1" className="btn-primary mt-3">Run deep check</Link>}
      </Card>
      <p className="text-xs text-ink-mute">To check it yourself without trusting this site, use the hashed text shown on each block and transaction page with any SHA-256 tool.</p>
    </div>
  );
}
