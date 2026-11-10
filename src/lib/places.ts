import "server-only";
import { all, cached, one, type Geo } from "./db";

export type PlaceAgg = { id: string; n_aw: number; amt_aw: number; n_pr: number; amt_pr: number };

/** Award and DPWH totals per province and per city/municipality (computed once per server start). */
export function placeTotals() {
  return cached("placeTotals", () => {
    const m = new Map<string, PlaceAgg>();
    const add = (id: string | null, key: "aw" | "pr", n: number, amt: number) => {
      if (!id) return;
      const x = m.get(id) ?? { id, n_aw: 0, amt_aw: 0, n_pr: 0, amt_pr: 0 };
      if (key === "aw") { x.n_aw += n; x.amt_aw += amt; } else { x.n_pr += n; x.amt_pr += amt; }
      m.set(id, x);
    };
    for (const r of all<{ id: string; n: number; amt: number }>("SELECT prov id, count(*) n, coalesce(sum(amount),0) amt FROM award WHERE prov IS NOT NULL GROUP BY prov")) add(r.id, "aw", r.n, r.amt);
    for (const r of all<{ id: string; n: number; amt: number }>("SELECT mun id, count(*) n, coalesce(sum(amount),0) amt FROM award WHERE mun IS NOT NULL GROUP BY mun")) add(r.id, "aw", r.n, r.amt);
    for (const r of all<{ id: string; n: number; amt: number }>("SELECT prov id, count(*) n, coalesce(sum(amount),0) amt FROM project WHERE prov IS NOT NULL GROUP BY prov")) add(r.id, "pr", r.n, r.amt);
    for (const r of all<{ id: string; n: number; amt: number }>("SELECT mun id, count(*) n, coalesce(sum(amount),0) amt FROM project WHERE mun IS NOT NULL GROUP BY mun")) add(r.id, "pr", r.n, r.amt);
    // regions = sum of their provinces
    for (const r of all<Geo>("SELECT * FROM geo WHERE level = 'region'")) {
      const kids = all<Geo>("SELECT * FROM geo WHERE parent = ? AND level = 'province'", r.id);
      const x: PlaceAgg = { id: r.id, n_aw: 0, amt_aw: 0, n_pr: 0, amt_pr: 0 };
      for (const k of kids) { const y = m.get(k.id); if (y) { x.n_aw += y.n_aw; x.amt_aw += y.amt_aw; x.n_pr += y.n_pr; x.amt_pr += y.amt_pr; } }
      m.set(r.id, x);
    }
    return m;
  });
}

export const children = (id: string) => all<Geo>("SELECT * FROM geo WHERE parent = ? AND level != 'barangay' ORDER BY name", id);
export const barangayCount = (id: string) => one<{ n: number }>("SELECT count(*) n FROM geo WHERE parent = ? AND level = 'barangay'", id)!.n;
