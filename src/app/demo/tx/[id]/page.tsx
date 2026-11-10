import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, CircleDashed, CircleDot, FileText, Code2, KeyRound, AlertTriangle } from "lucide-react";
import { one, type Award } from "@/lib/db";
import { awardFingerprint } from "@/lib/verify";
import { txProof, tipHeight, trail, levelOf, LEVELS, verifyBlockSignature } from "@/lib/demo";
import { Card, Hash, Row } from "@/components/ui";
import { TamperTest } from "@/components/TamperTest";
import { age, date, num, peso, pesoShort } from "@/lib/format";

export async function generateMetadata({ params }: { params: { id: string } }) {
  return { title: `Transaction ${params.id.slice(0, 10)}…` };
}

export default function TxPage({ params }: { params: { id: string } }) {
  if (!/^[0-9a-f]{24}$/.test(params.id)) notFound();
  const a = one<Award>("SELECT * FROM award WHERE id = ?", params.id);
  const p = a ? txProof(a.id) : null;
  if (!a || !p) notFound();
  const fp = awardFingerprint(a);
  const tip = tipHeight();
  const steps = trail(a);
  const lvl = LEVELS.find((l) => l.k === levelOf(a))!;
  const sigOk = verifyBlockSignature(p.block);
  const row = [a.reference, a.contract_no, a.title, a.awardee, a.organization, a.area, a.amount, a.award_date, a.org_level, a.prov, a.mun, a.brgy];

  return (
    <div className="wrap space-y-5 pb-4 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Transaction details</h1>
        <a href={`/api/demo/tx/${a.id}`} className="btn"><Code2 size={14} /> API</a>
      </div>

      <section className="card flex items-start gap-3 p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-canvas text-ink-mute"><FileText size={18} /></span>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-mute">Transaction action</div>
          <p className="mt-0.5">
            <Link href={`/agency/${a.agency_id}`}>{a.organization}</Link> <span className="pill mx-1 align-middle">Award</span> a{" "}
            <strong className="font-semibold">{pesoShort(a.amount)}</strong> contract to <Link href={`/contractor/${a.contractor_id}`}>{a.awardee}</Link>
            <span className="badge ml-2 align-middle" style={{ borderColor: lvl.c, color: lvl.k === "municipality" ? "#525252" : lvl.c }}>{lvl.l}</span>
          </p>
        </div>
      </section>

      <Card bodyClass="px-4">
        <Row label="Transaction hash" tip="SHA-256 fingerprint of the published record."><Hash value={fp.hash} full /></Row>
        <Row label="Status">{fp.ok ? <span className="badge badge-ok"><CheckCircle2 size={13} /> Included and unchanged</span> : <span className="badge badge-bad">Record changed since import</span>}</Row>
        <Row label="Block"><Link href={`/demo/block/${p.block.height}`} className="mono">#{num(p.block.height)}</Link> <span className="pill ml-1">{num(tip - p.block.height)} blocks after it</span></Row>
        <Row label="Position in block">Transaction {num(p.tx.tx_index)} of {num(p.leafCount)}</Row>
        <Row label="Award day">{date(a.award_date)} <span className="muted">({age(a.award_date)})</span></Row>
      </Card>
      <Card bodyClass="px-4">
        <Row label="From" tip="Procuring entity that awarded the contract."><Link href={`/agency/${a.agency_id}`}>{a.organization}</Link></Row>
        <Row label="To" tip="Contractor named in the award."><Link href={`/contractor/${a.contractor_id}`}>{a.awardee}</Link></Row>
        <Row label="Value">{peso(a.amount)}</Row>
        <Row label="Project">{a.title}</Row>
        <Row label="Full record"><Link href={`/award/${a.id}`}>Open the award page</Link></Row>
      </Card>

      <Card title="Accountability" right={<span className="text-xs text-ink-mute">Bill Sec. 3 and 19</span>} bodyClass="px-4">
        <Row label="Responsible agency" tip="The government entity responsible for certifying and publishing this record (Sec. 3)."><Link href={`/agency/${a.agency_id}`}>{a.organization}</Link></Row>
        <Row label="Accountable officer" tip="The official who would certify the record under CADENA (Sec. 3)."><span className="text-ink-mute">Not stated in the source. PhilGEPS does not publish who certified the award.</span></Row>
        <Row label="Certification"><span className="badge badge-warn"><AlertTriangle size={12} /> Not certified</span> <span className="ml-1 text-sm text-ink-mute">No agency signed this record. Under CADENA the accountable officer would sign it with their own key.</span></Row>
        <Row label="Demo signature" tip="The block holding this record is signed with a PisoScan demo key, to show how signature checks work.">
          <span className="flex flex-wrap items-center gap-2">
            {sigOk ? <span className="badge badge-ok"><CheckCircle2 size={13} /> Block #{num(p.block.height)} signature valid</span> : <span className="badge badge-bad">Signature invalid</span>}
            <span className="badge badge-warn"><KeyRound size={12} /> Demo key, proves nothing about the government</span>
            <a href="/api/demo/public-key" className="text-sm">Public key</a>
          </span>
        </Row>
      </Card>

      <Card title="Linked records: from budget to payment" right={<span className="text-xs text-ink-mute">Bill Sec. 5</span>}>
        <ol className="divide-y divide-line">
          {steps.map((st, i) => (
            <li key={st.key} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 px-4 py-3 sm:grid-cols-[1.5rem_12rem_minmax(0,1fr)_auto]">
              <span className="pt-0.5">{st.status === "found" ? <CheckCircle2 size={18} className="text-ok" /> : st.status === "partial" ? <CircleDot size={18} className="text-warn" /> : <CircleDashed size={18} className="text-ink-faint" />}</span>
              <div><div className="font-medium">{i + 1}. {st.label}</div><div className="text-xs text-ink-mute">{st.doc} · {st.section}</div></div>
              <div className="col-span-2 text-sm sm:col-span-1">{st.detail}</div>
              <div className="col-span-2 sm:col-span-1 sm:text-right">
                <span className={`badge ${st.status === "found" ? "badge-ok" : st.status === "partial" ? "badge-warn" : "badge-mute"}`}>{st.status === "found" ? "Found" : st.status === "partial" ? "Partly" : "Not published"}</span>
                {st.href ? <div className="mt-1 text-sm"><Link href={st.href}>Open</Link></div> : null}
              </div>
            </li>
          ))}
        </ol>
        <p className="border-t border-line px-4 py-3 text-xs text-ink-mute">
          {steps.filter((x) => x.status === "found").length} of {steps.length} documents found, {steps.filter((x) => x.status === "partial").length} partly. Under CADENA every step would be published within 7 working days and linked to this record.
        </p>
      </Card>

      <TamperTest row={row} dup={a.dup} leaf={fp.hash} proof={p.proof} block={p.block} nextPrev={p.next?.prev_hash ?? null} blocksAfter={tip - p.block.height} />

      <Card title={`Merkle proof (${p.proof.length} steps)`} bodyClass="p-4">
        <p className="mb-3 text-sm text-ink-mute">How this one record is tied to the block&apos;s Merkle root, without needing the other {num(p.leafCount - 1)} records. Each step hashes the current value together with the sibling shown.</p>
        <ol className="space-y-1 break-all font-mono text-xs">
          <li><span className="text-ink-mute">leaf&nbsp;&nbsp;</span>{fp.hash}</li>
          {p.proof.map((s, i) => <li key={i}><span className="text-ink-mute">{String(i + 1).padStart(2, "0")} {s.side === "left" ? "L" : "R"} </span>{s.hash}</li>)}
          <li><span className="text-ink-mute">root&nbsp;&nbsp;</span>{p.block.merkle_root}</li>
        </ol>
      </Card>
    </div>
  );
}
