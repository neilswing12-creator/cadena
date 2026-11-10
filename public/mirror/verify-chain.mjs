#!/usr/bin/env node
// PisoScan DEMO chain checker. No dependencies; Node 18+.
// Checks that every block links to the one before it, that block hashes match their headers,
// that Merkle roots match the records, and that each block carries a valid demo signature.
//
//   node verify-chain.mjs pisoscan-demo-chain.jsonl.gz          # full check of an exported copy
//   node verify-chain.mjs --url http://localhost:4100 --sample 25  # check a running site's headers + 25 random blocks
//
// DEMO for public education. Not an official government ledger.
import { createHash, createPublicKey, verify } from "node:crypto";
import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import readline from "node:readline";

const sha = (s) => createHash("sha256").update(s).digest("hex");
const GENESIS = "0".repeat(64);
function merkleRoot(leaves) {
  if (!leaves.length) return sha("");
  let l = leaves;
  while (l.length > 1) { const n = []; for (let i = 0; i < l.length; i += 2) n.push(sha(l[i] + (l[i + 1] ?? l[i]))); l = n; }
  return l[0];
}
const headerHash = (b) => sha(JSON.stringify(["pisoscan-demo", b.height, b.date, b.prev_hash, b.merkle_root, b.tx_count]));
const sigOk = (key, b) => { try { return verify(null, Buffer.from(b.hash, "utf8"), key, Buffer.from(b.signature, "base64")); } catch { return false; } };

const problems = [];
const bad = (h, msg) => { problems.push(`block #${h}: ${msg}`); if (problems.length <= 20) console.log(`  ✗ block #${h}: ${msg}`); };

function checkHeader(b, prevHash, key) {
  if (b.prev_hash !== prevHash) bad(b.height, "does not point to the previous block's hash");
  if (headerHash(b) !== b.hash) bad(b.height, "block hash does not match its header");
  if (key && !sigOk(key, b)) bad(b.height, "signature is not valid for the published demo key");
}
function checkRecords(b, records) {
  if (records.length !== b.tx_count) bad(b.height, `has ${records.length} records, header says ${b.tx_count}`);
  if (merkleRoot(records.map(sha)) !== b.merkle_root) bad(b.height, "Merkle root does not match its records");
}

const args = process.argv.slice(2);
const urlIdx = args.indexOf("--url");
if (urlIdx >= 0) {
  const base = args[urlIdx + 1].replace(/\/$/, "");
  const sample = Number(args[args.indexOf("--sample") + 1]) || 10;
  console.log(`Fetching headers from ${base} …`);
  const H = await (await fetch(`${base}/api/demo/headers`)).json();
  const key = createPublicKey(H.public_key);
  let prev = GENESIS;
  for (const b of H.headers) { checkHeader(b, prev, key); prev = b.hash; }
  console.log(`Checked ${H.headers.length} headers and signatures.`);
  const picks = new Set(); while (picks.size < Math.min(sample, H.headers.length)) picks.add(1 + Math.floor(Math.random() * H.headers.length));
  for (const h of picks) {
    const r = await (await fetch(`${base}/api/demo/block/${h}`)).json();
    checkRecords(r.block, r.transactions.map((t) => t.hashed_input));
    await new Promise((res) => setTimeout(res, 250));
  }
  console.log(`Re-hashed every record in ${picks.size} random blocks.`);
} else {
  const file = args[0] ?? "pisoscan-demo-chain.jsonl.gz";
  console.log(`Reading ${file} …`);
  const rl = readline.createInterface({ input: createReadStream(file).pipe(createGunzip()), crlfDelay: Infinity });
  let key = null, prev = GENESIS, blocks = 0, records = 0;
  for await (const line of rl) {
    if (!line) continue;
    const o = JSON.parse(line);
    if (o.type === "meta") { key = createPublicKey(o.public_key); continue; }
    checkHeader(o, prev, key); checkRecords(o, o.records);
    prev = o.hash; blocks++; records += o.records.length;
  }
  console.log(`Checked ${blocks} blocks and ${records} records.`);
}
console.log(problems.length ? `\nFAILED: ${problems.length} problem(s).` : "\nOK: the chain is intact.");
process.exit(problems.length ? 1 : 0);
