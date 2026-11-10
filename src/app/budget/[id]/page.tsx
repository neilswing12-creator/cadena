import Link from "next/link";
import { notFound } from "next/navigation";
import { all, one, stats, type Dept, type Program, type YearMap } from "@/lib/db";
import { pageOf, PAGE_SIZE } from "@/lib/lists";
import { BarChart, HBar } from "@/components/charts";
import { Card, PageTitle, Pager, SourceNote, TableWrap } from "@/components/ui";
import { date, num, peso, pesoShort, pct, qs } from "@/lib/format";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const d = one<Dept>("SELECT name FROM dept WHERE id = ?", params.id);
  return { title: d ? `${d.name} budget` : "Department not found" };
}

export default function DeptPage({ params, searchParams }: { params: { id: string }; searchParams: Record<string, string | undefined> }) {
  const d = one<Dept>("SELECT * FROM dept WHERE id = ?", params.id);
  if (!d) notFound();
  const s = stats();
  const ym = JSON.parse(d.years) as YearMap;
  const exp = JSON.parse(d.expense) as { expense_code: string; label: string; years: YearMap }[];
  const q = (searchParams.q ?? "").trim().slice(0, 80);
  const agencies = all<{ id: string; name: string; y2025: number | null; y2026: number | null }>("SELECT id, name, y2025, y2026 FROM gov_agency WHERE dept_id = ? ORDER BY y2026 DESC NULLS LAST", d.id);
  const agency = agencies.find((a) => a.id === searchParams.agency) ?? null;
  const page = pageOf(searchParams.p);
  const where = (q ? "AND name LIKE ? ESCAPE '\\' " : "") + (agency ? "AND agency_id = ?" : "");
  const args = [...(q ? [`%${q.replace(/[%_\\]/g, (m) => "\\" + m)}%`] : []), ...(agency ? [agency.id] : [])];
  const total = one<{ n: number }>(`SELECT count(*) n FROM program WHERE dept_id = ? ${where}`, d.id, ...args)!.n;
  const progs = all<Program>(`SELECT * FROM program WHERE dept_id = ? ${where} ORDER BY amount_2026 DESC NULLS LAST LIMIT ? OFFSET ?`, d.id, ...args, PAGE_SIZE, (page - 1) * PAGE_SIZE);
  const exp26 = exp.reduce((t, e) => t + (e.years["2026"]?.amount ?? 0), 0);

  return (
    <div className="wrap">
      <PageTitle sub={<>GAA department code <span className="mono">{d.id}</span> · <Link href="/budget">All departments</Link></>}>{d.name}</PageTitle>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card title="FY2026 GAA" bodyClass="px-4 py-3"><div className="text-lg">{peso(d.amount_2026)}</div><div className="text-sm text-ink-mute">{num(ym["2026"]?.count)} line items</div></Card>
        <Card title="FY2027 NEP (proposed)" bodyClass="px-4 py-3">{d.nep_2027 != null ? <><div className="text-lg">{peso(d.nep_2027)}</div><div className={`text-sm ${(d.nep_delta ?? 0) >= 0 ? "text-ok" : "text-bad"}`}>{pct(d.nep_pct)} vs FY2026 GAA ({pesoShort(d.nep_delta)})</div></> : <div className="text-sm text-ink-mute">Not listed separately in the NEP</div>}</Card>
        <Card title="Where the money goes (FY2026)" bodyClass="px-4 py-2">
          {exp.map((e) => (
            <div key={e.expense_code} className="border-b border-line py-2 last:border-0">
              <div className="flex justify-between gap-2 text-sm"><span>{e.label}</span><span className="tabular-nums">{pesoShort(e.years["2026"]?.amount ?? 0)}</span></div>
              <div className="mt-1"><HBar value={e.years["2026"]?.amount ?? 0} max={exp26} /></div>
            </div>
          ))}
        </Card>
      </div>
      <Card className="mt-5" title="Appropriations per year" bodyClass="p-4" right={d.cycle ? <Link href={`/budget/cycle?dept=${d.id}`} className="btn-primary">Follow the money →</Link> : null}>
        <BarChart highlightLast data={Object.entries(ym).map(([y, v]) => ({ label: y, value: v.amount, title: `FY${y}: ${peso(v.amount)}` }))} ariaLabel={`${d.name} appropriations per year`} />
      </Card>
      {agencies.length > 1 ? (
        <Card className="mt-5" title={`Agencies (${agencies.length})`}>
          <TableWrap><table className="tbl"><thead><tr><th>Agency</th><th>Code</th><th className="text-right">FY2025</th><th className="text-right">FY2026</th><th className="text-right">Share of department</th></tr></thead>
            <tbody>{agencies.map((a) => <tr key={a.id} className={agency?.id === a.id ? "bg-brand-soft" : ""}><td><Link href={`/budget/${d.id}?agency=${a.id}#programs`}>{a.name}</Link></td><td className="mono text-xs">{a.id}</td><td className="whitespace-nowrap text-right tabular-nums">{pesoShort(a.y2025)}</td><td className="whitespace-nowrap text-right tabular-nums">{pesoShort(a.y2026)}</td><td className="text-right tabular-nums">{d.amount_2026 && a.y2026 ? ((a.y2026 / d.amount_2026) * 100).toFixed(1) + "%" : "—"}</td></tr>)}</tbody></table></TableWrap>
        </Card>
      ) : null}
      <section className="card mt-5" id="programs">
        <div className="card-h">
          <h2 className="card-t">{agency ? <>{agency.name}: </> : null}Programs, activities &amp; projects <span className="text-sm font-normal text-ink-mute">({num(total)})</span></h2>
          <form method="get" className="flex gap-2">{agency ? <input type="hidden" name="agency" value={agency.id} /> : null}<label htmlFor="pq" className="sr-only">Filter programs</label><input id="pq" name="q" defaultValue={q} placeholder="Filter programs…" className="input w-56 py-1.5" /><button className="btn-primary">Filter</button></form>
        </div>
        <TableWrap>
          <table className="tbl">
            <thead><tr><th>Program / activity / project</th><th className="text-right">FY2025</th><th className="text-right">FY2026</th><th className="text-right">Change</th></tr></thead>
            <tbody>
              {progs.map((p) => (
                <tr key={p.id}>
                  <td className="min-w-[320px]"><Link href={`/budget/program/${p.id}`}>{p.name}</Link>{p.agency_id ? <span className="mono ml-2 text-xs text-ink-mute">{p.agency_id}</span> : null}</td>
                  <td className="whitespace-nowrap text-right tabular-nums">{pesoShort(p.amount_2025)}</td>
                  <td className="whitespace-nowrap text-right tabular-nums" title={peso(p.amount_2026)}>{pesoShort(p.amount_2026)}</td>
                  <td className="whitespace-nowrap text-right tabular-nums">{p.amount_2025 && p.amount_2026 ? pct(((p.amount_2026 - p.amount_2025) / p.amount_2025) * 100, 0) : p.amount_2026 && !p.amount_2025 ? <span className="badge badge-info">New</span> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3">
          <span className="text-xs text-ink-mute">Programs present in the FY2026 GAA, with their earlier years where the same line existed.</span>
          <Pager page={page} pages={Math.ceil(Math.min(total, 10000) / PAGE_SIZE)} base={`/budget/${d.id}`} params={{ q, agency: agency?.id }} />
        </div>
      </section>
      <SourceNote>Source: {s.gaa.source} ({s.gaa.license}), snapshot {date(s.gaa.fetchedAt)}. {q || agency ? <Link href={`/budget/${d.id}${qs({})}`}>Clear filters</Link> : null}</SourceNote>
    </div>
  );
}
