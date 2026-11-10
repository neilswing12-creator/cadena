import Link from "next/link";
import { all, type Geo } from "@/lib/db";
import { placeTotals } from "@/lib/places";
import { Card, PageTitle, TableWrap } from "@/components/ui";
import { num, pesoShort } from "@/lib/format";

export const metadata = { title: "Regions, provinces & LGUs" };

export default function Places() {
  const t = placeTotals();
  const regions = all<Geo>("SELECT * FROM geo WHERE level = 'region'");
  const provs = all<Geo>("SELECT * FROM geo WHERE level = 'province' ORDER BY name");
  return (
    <div className="wrap">
      <PageTitle sub="Contract awards and DPWH contracts located in each place (PSGC boundaries)">Regions, Provinces &amp; LGUs</PageTitle>
      <div className="mt-5 space-y-5">
        {regions.map((r) => {
          const kids = provs.filter((p) => p.parent === r.id);
          const rt = t.get(r.id);
          return (
            <Card key={r.id} title={<Link href={`/lgu/${r.id}`}>{r.name}</Link>} right={<span className="text-xs text-ink-mute">{num(rt?.n_aw)} awards · {num(rt?.n_pr)} DPWH contracts</span>}>
              <TableWrap>
                <table className="tbl tbl-fixed min-w-[640px]">
                  <colgroup><col className="w-[32%]" /><col className="w-[14%]" /><col className="w-[18%]" /><col className="w-[18%]" /><col className="w-[18%]" /></colgroup>
                  <thead><tr><th>Province</th><th className="text-right">Awards</th><th className="text-right">Award value</th><th className="text-right">DPWH contracts</th><th className="text-right">DPWH value</th></tr></thead>
                  <tbody>
                    {kids.map((p) => {
                      const x = t.get(p.id);
                      return (
                        <tr key={p.id}>
                          <td><Link href={`/lgu/${p.id}`}>{p.name}</Link></td>
                          <td className="text-right tabular-nums">{num(x?.n_aw ?? 0)}</td>
                          <td className="text-right tabular-nums">{pesoShort(x?.amt_aw ?? 0)}</td>
                          <td className="text-right tabular-nums">{num(x?.n_pr ?? 0)}</td>
                          <td className="text-right tabular-nums">{pesoShort(x?.amt_pr ?? 0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableWrap>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
