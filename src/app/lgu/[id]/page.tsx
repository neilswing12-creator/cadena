import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { all, geo, geoChain, type Audit } from "@/lib/db";
import { placeTotals, children, barangayCount } from "@/lib/places";
import { listAwards, listProjects, pageOf } from "@/lib/lists";
import { AwardTable, ProjectTable } from "@/components/AwardTable";
import { Card, OpinionBadge, PageTitle, Pager, Tabs, TableWrap } from "@/components/ui";
import { num, pesoShort } from "@/lib/format";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const g = geo(params.id);
  return { title: g ? g.name : "Place not found" };
}

const LEVEL: Record<string, string> = { region: "Region", province: "Province", municipality: "City / municipality" };

export default function PlacePage({ params, searchParams }: { params: { id: string }; searchParams: Record<string, string | undefined> }) {
  const g = geo(params.id);
  if (!g || g.level === "barangay") notFound();
  const chain = geoChain(g.id);
  const t = placeTotals().get(g.id);
  const kids = g.level === "municipality" ? [] : children(g.id);
  const tab = ["projects", "places", "audit"].includes(searchParams.tab ?? "") ? searchParams.tab! : "awards";
  const page = pageOf(searchParams.p);
  const base = `/lgu/${g.id}`;
  const audits = g.level === "region" ? [] : all<Audit>(g.level === "province" ? "SELECT * FROM audit WHERE lgu_id = ? OR province_id = ? ORDER BY level DESC, lgu_name" : "SELECT * FROM audit WHERE lgu_id = ?", ...(g.level === "province" ? [g.id, g.id] : [g.id]));
  const own = audits.find((a) => a.lgu_id === g.id);
  const totals = placeTotals();

  return (
    <div className="wrap">
      <PageTitle sub={<span className="flex flex-wrap gap-1">{chain.slice(0, -1).map((c) => <span key={c.id}><Link href={`/lgu/${c.id}`}>{c.name}</Link> ›</span>)} {LEVEL[g.level]} · PSGC <span className="mono">{g.id.padStart(10, "0")}</span></span>}>{g.name}</PageTitle>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card title="Contract awards located here" bodyClass="px-4 py-3"><div className="text-lg">{num(t?.n_aw ?? 0)}</div><div className="text-sm text-ink-mute">{pesoShort(t?.amt_aw ?? 0)} listed value · PhilGEPS</div></Card>
        <Card title="DPWH contracts located here" bodyClass="px-4 py-3"><div className="text-lg">{num(t?.n_pr ?? 0)}</div><div className="text-sm text-ink-mute">{pesoShort(t?.amt_pr ?? 0)} contract value</div></Card>
        <Card title={g.level === "region" ? "Places" : "COA audit opinion"} bodyClass="px-4 py-3">
          {g.level === "region" ? <div className="text-lg">{num(kids.length)} provinces / districts</div> : own ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2"><OpinionBadge opinion={own.opinion} /><span className="text-sm text-ink-mute">CY{own.year}</span></div>
              {own.recs_total ? <div className="text-sm">{num(own.recs_fully)} of {num(own.recs_total)} prior-year audit recommendations fully implemented</div> : null}
              {own.source_url ? <a className="inline-flex items-center gap-1 text-sm" href={own.source_url} target="_blank" rel="noopener noreferrer">COA executive summary <ExternalLink size={12} /></a> : null}
            </div>
          ) : <div className="text-sm text-ink-mute">No COA executive summary matched for this LGU.</div>}
        </Card>
      </div>

      <Tabs active={tab} items={[
        { key: "awards", label: "Contract awards", href: base, count: t?.n_aw ?? 0 },
        { key: "projects", label: "DPWH projects", href: `${base}?tab=projects`, count: t?.n_pr ?? 0 },
        ...(kids.length ? [{ key: "places", label: g.level === "region" ? "Provinces" : "Cities & municipalities", href: `${base}?tab=places`, count: kids.length }] : []),
        ...(g.level === "province" ? [{ key: "audit", label: "COA audits", href: `${base}?tab=audit`, count: audits.length }] : []),
      ]} />

      {tab === "awards" ? (() => {
        const r = listAwards({ geo: g.id }, page);
        return <section className="card"><div className="card-h"><span className="text-sm">{num(r.total)} awards</span><Pager page={page} pages={r.pages} base={base} params={{}} /></div><AwardTable rows={r.rows} /></section>;
      })() : null}
      {tab === "projects" ? (() => {
        const r = listProjects({ geo: g.id }, page);
        return <section className="card"><div className="card-h"><span className="text-sm">{num(r.total)} DPWH contracts</span><Pager page={page} pages={r.pages} base={base} params={{ tab: "projects" }} /></div><ProjectTable rows={r.rows} /></section>;
      })() : null}
      {tab === "places" ? (
        <Card>
          <TableWrap><table className="tbl"><thead><tr><th>Name</th><th className="text-right">Awards</th><th className="text-right">Award value</th><th className="text-right">DPWH contracts</th><th className="text-right">DPWH value</th>{g.level === "province" ? <th className="text-right">Barangays</th> : null}</tr></thead>
            <tbody>{kids.map((k) => { const x = totals.get(k.id); return (
              <tr key={k.id}><td><Link href={`/lgu/${k.id}`}>{k.name}</Link></td><td className="text-right tabular-nums">{num(x?.n_aw ?? 0)}</td><td className="text-right tabular-nums">{pesoShort(x?.amt_aw ?? 0)}</td><td className="text-right tabular-nums">{num(x?.n_pr ?? 0)}</td><td className="text-right tabular-nums">{pesoShort(x?.amt_pr ?? 0)}</td>{g.level === "province" ? <td className="text-right tabular-nums">{num(barangayCount(k.id))}</td> : null}</tr>
            ); })}</tbody></table></TableWrap>
        </Card>
      ) : null}
      {tab === "audit" ? (
        <Card title="COA audit opinions in this province">
          <TableWrap><table className="tbl"><thead><tr><th>LGU</th><th>Year</th><th>Opinion</th><th className="text-right">Prior recommendations fully implemented</th><th>Source</th></tr></thead>
            <tbody>{audits.map((a) => <tr key={a.lgu_id + a.year}><td><Link href={`/lgu/${a.lgu_id}`}>{a.lgu_name}</Link> <span className="text-xs capitalize text-ink-mute">{a.level}</span></td><td>{a.year}</td><td><OpinionBadge opinion={a.opinion} /></td><td className="text-right tabular-nums">{a.recs_total ? `${num(a.recs_fully)} of ${num(a.recs_total)}` : "—"}</td><td>{a.source_url ? <a href={a.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">PDF <ExternalLink size={12} /></a> : "—"}</td></tr>)}</tbody></table></TableWrap>
        </Card>
      ) : null}
      <p className="mt-4 text-xs text-ink-mute">Records are placed by the location the source gives. Some national-level awards and DPWH contracts have no location and are not counted here.</p>
    </div>
  );
}
