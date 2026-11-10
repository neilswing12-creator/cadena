import Link from "next/link";
import { one } from "@/lib/db";
import { getBlock, tipHeight } from "@/lib/demo";
import { Card } from "@/components/ui";
import { short } from "@/lib/format";

export const metadata = { title: "How it works" };

export default function How() {
  const tip = tipHeight();
  const b = getBlock(tip)!, prev = getBlock(tip - 1)!;
  const tx = one<{ award_id: string }>("SELECT award_id FROM demo_tx WHERE height = ? ORDER BY tx_index LIMIT 1", tip)!;
  return (
    <div className="wrap max-w-[960px] space-y-5 pb-4 pt-6">
      <h1 className="text-xl font-semibold sm:text-2xl">How this demo blockchain works</h1>
      <p className="text-ink-mute">A plain-language walk-through, using the real records you can click through on this site.</p>

      <Card title="1. A record becomes a fingerprint" bodyClass="space-y-2 p-4 text-sm leading-relaxed">
        <p>Each contract award (who awarded it, to whom, for how much, on what date) is written out as one line of text and run through SHA-256. The result is a 64-character fingerprint. Change a single peso or letter and the fingerprint becomes completely different.</p>
        <p>Example: <Link href={`/demo/tx/${tx.award_id}`} className="mono">{short(tx.award_id, 12, 0)}</Link>, the first transaction in the latest block.</p>
      </Card>
      <Card title="2. One day of records becomes a block" bodyClass="space-y-2 p-4 text-sm leading-relaxed">
        <p>All awards dated the same day go into one block. Their fingerprints are paired and hashed again and again until one hash is left: the <strong className="font-medium">Merkle root</strong>. It summarises every record in the block.</p>
        <p>The block&apos;s header (its number, date, Merkle root, record count and the previous block&apos;s hash) is hashed into the <strong className="font-medium">block hash</strong>.</p>
      </Card>
      <Card title="3. Blocks are chained" bodyClass="space-y-2 p-4 text-sm leading-relaxed">
        <p>Each block stores the hash of the block before it. Block <Link href={`/demo/block/${tip}`} className="mono">#{tip}</Link> stores <span className="mono">{short(b.prev_hash, 10, 6)}</span>, which is exactly the hash of block <Link href={`/demo/block/${tip - 1}`} className="mono">#{tip - 1}</Link> (<span className="mono">{short(prev.hash, 10, 6)}</span>).</p>
        <p>So editing any old record changes its block&apos;s hash, which no longer matches what the next block stored, and the break carries on to the end of the chain. The <Link href={`/demo/tx/${tx.award_id}`}>tamper test</Link> on every transaction page shows this live.</p>
      </Card>
      <Card title="What a real system like CADENA would add" bodyClass="p-4 text-sm leading-relaxed">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong className="font-medium">Many independent copies.</strong> This demo runs on one computer. A real ledger would be held by several independent parties (for example DBM, COA and civil-society groups), so no single one could rewrite it quietly.</li>
          <li><strong className="font-medium">Official signatures.</strong> Each record would be digitally signed by the agency that issued it. Nothing here is signed by any agency.</li>
          <li><strong className="font-medium">Records at the moment they happen.</strong> Here the chain is built after the fact from published data. A real ledger would add each record when it is issued.</li>
        </ul>
      </Card>
      <Card title="What a blockchain cannot do" bodyClass="p-4 text-sm leading-relaxed">
        <p>It proves a record has not changed since it was added. It cannot prove the record was true in the first place. If an office publishes a wrong amount, the chain keeps the wrong amount faithfully. Audits, inspections and public scrutiny are still needed.</p>
      </Card>
    </div>
  );
}
