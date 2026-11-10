import Link from "next/link";
import { all, one, stats } from "@/lib/db";
import { deptKind, deptShort } from "@/lib/budget";
import { pageOf } from "@/lib/lists";
import { Hash, PageTitle, Pager, SourceNote, TableWrap } from "@/components/ui";
import { date, num, peso, pesoShort, pct } from "@/lib/format";

export const metadata = { title: "Agency budgets" };
const PER = 50;

type Row = { id: string; dept_id: string; name: string; dept_name: string; y2024: number | null; y2025: number | null; y2026: number | null; items_2026: number | null; cycle_year: number | null; allot: number | null; disb: number | null };

export default function Agencies({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const s = stats();
  const dept = searchParams.dept && /^\d{2}$/.test(searchParams.dept) ? searchParams.dept : null;
  const sort = searchParams.sort === "growth" ? "growth" : searchParams.sort === "name" ? "name" : "amount";
  const q = (searchParams.q ?? "").trim().slice(0, 60);
  const where = [dept ? "a.dept_id = ?" : null, q ? "(a.name LIKE ? OR d.name LIKE ?)" : null].filter(Boolean);
  const args: unknown[] = [...(dept ? [dept] : []), ...(q ? [`%${q}%`, `%${q}%`] : [])];
  const w = where.length ? "WHERE " + where.join(" AND ") : "";
  const order = sort === "name" ? "a.name" : sort === "growth" ? "CASE WHEN a.y2025 > 0 THEN (a.y2026 - a.y2025) / a.y2025 END DESC NULLS LAST" : "a.y2026 DESC NULLS LAST";
  const page = pageOf(searchParams.p);
  const total = one<{ n: number }>(`SELECT count(*) n FROM gov_agency a JOIN dept d ON d.id = a.dept_id ${w}`, ...args)!.n;
  const rows = all<Row>(`SELECT a.*, d.name dept_name FROM gov_agency a JOIN dept d ON d.id = a.dept_id ${w} ORDER BY ${order} LIMIT ? OFFSET ?`, ...args, PER, (page - 1) * PER);
  const gaa = s.gaa.yearly.find((y) => y.year === 2026)?.amount ?? 1;
  const depts = all<{ id: string; name: string }>("SELECT id, name FROM dept ORDER BY name");
  const params = { dept: dept ?? undefined, sort: searchParams.sort, q: q || undefined };

  return (
    <div className="wrap">
      <PageTitle sub="Every agency and bureau in the FY2026 General Appropriations Act, ranked by appropriation" right={<Link href="/budget" className="text-sm">← National budget</Link>}>Agency Budgets</PageTitle>
      <section className="card mt-5">
        <div className="card-h">
          <span className="text-sm">{num(total)} agencies{dept ? "" : ` · ${pesoShort(gaa, 3)} total FY2026 GAA`}</span>
          <form method="get" className="flex flex-wrap items-center gap-2">
            <label htmlFor="aq" className="sr-only">Search agencies</label>
            <input id="aq" name="q" defaultValue={q} placeholder="Search agencies…" className="input w-44 py-1.5" />
            <label htmlFor="dept" className="sr-only">Department</label>
            <select id="dept" name="dept" defaultValue={dept ?? ""} className="select max-w-[220px] py-1.5"><option value="">All departments</option>{depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
            <label htmlFor="sort" className="sr-only">Sort</label>
            <select id="sort" name="sort" defaultValue={searchParams.sort ?? ""} className="select py-1.5"><option value="">Largest FY2026</option><option value="growth">Biggest increase</option><option value="name">Name</option></select>
            <button className="btn-primary">Apply</button>
          </form>
        </div>
        <TableWrap>
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th><th>Agency</th><th>Type</th>
                <th className="text-right">FY2025 GAA</th><th className="text-right">FY2026 GAA</th><th className="text-right">Change</th><th className="text-right">Share</th>
                <th className="min-w-[150px]">Paid out / released</th><th />
              </tr>
            </thead>
            <tbody>
              {rows.map((a, i) => {
                const k = deptKind(a.dept_id);
                const isOsec = /^Office of the Secretary$/i.test(a.name);
                const rate = a.allot && a.disb != null ? (a.disb / a.allot) * 100 : null;
                return (
                  <tr key={a.id}>
                    <td className="text-ink-mute">{(page - 1) * PER + i + 1}</td>
                    <td className="min-w-[280px]">
                      <Link href={`/budget/${a.dept_id}?agency=${a.id}`}>{isOsec ? deptShort(a.dept_name) : a.name}</Link>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-mute">
                        <Hash value={a.id} full />
                        <span>·</span>
                        <span className="truncate">{isOsec ? "Office of the Secretary" : deptShort(a.dept_name)}</span>
                      </div>
                    </td>
                    <td><span className={`badge ${k.cls}`}>{k.label}</span></td>
                    <td className="whitespace-nowrap text-right tabular-nums">{pesoShort(a.y2025)}</td>
                    <td className="whitespace-nowrap text-right font-medium tabular-nums" title={peso(a.y2026)}>{pesoShort(a.y2026)}</td>
                    <td className={`whitespace-nowrap text-right tabular-nums ${a.y2025 && a.y2026 ? (a.y2026 >= a.y2025 ? "text-ok" : "text-bad") : ""}`}>{a.y2025 && a.y2026 ? pct(((a.y2026 - a.y2025) / a.y2025) * 100, 1) : a.y2026 && !a.y2025 ? <span className="badge badge-info">New</span> : "—"}</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{a.y2026 ? ((a.y2026 / gaa) * 100).toFixed(2) + "%" : "—"}</td>
                    <td>
                      {rate != null ? (
                        <span className="block" title={`FY${a.cycle_year}: ${peso(a.disb)} paid out of ${peso(a.allot)} released`}>
                          <span className="flex items-center gap-2"><span className="h-1.5 w-20 overflow-hidden rounded-full bg-line"><span className="block h-full rounded-full bg-ok" style={{ width: `${Math.min(100, rate)}%` }} /></span><span className="text-xs tabular-nums">{rate.toFixed(1)}%</span></span>
                          <span className="text-xs text-ink-mute">FY{a.cycle_year} · {pesoShort(a.disb)} of {pesoShort(a.allot)}</span>
                        </span>
                      ) : <span className="text-xs text-ink-faint">not published</span>}
                    </td>
                    <td className="whitespace-nowrap">{rate != null ? <Link href={`/budget/cycle?dept=${a.dept_id}`} className="text-sm">Trail →</Link> : <Link href={`/budget/${a.dept_id}?agency=${a.id}`} className="text-sm">View →</Link>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3">
          <span className="text-xs text-ink-mute">&quot;Paid out / released&quot; is shown where DBM&apos;s execution data (SAAODB) covers the agency; it uses the latest complete year.</span>
          <Pager page={page} pages={Math.ceil(total / PER)} base="/budget/agencies" params={params} />
        </div>
      </section>
      <SourceNote>
        Source: {s.gaa.source} ({s.gaa.license}): GAA agency level, snapshot {date(s.agenciesFetchedAt ?? s.gaa.fetchedAt)}. Execution: DBM NEP–GAA–SAAODB compilation via the same API ({s.cycle.note}).
      </SourceNote>
    </div>
  );
}
