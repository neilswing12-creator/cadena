import Link from "next/link";
import { all, one, type Contractor } from "@/lib/db";
import { pageOf, PAGE_SIZE } from "@/lib/lists";
import { Card, PageTitle, Pager, TableWrap } from "@/components/ui";
import { date, num, peso, pesoShort } from "@/lib/format";

export const metadata = { title: "Top contractors" };

export default function Contractors({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const sort = searchParams.sort === "pg" ? "pg_amount" : searchParams.sort === "dp" ? "dp_amount" : searchParams.sort === "count" ? "(pg_count + dp_count)" : "total";
  const page = pageOf(searchParams.p);
  const total = one<{ n: number }>("SELECT count(*) n FROM contractor")!.n;
  const rows = all<Contractor>(`SELECT * FROM contractor ORDER BY ${sort} DESC LIMIT ? OFFSET ?`, PAGE_SIZE, (page - 1) * PAGE_SIZE);
  const pages = Math.ceil(Math.min(total, 10000) / PAGE_SIZE);
  const head = (key: string, label: string) => <Link href={`/contractors${key ? `?sort=${key}` : ""}`} className={(searchParams.sort ?? "") === key ? "font-medium text-brand" : "text-ink"}>{label}</Link>;
  return (
    <div className="wrap">
      <PageTitle sub="Ranked by listed value across PhilGEPS construction awards and DPWH contracts">Top Contractors</PageTitle>
      <section className="card mt-5">
        <div className="card-h"><span className="text-sm">{num(total)} contractors</span><Pager page={page} pages={pages} base="/contractors" params={{ sort: searchParams.sort }} /></div>
        <TableWrap>
          <table className="tbl">
            <thead><tr><th>Rank</th><th>Contractor</th><th className="text-right">{head("pg", "PhilGEPS awards")}</th><th className="text-right">{head("dp", "DPWH contracts")}</th><th className="text-right">{head("", "Total listed")}</th><th className="text-right">{head("count", "Records")}</th><th>Active</th></tr></thead>
            <tbody>
              {rows.map((c, i) => (
                <tr key={c.id}>
                  <td className="text-ink-mute">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="min-w-[240px]"><Link href={`/contractor/${c.id}`}>{c.name}</Link><div className="mono text-xs text-ink-mute">{c.id}</div></td>
                  <td className="whitespace-nowrap text-right tabular-nums" title={peso(c.pg_amount)}>{pesoShort(c.pg_amount)}</td>
                  <td className="whitespace-nowrap text-right tabular-nums" title={peso(c.dp_amount)}>{pesoShort(c.dp_amount)}</td>
                  <td className="whitespace-nowrap text-right font-medium tabular-nums">{pesoShort(c.total)}</td>
                  <td className="text-right tabular-nums">{num(c.pg_count + c.dp_count)}</td>
                  <td className="whitespace-nowrap text-xs text-ink-mute">{c.first_date?.slice(0, 4)}–{c.last_date?.slice(0, 4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <p className="border-t border-line px-4 py-3 text-xs text-ink-mute">&quot;Total listed&quot; adds both datasets, which can overlap. Listed values are contract amounts, not payments. Last data: {date(rows[0]?.last_date)}.</p>
      </section>
    </div>
  );
}
