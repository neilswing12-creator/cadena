import "server-only";
import { all, one, cached, meta, geo, type Award, type Project, type Audit } from "./db";
import { createPublicKey, verify as edVerify } from "node:crypto";
import { awardFingerprint } from "./verify";
import { blockHash, blockHeaderInput, merkleProof, merkleRoot, GENESIS_PREV } from "./chain.mjs";

export type Block = { height: number; date: string; prev_hash: string; merkle_root: string; hash: string; tx_count: number; amount: number; signature: string };
export type Tx = { award_id: string; height: number; tx_index: number; leaf: string };

export const getBlock = (h: number) => one<Block>("SELECT * FROM demo_block WHERE height = ?", h);
export const tipHeight = () => cached("demo:tip", () => one<{ h: number }>("SELECT max(height) h FROM demo_block")!.h);

/** Recompute one block from its records: leaves, Merkle root, header hash, link to the previous block. */
export function checkBlock(b: Block) {
  const awards = all<Award & { tx_index: number }>("SELECT a.*, t.tx_index FROM demo_tx t JOIN award a ON a.id = t.award_id WHERE t.height = ? ORDER BY t.tx_index", b.height);
  const leaves = awards.map((a) => awardFingerprint(a).hash);
  const root = merkleRoot(leaves);
  const hash = blockHash(b.height, b.date, b.prev_hash, root, leaves.length);
  const prev = b.height === 1 ? null : getBlock(b.height - 1);
  const linked = b.height === 1 ? b.prev_hash === GENESIS_PREV : prev?.hash === b.prev_hash;
  return { awards, leaves, root, hash, rootOk: root === b.merkle_root, hashOk: hash === b.hash, linked, headerInput: blockHeaderInput(b.height, b.date, b.prev_hash, b.merkle_root, b.tx_count) };
}

/** Everything the tamper test needs for one record. */
export function txProof(awardId: string) {
  const t = one<Tx>("SELECT * FROM demo_tx WHERE award_id = ?", awardId);
  if (!t) return null;
  const b = getBlock(t.height)!;
  const leaves = all<{ leaf: string }>("SELECT leaf FROM demo_tx WHERE height = ? ORDER BY tx_index", t.height).map((r) => r.leaf);
  const next = getBlock(t.height + 1) ?? null;
  return { tx: t, block: b, next, proof: merkleProof(leaves, t.tx_index) as { hash: string; side: "left" | "right" }[], leafCount: leaves.length };
}

/** Re-hash every block header and check each link to the previous block. */
export function verifyChain() {
  const blocks = all<Block>("SELECT * FROM demo_block ORDER BY height");
  let prev = GENESIS_PREV;
  const problems: { height: number; issue: string }[] = [];
  for (const b of blocks) {
    if (b.prev_hash !== prev) problems.push({ height: b.height, issue: "does not point to the previous block's hash" });
    if (blockHash(b.height, b.date, b.prev_hash, b.merkle_root, b.tx_count) !== b.hash) problems.push({ height: b.height, issue: "header hash does not match its contents" });
    prev = b.hash;
  }
  return { blocks: blocks.length, problems, tip: blocks[blocks.length - 1] };
}

// ---------- demo signatures (bill Sec. 19: digital signatures on records) ----------

export const demoPublicKeyPem = () => meta<string>("demoPublicKey");
export function verifyBlockSignature(b: Block) {
  try {
    return edVerify(null, Buffer.from(b.hash, "utf8"), createPublicKey(demoPublicKeyPem()), Buffer.from(b.signature, "base64"));
  } catch {
    return false;
  }
}

// ---------- document level (for the action grid) ----------
export const LEVELS = [
  { k: "national", l: "National agencies", c: "#111111" },
  { k: "province", l: "Provinces", c: "#525252" },
  { k: "city", l: "Cities", c: "#8a8a8a" },
  { k: "municipality", l: "Municipalities", c: "#c4c4c4" },
  { k: "barangay", l: "Barangays", c: "#15803d" },
] as const;
export const levelOf = (a: { org_level: string | null }) => (a.org_level && ["province", "city", "municipality", "barangay"].includes(a.org_level) ? a.org_level : "national");

// ---------- budget-to-payment trail (bill Sec. 5(c), 5(d), 5(e)) ----------
export type TrailStep = { key: string; label: string; doc: string; section: string; status: "found" | "gap" | "partial"; detail: string; href?: string };

export function trail(a: Award): TrailStep[] {
  const p = one<Project>("SELECT * FROM project WHERE id IN (?, ?) AND contractor_id = ? LIMIT 1", a.reference ?? "", a.contract_no ?? "", a.contractor_id);
  const gaaYear = p?.funds?.match(/GAA\s+(\d{4})/)?.[1];
  const lguId = a.org_level === "province" ? a.prov : a.org_level === "city" || a.org_level === "municipality" ? a.mun : null;
  const audit = lguId ? one<Audit>("SELECT * FROM audit WHERE lgu_id = ? ORDER BY year DESC LIMIT 1", lguId) : undefined;
  const lgu = geo(lguId);
  return [
    {
      key: "gaa", label: "Appropriation", doc: "GAA line item", section: "Sec. 5(b)",
      status: p?.funds ? "partial" : "gap",
      detail: p?.funds ? `DPWH lists the funding source as "${p.funds}"${gaaYear ? `, i.e. the FY${gaaYear} GAA` : ""}. The exact UACS line is not given.` : "The award does not say which budget line pays for it.",
      href: p?.funds && gaaYear ? `/budget/18` : undefined,
    },
    { key: "saro", label: "Allotment release", doc: "SARO / allotment", section: "Sec. 5(c)(iii)", status: "gap", detail: "Not published per project. DBM releases SAROs, but not linked to individual contracts." },
    { key: "nca", label: "Cash allocation", doc: "Notice of Cash Allocation", section: "Sec. 5(c)(iv)", status: "gap", detail: "Not published per project." },
    { key: "award", label: "Contract award", doc: "Notice of Award (PhilGEPS)", section: "Sec. 5(d)", status: "found", detail: `${a.organization} awarded it to ${a.awardee} on ${a.award_date ?? "an unstated date"}.`, href: `/award/${a.id}` },
    {
      key: "contract", label: "Contract & progress", doc: "Contract / progress report (DPWH)", section: "Sec. 5(d)",
      status: p ? "found" : "gap",
      detail: p ? `DPWH contract ${p.id}: ${p.status ?? "status not stated"}${p.progress != null ? `, ${p.progress}% physical progress` : ""}.` : "No matching DPWH contract record (only DPWH contracts are listed with progress).",
      href: p ? `/project/${encodeURIComponent(p.id)}` : undefined,
    },
    { key: "dv", label: "Payment", doc: "Disbursement voucher", section: "Sec. 5(c)(viii)", status: "gap", detail: "Not published. No public source shows how much of this contract has been paid." },
    {
      key: "completion", label: "Completion", doc: "Certificate of completion", section: "Sec. 5(d)",
      status: p && /complete/i.test(p.status ?? "") ? "partial" : "gap",
      detail: p && /complete/i.test(p.status ?? "") ? `DPWH marks the contract "${p.status}"${p.end ? ` (end ${p.end})` : ""}. The certificate itself is not published.` : "No completion certificate published.",
    },
    {
      key: "audit", label: "Audit", doc: "COA annual audit report", section: "Sec. 5(e)(iii)",
      status: audit ? "partial" : "gap",
      detail: audit ? `COA's CY${audit.year} audit of ${lgu?.name ?? audit.lgu_name} gave a "${audit.opinion ?? "not stated"}" opinion on its financial statements (not specific to this contract).` : "No COA finding linked to this contract.",
      href: audit && lguId ? `/lgu/${lguId}` : undefined,
    },
  ];
}
