// Writes the whole DEMO chain to data/export/pisoscan-demo-chain.jsonl.gz so others can keep an independent copy (bill Sec. 13, mirror sites).
// One JSON object per line: a "meta" line, then one "block" line per block with every record's exact hashed input.
// Usage: npm run export:chain
import Database from "better-sqlite3";
import { createGzip } from "node:zlib";
import { createWriteStream, mkdirSync } from "node:fs";
import { once } from "node:events";
import path from "node:path";
import { fingerprintInput } from "../src/lib/canon.mjs";

const DATA = process.env.DATA_DIR || path.resolve("data");
const db = new Database(process.env.DB_PATH || path.join(DATA, "pisoscan.db"), { readonly: true });
const outDir = path.join(DATA, "export");
mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, "pisoscan-demo-chain.jsonl.gz");
const gz = createGzip({ level: 9 });
const file = createWriteStream(out);
gz.pipe(file);
const write = async (obj) => { if (!gz.write(JSON.stringify(obj) + "\n")) await once(gz, "drain"); };

await write({
  type: "meta", demo: true,
  note: "DEMO for public education. Built by PisoScan from published PhilGEPS records. Not an official government ledger.",
  exported_at: new Date().toISOString(),
  public_key: JSON.parse(db.prepare("SELECT value FROM meta WHERE key = 'demoPublicKey'").get().value),
  hashing: { leaf: "sha256(record)", merkle_parent: "sha256(left_hex + right_hex), odd last node paired with itself", block_hash: 'sha256(JSON.stringify(["pisoscan-demo", height, date, prev_hash, merkle_root, tx_count]))', signature: "Ed25519 over the block hash (UTF-8)" },
});
const recs = db.prepare("SELECT a.*, t.tx_index FROM demo_tx t JOIN award a ON a.id = t.award_id WHERE t.height = ? ORDER BY t.tx_index");
let n = 0;
for (const b of db.prepare("SELECT * FROM demo_block ORDER BY height").iterate()) {
  const records = recs.all(b.height).map((a) => fingerprintInput("philgeps", [a.reference, a.contract_no, a.title, a.awardee, a.organization, a.area, a.amount, a.award_date, a.org_level, a.prov, a.mun, a.brgy], a.dup));
  await write({ type: "block", ...b, records });
  if (++n % 1000 === 0) console.log(`${n} blocks`);
}
gz.end();
await once(file, "finish");
console.log(`done: ${n} blocks → ${out}`);
