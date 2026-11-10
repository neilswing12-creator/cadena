import Link from "next/link";
import { all, stats, type Dept } from "@/lib/db";
import { Card, PageTitle, SourceNote, TableWrap } from "@/components/ui";
import { date, num, peso, pesoShort, pct } from "@/lib/format";

export const metadata = { title: "FY2027 proposed budget (NEP)" };

export default function Nep() {
  const s = stats();
  const rows = all<Dept>("SELECT * FROM dept WHERE nep_2027 IS NOT NULL ORDER BY nep_delta DESC");
  const n = s.nep2027;
  return (
    <div className="wrap">
      <PageTitle sub="The Executive's proposal for FY2027, compared with the FY2026 enacted budget">FY2027 National Expenditure Program</PageTitle>
      {n ? (
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <Card title="Proposed FY2027" bodyClass="px-4 py-3"><div className="text-lg">{peso(n.amount)}</div><div className="text-sm text-ink-mute">{num(n.line_items)} line items</div></Card>
          <Card title="FY2026 GAA (baseline)" bodyClass="px-4 py-3"><div className="text-lg">{peso(n.base_amount)}</div></Card>
          <Card title="Change" bodyClass="px-4 py-3"><div className="text-lg text-ok">+{pesoShort(n.delta)}</div><div className="text-sm text-ink-mute">{pct(n.pct)}</div></Card>
        </div>
      ) : null}
      <Card className="mt-5" title="By department (largest increase first)">
        <TableWrap>
          <table className="tbl">
            <thead><tr><th>Department</th><th className="text-right">FY2026 GAA</th><th className="text-right">FY2027 NEP</th><th className="text-right">Change</th><th className="text-right">%</th></tr></thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id}>
                  <td className="min-w-[260px]"><Link href={`/budget/${d.id}`}>{d.name}</Link></td>
                  <td className="whitespace-nowrap text-right tabular-nums">{pesoShort(d.nep_base)}</td>
                  <td className="whitespace-nowrap text-right tabular-nums" title={peso(d.nep_2027)}>{pesoShort(d.nep_2027)}</td>
                  <td className={`whitespace-nowrap text-right tabular-nums ${(d.nep_delta ?? 0) >= 0 ? "text-ok" : "text-bad"}`}>{(d.nep_delta ?? 0) > 0 ? "+" : ""}{pesoShort(d.nep_delta)}</td>
                  <td className="whitespace-nowrap text-right tabular-nums">{pct(d.nep_pct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Card>
      <SourceNote>Source: {s.gaa.source} ({s.gaa.license}), FY2027 NEP extract, snapshot {date(s.gaa.fetchedAt)}. The NEP is a proposal; Congress may change it. See how proposals changed in past years on <Link href="/budget/stages">Budget stages</Link>.</SourceNote>
    </div>
  );
}
