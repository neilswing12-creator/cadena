import Link from "next/link";
import { all, one, type Agency } from "@/lib/db";
import { pageOf, PAGE_SIZE } from "@/lib/lists";
import { PageTitle, Pager, TableWrap } from "@/components/ui";
import { Place } from "@/components/Place";
import { num, peso, pesoShort } from "@/lib/format";

export const metadata = { title: "Procuring entities" };

export default function Agencies({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const kind = searchParams.kind === "dpwh" ? "dpwh-office" : searchParams.kind === "procuring" ? "procuring" : null;
  const level = ["province", "city", "municipality", "barangay"].includes(searchParams.level ?? "") ? searchParams.level! : null;
  const where = [kind ? "kind = ?" : null, level ? "level = ?" : null].filter(Boolean);
  const args = [kind, level].filter(Boolean);
  const w = where.length ? "WHERE " + where.join(" AND ") : "";
  const page = pageOf(searchParams.p);
  const total = one<{ n: number }>(`SELECT count(*) n FROM agency ${w}`, ...args)!.n;
  const rows = all<Agency>(`SELECT * FROM agency ${w} ORDER BY amount DESC LIMIT ? OFFSET ?`, ...args, PAGE_SIZE, (page - 1) * PAGE_SIZE);
  const pages = Math.ceil(Math.min(total, 10000) / PAGE_SIZE);
  return (
    <div className="wrap">
      <PageTitle sub="Government offices that awarded contracts (PhilGEPS) or implement DPWH projects">Procuring Entities</PageTitle>
      <section className="card mt-5">
        <div className="card-h">
          <span className="text-sm">{num(total)} entities</span>
          <form method="get" className="flex flex-wrap gap-2">
            <label htmlFor="kind" className="sr-only">Type</label>
            <select id="kind" name="kind" defaultValue={searchParams.kind ?? ""} className="select py-1.5"><option value="">All types</option><option value="procuring">PhilGEPS procuring entities</option><option value="dpwh">DPWH offices</option></select>
            <label htmlFor="level" className="sr-only">Level</label>
            <select id="level" name="level" defaultValue={searchParams.level ?? ""} className="select py-1.5"><option value="">All levels</option><option value="province">Provinces</option><option value="city">Cities</option><option value="municipality">Municipalities</option><option value="barangay">Barangays</option></select>
            <button className="btn-primary">Apply</button>
          </form>
        </div>
        <TableWrap>
          <table className="tbl">
            <thead><tr><th>#</th><th>Entity</th><th>Location</th><th className="text-right">Records</th><th className="text-right">Contractors</th><th className="text-right">Listed value</th></tr></thead>
            <tbody>
              {rows.map((a, i) => (
                <tr key={a.id}>
                  <td className="text-ink-mute">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="min-w-[240px]"><Link href={`/agency/${a.id}`}>{a.name}</Link>{a.kind === "dpwh-office" ? <span className="pill ml-2">DPWH</span> : a.level ? <span className="pill ml-2 capitalize">{a.level}</span> : null}</td>
                  <td className="min-w-[160px] text-sm"><Place id={a.mun || a.prov} fallback="—" /></td>
                  <td className="text-right tabular-nums">{num(a.count)}</td>
                  <td className="text-right tabular-nums">{num(a.contractors)}</td>
                  <td className="whitespace-nowrap text-right tabular-nums" title={peso(a.amount)}>{pesoShort(a.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <div className="flex justify-end border-t border-line px-4 py-3"><Pager page={page} pages={pages} base="/agencies" params={{ kind: searchParams.kind, level: searchParams.level }} /></div>
      </section>
    </div>
  );
}
