import Link from "next/link";
import { notFound } from "next/navigation";
import { all, one, type Agency } from "@/lib/db";
import { listAwards, listProjects, pageOf } from "@/lib/lists";
import { AwardTable, ProjectTable } from "@/components/AwardTable";
import { BarChart, HBar } from "@/components/charts";
import { Card, Hash, PageTitle, Pager, Tabs, TableWrap } from "@/components/ui";
import { Place } from "@/components/Place";
import { date, num, peso, pesoShort } from "@/lib/format";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const a = one<Agency>("SELECT name FROM agency WHERE id = ?", params.id);
  return { title: a ? a.name : "Entity not found" };
}

export default function AgencyPage({ params, searchParams }: { params: { id: string }; searchParams: Record<string, string | undefined> }) {
  const a = one<Agency>("SELECT * FROM agency WHERE id = ?", params.id);
  if (!a) notFound();
  const isDpwh = a.kind === "dpwh-office";
  const tab = ["contractors", "analytics"].includes(searchParams.tab ?? "") ? searchParams.tab! : "records";
  const page = pageOf(searchParams.p);
  const base = `/agency/${a.id}`;
  const table = isDpwh ? "project" : "award";
  const top = all<{ id: string; name: string; n: number; amt: number }>(
    `SELECT c.id, c.name, x.n, x.amt FROM (SELECT contractor_id, count(*) n, sum(amount) amt FROM ${table} WHERE agency_id = ? AND contractor_id IS NOT NULL GROUP BY contractor_id) x JOIN contractor c ON c.id = x.contractor_id ORDER BY x.amt DESC LIMIT 50`, a.id);
  const share = top.length && a.amount > 0 ? (top[0].amt / a.amount) * 100 : null;

  return (
    <div className="wrap">
      <PageTitle sub={<span className="inline-flex flex-wrap items-center gap-2">{isDpwh ? "DPWH implementing office" : "Procuring entity (PhilGEPS)"} <Hash value={a.id} full /></span>}>{a.name}</PageTitle>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card title="Overview" bodyClass="px-4 py-2">
          <div className="py-2"><div className="text-xs uppercase tracking-wide text-ink-mute">{isDpwh ? "DPWH contracts" : "Contract awards"}</div><div>{num(a.count)}</div></div>
          <div className="border-t border-line py-2"><div className="text-xs uppercase tracking-wide text-ink-mute">Total listed value</div><div title={peso(a.amount)}>{pesoShort(a.amount)}</div></div>
          <div className="border-t border-line py-2"><div className="text-xs uppercase tracking-wide text-ink-mute">Distinct contractors</div><div>{num(a.contractors)}</div></div>
        </Card>
        <Card title="More info" bodyClass="px-4 py-2">
          <div className="py-2"><div className="text-xs uppercase tracking-wide text-ink-mute">Level</div><div className="capitalize">{isDpwh ? "DPWH office" : a.level ?? "National / other"}</div></div>
          <div className="border-t border-line py-2"><div className="text-xs uppercase tracking-wide text-ink-mute">Location</div><div><Place id={a.mun || a.prov} fallback="Not stated" /></div></div>
          <div className="border-t border-line py-2"><div className="text-xs uppercase tracking-wide text-ink-mute">Records span</div><div>{date(a.first_date)} – {date(a.last_date)}</div></div>
        </Card>
        <Card title="Largest contractors" bodyClass="px-4 py-2">
          {top.slice(0, 4).map((c) => (
            <div key={c.id} className="border-b border-line py-2 last:border-0">
              <div className="flex justify-between gap-2 text-sm"><Link href={`/contractor/${c.id}`} className="truncate">{c.name}</Link><span className="shrink-0 tabular-nums">{pesoShort(c.amt)}</span></div>
              <div className="mt-1"><HBar value={c.amt} max={a.amount} /></div>
            </div>
          ))}
          {share != null ? <p className="pt-2 text-xs text-ink-mute">The largest contractor holds {share.toFixed(1)}% of this office&apos;s listed value.</p> : null}
        </Card>
      </div>

      <Tabs active={tab} items={[
        { key: "records", label: isDpwh ? "DPWH projects" : "Contract awards", href: base, count: a.count },
        { key: "contractors", label: "Contractors", href: `${base}?tab=contractors`, count: a.contractors },
        { key: "analytics", label: "Analytics", href: `${base}?tab=analytics` },
      ]} />

      {tab === "records" ? (() => {
        const r = isDpwh ? listProjects({ agency: a.id }, page) : listAwards({ agency: a.id }, page);
        return (
          <section className="card">
            <div className="card-h"><span className="text-sm">Latest {Math.min(25, r.total)} from a total of {num(r.total)} records</span><Pager page={page} pages={r.pages} base={base} params={{}} /></div>
            {isDpwh ? <ProjectTable rows={(r as ReturnType<typeof listProjects>).rows} hide={["office"]} /> : <AwardTable rows={(r as ReturnType<typeof listAwards>).rows} hide={["agency"]} />}
          </section>
        );
      })() : null}

      {tab === "contractors" ? (
        <Card title={`Top ${top.length} contractors by listed value`}>
          <TableWrap><table className="tbl"><thead><tr><th>#</th><th>Contractor</th><th className="text-right">Records</th><th className="text-right">Value</th><th className="text-right">Share</th></tr></thead>
            <tbody>{top.map((c, i) => <tr key={c.id}><td className="text-ink-mute">{i + 1}</td><td><Link href={`/contractor/${c.id}`}>{c.name}</Link></td><td className="text-right tabular-nums">{num(c.n)}</td><td className="text-right tabular-nums" title={peso(c.amt)}>{pesoShort(c.amt)}</td><td className="text-right tabular-nums">{a.amount ? ((c.amt / a.amount) * 100).toFixed(1) + "%" : "—"}</td></tr>)}</tbody></table></TableWrap>
        </Card>
      ) : null}

      {tab === "analytics" ? (() => {
        const rows = isDpwh
          ? all<{ y: string; n: number; amt: number }>("SELECT CAST(year AS TEXT) y, count(*) n, sum(amount) amt FROM project WHERE agency_id = ? AND year IS NOT NULL GROUP BY y ORDER BY y", a.id)
          : all<{ y: string; n: number; amt: number }>("SELECT substr(award_date,1,4) y, count(*) n, sum(amount) amt FROM award WHERE agency_id = ? AND award_date IS NOT NULL GROUP BY y ORDER BY y", a.id);
        return <Card title="Listed value per year" bodyClass="p-4"><BarChart data={rows.map((x) => ({ label: x.y, value: x.amt, title: `${x.y}: ${pesoShort(x.amt)} in ${num(x.n)} records` }))} ariaLabel="Listed value per year" /></Card>;
      })() : null}
    </div>
  );
}
