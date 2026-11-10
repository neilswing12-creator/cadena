import Link from "next/link";
import { meta, stats } from "@/lib/db";
import { BarChart } from "@/components/charts";
import { Card, PageTitle, SourceNote, TableWrap } from "@/components/ui";
import { num, peso, pesoShort, pct, date } from "@/lib/format";

export const metadata = { title: "Budget stages: NEP vs House vs Senate vs GAA" };

type Col = { key: string; fy: number; stage: string; label: string; axis: string; source: string };
type Series = { key: string; label: string; department: string; plain: string; php: (number | null)[]; projects: (number | null)[] };
type History = { built_at: string; columns: Col[]; series: Series[]; sources: { key: string; label: string }[] };

const STAGE: Record<string, string> = { nep: "Proposed (NEP)", house: "House version", senate: "Senate version", gaa: "Enacted (GAA)" };

export default function Stages({ searchParams }: { searchParams: { s?: string } }) {
  const h = meta<History>("budgetHistory");
  const st = stats();
  const series = h.series.find((x) => x.key === searchParams.s) ?? h.series[0];
  const cols = h.columns;
  // biggest change between consecutive stages of the same fiscal year
  const changes: { fy: number; from: string; to: string; a: number; b: number }[] = [];
  for (let i = 1; i < cols.length; i++) {
    const a = series.php[i - 1], b = series.php[i];
    if (cols[i].fy === cols[i - 1].fy && a != null && b != null && a !== b) changes.push({ fy: cols[i].fy, from: cols[i - 1].stage, to: cols[i].stage, a, b });
  }
  return (
    <div className="wrap">
      <PageTitle sub="How selected programs changed from the President's proposal through Congress to the enacted budget">Budget Stages</PageTitle>
      <nav className="-mx-1 mt-4 flex gap-1 overflow-x-auto px-1 pb-1" aria-label="Programs">
        {h.series.map((x) => (
          <Link key={x.key} href={`/budget/stages?s=${x.key}`} scroll={false} className={`tab border border-line ${x.key === series.key ? "tab-on" : "bg-white"}`}>{x.label}</Link>
        ))}
      </nav>
      <Card className="mt-4" title={<>{series.label} <span className="pill ml-1">{series.department}</span></>} bodyClass="p-4">
        <p className="mb-4 text-sm text-ink-mute">{series.plain}</p>
        <BarChart
          data={cols.map((c, i) => ({ label: c.fy < 2026 ? String(c.fy) : `${c.stage === "house" ? "House" : c.stage === "senate" ? "Senate" : c.stage.toUpperCase()} '${String(c.fy).slice(2)}`, value: series.php[i] ?? 0, title: `${c.label}: ${series.php[i] == null ? "no figure" : peso(series.php[i])}` }))}
          ariaLabel={`${series.label} by budget stage`}
        />
        <div className="mt-1 text-xs text-ink-mute">FY2020–2025: enacted GAA. FY2026 and FY2027: each stage shown separately (NEP → House → Senate → GAA).</div>
      </Card>

      {changes.length ? (
        <Card className="mt-5" title="Changes between stages">
          <ul className="divide-y divide-line">
            {changes.map((c, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span>FY{c.fy}: {STAGE[c.from]} → {STAGE[c.to]}</span>
                <span className="tabular-nums">{pesoShort(c.a)} → {pesoShort(c.b)} <span className={c.b > c.a ? "text-ok" : "text-bad"}>({c.b > c.a ? "+" : ""}{pesoShort(c.b - c.a)}, {pct(((c.b - c.a) / c.a) * 100, 0)})</span></span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="mt-5" title="All stages">
        <TableWrap>
          <table className="tbl">
            <thead><tr><th>Stage</th><th className="text-right">Amount</th><th className="text-right">Projects listed</th></tr></thead>
            <tbody>
              {cols.map((c, i) => (
                <tr key={c.key}>
                  <td>{c.label}</td>
                  <td className="whitespace-nowrap text-right tabular-nums">{series.php[i] == null ? <span className="muted">no figure</span> : peso(series.php[i])}</td>
                  <td className="text-right tabular-nums">{series.projects[i] == null ? <span className="muted">—</span> : num(series.projects[i])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Card>
      <SourceNote>
        Sources: {h.sources.map((x) => x.label).filter((v, i, a) => a.indexOf(v) === i).join("; ")}. Compiled by BetterGov.ph ({date(h.built_at)}).
        &quot;No figure&quot; means the stage was not published at that level of detail; it does not mean zero. See also the <Link href="/budget/nep-2027">FY2027 proposal</Link>. Snapshot {date(st.gaa.fetchedAt)}.
      </SourceNote>
    </div>
  );
}
