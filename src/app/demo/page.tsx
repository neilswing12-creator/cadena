import Link from "next/link";
import { Box, FileText, Link2, ShieldCheck, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { all, one, type Award } from "@/lib/db";
import { verifyChain, type Block } from "@/lib/demo";
import { Spark } from "@/components/charts";
import { age, date, num, peso, pesoShort, short } from "@/lib/format";

export const metadata = { title: "Overview" };

export default function DemoHome() {
  const v = verifyChain();
  const blocks = all<Block>("SELECT * FROM demo_block ORDER BY height DESC LIMIT 6");
  const txs = all<Award & { height: number }>("SELECT a.*, t.height FROM demo_tx t JOIN award a ON a.id = t.award_id WHERE t.height >= ? ORDER BY t.height DESC, t.tx_index LIMIT 6", Math.max(1, v.tip.height - 50));
  const genesis = one<Block>("SELECT * FROM demo_block WHERE height = 1")!;
  const totals = one<{ n: number; amt: number }>("SELECT sum(tx_count) n, sum(amount) amt FROM demo_block")!;
  const showcase = one<{ id: string }>("SELECT a.id FROM award a JOIN project p ON p.id = a.reference AND p.contractor_id = a.contractor_id WHERE p.status = 'Completed' AND a.award_date >= '2024-01-01' LIMIT 1");
  const recent = all<{ date: string; tx_count: number }>("SELECT date, tx_count FROM demo_block ORDER BY height DESC LIMIT 30").reverse();

  return (
    <div className="wrap space-y-5 pb-4 pt-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">How a public budget blockchain would work</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-mute">
          Every PhilGEPS construction award is fingerprinted, grouped into one block per award day, and chained to the block before it.
          Change one peso in any record and every block after it stops matching. Try it on any transaction page{showcase ? <>, for example <Link href={`/demo/tx/${showcase.id}`}>this DPWH contract</Link>, which also shows its budget-to-payment trail</> : null}.
        </p>
      </div>

      <section className="card grid grid-cols-1 divide-y divide-line px-4 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x [&>*]:lg:px-4 [&>*:first-child]:lg:pl-0">
        <div className="divide-y divide-line">
          <div className="py-3"><div className="text-xs uppercase tracking-wide text-ink-mute">Latest block</div><Link href={`/demo/block/${v.tip.height}`} className="mono text-lg">#{num(v.tip.height)}</Link><div className="text-xs text-ink-mute">{date(v.tip.date)}</div></div>
          <div className="py-3"><div className="text-xs uppercase tracking-wide text-ink-mute">Genesis block</div><Link href="/demo/block/1" className="mono">#1</Link> <span className="text-sm text-ink-mute">{date(genesis.date)}</span></div>
        </div>
        <div className="divide-y divide-line">
          <div className="py-3"><div className="text-xs uppercase tracking-wide text-ink-mute">Transactions</div><div className="mono text-lg">{num(totals.n)}</div><div className="text-xs text-ink-mute">Contract awards, each SHA-256 fingerprinted</div></div>
          <div className="py-3"><div className="text-xs uppercase tracking-wide text-ink-mute">Value recorded</div><div className="mono">{pesoShort(totals.amt)}</div><div className="text-xs text-ink-mute">Award amounts as published, not payments</div></div>
        </div>
        <div className="divide-y divide-line">
          <div className="py-3">
            <div className="text-xs uppercase tracking-wide text-ink-mute">Chain status</div>
            {v.problems.length ? <div className="flex items-center gap-1.5 font-medium text-bad"><AlertTriangle size={16} /> {num(v.problems.length)} problems</div> : <div className="flex items-center gap-1.5 font-medium text-ok"><CheckCircle2 size={16} /> All {num(v.blocks)} blocks link correctly</div>}
            <div className="text-xs text-ink-mute">Re-checked when this page loaded · <Link href="/demo/verify">details</Link></div>
          </div>
          <div className="py-3"><div className="text-xs uppercase tracking-wide text-ink-mute">Built by</div><div>PisoScan, one demo computer</div><div className="text-xs text-ink-mute">A real system would use several independent nodes</div></div>
        </div>
        <div className="py-3">
          <div className="text-xs uppercase tracking-wide text-ink-mute">Transactions per block, last 30 blocks</div>
          <Spark data={recent.map((r) => ({ label: r.date.slice(5), value: r.tx_count }))} ariaLabel="Transactions per block, last 30 blocks" />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card">
          <div className="card-h"><h2 className="card-t">Latest blocks</h2><Link href="/demo/blocks" className="text-sm">View all</Link></div>
          <ul>
            {blocks.map((b) => (
              <li key={b.height} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-4 py-3 last:border-0 sm:grid-cols-[auto_8rem_minmax(0,1fr)_auto]">
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-canvas text-ink-mute"><Box size={18} /></span>
                <div><Link href={`/demo/block/${b.height}`} className="mono">#{b.height}</Link><div className="text-xs text-ink-mute">{age(b.date)}</div></div>
                <div className="col-span-2 min-w-0 text-sm sm:col-span-1">
                  <div className="truncate"><span className="text-ink-mute">Hash </span><span className="mono">{short(b.hash, 10, 6)}</span></div>
                  <div className="text-ink-mute">{num(b.tx_count)} txns in block</div>
                </div>
                <span className="pill mono justify-self-end" title={peso(b.amount)}>{pesoShort(b.amount)}</span>
              </li>
            ))}
          </ul>
          <Link href="/demo/blocks" className="flex items-center justify-center gap-1 border-t border-line bg-canvas py-3 text-xs font-semibold uppercase tracking-wide text-ink no-underline">View all blocks <ArrowRight size={14} /></Link>
        </section>
        <section className="card">
          <div className="card-h"><h2 className="card-t">Latest transactions</h2><Link href="/demo/txs" className="text-sm">View all</Link></div>
          <ul>
            {txs.map((a) => (
              <li key={a.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-4 py-3 last:border-0 sm:grid-cols-[auto_8rem_minmax(0,1fr)_auto]">
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-canvas text-ink-mute"><FileText size={18} /></span>
                <div className="min-w-0"><Link href={`/demo/tx/${a.id}`} className="mono block truncate">{a.id.slice(0, 12)}…</Link><div className="text-xs text-ink-mute">Block #{a.height}</div></div>
                <div className="col-span-2 min-w-0 text-sm sm:col-span-1">
                  <div className="truncate"><span className="text-ink-mute">From </span><Link href={`/agency/${a.agency_id}`}>{a.organization}</Link></div>
                  <div className="truncate"><span className="text-ink-mute">To </span><Link href={`/contractor/${a.contractor_id}`}>{a.awardee}</Link></div>
                </div>
                <span className="pill mono justify-self-end" title={peso(a.amount)}>{pesoShort(a.amount)}</span>
              </li>
            ))}
          </ul>
          <Link href="/demo/txs" className="flex items-center justify-center gap-1 border-t border-line bg-canvas py-3 text-xs font-semibold uppercase tracking-wide text-ink no-underline">View all transactions <ArrowRight size={14} /></Link>
        </section>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        {[
          { i: <FileText size={18} />, t: "1. Fingerprint every record", d: "Each award is turned into a SHA-256 hash. Change any field and the hash changes completely." },
          { i: <Link2 size={18} />, t: "2. Chain the blocks", d: "Each day's records form a block. The block stores the hash of the block before it, so the blocks form one unbroken chain." },
          { i: <ShieldCheck size={18} />, t: "3. Anyone can check", d: "Re-hash the records and compare. One edited record breaks its block and every block after it." },
        ].map((x) => (
          <div key={x.t} className="card p-4"><div className="flex items-center gap-2 font-medium">{x.i}{x.t}</div><p className="mt-1 text-sm text-ink-mute">{x.d}</p></div>
        ))}
      </section>
    </div>
  );
}
