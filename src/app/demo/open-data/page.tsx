import Link from "next/link";
import { tipHeight } from "@/lib/demo";
import { one } from "@/lib/db";
import { Card } from "@/components/ui";
import { num } from "@/lib/format";

export const metadata = { title: "API & mirror kit" };

const code = "rounded bg-canvas px-1.5 py-0.5 font-mono text-xs";

export default function OpenData() {
  const tip = tipHeight();
  const tx = one<{ award_id: string }>("SELECT award_id FROM demo_tx WHERE height = ? LIMIT 1", tip)!;
  const eps = [
    { m: "GET", p: "/api/demo/blocks?page=1&limit=25", d: "Latest blocks, newest first. Add &format=csv for a spreadsheet.", ex: "/api/demo/blocks" },
    { m: "GET", p: "/api/demo/block/{height}", d: "One block: header, signature, and every record with the exact text that was hashed. &format=csv lists the transactions.", ex: `/api/demo/block/${tip}` },
    { m: "GET", p: "/api/demo/tx/{recordId}", d: "One transaction: record, Merkle proof, block, accountability fields and the budget-to-payment trail.", ex: `/api/demo/tx/${tx.award_id}` },
    { m: "GET", p: "/api/demo/headers", d: `All ${num(tip)} block headers and signatures in one file, for mirrors. &format=csv also works.`, ex: "/api/demo/headers" },
    { m: "GET", p: "/api/demo/public-key", d: "The DEMO signing key (Ed25519, PEM). It is not a government key.", ex: "/api/demo/public-key" },
  ];
  return (
    <div className="wrap max-w-[1000px] space-y-5 pb-4 pt-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">API &amp; mirror kit</h1>
        <p className="mt-1 text-ink-mute">The CADENA bill asks for an open API (Sec. 14), open formats such as CSV and JSON (Sec. 19), and independent mirror sites run by NGOs, media and universities (Sec. 13). This is how that works with the demo chain.</p>
      </div>

      <Card title="Open API" right={<span className="text-xs text-ink-mute">No sign-up · about 5 requests per second</span>}>
        <ul className="divide-y divide-line">
          {eps.map((e) => (
            <li key={e.p} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-2"><span className="badge badge-ok">{e.m}</span><span className="font-mono text-sm">{e.p}</span></div>
              <p className="mt-1 text-sm text-ink-mute">{e.d} <a href={e.ex}>Try it</a></p>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Run your own mirror" bodyClass="space-y-4 p-4 text-sm leading-relaxed">
        <p>A mirror is an independent copy of the chain. If the main site changed a record, every mirror would disagree with it. Anyone with a computer can be one.</p>
        <ol className="list-decimal space-y-3 pl-5">
          <li>
            <strong className="font-medium">Get a full copy.</strong> In the PisoScan folder run <span className={code}>npm run export:chain</span>. It writes every block and all {num(844624)} records with their hashed text to <span className={code}>data/export/pisoscan-demo-chain.jsonl.gz</span> (about 34 MB).
          </li>
          <li>
            <strong className="font-medium">Check it yourself.</strong> Download <a href="/mirror/verify-chain.mjs" download>verify-chain.mjs</a> (no dependencies, Node 18 or newer) and run{" "}
            <span className={code}>node verify-chain.mjs pisoscan-demo-chain.jsonl.gz</span>. It re-hashes every record, rebuilds every Merkle root, checks each block links to the one before it, and checks each signature. It takes a few seconds.
          </li>
          <li>
            <strong className="font-medium">Or check a running site.</strong> <span className={code}>node verify-chain.mjs --url http://localhost:4100 --sample 25</span> checks all headers and signatures, then re-hashes 25 random blocks through the API.
          </li>
          <li>
            <strong className="font-medium">Keep checking.</strong> Run it again later. If any record changed since your copy, the checker names the block that no longer matches.
          </li>
        </ol>
        <p className="rounded-md border border-line bg-canvas p-3 text-xs text-ink-mute">Tested: changing one award by ₱1 in a copied file makes the checker report &quot;block #3000: Merkle root does not match its records&quot; and exit with an error.</p>
      </Card>

      <Card title="What is still missing for a real CADENA" bodyClass="p-4 text-sm leading-relaxed">
        <ul className="list-disc space-y-2 pl-5">
          <li>Records signed by the accountable officer of each agency, not a demo key (Sec. 3, 19).</li>
          <li>Accredited mirrors that sync automatically with the official system (Sec. 13).</li>
          <li>SAROs, NCAs, disbursement vouchers and completion certificates published per project, so the <Link href={`/demo/tx/${tx.award_id}`}>budget-to-payment trail</Link> has no gaps (Sec. 5).</li>
        </ul>
      </Card>
    </div>
  );
}
