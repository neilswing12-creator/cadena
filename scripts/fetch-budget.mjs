// Snapshots the BetterGov Philippine Budget Data API (CC BY 4.0) into data/budget-api.json.gz.
// Polite: one request at a time, a short pause between requests, identified client.
// Usage: npm run fetch:budget
import { gzipSync } from "node:zlib";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import path from "node:path";

const BASE = process.env.BUDGET_API || "https://budget.bettergov.ph/api/v1";
const OUT = path.resolve(process.env.DATA_DIR || "data", "budget-api.json.gz");
const PAUSE = 400;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let calls = 0;

async function get(p, tries = 3) {
  for (let i = 1; ; i++) {
    calls++;
    const res = await fetch(BASE + p, { headers: { "User-Agent": "PisoScan/0.1 (independent civic data explorer; snapshot script)", Accept: "application/json" } });
    await sleep(PAUSE);
    if (res.ok) return res.json();
    if (res.status === 404) return null;
    if (i >= tries) throw new Error(`${res.status} on ${p}`);
    await sleep(2000 * i);
  }
}

// ONLY=agencies,regions refreshes just those parts of an existing snapshot.
const ONLY = (process.env.ONLY || "").split(",").filter(Boolean);
const want = (k) => !ONLY.length || ONLY.includes(k);
const snap = ONLY.length && existsSync(OUT)
  ? JSON.parse(gunzipSync(readFileSync(OUT)).toString("utf8"))
  : { source: "Philippine Budget Data API (BetterGov.ph), " + BASE, license: "CC BY 4.0", fetchedAt: new Date().toISOString() };
if (want("core")) {
const root = await get("");
snap.description = root?.description ?? null;
snap.gaa = await get("/gaa");
snap.departments = await get("/gaa/departments");
snap.nep2027 = await get("/nep/2027/departments");
snap.nep2027national = (await get("/nep/2027"))?.data?.national ?? null;

snap.programs = {};
snap.expenseClasses = {};
for (const d of snap.departments.data) {
  const rows = [];
  let cursor = null;
  do {
    const q = `/gaa/departments/${d.id}/programs?year=2026&limit=500${cursor ? "&cursor=" + encodeURIComponent(cursor) : ""}`;
    const r = await get(q);
    if (!r) break;
    rows.push(...r.data);
    cursor = r.meta?.next_cursor ?? r.next_cursor ?? null;
  } while (cursor);
  snap.programs[d.id] = rows;
  snap.expenseClasses[d.id] = (await get(`/gaa/departments/${d.id}/expense-classes`))?.data ?? [];
  console.log(`GAA ${d.id} ${d.description}: ${rows.length} programs`);
}

}

if (want("core")) {
const cycle = await get("/budget-cycle");
snap.cycle = { meta: cycle.meta, note: cycle.data.note, subjects: cycle.data.subjects, departments: {} };
for (const id of [...new Set(cycle.data.subjects.map((s) => s.canonical_portal_department_id))].filter(Boolean)) {
  const r = await get(`/budget-cycle/departments/${id}`);
  if (r) snap.cycle.departments[id] = r.data;
  console.log(`budget cycle ${id}: ${r?.data?.facts?.length ?? 0} facts`);
}

}

// Agencies (bureaus) inside each department, FY2024–2026.
if (want("agencies")) {
  snap.agencies = {};
  for (const d of snap.departments.data) {
    for (const y of [2024, 2025, 2026]) {
      const r = await get(`/gaa/years/${y}/departments/${d.id}/children?limit=500`);
      for (const a of r?.data ?? []) {
        const x = (snap.agencies[a.id] ??= { id: a.id, dept: d.id, name: a.description, years: {} });
        x.name = a.description;
        x.years[y] = { amount: a.amount, line_items: a.line_items };
      }
    }
    console.log(`agencies ${d.id}`);
  }
  snap.agenciesFetchedAt = new Date().toISOString();
}

// FY2026 GAA (baseline) and FY2027 NEP by region, overall and by department.
if (want("regions")) {
  const r = await get("/nep/2027/rollups/region");
  snap.regions = { totals: r.data, byDept: {} };
  for (const x of r.data) {
    const b = await get(`/nep/2027/rollups/region?code=${x.code}&by=department`);
    snap.regions.byDept[x.code] = b?.data ?? [];
    console.log(`region ${x.code} ${x.description}`);
  }
  snap.regionsFetchedAt = new Date().toISOString();
}

mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, gzipSync(JSON.stringify(snap)));
console.log(`done: ${calls} requests → ${OUT}`);
