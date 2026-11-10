import Link from "next/link";
import { notFound } from "next/navigation";
import { all, one, stats, type Program, type Dept, type YearMap } from "@/lib/db";
import { BarChart } from "@/components/charts";
import { Card, Hash, PageTitle, Row, SourceNote, TableWrap } from "@/components/ui";
import { date, num, peso, pesoShort } from "@/lib/format";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const p = one<Program>("SELECT name FROM program WHERE id = ?", params.id);
  return { title: p ? p.name.slice(0, 80) : "Program not found" };
}

export default function ProgramPage({ params }: { params: { id: string } }) {
  const p = one<Program>("SELECT * FROM program WHERE id = ?", params.id);
  if (!p) notFound();
  const s = stats();
  const d = one<Dept>("SELECT id, name, cycle FROM dept WHERE id = ?", p.dept_id)!;
  const ym = JSON.parse(p.years) as YearMap;
  // Spending stages for the same PAP, where the budget-cycle data covers it (matched by the portal's FPAP id prefix).
  const fpapPrefix = p.fam_key.split("|")[0];
  const cycle = all<{ row_id: string; label: string; agency_name: string; pap_code: string }>(
    "SELECT row_id, label, agency_name, pap_code FROM cycle_program WHERE dept_id = ? AND fpap_id LIKE ? AND lower(label) = lower(?) LIMIT 3",
    p.dept_id, fpapPrefix + "%", p.name.split(" — ").pop() ?? p.name);
  return (
    <div className="wrap">
      <PageTitle sub={<><Link href={`/budget/${d.id}`}>{d.name}</Link> · GAA program line</>}>{p.name}</PageTitle>
      <Card className="mt-5" bodyClass="px-4">
        <Row label="Program ID" tip="PisoScan ID derived from the Budget Data API's program key."><Hash value={p.id} full /></Row>
        <Row label="Agency code">{p.agency_id ? <span className="mono">{p.agency_id}</span> : "—"}</Row>
        <Row label="FY2026 appropriation"><span className="font-medium">{peso(p.amount_2026)}</span> <span className="muted">· {num(ym["2026"]?.count)} line items</span></Row>
        <Row label="FY2025 appropriation">{peso(p.amount_2025)}</Row>
        <Row label="Source key" tip="Program family key in the Budget Data API."><span className="mono break-all text-xs">{p.fam_key}</span></Row>
      </Card>
      <Card className="mt-5" title="Appropriation per year" bodyClass="p-4">
        <BarChart highlightLast data={Object.entries(ym).map(([y, v]) => ({ label: y, value: v.amount, title: `FY${y}: ${peso(v.amount)} (${num(v.count)} line items)` }))} ariaLabel="Appropriation per year" />
      </Card>
      {cycle.length ? (
        <Card className="mt-5" title="Spending data available">
          <TableWrap><table className="tbl"><tbody>{cycle.map((c) => <tr key={c.row_id}><td>{c.agency_name}</td><td>{c.label}</td><td className="mono text-xs">{c.pap_code}</td><td><Link href={`/budget/cycle?dept=${p.dept_id}&row=${encodeURIComponent(c.row_id)}`}>NEP → disbursement</Link></td></tr>)}</tbody></table></TableWrap>
        </Card>
      ) : null}
      <SourceNote>Source: {s.gaa.source} ({s.gaa.license}), snapshot {date(s.gaa.fetchedAt)}. A program line is an authority to spend, not proof of spending. {pesoShort(p.amount_2026)} in FY2026.</SourceNote>
    </div>
  );
}
