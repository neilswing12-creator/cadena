import "server-only";
import Database from "better-sqlite3";
import path from "node:path";
import { existsSync } from "node:fs";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  const file = process.env.DB_PATH || path.join(process.cwd(), "data", "pisoscan.db");
  if (!existsSync(file)) throw new Error(`Database not found at ${file}. Run "npm run import" first.`);
  db = new Database(file, { readonly: true, fileMustExist: true });
  db.pragma("query_only = ON");
  db.pragma("cache_size = -64000");
  db.pragma("mmap_size = 268435456");
  return db;
}

export function all<T>(sql: string, ...params: unknown[]): T[] {
  return getDb().prepare(sql).all(...params) as T[];
}
export function one<T>(sql: string, ...params: unknown[]): T | undefined {
  return getDb().prepare(sql).get(...params) as T | undefined;
}

const memo = new Map<string, unknown>();
export function cached<T>(key: string, fn: () => T): T {
  if (!memo.has(key)) memo.set(key, fn());
  return memo.get(key) as T;
}

export type Stats = {
  builtAt: string;
  philgeps: { rows: number; amount: number; source: string; sourceUrl: string; byYear: { year: number; count: number; amount: number }[]; byLevel: { level: string; count: number; amount: number }[]; maxDate: string };
  dpwh: { rows: number; amount: number; source: string; sourceUrl: string; notice: string; byYear: { year: number; count: number; amount: number }[]; byStatus: { status: string; count: number }[]; byCategory: { category: string; count: number; amount: number }[]; maxDate: string };
  contractors: number;
  agencies: number;
  coa: { rows: number; years: number[] };
  gaa: { yearly: { year: number; line_items: number; amount: number }[]; source: string; license: string; fetchedAt: string };
  agenciesFetchedAt: string | null;
  regionsFetchedAt: string | null;
  nep2027: { line_items: number; amount: number; base_amount: number; delta: number; pct: number } | null;
  cycle: { meta: { years: number[]; stages: string[]; source_filename: string; source_sha256: string; generated_at: string }; note: string };
};

export const meta = <T,>(key: string): T => cached("meta:" + key, () => JSON.parse(one<{ value: string }>("SELECT value FROM meta WHERE key = ?", key)!.value) as T);
export const stats = () => meta<Stats>("stats");

// ---------- row types ----------
export type Award = {
  id: string; dup: number; reference: string | null; contract_no: string | null; title: string | null; awardee: string | null;
  organization: string | null; area: string | null; amount: number | null; award_date: string | null; org_level: string | null;
  prov: string | null; mun: string | null; brgy: string | null; contractor_id: string; agency_id: string;
};
export type Project = {
  id: string; fp: string; description: string | null; category: string | null; status: string | null; amount: number | null; paid: number | null;
  progress: number | null; office: string | null; region: string | null; contractor_raw: string | null; start: string | null; end: string | null;
  year: number | null; funds: string | null; lat: number | null; lng: number | null; mun: string | null; prov: string | null; contractor_id: string | null; agency_id: string;
};
export type Contractor = { id: string; key: string; name: string; dpwh_codes: string | null; pg_count: number; pg_amount: number; dp_count: number; dp_amount: number; total: number; first_date: string | null; last_date: string | null; agencies: number };
export type Agency = { id: string; key: string; name: string; kind: string; level: string | null; prov: string | null; mun: string | null; count: number; amount: number; first_date: string | null; last_date: string | null; contractors: number };
export type Geo = { id: string; name: string; level: string; parent: string | null };
export type Audit = { lgu_id: string; year: number; lgu_name: string; level: string; province_id: string | null; opinion: string | null; opinion_text: string | null; recs_total: number | null; recs_fully: number | null; recs_partially: number | null; recs_not: number | null; source_url: string | null; source_title: string | null };
export type Dept = { id: string; slug: string; name: string; years: string; amount_2026: number | null; nep_2027: number | null; nep_base: number | null; nep_delta: number | null; nep_pct: number | null; expense: string; cycle: number };
export type Program = { id: string; dept_id: string; agency_id: string | null; name: string; fam_key: string; years: string; amount_2026: number | null; amount_2025: number | null };
export type YearMap = Record<string, { count: number; amount: number }>;

export const geo = (id: string | null | undefined) => (id ? cached("geo:" + id, () => one<Geo>("SELECT * FROM geo WHERE id = ?", id) ?? null) : null);

/** Region → province → municipality → barangay chain for a PSGC id (as stored, without leading zeros). */
export function geoChain(id: string | null | undefined): Geo[] {
  const out: Geo[] = [];
  let g = geo(id);
  while (g) {
    out.unshift(g);
    g = geo(g.parent);
  }
  return out;
}
