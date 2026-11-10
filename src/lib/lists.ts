import "server-only";
import { all, one, geo, type Award, type Project } from "./db";

export const PAGE_SIZE = 25;
export const MAX_ROWS = 10000; // like block explorers: deep paging is capped; use filters

export function pageOf(p: string | undefined) {
  const n = Math.floor(Number(p));
  return Number.isFinite(n) && n > 1 ? Math.min(n, MAX_ROWS / PAGE_SIZE) : 1;
}

type Where = { sql: string; args: unknown[] };
/** Filter on a PSGC place: region → its provinces, province, city/municipality or barangay. */
function geoWhere(id: string | undefined, hasBrgy: boolean): Where | null {
  const g = geo(id);
  if (!g) return null;
  if (g.level === "region") return { sql: "prov IN (SELECT id FROM geo WHERE parent = ? AND level = 'province')", args: [g.id] };
  if (g.level === "province") return { sql: "prov = ?", args: [g.id] };
  if (g.level === "municipality") return { sql: "mun = ?", args: [g.id] };
  if (g.level === "barangay" && hasBrgy) return { sql: "brgy = ?", args: [g.id] };
  return null;
}

const and = (parts: (Where | null)[]): Where => {
  const ps = parts.filter(Boolean) as Where[];
  return { sql: ps.length ? "WHERE " + ps.map((p) => p.sql).join(" AND ") : "", args: ps.flatMap((p) => p.args) };
};

export type AwardFilter = { year?: string; level?: string; contractor?: string; agency?: string; geo?: string; sort?: string; min?: string };
export function awardWhere(f: AwardFilter): Where {
  const y = f.year && /^\d{4}$/.test(f.year) ? f.year : null;
  return and([
    y ? { sql: "award_date >= ? AND award_date < ?", args: [`${y}-01-01`, `${Number(y) + 1}-01-01`] } : null,
    f.level === "national" ? { sql: "org_level IS NULL", args: [] } : f.level && ["province", "city", "municipality", "barangay"].includes(f.level) ? { sql: "org_level = ?", args: [f.level] } : null,
    f.contractor ? { sql: "contractor_id = ?", args: [f.contractor] } : null,
    f.agency ? { sql: "agency_id = ?", args: [f.agency] } : null,
    geoWhere(f.geo, true),
    f.min && Number(f.min) > 0 ? { sql: "amount >= ?", args: [Number(f.min)] } : null,
  ]);
}
export function listAwards(f: AwardFilter, page: number) {
  const w = awardWhere(f);
  const order = f.sort === "amount" ? "amount DESC" : f.sort === "oldest" ? "award_date ASC" : "award_date DESC";
  const total = one<{ n: number; s: number }>(`SELECT count(*) n, coalesce(sum(amount),0) s FROM award ${w.sql}`, ...w.args)!;
  const rows = all<Award>(`SELECT * FROM award ${w.sql} ORDER BY ${order} NULLS LAST LIMIT ? OFFSET ?`, ...w.args, PAGE_SIZE, (page - 1) * PAGE_SIZE);
  return { total: total.n, sum: total.s, rows, pages: Math.max(1, Math.ceil(Math.min(total.n, MAX_ROWS) / PAGE_SIZE)) };
}

export type ProjectFilter = { year?: string; status?: string; category?: string; contractor?: string; agency?: string; geo?: string; sort?: string };
export function projectWhere(f: ProjectFilter): Where {
  const y = f.year && /^\d{4}$/.test(f.year) ? Number(f.year) : null;
  return and([
    y ? { sql: "year = ?", args: [y] } : null,
    f.status ? { sql: "status = ?", args: [f.status] } : null,
    f.category ? { sql: "category = ?", args: [f.category] } : null,
    f.contractor ? { sql: "contractor_id = ?", args: [f.contractor] } : null,
    f.agency ? { sql: "agency_id = ?", args: [f.agency] } : null,
    geoWhere(f.geo, false),
  ]);
}
export function listProjects(f: ProjectFilter, page: number) {
  const w = projectWhere(f);
  const order = f.sort === "amount" ? "amount DESC" : f.sort === "oldest" ? "start ASC" : "start DESC";
  const total = one<{ n: number; s: number }>(`SELECT count(*) n, coalesce(sum(amount),0) s FROM project ${w.sql}`, ...w.args)!;
  const rows = all<Project & { cname: string | null }>(`SELECT p.*, c.name AS cname FROM project p LEFT JOIN contractor c ON c.id = p.contractor_id ${w.sql.replace(/\b(year|status|category|contractor_id|agency_id|prov|mun|start|amount)\b/g, "p.$1")} ORDER BY p.${order} NULLS LAST LIMIT ? OFFSET ?`, ...w.args, PAGE_SIZE, (page - 1) * PAGE_SIZE);
  return { total: total.n, sum: total.s, rows, pages: Math.max(1, Math.ceil(Math.min(total.n, MAX_ROWS) / PAGE_SIZE)) };
}
