// Demo hash chain, shared by the importer and the web app. Keep stable: block hashes depend on it.
// Educational demo only: built by PisoScan on one computer from published records. Not an official ledger.
import { createHash } from "node:crypto";

export const GENESIS_PREV = "0".repeat(64);
const sha = (s) => createHash("sha256").update(s).digest("hex");

/** Parent of two Merkle nodes: SHA-256 of the two hex strings joined. */
export const merkleParent = (a, b) => sha(a + b);

/** Merkle root of a list of hex hashes (an odd last node is paired with itself). */
export function merkleRoot(leaves) {
  if (!leaves.length) return sha("");
  let level = leaves.slice();
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) next.push(merkleParent(level[i], level[i + 1] ?? level[i]));
    level = next;
  }
  return level[0];
}

/** Sibling path from leaf `index` up to the root: [{ hash, side: "left" | "right" }]. */
export function merkleProof(leaves, index) {
  const path = [];
  let level = leaves.slice();
  let i = index;
  while (level.length > 1) {
    const isRight = i % 2 === 1;
    const sib = isRight ? level[i - 1] : level[i + 1] ?? level[i];
    path.push({ hash: sib, side: isRight ? "left" : "right" });
    const next = [];
    for (let j = 0; j < level.length; j += 2) next.push(merkleParent(level[j], level[j + 1] ?? level[j]));
    level = next;
    i = Math.floor(i / 2);
  }
  return path;
}

/** The exact text hashed to make a block hash. */
export const blockHeaderInput = (height, date, prev, merkle, txCount) => JSON.stringify(["pisoscan-demo", height, date, prev, merkle, txCount]);
export const blockHash = (height, date, prev, merkle, txCount) => sha(blockHeaderInput(height, date, prev, merkle, txCount));
