import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { all, meta, stats, type Dept, type YearMap } from "@/lib/db";
import { deptShort } from "@/lib/budget";
import { BarChart } from "@/components/charts";
import { Card, SourceNote, TableWrap } from "@/components/ui";
import { date, num, peso, pesoShort, pct, qs } from "@/lib/format";

export const metadata = { title: "National budget (GAA)" };
const YEARS = ["2020", "2021", "2022", "2023", "2024", "2025", "2026"];

type Col = { key: string; fy: number; stage: string; label: string; axis: string };
type Series = { key: string; label: string; department: string; plain: string; php: (number | null)[] };
type History = { built_at: string; columns: Col[]; series: Series[] };

export default function Budget({ searchParams }: { searchParams: { y?: string; s?: string } }) {
  const s = stats();
  const h = meta<History>("budgetHistory");
  const year = YEARS.includes(searchParams.y ?? "") ? searchParams.y! : "2026";
  const series = h.series.find((x) => x.key === searchParams.s) ?? h.series.find((x) => x.key === "flood") ?? h.series[0];
  const depts = all<Dept>("SELECT * FROM dept").map((d) => ({ ...d, ym: JSON.parse(d.years) as YearMap }));
  const ranked = depts.filter((d) => d.ym[year]?.amount).sort((a, b) => b.ym[year].amount - a.ym[year].amount);
  const total = s.gaa.yearly.find((y) => String(y.year) === year)?.amount ?? 0;
  const max = ranked[0]?.ym[year].amount ?? 1;
  const here = { y: searchParams.y, s: searchParams.s };

  return (
    <div className="wrap">
      <nav className="pt-5 text-sm text-ink-mute" aria-label="Breadcrumb"><Link href="/">Home</Link> / Budget</nav>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4 pt-3">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-medium sm:text-[1.35rem]">National Budget Appropriations (2020–2026) <span className="badge badge-info"><BadgeCheck size={13} /> DBM GAA data</span></h1>
          <p className="mt-1 text-sm text-ink-mute">Department-level General Appropriations Act figures, and how key program lines moved from the President&apos;s proposal through Congress.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/budget/agencies" className="btn">Agencies</Link>
          <Link href="/budget/regions" className="btn">Regions &amp; LGUs</Link>
          <Link href="/budget/cycle" className="btn-primary">Follow the money</Link>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card bodyClass="p-4 sm:p-5">
          <h2 className="font-medium">Where the national budget goes</h2>
          <p className="text-sm text-ink-mute">Largest departments, FY{year} GAA · total {pesoShort(total, 3)}</p>
          <nav className="mt-3 flex flex-wrap gap-1.5" aria-label="Year">
            {YEARS.map((y) => <Link key={y} href={`/budget${qs(here, { y: y === "2026" ? undefined : y })}`} scroll={false} className={`tab border border-line px-2.5 py-1 ${y === year ? "tab-on" : "bg-white"}`}>{y}</Link>)}
          </nav>
          <ol className="mt-4 space-y-3">
            {ranked.slice(0, 12).map((d, i) => (
              <li key={d.id} className="grid grid-cols-[2.2rem_minmax(0,1fr)_auto] items-baseline gap-x-2">
                <span className="text-xs text-ink-mute">#{i + 1}</span>
                <Link href={`/budget/${d.id}`} className="truncate text-sm text-ink hover:text-ink">{deptShort(d.name)}</Link>
                <span className="mono text-xs tabular-nums" title={peso(d.ym[year].amount)}>{pesoShort(d.ym[year].amount, 3)}</span>
                <span />
                <span className="col-span-2 mt-1 block h-1 rounded-full bg-transparent"><span className="block h-1 rounded-full bg-brand" style={{ width: `${(d.ym[year].amount / max) * 100}%` }} /></span>
              </li>
            ))}
          </ol>
          <p className="mt-4 border-t border-line pt-3 text-xs text-ink-mute">Appropriations per the General Appropriations Act, department level. &quot;Automatic Appropriations&quot; holds items such as debt interest and the LGUs&apos; National Tax Allotment. <a href="#departments">All {ranked.length} departments ↓</a></p>
        </Card>

        <Card bodyClass="p-4 sm:p-5">
          <h2 className="font-medium">Program lines, FY2020 GAA → FY2027 House bill</h2>
          <p className="text-sm text-ink-mute">How much each program got at every stage: NEP (President&apos;s proposal), House and Senate bills, and the enacted GAA.</p>
          <nav className="mt-3 flex flex-wrap gap-1.5" aria-label="Program">
            {h.series.map((x) => <Link key={x.key} href={`/budget${qs(here, { s: x.key })}`} scroll={false} className={`tab border border-line px-2.5 py-1 ${x.key === series.key ? "tab-on" : "bg-white"}`}>{x.label}</Link>)}
          </nav>
          <div className="mt-4">
            <BarChart
              height={260}
              data={h.columns.map((c, i) => ({ label: c.fy < 2026 ? `${c.fy}` : `${c.stage === "house" ? "House" : c.stage === "senate" ? "Senate" : c.stage.toUpperCase()} '${String(c.fy).slice(2)}`, value: series.php[i] ?? 0, title: `${c.label}: ${series.php[i] == null ? "no figure published" : peso(series.php[i])}` }))}
              ariaLabel={`${series.label} by budget stage`}
            />
          </div>
          <p className="mt-2 text-sm text-ink-mute">{series.plain}</p>
          <p className="mt-3 border-t border-line pt-3 text-xs text-ink-mute">{series.department} · Source: BetterGov.ph Budget, from DBM GAA extracts and the People&apos;s Budget Coalition. NEP and bills are proposals, not enacted appropriations. <Link href={`/budget/stages?s=${series.key}`}>Stage-by-stage changes →</Link></p>
        </Card>
      </div>

      <Card className="mt-5" title="Total GAA per year" bodyClass="p-4 max-w-3xl">
        <BarChart highlightLast data={s.gaa.yearly.map((y) => ({ label: String(y.year), value: y.amount, title: `FY${y.year}: ${peso(y.amount)} · ${num(y.line_items)} line items` }))} ariaLabel="Total General Appropriations per year, 2020 to 2026" />
      </Card>

      <Card className="mt-5" title={<span id="departments">All departments</span>} right={<span className="text-xs text-ink-mute">Click a department for its agencies, programs and expense classes</span>}>
        <TableWrap>
          <table className="tbl">
            <thead><tr><th>Department</th>{YEARS.map((y) => <th key={y} className="text-right">{y}</th>)}<th className="text-right">2020→26</th></tr></thead>
            <tbody>
              {[...depts].sort((a, b) => (b.amount_2026 ?? 0) - (a.amount_2026 ?? 0)).map((d) => {
                const a = d.ym["2020"]?.amount, b = d.ym["2026"]?.amount;
                return (
                  <tr key={d.id}>
                    <td className="min-w-[260px]"><Link href={`/budget/${d.id}`}>{d.name}</Link>{d.cycle ? <span className="badge badge-info ml-2">Spending data</span> : null}</td>
                    {YEARS.map((y) => <td key={y} className="whitespace-nowrap text-right tabular-nums" title={peso(d.ym[y]?.amount)}>{d.ym[y] ? pesoShort(d.ym[y].amount, 1) : "—"}</td>)}
                    <td className={`whitespace-nowrap text-right tabular-nums ${a && b ? (b >= a ? "text-ok" : "text-bad") : ""}`}>{a && b ? pct(((b - a) / a) * 100, 0) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      </Card>
      <SourceNote>
        Source: {s.gaa.source} ({s.gaa.license}), snapshot of {date(s.gaa.fetchedAt)}. Figures are derived from DBM&apos;s GAA publications; check against the official GAA for formal use.
        &quot;Spending data&quot; marks departments with release and disbursement figures on <Link href="/budget/cycle">Follow the money</Link>.
      </SourceNote>
    </div>
  );
}
