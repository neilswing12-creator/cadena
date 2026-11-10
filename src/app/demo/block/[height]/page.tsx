import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, Code2, Download, KeyRound } from "lucide-react";
import { getBlock, checkBlock, tipHeight, verifyBlockSignature, levelOf, LEVELS } from "@/lib/demo";
import { Card, Hash, Pager, Row, TableWrap } from "@/components/ui";
import { age, date, num, peso, pesoShort } from "@/lib/format";

export async function generateMetadata({ params }: { params: { height: string } }) {
  return { title: `Block #${params.height}` };
}

const Check = ({ ok, yes, no }: { ok: boolean; yes: string; no: string }) =>
  ok ? <span className="badge badge-ok"><CheckCircle2 size={13} /> {yes}</span> : <span className="badge badge-bad"><AlertTriangle size={13} /> {no}</span>;

export default function BlockPage({ params, searchParams }: { params: { height: string }; searchParams: { p?: string } }) {
  const h = Number(params.height);
  if (!Number.isInteger(h) || h < 1) notFound();
  const b = getBlock(h);
  if (!b) notFound();
  const tip = tipHeight();
  const c = checkBlock(b);
  const PER = 25;
  const pages = Math.ceil(c.awards.length / PER);
  const page = Math.min(pages, Math.max(1, Number(searchParams.p) || 1));
  const sigOk = verifyBlockSignature(b);
  const lv = c.awards.map((a) => levelOf(a));
  const counts = Object.fromEntries(LEVELS.map((l) => [l.k, lv.filter((x) => x === l.k).length]));
  const agencies = new Set(c.awards.map((a) => a.agency_id)).size;
  const GRID_MAX = 1200;

  return (
    <div className="wrap space-y-5 pb-4 pt-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">Block <span className="mono">#{num(b.height)}</span></h1>
        {h > 1 ? <Link href={`/demo/block/${h - 1}`} className="btn px-2 py-1" aria-label="Previous block"><ChevronLeft size={15} /></Link> : null}
        {h < tip ? <Link href={`/demo/block/${h + 1}`} className="btn px-2 py-1" aria-label="Next block"><ChevronRight size={15} /></Link> : null}
        <span className="ml-auto flex gap-2">
          <a href={`/api/demo/block/${h}?format=csv`} className="btn"><Download size={14} /> CSV</a>
          <a href={`/api/demo/block/${h}`} className="btn"><Code2 size={14} /> API</a>
        </span>
      </div>

      <Card bodyClass="px-4">
        <Row label="Block height" tip="Position in the chain, counting from the first award day (#1)."><span className="mono">{num(b.height)}</span></Row>
        <Row label="Checks" tip="Recomputed from the stored records every time this page loads.">
          <span className="flex flex-wrap gap-2">
            <Check ok={c.rootOk} yes="Merkle root matches records" no="Merkle root does not match" />
            <Check ok={c.hashOk} yes="Block hash matches header" no="Block hash does not match" />
            <Check ok={c.linked} yes={h === 1 ? "Genesis block" : "Linked to block #" + (h - 1)} no="Broken link to previous block" />
          </span>
        </Row>
        <Row label="Award day">{date(b.date)} <span className="muted">({age(b.date)})</span></Row>
        <Row label="Transactions"><strong className="font-medium">{num(b.tx_count)}</strong> contract awards in this block</Row>
        <Row label="Value">{peso(b.amount)} <span className="muted">({pesoShort(b.amount)})</span></Row>
        <Row label="Responsible agencies" tip="Bill Sec. 3: each record has a responsible agency and accountable officer.">{num(agencies)} procuring {agencies === 1 ? "entity" : "entities"} published records in this block</Row>
        <Row label="Built by" tip="In a real system, several independent nodes (e.g. DBM, COA, civil society) would each hold a copy and sign blocks.">PisoScan demo (one computer, no official signatures)</Row>
      </Card>

      <Card bodyClass="px-4">
        <Row label="Document types" tip="What kind of office published each record. Each square is one transaction; hover for details, click to open.">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {LEVELS.filter((l) => counts[l.k]).map((l) => <span key={l.k} className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-[2px]" style={{ background: l.c }} />{l.l} ({num(counts[l.k])})</span>)}
            </div>
            <div className="flex flex-wrap gap-[3px]">
              {c.awards.slice(0, GRID_MAX).map((a, i) => (
                <Link key={a.id} href={`/demo/tx/${a.id}`} title={`${a.organization} → ${a.awardee}: ${peso(a.amount)}`} aria-label={`Transaction ${i}`} className="block h-3 w-3 rounded-[2px] hover:outline hover:outline-2 hover:outline-ink" style={{ background: LEVELS.find((l) => l.k === lv[i])!.c }} />
              ))}
            </div>
            {c.awards.length > GRID_MAX ? <div className="text-xs text-ink-mute">Showing the first {num(GRID_MAX)} of {num(c.awards.length)}.</div> : null}
          </div>
        </Row>
      </Card>

      <Card bodyClass="px-4">
        <Row label="Block hash" tip="SHA-256 of the block header below."><Hash value={b.hash} full /></Row>
        <Row label="Previous block hash" tip="The hash of the block before this one. This is what chains the blocks together.">{h > 1 ? <Link href={`/demo/block/${h - 1}`} className="mono break-all no-underline">{b.prev_hash}</Link> : <span className="mono break-all">{b.prev_hash} <span className="font-sans text-ink-mute">(genesis)</span></span>}</Row>
        <Row label="Merkle root" tip="One hash that summarises every record in the block. Changing any record changes it."><Hash value={b.merkle_root} full /></Row>
        <Row label="Signature" tip="Bill Sec. 19 asks for digital signatures on all records. Here a DEMO key signs each block hash.">
          <span className="flex flex-wrap items-center gap-2">
            {sigOk ? <span className="badge badge-ok"><CheckCircle2 size={13} /> Valid demo signature</span> : <span className="badge badge-bad"><AlertTriangle size={13} /> Invalid signature</span>}
            <span className="badge badge-warn"><KeyRound size={12} /> Demo key, not a government key</span>
            <a href="/api/demo/public-key" className="text-sm">Public key</a>
          </span>
          <span className="mt-1 block break-all font-mono text-xs text-ink-mute">{b.signature}</span>
        </Row>
        <Row label="Header (hashed)"><pre className="overflow-x-auto rounded-md bg-canvas p-2 font-mono text-xs">{c.headerInput}</pre></Row>
      </Card>

      <section className="card">
        <div className="card-h"><h2 className="card-t">Transactions in this block</h2><Pager page={page} pages={pages} base={`/demo/block/${h}`} params={{}} /></div>
        <TableWrap>
          <table className="tbl">
            <thead><tr><th>#</th><th>Txn hash</th><th>From</th><th>To</th><th className="text-right">Value</th></tr></thead>
            <tbody>
              {c.awards.slice((page - 1) * PER, page * PER).map((a) => (
                <tr key={a.id}>
                  <td className="text-ink-mute">{a.tx_index}</td>
                  <td><Link href={`/demo/tx/${a.id}`} className="mono whitespace-nowrap">{a.id.slice(0, 14)}…</Link></td>
                  <td className="min-w-[200px] max-w-[320px]"><span className="line-clamp-1">{a.organization}</span></td>
                  <td className="min-w-[200px] max-w-[320px]"><span className="line-clamp-1">{a.awardee}</span></td>
                  <td className="text-right" title={peso(a.amount)}>{pesoShort(a.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </section>
    </div>
  );
}
