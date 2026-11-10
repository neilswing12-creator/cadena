import Link from "next/link";
import { all } from "@/lib/db";
import { tipHeight, type Block } from "@/lib/demo";
import { Pager, TableWrap } from "@/components/ui";
import { age, date, num, peso, pesoShort, short } from "@/lib/format";

export const metadata = { title: "Blocks" };
const PER = 25;

export default function Blocks({ searchParams }: { searchParams: { p?: string } }) {
  const tip = tipHeight();
  const pages = Math.ceil(tip / PER);
  const page = Math.min(pages, Math.max(1, Number(searchParams.p) || 1));
  const rows = all<Block>("SELECT * FROM demo_block WHERE height <= ? ORDER BY height DESC LIMIT ?", tip - (page - 1) * PER, PER);
  return (
    <div className="wrap pb-4 pt-6">
      <h1 className="text-xl font-semibold">Blocks</h1>
      <p className="mt-1 text-sm text-ink-mute">One block per PhilGEPS award day, {num(tip)} blocks in all.</p>
      <section className="card mt-5">
        <div className="card-h"><span className="text-sm">Block #{num(rows[rows.length - 1]?.height)} to #{num(rows[0]?.height)}</span><Pager page={page} pages={pages} base="/demo/blocks" params={{}} /></div>
        <TableWrap>
          <table className="tbl">
            <thead><tr><th>Block</th><th>Award day</th><th>Age</th><th>Block hash</th><th>Previous hash</th><th className="text-right">Txns</th><th className="text-right">Value</th></tr></thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.height}>
                  <td><Link href={`/demo/block/${b.height}`} className="mono">#{b.height}</Link></td>
                  <td className="whitespace-nowrap">{date(b.date)}</td>
                  <td className="whitespace-nowrap text-ink-mute">{age(b.date)}</td>
                  <td className="mono whitespace-nowrap">{short(b.hash, 10, 6)}</td>
                  <td className="mono whitespace-nowrap text-ink-mute">{b.height > 1 ? <Link href={`/demo/block/${b.height - 1}`}>{short(b.prev_hash, 10, 6)}</Link> : "genesis"}</td>
                  <td className="text-right">{num(b.tx_count)}</td>
                  <td className="text-right" title={peso(b.amount)}>{pesoShort(b.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <div className="flex justify-end border-t border-line px-4 py-3"><Pager page={page} pages={pages} base="/demo/blocks" params={{}} /></div>
      </section>
    </div>
  );
}
