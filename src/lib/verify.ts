import "server-only";
import { createHash } from "node:crypto";
import { fingerprintInput } from "./canon.mjs";
import type { Award, Project } from "./db";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/** Rebuilds the PhilGEPS source row from stored columns and re-hashes it. */
export function awardFingerprint(a: Award) {
  const row = [a.reference, a.contract_no, a.title, a.awardee, a.organization, a.area, a.amount, a.award_date, a.org_level, a.prov, a.mun, a.brgy];
  const input = fingerprintInput("philgeps", row, a.dup);
  const hash = sha(input);
  return { input, hash, ok: hash.startsWith(a.id) };
}

/** Rebuilds the DPWH source row from stored columns and re-hashes it. */
export function projectFingerprint(p: Project) {
  const row = [p.id, p.description, p.category, p.status, p.amount, p.paid, p.progress, p.office, p.region, p.contractor_raw, p.start, p.end, p.year, p.funds, p.lat, p.lng, p.mun, p.prov];
  const input = fingerprintInput("dpwh", row, 0);
  const hash = sha(input);
  return { input, hash, ok: hash === p.fp };
}
