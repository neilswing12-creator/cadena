import Link from "next/link";
import { notFound } from "next/navigation";
import { all, one, type Contractor } from "@/lib/db";
import { listAwards, listProjects, pageOf } from "@/lib/lists";
import { AwardTable, ProjectTable } from "@/components/AwardTable";
import { BarChart, HBar } from "@/components/charts";
import { Card, Hash, PageTitle, Pager, Tabs, TableWrap } from "@/components/ui";
import { date, num, peso, pesoShort, age } from "@/lib/format";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const c = one<Contractor>("SELECT name FROM contractor WHERE id = ?", params.id);
  return { title: c ? c.name : "Contractor not found" };
}

export default function ContractorPage({ params, searchParams }: { params: { id: string }; searchParams: Record<string, string | undefined> }) {
  const c = one<Contractor>("SELECT * FROM contractor WHERE id = ?", params.id);
  if (!c) notFound();
  const tab = ["projects", "analytics", "entities"].includes(searchParams.tab ?? "") ? searchParams.tab! : c.pg_count ? "awards" : "projects";
  const page = pageOf(searchParams.p);
  const base = `/contractor/${c.id}`;
  const rank = one<{ n: number }>("SELECT count(*) + 1 n FROM contractor WHERE total > ?", c.total)!.n;

  const topAgencies = all<{ id: string; name: string; n: number; amt: number }>(
    `SELECT a.id, a.name, x.n, x.amt FROM (
       SELECT agency_id, count(*) n, sum(amount) amt FROM award WHERE contractor_id = ? GROUP BY agency_id
       UNION ALL SELECT agency_id, count(*) n, sum(amount) amt FROM project WHERE contractor_id = ? GROUP BY agency_id
     ) x JOIN agency a ON a.id = x.agency_id ORDER BY x.amt DESC LIMIT 25`, c.id, c.id);
  const topProv = all<{ id: string; name: string; n: number; amt: number }>(
    `SELECT g.id, g.name, sum(n) n, sum(amt) amt FROM (
       SELECT prov, count(*) n, sum(amount) amt FROM award WHERE contractor_id = ? AND prov IS NOT NULL GROUP BY prov
       UNION ALL SELECT prov, count(*) n, sum(amount) amt FROM project WHERE contractor_id = ? AND prov IS NOT NULL GROUP BY prov
     ) x JOIN geo g ON g.id = x.prov GROUP BY g.id ORDER BY amt DESC LIMIT 5`, c.id, c.id);

  return (
    <div className="wrap">
      <PageTitle sub={<span className="inline-flex flex-wrap items-center gap-2">Contractor <Hash value={c.id} full /></span>}>
        {c.name}
      </PageTitle>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card title="Overview" bodyClass="px-4 py-2">
          <div className="py-2"><div className="text-xs uppercase tracking-wide text-ink-mute">PhilGEPS awards</div><div>{pesoShort(c.pg_amount)} <span className="muted text-sm">· {num(c.pg_count)} awards</span></div></div>
          <div className="border-t border-line py-2"><div className="text-xs uppercase tracking-wide text-ink-mute">DPWH contracts</div><div>{pesoShort(c.dp_amount)} <span className="muted text-sm">· {num(c.dp_count)} contracts</span></div></div>
          <div className="border-t border-line py-2"><div className="text-xs uppercase tracking-wide text-ink-mute">Rank by recorded value</div><div>#{num(rank)} <span className="muted text-sm">of {num(one<{ n: number }>("SELECT count(*) n FROM contractor")!.n)}</span></div></div>
        </Card>
        <Card title="More info" bodyClass="px-4 py-2">
          <div className="py-2"><div className="text-xs uppercase tracking-wide text-ink-mute">First record</div><div>{c.first_date ? <>{date(c.first_date)} <span className="muted text-sm">({age(c.first_date)})</span></> : "—"}</div></div>
          <div className="border-t border-line py-2"><div className="text-xs uppercase tracking-wide text-ink-mute">Latest record</div><div>{c.last_date ? <>{date(c.last_date)} <span className="muted text-sm">({age(c.last_date)})</span></> : "—"}</div></div>
          <div className="border-t border-line py-2"><div className="text-xs uppercase tracking-wide text-ink-mute">DPWH contractor code</div><div className="mono">{c.dpwh_codes ? c.dpwh_codes.split(",").join(", ") : <span className="muted font-sans">Not in the DPWH list</span>}</div></div>
        </Card>
        <Card title="Where they work" bodyClass="px-4 py-2">
          {topProv.length ? topProv.map((p) => (
            <div key={p.id} className="border-b border-line py-2 last:border-0">
              <div className="flex justify-between gap-2 text-sm"><Link href={`/lgu/${p.id}`} className="truncate">{p.name}</Link><span className="shrink-0 tabular-nums">{pesoShort(p.amt)}</span></div>
              <div className="mt-1"><HBar value={p.amt} max={topProv[0].amt} /></div>
            </div>
          )) : <p className="py-3 text-sm text-ink-mute">No province recorded for this contractor&apos;s records.</p>}
        </Card>
      </div>

      <Tabs active={tab} items={[
        ...(c.pg_count ? [{ key: "awards", label: "Contract awards", href: base, count: c.pg_count }] : []),
        ...(c.dp_count ? [{ key: "projects", label: "DPWH projects", href: `${base}?tab=projects`, count: c.dp_count }] : []),
        { key: "entities", label: "Government clients", href: `${base}?tab=entities` },
        { key: "analytics", label: "Analytics", href: `${base}?tab=analytics` },
      ]} />

      {tab === "awards" ? (() => {
        const r = listAwards({ contractor: c.id }, page);
        return (
          <section className="card">
            <div className="card-h"><span className="text-sm">Latest {Math.min(25, r.total)} from a total of {num(r.total)} awards</span><Pager page={page} pages={r.pages} base={base} params={{}} /></div>
            <AwardTable rows={r.rows} hide={["contractor"]} />
          </section>
        );
      })() : null}

      {tab === "projects" ? (() => {
        const r = listProjects({ contractor: c.id }, page);
        return (
          <section className="card">
            <div className="card-h"><span className="text-sm">Latest {Math.min(25, r.total)} from a total of {num(r.total)} DPWH contracts</span><Pager page={page} pages={r.pages} base={base} params={{ tab: "projects" }} /></div>
            <ProjectTable rows={r.rows} hide={["contractor"]} />
          </section>
        );
      })() : null}

      {tab === "entities" ? (
        <Card title="Government offices this contractor has records with">
          <TableWrap>
            <table className="tbl">
              <thead><tr><th>#</th><th>Office / procuring entity</th><th className="text-right">Records</th><th className="text-right">Value</th></tr></thead>
              <tbody>{topAgencies.map((a, i) => <tr key={a.id + i}><td className="text-ink-mute">{i + 1}</td><td><Link href={`/agency/${a.id}`}>{a.name}</Link></td><td className="text-right tabular-nums">{num(a.n)}</td><td className="text-right tabular-nums" title={peso(a.amt)}>{pesoShort(a.amt)}</td></tr>)}</tbody>
            </table>
          </TableWrap>
        </Card>
      ) : null}

      {tab === "analytics" ? (() => {
        const pg = all<{ y: string; n: number; amt: number }>("SELECT substr(award_date,1,4) y, count(*) n, sum(amount) amt FROM award WHERE contractor_id = ? AND award_date IS NOT NULL GROUP BY y ORDER BY y", c.id);
        const dp = all<{ y: number; n: number; amt: number }>("SELECT year y, count(*) n, sum(amount) amt FROM project WHERE contractor_id = ? AND year IS NOT NULL GROUP BY y ORDER BY y", c.id);
        return (
          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="PhilGEPS awards per year (value)" bodyClass="p-4">{pg.length ? <BarChart data={pg.map((x) => ({ label: x.y, value: x.amt, title: `${x.y}: ${pesoShort(x.amt)} in ${num(x.n)} awards` }))} ariaLabel="PhilGEPS award value per year" /> : <p className="text-sm text-ink-mute">No PhilGEPS awards.</p>}</Card>
            <Card title="DPWH contracts per budget year (value)" bodyClass="p-4">{dp.length ? <BarChart color="#0a0a0a" data={dp.map((x) => ({ label: String(x.y), value: x.amt, title: `${x.y}: ${pesoShort(x.amt)} in ${num(x.n)} contracts` }))} ariaLabel="DPWH contract value per year" /> : <p className="text-sm text-ink-mute">No DPWH contracts.</p>}</Card>
          </div>
        );
      })() : null}

      <p className="mt-4 text-xs text-ink-mute">
        Records are grouped under one contractor when the names match after removing case, punctuation and notes such as &quot;(formerly …)&quot;. Different
        legal names stay separate. PhilGEPS and DPWH figures can overlap, since one DPWH contract can also appear in PhilGEPS.
      </p>
    </div>
  );
}
