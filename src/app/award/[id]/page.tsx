import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { all, one, stats, type Award } from "@/lib/db";
import { awardFingerprint } from "@/lib/verify";
import { Card, Hash, PageTitle, Row, Tabs, TableWrap } from "@/components/ui";
import { Place } from "@/components/Place";
import { age, date, peso, pesoShort } from "@/lib/format";
import { toOcdsRelease } from "@/lib/ocds";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const a = one<Award>("SELECT title, organization FROM award WHERE id = ?", params.id);
  return { title: a ? `Award: ${a.title ?? "contract award"}` : "Award not found" };
}

export default function AwardPage({ params, searchParams }: { params: { id: string }; searchParams: { tab?: string } }) {
  if (!/^[0-9a-f]{24}$/.test(params.id)) notFound();
  const a = one<Award>("SELECT * FROM award WHERE id = ?", params.id);
  if (!a) notFound();
  const s = stats();
  const tab = searchParams.tab === "source" ? "source" : searchParams.tab === "ocds" ? "ocds" : "overview";
  const fp = awardFingerprint(a);
  const related = a.reference
    ? all<Award>("SELECT * FROM award WHERE reference = ? AND agency_id = ? AND id != ? ORDER BY award_date DESC LIMIT 20", a.reference, a.agency_id, a.id)
    : [];
  const sameTitleCount = one<{ n: number }>("SELECT count(*) n FROM award WHERE agency_id = ? AND contractor_id = ?", a.agency_id, a.contractor_id)!.n;

  return (
    <div className="wrap">
      <PageTitle sub="PhilGEPS construction contract award">Contract Award Details</PageTitle>
      <Tabs
        active={tab}
        items={[
          { key: "overview", label: "Overview", href: `/award/${a.id}` },
          { key: "source", label: "Source record", href: `/award/${a.id}?tab=source` },
          { key: "ocds", label: "OCDS release", href: `/award/${a.id}?tab=ocds` },
        ]}
      />

      {tab === "overview" ? (
        <div className="space-y-5">
          <Card bodyClass="px-4">
            <Row label="Record ID" tip="First 24 hex characters of the SHA-256 fingerprint of this row as published in the source dataset."><Hash value={a.id} full /></Row>
            <Row label="Integrity" tip="PisoScan re-hashes the stored fields on every page view and compares the result with the record ID.">
              {fp.ok ? (
                <span className="badge badge-ok"><CheckCircle2 size={13} /> Matches source fingerprint</span>
              ) : (
                <span className="badge badge-bad"><AlertTriangle size={13} /> Fingerprint mismatch</span>
              )}
            </Row>
            <Row label="Award date" tip="Date of award as listed in PhilGEPS.">
              {a.award_date ? <>{age(a.award_date)} <span className="muted">({date(a.award_date)})</span></> : <span className="muted">Not stated</span>}
            </Row>
            <Row label="Reference no." tip="PhilGEPS reference number (as typed by the procuring entity).">{a.reference ? <span className="mono">{a.reference}</span> : <span className="muted">Not stated</span>}</Row>
            {a.contract_no && a.contract_no !== a.reference ? <Row label="Contract no."><span className="mono">{a.contract_no}</span></Row> : null}
          </Card>

          <Card bodyClass="px-4">
            <Row label="Procuring entity" tip="The government office that ran the procurement."><Link href={`/agency/${a.agency_id}`}>{a.organization}</Link>{a.org_level ? <span className="pill ml-2 capitalize">{a.org_level}</span> : null}</Row>
            <Row label="Awarded to" tip="The supplier or contractor named in the award."><Link href={`/contractor/${a.contractor_id}`}>{a.awardee}</Link> <span className="muted text-xs">({sameTitleCount.toLocaleString("en-PH")} award{sameTitleCount === 1 ? "" : "s"} between these two)</span></Row>
            <Row label="Project title" tip="Title as published (PhilGEPS truncates long titles)."><span>{a.title}</span></Row>
            <Row label="Location" tip="Delivery area from PhilGEPS, matched to PSGC by BetterGov where possible."><Place id={a.brgy || a.mun || a.prov} fallback={a.area} /></Row>
          </Card>

          <Card bodyClass="px-4">
            <Row label="Contract amount" tip="Amount of the award as listed. This is not a payment record."><span className="text-[1.05rem] font-medium">{peso(a.amount)}</span> <span className="muted">({pesoShort(a.amount)})</span></Row>
            <Row label="Category"><span className="pill">Construction Projects</span></Row>
            <Row label="Source"><a href={s.philgeps.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">{s.philgeps.source} <ExternalLink size={13} /></a></Row>
          </Card>

          {related.length ? (
            <Card title={`Other awards under reference ${a.reference} by the same entity`}>
              <TableWrap>
                <table className="tbl">
                  <thead><tr><th>Record</th><th>Date</th><th>Title</th><th>Awarded to</th><th className="text-right">Amount</th></tr></thead>
                  <tbody>
                    {related.map((r) => (
                      <tr key={r.id}>
                        <td><Link className="mono" href={`/award/${r.id}`}>{r.id.slice(0, 12)}…</Link></td>
                        <td className="whitespace-nowrap">{date(r.award_date)}</td>
                        <td className="min-w-[220px]">{r.title}</td>
                        <td><Link href={`/contractor/${r.contractor_id}`}>{r.awardee}</Link></td>
                        <td className="whitespace-nowrap text-right tabular-nums">{peso(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </Card>
          ) : null}
          <p className="text-xs text-ink-mute">A contract award shows that the government chose a supplier for a stated amount. It does not show payment, delivery or quality of work, and it is not evidence of wrongdoing.</p>
        </div>
      ) : null}

      {tab === "source" ? (
        <Card bodyClass="p-4 space-y-4">
          <div>
            <div className="mb-1 text-sm font-medium">Hashed input (canonical JSON of the source row)</div>
            <pre className="overflow-x-auto rounded-lg bg-canvas p-3 font-mono text-xs leading-relaxed">{fp.input}</pre>
          </div>
          <div>
            <div className="mb-1 text-sm font-medium">SHA-256</div>
            <Hash value={fp.hash} full />
          </div>
          <p className="text-xs text-ink-mute">
            Anyone can check this: hash the line above with SHA-256 and compare it with the record ID (its first 24 characters). The fingerprint proves the
            record has not changed since PisoScan imported it from the source file. It is not stored on a blockchain, and it cannot prove the source itself is accurate.
          </p>
        </Card>
      ) : null}

      {tab === "ocds" ? (
        <Card bodyClass="p-4">
          <p className="mb-3 text-sm text-ink-mute">This award expressed as an <a href="https://standard.open-contracting.org/latest/en/" target="_blank" rel="noopener noreferrer">Open Contracting Data Standard</a> release, the format used by OpenGovChain&apos;s procurement module. Download: <Link href={`/api/ocds/award/${a.id}`}>JSON</Link></p>
          <pre className="max-h-[560px] overflow-auto rounded-lg bg-canvas p-3 font-mono text-xs leading-relaxed">{JSON.stringify(toOcdsRelease(a, fp.hash), null, 2)}</pre>
        </Card>
      ) : null}
    </div>
  );
}
