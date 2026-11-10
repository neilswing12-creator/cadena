import Link from "next/link";
import { all, type Award } from "@/lib/db";
import { tipHeight } from "@/lib/demo";
import { Pager, TableWrap } from "@/components/ui";
import { age, num, peso, pesoShort } from "@/lib/format";

export const metadata = { title: "Transactions" };
const PER = 25;

export default function Txs({ searchParams }: { searchParams: { p?: string } }) {
  const tip = tipHeight();
  const page = Math.min(400, Math.max(1, Number(searchParams.p) || 1));
  const rows = all<Award & { height: number; tx_index: number }>(
    "SELECT a.*, t.height, t.tx_index FROM demo_tx t JOIN award a ON a.id = t.award_id ORDER BY t.height DESC, t.tx_index LIMIT ? OFFSET ?", PER, (page - 1) * PER);
  return (
    <div className="wrap pb-4 pt-6">
      <h1 className="text-xl font-semibold">Transactions</h1>
      <p className="mt-1 text-sm text-ink-mute">Each transaction is one published contract award, newest block first. Showing the latest 10,000.</p>
      <section className="card mt-5">
        <div className="card-h"><span className="text-sm">Up to block #{num(tip)}</span><Pager page={page} pages={400} base="/demo/txs" params={{}} /></div>
        <TableWrap>
          <table className="tbl">
            <thead><tr><th>Txn hash</th><th>Block</th><th>Age</th><th>From (procuring entity)</th><th>To (contractor)</th><th className="text-right">Value</th></tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td><Link href={`/demo/tx/${a.id}`} className="mono whitespace-nowrap">{a.id.slice(0, 14)}…</Link></td>
                  <td><Link href={`/demo/block/${a.height}`} className="mono">#{a.height}</Link></td>
                  <td className="whitespace-nowrap text-ink-mute">{age(a.award_date)}</td>
                  <td className="min-w-[200px] max-w-[300px]"><Link href={`/agency/${a.agency_id}`} className="line-clamp-1">{a.organization}</Link></td>
                  <td className="min-w-[200px] max-w-[300px]"><Link href={`/contractor/${a.contractor_id}`} className="line-clamp-1">{a.awardee}</Link></td>
                  <td className="text-right" title={peso(a.amount)}>{pesoShort(a.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <div className="flex justify-end border-t border-line px-4 py-3"><Pager page={page} pages={400} base="/demo/txs" params={{}} /></div>
      </section>
    </div>
  );
}
