import Link from "next/link";
import { all, one, stats } from "@/lib/db";
import { Card, PageTitle, SourceNote, TableWrap } from "@/components/ui";
import { HBar } from "@/components/charts";
import { date, num, peso, pesoShort } from "@/lib/format";

export const metadata = { title: "Follow the money: NEP → GAA → spending" };

const STAGES = [
  { k: "nep", l: "Proposed", s: "NEP", c: "#c4c4c4" },
  { k: "gaa", l: "Enacted", s: "GAA", c: "#0a0a0a" },
  { k: "adjusted_appropriation", l: "Adjusted", s: "Adjusted appropriation", c: "#262626" },
  { k: "adjusted_allotment", l: "Released", s: "Allotment", c: "#525252" },
  { k: "obligations", l: "Committed", s: "Obligations", c: "#8a8a8a" },
  { k: "disbursements", l: "Paid out", s: "Disbursed", c: "#15803d" },
] as const;

type Agg = { year: number; stage: string; amt: number };

export default function Cycle({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const s = stats();
  const depts = all<{ id: string; name: string; n: number }>("SELECT c.dept_id id, d.name, count(*) n FROM cycle_program c JOIN dept d ON d.id = c.dept_id GROUP BY c.dept_id ORDER BY d.name");
  const dept = depts.find((d) => d.id === searchParams.dept) ?? depts.find((d) => d.id === "07") ?? depts[0];
  const agg = all<Agg>("SELECT f.year, f.stage, sum(f.amount) amt FROM cycle_fact f JOIN cycle_program p ON p.row_id = f.row_id WHERE p.dept_id = ? AND f.expense_class = 'total' GROUP BY f.year, f.stage", dept.id);
  const years = [...new Set(agg.filter((a) => a.stage === "disbursements" && a.amt > 0).map((a) => a.year))].sort();
  const year = years.includes(Number(searchParams.year)) ? Number(searchParams.year) : years[years.length - 1];
  const get = (y: number, k: string) => agg.find((a) => a.year === y && a.stage === k)?.amt ?? null;
  const max = Math.max(...STAGES.map((st) => get(year, st.k) ?? 0), 1);
  const rowId = searchParams.row;
  const progs = all<{ row_id: string; label: string; agency_name: string; pap_code: string; nep: number | null; gaa: number | null; allot: number | null; oblig: number | null; disb: number | null }>(
    `SELECT p.row_id, p.label, p.agency_name, p.pap_code,
       sum(CASE WHEN f.stage='nep' THEN f.amount END) nep, sum(CASE WHEN f.stage='gaa' THEN f.amount END) gaa,
       sum(CASE WHEN f.stage='adjusted_allotment' THEN f.amount END) allot, sum(CASE WHEN f.stage='obligations' THEN f.amount END) oblig,
       sum(CASE WHEN f.stage='disbursements' THEN f.amount END) disb
     FROM cycle_program p JOIN cycle_fact f ON f.row_id = p.row_id AND f.year = ? AND f.expense_class = 'total'
     WHERE p.dept_id = ? GROUP BY p.row_id ORDER BY allot DESC NULLS LAST LIMIT 200`, year, dept.id);
  const focus = rowId ? one<{ row_id: string; label: string; agency_name: string; pap_code: string }>("SELECT row_id, label, agency_name, pap_code FROM cycle_program WHERE row_id = ?", rowId) : null;
  const focusFacts = focus ? all<Agg>("SELECT year, stage, sum(amount) amt FROM cycle_fact WHERE row_id = ? AND expense_class = 'total' GROUP BY year, stage", focus.row_id) : [];
  const fget = (y: number, k: string) => focusFacts.find((a) => a.year === y && a.stage === k)?.amt ?? null;
  const focusYears = [...new Set(focusFacts.map((f) => f.year))].sort();
  const rate = (a: number | null, b: number | null) => (a && b ? `${((b / a) * 100).toFixed(1)}%` : "—");

  return (
    <div className="wrap">
      <PageTitle sub="How much was proposed, enacted, released, committed and actually paid out">Follow the Money</PageTitle>

      <div className="mt-5">
        <form method="get" className="flex w-full flex-wrap items-center gap-2">
          <label htmlFor="dept" className="text-sm text-ink-mute">Department</label>
          <select id="dept" name="dept" defaultValue={dept.id} className="select w-full max-w-full py-1.5 sm:w-auto">{depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
          <label htmlFor="year" className="text-sm text-ink-mute">Year</label>
          <select id="year" name="year" defaultValue={year} className="select py-1.5">{years.map((y) => <option key={y} value={y}>FY{y}</option>)}</select>
          <button className="btn-primary">Show</button>
        </form>
      </div>

      <Card className="mt-5" title={`${dept.name}, FY${year}`} right={<span className="text-xs text-ink-mute">Current new appropriations · all expense classes</span>} bodyClass="p-4">
        <ol className="grid gap-3 md:grid-cols-6">
          {STAGES.map((st, i) => {
            const v = get(year, st.k);
            return (
              <li key={st.k} className="flex flex-col rounded-lg border border-line p-3">
                <div className="flex items-center gap-1.5 whitespace-nowrap text-xs uppercase tracking-wide text-ink-mute"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-canvas text-[0.7rem] text-ink">{i + 1}</span>{st.l}</div>
                <div className="mt-1 text-[1.05rem] tabular-nums" title={peso(v)}>{pesoShort(v)}</div>
                <div className="text-xs text-ink-mute">{st.s}</div>
                <div className="mt-auto pt-2"><HBar value={v ?? 0} max={max} color={st.c} /></div>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-sm">
          Of the {pesoShort(get(year, "adjusted_allotment"))} released in FY{year}, {pesoShort(get(year, "obligations"))} was committed ({rate(get(year, "adjusted_allotment"), get(year, "obligations"))})
          and {pesoShort(get(year, "disbursements"))} was paid out ({rate(get(year, "adjusted_allotment"), get(year, "disbursements"))}) by the end of the reporting period.
        </p>
      </Card>

      {focus ? (
        <Card className="mt-5" title={<>Program trail: {focus.label}</>} right={<Link href={`/budget/cycle?dept=${dept.id}&year=${year}`} className="text-sm">Close</Link>}>
          <div className="px-4 pt-3 text-sm text-ink-mute">{focus.agency_name} · PAP <span className="mono">{focus.pap_code}</span></div>
          <TableWrap><table className="tbl"><thead><tr><th>Year</th>{STAGES.map((st) => <th key={st.k} className="text-right">{st.s}</th>)}<th className="text-right">Paid / released</th></tr></thead>
            <tbody>{focusYears.map((y) => <tr key={y}><td>FY{y}</td>{STAGES.map((st) => <td key={st.k} className="whitespace-nowrap text-right tabular-nums" title={peso(fget(y, st.k))}>{pesoShort(fget(y, st.k))}</td>)}<td className="text-right tabular-nums">{rate(fget(y, "adjusted_allotment"), fget(y, "disbursements"))}</td></tr>)}</tbody></table></TableWrap>
        </Card>
      ) : null}

      <Card className="mt-5" title={`Programs, FY${year}`} right={<span className="text-xs text-ink-mute">{num(progs.length)} shown · click one for its multi-year trail</span>}>
        <TableWrap>
          <table className="tbl">
            <thead><tr><th>Program / activity / project</th><th className="text-right">NEP</th><th className="text-right">GAA</th><th className="text-right">Released</th><th className="text-right">Committed</th><th className="text-right">Paid out</th><th className="text-right">Paid / released</th></tr></thead>
            <tbody>
              {progs.map((p) => (
                <tr key={p.row_id} className={p.row_id === rowId ? "bg-brand-soft" : ""}>
                  <td className="min-w-[280px]"><Link href={`/budget/cycle?dept=${dept.id}&year=${year}&row=${encodeURIComponent(p.row_id)}`}>{p.label}</Link><div className="text-xs text-ink-mute">{p.agency_name}</div></td>
                  <td className="whitespace-nowrap text-right tabular-nums">{pesoShort(p.nep)}</td>
                  <td className="whitespace-nowrap text-right tabular-nums">{pesoShort(p.gaa)}</td>
                  <td className="whitespace-nowrap text-right tabular-nums">{pesoShort(p.allot)}</td>
                  <td className="whitespace-nowrap text-right tabular-nums">{pesoShort(p.oblig)}</td>
                  <td className="whitespace-nowrap text-right tabular-nums">{pesoShort(p.disb)}</td>
                  <td className="whitespace-nowrap text-right tabular-nums">{rate(p.allot, p.disb)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Card>
      <SourceNote>
        {s.cycle.note} Source file: <span className="mono">{s.cycle.meta.source_filename}</span> (SHA-256 <span className="mono">{s.cycle.meta.source_sha256.slice(0, 16)}…</span>), via the Philippine Budget Data API ({s.gaa.license}), snapshot {date(s.gaa.fetchedAt)}.
        A low paid-out share can have ordinary causes (multi-year projects, late releases, continuing appropriations). It is not by itself a sign of wrongdoing.
      </SourceNote>
    </div>
  );
}
