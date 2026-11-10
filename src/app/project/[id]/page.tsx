import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, AlertTriangle, ExternalLink, MapPin } from "lucide-react";
import { all, one, stats, type Project, type Award } from "@/lib/db";
import { projectFingerprint } from "@/lib/verify";
import { toOc4idsProject } from "@/lib/ocds";
import { Card, Hash, PageTitle, Progress, Row, StatusBadge, Tabs, TableWrap } from "@/components/ui";
import { Place } from "@/components/Place";
import { age, date, peso, pesoShort } from "@/lib/format";
import { cleanName, dpwhCode } from "@/lib/canon.mjs";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const p = one<Project>("SELECT description FROM project WHERE id = ?", decodeURIComponent(params.id));
  return { title: p ? `DPWH ${decodeURIComponent(params.id)}: ${p.description ?? ""}` : "Project not found" };
}

export default function ProjectPage({ params, searchParams }: { params: { id: string }; searchParams: { tab?: string } }) {
  const id = decodeURIComponent(params.id);
  const p = one<Project & { cname: string | null }>("SELECT p.*, c.name AS cname FROM project p LEFT JOIN contractor c ON c.id = p.contractor_id WHERE p.id = ?", id);
  if (!p) notFound();
  const s = stats();
  const tab = searchParams.tab === "source" ? "source" : searchParams.tab === "oc4ids" ? "oc4ids" : "overview";
  const fp = projectFingerprint(p);
  const office = one<{ id: string; name: string }>("SELECT id, name FROM agency WHERE id = ?", p.agency_id);
  // Possible PhilGEPS entries for the same contract: same contractor and same contract ID used as reference.
  const pg = p.contractor_id ? all<Award>("SELECT * FROM award WHERE contractor_id = ? AND (reference = ? OR contract_no = ?) LIMIT 10", p.contractor_id, p.id, p.id) : [];
  const nearby = p.mun ? all<Project>("SELECT id, description, amount, status, start FROM project WHERE mun = ? AND id != ? ORDER BY start DESC LIMIT 8", p.mun, p.id) : [];
  const href = `/project/${encodeURIComponent(p.id)}`;

  return (
    <div className="wrap">
      <PageTitle sub="DPWH infrastructure contract">Project <span className="mono text-lg">{p.id}</span></PageTitle>
      <Tabs active={tab} items={[
        { key: "overview", label: "Overview", href },
        { key: "source", label: "Source record", href: `${href}?tab=source` },
        { key: "oc4ids", label: "OC4IDS", href: `${href}?tab=oc4ids` },
      ]} />

      {tab === "overview" ? (
        <div className="space-y-5">
          <Card bodyClass="px-4">
            <Row label="Contract ID" tip="DPWH contract ID."><Hash value={p.id} full /></Row>
            <Row label="Fingerprint" tip="SHA-256 of this row as published in the source file, re-checked on every page view.">
              <span className="flex flex-wrap items-center gap-2"><Hash value={p.fp} head={14} tail={10} />{fp.ok ? <span className="badge badge-ok"><CheckCircle2 size={13} /> Verified</span> : <span className="badge badge-bad"><AlertTriangle size={13} /> Mismatch</span>}</span>
            </Row>
            <Row label="Status" tip="Status as DPWH lists it."><StatusBadge status={p.status} /></Row>
            <Row label="Physical progress" tip="Percent accomplishment as reported by DPWH."><Progress value={p.progress} /></Row>
            <Row label="Timeline">
              {p.start ? <>Start {date(p.start)} <span className="muted">({age(p.start)})</span></> : <span className="muted">Start not stated</span>}
              {p.end ? <> · Target/actual end {date(p.end)}</> : null}
            </Row>
          </Card>

          <Card bodyClass="px-4">
            <Row label="Description"><span>{p.description}</span></Row>
            <Row label="Category"><span className="pill">{p.category ?? "Not stated"}</span></Row>
            <Row label="Implementing office">{office ? <Link href={`/agency/${office.id}`}>{office.name}</Link> : p.office}{p.region ? <span className="muted"> · {p.region}</span> : null}</Row>
            <Row label="Contractor">
              {p.contractor_id ? <Link href={`/contractor/${p.contractor_id}`}>{p.cname}</Link> : <span className="muted">Not listed</span>}
              {p.contractor_raw && dpwhCode(p.contractor_raw) ? <span className="muted text-xs"> · DPWH contractor code {dpwhCode(p.contractor_raw)}</span> : null}
              {p.contractor_raw && p.cname && cleanName(p.contractor_raw) !== p.cname ? <div className="text-xs text-ink-mute">As listed: {cleanName(p.contractor_raw)}</div> : null}
            </Row>
            <Row label="Location">
              <Place id={p.mun || p.prov} />
              {p.lat != null && p.lng != null ? (
                <a className="ml-2 inline-flex items-center gap-1 text-sm" href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=15/${p.lat}/${p.lng}`} target="_blank" rel="noopener noreferrer"><MapPin size={13} /> {p.lat.toFixed(4)}, {p.lng.toFixed(4)}</a>
              ) : null}
            </Row>
          </Card>

          <Card bodyClass="px-4">
            <Row label="Contract amount" tip="Contract cost as listed by DPWH. Not a payment."><span className="text-[1.05rem] font-medium">{peso(p.amount)}</span> <span className="muted">({pesoShort(p.amount)})</span></Row>
            <Row label="Funding source" tip="Appropriation line named in the DPWH list (e.g. GAA year and program)."><span>{p.funds ?? <span className="muted">Not stated</span>}</span></Row>
            <Row label="Budget year">{p.year ?? "—"}</Row>
            <Row label="Source"><a href={s.dpwh.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">{s.dpwh.source} <ExternalLink size={13} /></a></Row>
          </Card>

          {pg.length ? (
            <Card title="Matching PhilGEPS award entries (same contractor, same contract ID)">
              <TableWrap><table className="tbl"><thead><tr><th>Record</th><th>Date</th><th>Procuring entity</th><th className="text-right">Amount</th></tr></thead>
                <tbody>{pg.map((r) => <tr key={r.id}><td><Link className="mono" href={`/award/${r.id}`}>{r.id.slice(0, 12)}…</Link></td><td>{date(r.award_date)}</td><td><Link href={`/agency/${r.agency_id}`}>{r.organization}</Link></td><td className="text-right tabular-nums">{peso(r.amount)}</td></tr>)}</tbody></table></TableWrap>
            </Card>
          ) : null}

          {nearby.length ? (
            <Card title="Other DPWH contracts in the same city / municipality" right={<Link href={`/lgu/${p.mun}?tab=projects`} className="text-sm">View all</Link>}>
              <TableWrap><table className="tbl"><thead><tr><th>Contract</th><th>Start</th><th>Description</th><th>Status</th><th className="text-right">Amount</th></tr></thead>
                <tbody>{nearby.map((r) => <tr key={r.id}><td><Link className="mono" href={`/project/${encodeURIComponent(r.id)}`}>{r.id}</Link></td><td className="whitespace-nowrap">{date(r.start)}</td><td className="min-w-[240px]">{r.description}</td><td><StatusBadge status={r.status} /></td><td className="whitespace-nowrap text-right tabular-nums">{pesoShort(r.amount)}</td></tr>)}</tbody></table></TableWrap>
            </Card>
          ) : null}
          <p className="text-xs text-ink-mute">{s.dpwh.notice}</p>
        </div>
      ) : null}

      {tab === "source" ? (
        <Card bodyClass="p-4 space-y-4">
          <div><div className="mb-1 text-sm font-medium">Hashed input (canonical JSON of the source row)</div><pre className="overflow-x-auto rounded-lg bg-canvas p-3 font-mono text-xs leading-relaxed">{fp.input}</pre></div>
          <div><div className="mb-1 text-sm font-medium">SHA-256</div><Hash value={fp.hash} full /></div>
          <p className="text-xs text-ink-mute">Hash the line above with SHA-256 to reproduce the fingerprint. It proves the record is unchanged since import. It is not a blockchain entry, and it cannot prove the source data is accurate.</p>
        </Card>
      ) : null}

      {tab === "oc4ids" ? (
        <Card bodyClass="p-4">
          <p className="mb-3 text-sm text-ink-mute">This contract as an <a href="https://standard.open-contracting.org/infrastructure/latest/en/" target="_blank" rel="noopener noreferrer">OC4IDS</a> project record, the infrastructure standard used by OpenGovChain. Download: <Link href={`/api/oc4ids/project/${encodeURIComponent(p.id)}`}>JSON</Link></p>
          <pre className="max-h-[560px] overflow-auto rounded-lg bg-canvas p-3 font-mono text-xs leading-relaxed">{JSON.stringify(toOc4idsProject(p, fp.hash, p.cname), null, 2)}</pre>
        </Card>
      ) : null}
    </div>
  );
}
