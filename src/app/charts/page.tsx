import { stats } from "@/lib/db";
import { BarChart, HBar } from "@/components/charts";
import { Card, PageTitle, SourceNote, TableWrap } from "@/components/ui";
import { num, peso, pesoShort } from "@/lib/format";

export const metadata = { title: "Charts & statistics" };

export default function Charts() {
  const s = stats();
  const pgY = s.philgeps.byYear.filter((y) => y.year >= 2008 && y.year <= 2025);
  const dpY = s.dpwh.byYear;
  const lvl = [...s.philgeps.byLevel].sort((a, b) => b.amount - a.amount);
  return (
    <div className="wrap">
      <PageTitle sub="Totals across the datasets in PisoScan">Charts &amp; Statistics</PageTitle>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="National budget (GAA) per year" bodyClass="p-4"><BarChart highlightLast data={s.gaa.yearly.map((y) => ({ label: String(y.year), value: y.amount }))} ariaLabel="GAA per year" /></Card>
        <Card title="PhilGEPS construction awards: value per year" bodyClass="p-4"><BarChart data={pgY.map((y) => ({ label: String(y.year), value: y.amount, title: `${y.year}: ${pesoShort(y.amount)} in ${num(y.count)} awards` }))} ariaLabel="PhilGEPS award value per year" /></Card>
        <Card title="PhilGEPS construction awards: number per year" bodyClass="p-4"><BarChart money={false} color="#8a8a8a" data={pgY.map((y) => ({ label: String(y.year), value: y.count }))} ariaLabel="Number of PhilGEPS awards per year" /></Card>
        <Card title="DPWH contracts: value per budget year" bodyClass="p-4"><BarChart color="#0a0a0a" data={dpY.map((y) => ({ label: String(y.year), value: y.amount, title: `${y.year}: ${pesoShort(y.amount)} in ${num(y.count)} contracts` }))} ariaLabel="DPWH contract value per year" /></Card>
        <Card title="DPWH contracts by category (value)">
          <TableWrap><table className="tbl"><tbody>{s.dpwh.byCategory.slice(0, 10).map((c) => (
            <tr key={c.category}><td className="min-w-[200px]">{c.category}<div className="mt-1"><HBar value={c.amount} max={s.dpwh.byCategory[0].amount} /></div></td><td className="text-right tabular-nums">{num(c.count)}</td><td className="whitespace-nowrap text-right tabular-nums" title={peso(c.amount)}>{pesoShort(c.amount)}</td></tr>
          ))}</tbody></table></TableWrap>
        </Card>
        <Card title="Who awards construction contracts (PhilGEPS)">
          <TableWrap><table className="tbl"><tbody>{lvl.map((l) => (
            <tr key={l.level}><td className="min-w-[180px] capitalize">{l.level}<div className="mt-1"><HBar value={l.amount} max={lvl[0].amount} /></div></td><td className="text-right tabular-nums">{num(l.count)}</td><td className="whitespace-nowrap text-right tabular-nums">{pesoShort(l.amount)}</td></tr>
          ))}</tbody></table></TableWrap>
        </Card>
        <Card title="DPWH contracts by status">
          <TableWrap><table className="tbl"><tbody>{s.dpwh.byStatus.map((x) => (
            <tr key={x.status}><td>{x.status}<div className="mt-1"><HBar value={x.count} max={s.dpwh.byStatus[0].count} color="#15803d" /></div></td><td className="text-right tabular-nums">{num(x.count)}</td></tr>
          ))}</tbody></table></TableWrap>
        </Card>
      </div>
      <SourceNote>PhilGEPS 2026 is a partial year and is left out of the yearly charts. Award and contract values are amounts as listed, not payments.</SourceNote>
    </div>
  );
}
