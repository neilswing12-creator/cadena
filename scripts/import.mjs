// PisoScan importer: builds data/pisoscan.db from the source files in data/.
// Usage: npm run import   (takes a few minutes; re-run any time, it rebuilds from scratch)
import Database from "better-sqlite3";
import { createHash, generateKeyPairSync, createPrivateKey, createPublicKey, sign as edSign } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { readFileSync, existsSync, rmSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fingerprintInput, cleanName, nameKey, dpwhCode } from "../src/lib/canon.mjs";
import { GENESIS_PREV, merkleRoot, blockHash } from "../src/lib/chain.mjs";

const DATA = process.env.DATA_DIR || path.resolve("data");
const OUT = process.env.DB_PATH || path.join(DATA, "pisoscan.db");
const TMP = OUT + ".building";

const readJson = (f) => {
  const p = path.join(DATA, f);
  if (!existsSync(p)) throw new Error(`Missing ${p}. See README: copy the source files into data/.`);
  const buf = readFileSync(p);
  return JSON.parse((f.endsWith(".gz") ? gunzipSync(buf) : buf).toString("utf8"));
};
const sha = (s) => createHash("sha256").update(s).digest("hex");
const t0 = Date.now();
const log = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);

for (const f of [TMP, TMP + "-wal", TMP + "-shm"]) if (existsSync(f)) rmSync(f);
const db = new Database(TMP);
db.pragma("journal_mode = OFF");
db.pragma("synchronous = OFF");
db.pragma("temp_store = MEMORY");

db.exec(`
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE geo (id TEXT PRIMARY KEY, name TEXT NOT NULL, level TEXT NOT NULL, parent TEXT);
CREATE TABLE contractor (
  id TEXT PRIMARY KEY, key TEXT NOT NULL UNIQUE, name TEXT NOT NULL, dpwh_codes TEXT,
  pg_count INTEGER NOT NULL DEFAULT 0, pg_amount REAL NOT NULL DEFAULT 0,
  dp_count INTEGER NOT NULL DEFAULT 0, dp_amount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0, first_date TEXT, last_date TEXT, agencies INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE agency (
  id TEXT PRIMARY KEY, key TEXT NOT NULL UNIQUE, name TEXT NOT NULL, kind TEXT NOT NULL,
  level TEXT, prov TEXT, mun TEXT, count INTEGER NOT NULL DEFAULT 0, amount REAL NOT NULL DEFAULT 0,
  first_date TEXT, last_date TEXT, contractors INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE award (
  id TEXT PRIMARY KEY, dup INTEGER NOT NULL, reference TEXT, contract_no TEXT, title TEXT, awardee TEXT,
  organization TEXT, area TEXT, amount REAL, award_date TEXT, org_level TEXT, prov TEXT, mun TEXT, brgy TEXT,
  contractor_id TEXT NOT NULL, agency_id TEXT NOT NULL
);
CREATE TABLE demo_block (height INTEGER PRIMARY KEY, date TEXT NOT NULL, prev_hash TEXT NOT NULL, merkle_root TEXT NOT NULL, hash TEXT NOT NULL UNIQUE, tx_count INTEGER NOT NULL, amount REAL NOT NULL, signature TEXT NOT NULL);
CREATE TABLE demo_tx (award_id TEXT PRIMARY KEY, height INTEGER NOT NULL, tx_index INTEGER NOT NULL, leaf TEXT NOT NULL);
CREATE TABLE project (
  id TEXT PRIMARY KEY, fp TEXT NOT NULL, description TEXT, category TEXT, status TEXT, amount REAL, paid REAL,
  progress REAL, office TEXT, region TEXT, contractor_raw TEXT, start TEXT, end TEXT, year INTEGER, funds TEXT,
  lat REAL, lng REAL, mun TEXT, prov TEXT, contractor_id TEXT, agency_id TEXT NOT NULL
);
CREATE TABLE audit (
  lgu_id TEXT NOT NULL, year INTEGER NOT NULL, lgu_name TEXT, level TEXT, province_id TEXT, opinion TEXT,
  opinion_text TEXT, recs_total INTEGER, recs_fully INTEGER, recs_partially INTEGER, recs_not INTEGER,
  source_url TEXT, source_title TEXT, PRIMARY KEY (lgu_id, year)
);
CREATE TABLE dept (id TEXT PRIMARY KEY, slug TEXT, name TEXT NOT NULL, years TEXT NOT NULL, amount_2026 REAL, nep_2027 REAL, nep_base REAL, nep_delta REAL, nep_pct REAL, expense TEXT, cycle INTEGER NOT NULL DEFAULT 0);
CREATE TABLE program (id TEXT PRIMARY KEY, dept_id TEXT NOT NULL, agency_id TEXT, name TEXT NOT NULL, fam_key TEXT, years TEXT NOT NULL, amount_2026 REAL, amount_2025 REAL);
CREATE TABLE gov_agency (id TEXT PRIMARY KEY, dept_id TEXT NOT NULL, name TEXT NOT NULL, y2024 REAL, y2025 REAL, y2026 REAL, items_2026 INTEGER, cycle_year INTEGER, allot REAL, oblig REAL, disb REAL);
CREATE TABLE region_budget (code TEXT PRIMARY KEY, psgc TEXT, name TEXT NOT NULL, gaa_2026 REAL, nep_2027 REAL, delta REAL, pct REAL, items INTEGER);
CREATE TABLE region_dept (code TEXT NOT NULL, dept_id TEXT NOT NULL, dept_name TEXT, gaa_2026 REAL, nep_2027 REAL, items INTEGER, PRIMARY KEY (code, dept_id));
CREATE TABLE cycle_program (row_id TEXT PRIMARY KEY, dept_id TEXT NOT NULL, subject_id TEXT, subject_name TEXT, dept_name TEXT, agency_name TEXT, pap_code TEXT, label TEXT, fpap_id TEXT, match_method TEXT, match_confidence TEXT);
CREATE TABLE cycle_fact (row_id TEXT NOT NULL, year INTEGER NOT NULL, stage TEXT NOT NULL, expense_class TEXT NOT NULL, amount REAL);
CREATE VIRTUAL TABLE entity_fts USING fts5(label, kind UNINDEXED, ref UNINDEXED, sub UNINDEXED, rank_hint UNINDEXED, tokenize = 'unicode61 remove_diacritics 2');
CREATE VIRTUAL TABLE record_fts USING fts5(title, kind UNINDEXED, ref UNINDEXED, tokenize = 'unicode61 remove_diacritics 2');
`);

// ---------- geography ----------
const geo = readJson("geo-index.json");
const bgy = readJson("barangays.json");
const insGeo = db.prepare("INSERT INTO geo VALUES (?,?,?,?)");
const geoName = new Map();
db.transaction(() => {
  for (const r of geo.regions) { insGeo.run(r.id, r.name, "region", null); geoName.set(r.id, r.name); }
  for (const p of geo.provinces) { insGeo.run(p.id, p.name, "province", p.parent); geoName.set(p.id, p.name); }
  for (const m of geo.municipalities) { insGeo.run(m.id, m.name, "municipality", m.parent); geoName.set(m.id, m.name); }
  for (const [id, name, parent] of bgy) insGeo.run(id, name, "barangay", parent);
})();
log(`geo: ${geo.regions.length} regions, ${geo.provinces.length} provinces, ${geo.municipalities.length} LGUs, ${bgy.length} barangays`);

// ---------- entity registries ----------
const contractors = new Map(); // key -> entity
const agencies = new Map();
function contractorFor(raw) {
  const key = nameKey(raw);
  let c = contractors.get(key);
  if (!c) {
    c = { id: sha("contractor:" + key).slice(0, 20), key, names: new Map(), codes: new Set(), pg_count: 0, pg_amount: 0, dp_count: 0, dp_amount: 0, first: null, last: null, agencies: new Set() };
    contractors.set(key, c);
  }
  const nm = cleanName(raw);
  c.names.set(nm, (c.names.get(nm) || 0) + 1);
  const code = dpwhCode(raw);
  if (code) c.codes.add(code);
  return c;
}
function agencyFor(kind, name, extra = {}) {
  const key = kind + "|" + name.toUpperCase().replace(/\s+/g, " ").trim();
  let a = agencies.get(key);
  if (!a) {
    a = { id: sha("agency:" + key).slice(0, 20), key, name, kind, level: extra.level ?? null, prov: extra.prov ?? null, mun: extra.mun ?? null, count: 0, amount: 0, first: null, last: null, contractors: new Set() };
    agencies.set(key, a);
  }
  if (!a.prov && extra.prov) a.prov = extra.prov;
  if (!a.mun && extra.mun) a.mun = extra.mun;
  if (!a.level && extra.level) a.level = extra.level;
  return a;
}
const seen = (e, d) => {
  if (!d) return;
  if (!e.first || d < e.first) e.first = d;
  if (!e.last || d > e.last) e.last = d;
};

// ---------- PhilGEPS awards ----------
const pg = readJson("philgeps-construction.json.gz");
const insAward = db.prepare("INSERT INTO award VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
const insRec = db.prepare("INSERT INTO record_fts (title, kind, ref) VALUES (?,?,?)");
const pgYear = new Map();
const pgLevel = new Map();
let pgTotal = 0;
const used = new Set();
const chainRows = []; // [date, fullHash, id, amount] for the demo chain
db.transaction(() => {
  for (const row of pg.rows) {
    const [reference, contractNo, title, awardee, organization, area, amount, awardDate, orgLevel, prov, mun, brgy] = row;
    let dup = 0, id;
    for (;;) {
      id = sha(fingerprintInput("philgeps", row, dup));
      if (!used.has(id.slice(0, 24))) break;
      dup++;
    }
    const full = id;
    id = id.slice(0, 24);
    used.add(id);
    if (awardDate) chainRows.push([awardDate, full, id, amount || 0]);
    const c = contractorFor(awardee || "(no awardee listed)");
    const a = agencyFor("procuring", organization || "(no entity listed)", { level: orgLevel, prov, mun });
    c.pg_count++; c.pg_amount += amount || 0; seen(c, awardDate); c.agencies.add(a.id);
    a.count++; a.amount += amount || 0; seen(a, awardDate); a.contractors.add(c.id);
    insAward.run(id, dup, reference, contractNo, title, awardee, organization, area, amount, awardDate, orgLevel, prov, mun, brgy, c.id, a.id);
    if (title) insRec.run(title, "award", id);
    const y = awardDate ? awardDate.slice(0, 4) : "unknown";
    const yy = pgYear.get(y) || [0, 0]; yy[0]++; yy[1] += amount || 0; pgYear.set(y, yy);
    const lv = orgLevel || "national/other";
    const ll = pgLevel.get(lv) || [0, 0]; ll[0]++; ll[1] += amount || 0; pgLevel.set(lv, ll);
    pgTotal += amount || 0;
  }
})();
log(`philgeps: ${pg.rows.length} awards`);

// ---------- demo hash chain: one block per award day ----------
{
  chainRows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0));
  const insB = db.prepare("INSERT INTO demo_block VALUES (?,?,?,?,?,?,?,?)");
  // DEMO signing key. Not a government key: it only shows how signed records work (bill Sec. 19).
  const keyFile = path.join(DATA, "demo-signing-key.pem");
  let priv;
  if (existsSync(keyFile)) priv = createPrivateKey(readFileSync(keyFile));
  else { priv = generateKeyPairSync("ed25519").privateKey; writeFileSync(keyFile, priv.export({ type: "pkcs8", format: "pem" })); }
  const pubPem = createPublicKey(priv).export({ type: "spki", format: "pem" }).toString();
  db.prepare("INSERT INTO meta VALUES (?,?)").run("demoPublicKey", JSON.stringify(pubPem));
  const insT = db.prepare("INSERT INTO demo_tx VALUES (?,?,?,?)");
  let prev = GENESIS_PREV, height = 0, i = 0;
  db.transaction(() => {
    while (i < chainRows.length) {
      const date = chainRows[i][0];
      let j = i, amt = 0;
      while (j < chainRows.length && chainRows[j][0] === date) { amt += chainRows[j][3]; j++; }
      const txs = chainRows.slice(i, j);
      height++;
      const root = merkleRoot(txs.map((t) => t[1]));
      const h = blockHash(height, date, prev, root, txs.length);
      insB.run(height, date, prev, root, h, txs.length, amt, edSign(null, Buffer.from(h, "utf8"), priv).toString("base64"));
      txs.forEach((t, k) => insT.run(t[2], height, k, t[1]));
      prev = h;
      i = j;
    }
  })();
  log(`demo chain: ${height} blocks`);
}

// ---------- DPWH contracts ----------
const dp = readJson("dpwh-projects.json.gz");
const insProj = db.prepare("INSERT INTO project VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
const dpYear = new Map(), dpStatus = new Map(), dpCat = new Map();
let dpTotal = 0;
db.transaction(() => {
  for (const row of dp.rows) {
    const [id, description, category, status, amount, paid, progress, office, region, contractor, start, end, year, funds, lat, lng, mun, prov] = row;
    const fp = sha(fingerprintInput("dpwh", row, 0));
    const a = agencyFor("dpwh-office", "DPWH " + (office || "(office not listed)"), { level: "dpwh", prov: office && /DEO$/.test(office) ? prov : null });
    let c = null;
    if (contractor) {
      c = contractorFor(contractor);
      c.dp_count++; c.dp_amount += amount || 0; seen(c, start); c.agencies.add(a.id);
      a.contractors.add(c.id);
    }
    a.count++; a.amount += amount || 0; seen(a, start);
    insProj.run(id, fp, description, category, status, amount, paid, progress, office, region, contractor, start, end, year, funds, lat, lng, mun, prov, c ? c.id : null, a.id);
    if (description) insRec.run(description, "project", id);
    const y = String(year ?? "unknown");
    const yy = dpYear.get(y) || [0, 0]; yy[0]++; yy[1] += amount || 0; dpYear.set(y, yy);
    dpStatus.set(status || "Not stated", (dpStatus.get(status || "Not stated") || 0) + 1);
    const cc = dpCat.get(category || "Not stated") || [0, 0]; cc[0]++; cc[1] += amount || 0; dpCat.set(category || "Not stated", cc);
    dpTotal += amount || 0;
  }
})();
log(`dpwh: ${dp.rows.length} contracts`);

// ---------- entities ----------
const insC = db.prepare("INSERT INTO contractor VALUES (?,?,?,?,?,?,?,?,?,?,?,?)");
const insA = db.prepare("INSERT INTO agency VALUES (?,?,?,?,?,?,?,?,?,?,?,?)");
const insE = db.prepare("INSERT INTO entity_fts (label, kind, ref, sub, rank_hint) VALUES (?,?,?,?,?)");
db.transaction(() => {
  for (const c of contractors.values()) {
    const name = [...c.names.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const total = c.pg_amount + c.dp_amount;
    insC.run(c.id, c.key, name, c.codes.size ? [...c.codes].join(",") : null, c.pg_count, c.pg_amount, c.dp_count, c.dp_amount, total, c.first, c.last, c.agencies.size);
    insE.run(name, "contractor", c.id, `${c.pg_count + c.dp_count} records`, total);
  }
  for (const a of agencies.values()) {
    insA.run(a.id, a.key, a.name, a.kind, a.level, a.prov, a.mun, a.count, a.amount, a.first, a.last, a.contractors.size);
    insE.run(a.name, "agency", a.id, `${a.count} records`, a.amount);
  }
  for (const r of geo.regions) insE.run(r.name, "lgu", r.id, "Region", 3e15);
  for (const p of geo.provinces) insE.run(p.name, "lgu", p.id, `Province · ${geoName.get(p.parent) ?? ""}`, 2e15);
  for (const m of geo.municipalities) {
    const pv = geoName.get(m.parent) ?? "";
    insE.run(`${m.name}${pv ? ", " + pv : ""}`, "lgu", m.id, "City / municipality", 1e15);
  }
})();
log(`entities: ${contractors.size} contractors, ${agencies.size} agencies`);

// ---------- COA audits ----------
const coa = readJson("coa-audits.json.gz");
const insAud = db.prepare("INSERT OR REPLACE INTO audit VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)");
db.transaction(() => {
  for (const r of coa.rows) {
    insAud.run(r.lguId, r.year, r.lguName, r.level, r.provinceId, r.opinion, r.opinionText, r.recs?.total ?? null, r.recs?.fully ?? null, r.recs?.partially ?? null, r.recs?.not ?? null, r.sourceUrl, r.sourceTitle);
  }
})();
log(`coa: ${coa.rows.length} audit summaries`);

// ---------- GAA / NEP / budget cycle (Budget Data API snapshot) ----------
const budget = readJson("budget.json");
const api = readJson("budget-api.json.gz");
const nepById = new Map();
for (const d of api.nep2027.data) nepById.set(d.source_department_code || d.id, d);
const insD = db.prepare("INSERT INTO dept VALUES (?,?,?,?,?,?,?,?,?,?,?)");
const insP = db.prepare("INSERT INTO program VALUES (?,?,?,?,?,?,?,?)");
const insCP = db.prepare("INSERT OR IGNORE INTO cycle_program VALUES (?,?,?,?,?,?,?,?,?,?,?)");
const insCF = db.prepare("INSERT INTO cycle_fact VALUES (?,?,?,?,?)");
let nPrograms = 0, nFacts = 0;
db.transaction(() => {
  const cycleDepts = new Set(Object.keys(api.cycle.departments));
  for (const d of api.departments.data) {
    const n = nepById.get(d.id);
    insD.run(d.id, d.slug, d.description, JSON.stringify(d.years), d.years["2026"]?.amount ?? null, n?.amount ?? null, n?.base_amount ?? null, n?.delta ?? null, n?.pct ?? null, JSON.stringify(api.expenseClasses[d.id] ?? []), cycleDepts.has(d.id) ? 1 : 0);
    insE.run(d.description, "department", d.id, "GAA department", 5e15);
    for (const p of api.programs[d.id] ?? []) {
      const id = sha("program:" + p.fam_key).slice(0, 16);
      insP.run(id, d.id, p.agency_id, p.name.replace(/\s+-\s+/g, " — ").replace(/\s+/g, " ").trim(), p.fam_key, JSON.stringify(p.years), p.years["2026"]?.amount ?? null, p.years["2025"]?.amount ?? null);
      insE.run(p.name.replace(/\s+/g, " "), "program", id, d.description, p.years["2026"]?.amount ?? 0);
      nPrograms++;
    }
  }
  const subj = new Map(api.cycle.subjects.map((s) => [s.subject_id, s]));
  for (const [deptId, data] of Object.entries(api.cycle.departments)) {
    for (const p of data.programs) {
      insCP.run(p.source_row_id, deptId, p.subject_id, subj.get(p.subject_id)?.display_name ?? null, p.source_department_name, p.source_agency_name, p.source_pap_code, p.source_pap_label, p.canonical_portal_fpap_id, p.match_method, p.match_confidence);
    }
    for (const f of data.facts) { insCF.run(f.source_row_id, f.fiscal_year, f.stage, f.expense_class, f.amount); nFacts++; }
  }
})();
// agencies (bureaus) with their budget-cycle execution in the latest year that has disbursements
const insGA = db.prepare("INSERT INTO gov_agency VALUES (?,?,?,?,?,?,?,?,?,?,?)");
const cyc = db.prepare(`SELECT f.year, sum(CASE WHEN f.stage='adjusted_allotment' THEN f.amount END) allot, sum(CASE WHEN f.stage='obligations' THEN f.amount END) oblig, sum(CASE WHEN f.stage='disbursements' THEN f.amount END) disb
  FROM cycle_program p JOIN cycle_fact f ON f.row_id = p.row_id AND f.expense_class = 'total' WHERE substr(p.fpap_id,1,6) = ? GROUP BY f.year HAVING disb > 0 ORDER BY f.year DESC LIMIT 1`);
db.transaction(() => {
  for (const a of Object.values(api.agencies ?? {})) {
    const c = cyc.get(a.id);
    insGA.run(a.id, a.dept, a.name, a.years[2024]?.amount ?? null, a.years[2025]?.amount ?? null, a.years[2026]?.amount ?? null, a.years[2026]?.line_items ?? null, c?.year ?? null, c?.allot ?? null, c?.oblig ?? null, c?.disb ?? null);
    insE.run(a.name, "govagency", a.id, `Agency ${a.id}`, a.years[2026]?.amount ?? 0);
  }
  const insR = db.prepare("INSERT INTO region_budget VALUES (?,?,?,?,?,?,?,?)");
  const insRD = db.prepare("INSERT OR REPLACE INTO region_dept VALUES (?,?,?,?,?,?)");
  for (const r of api.regions?.totals ?? []) {
    const psgc = r.code === "00" ? null : String(Number(r.code) * 100000000);
    insR.run(r.code, geoName.has(psgc) ? psgc : null, r.description, r.base_amount, r.amount, r.delta, r.pct, r.count);
    for (const d of api.regions.byDept[r.code] ?? []) insRD.run(r.code, d.department_id, d.department, d.base_amount, d.amount, d.count);
  }
})();
log(`budget api: ${api.departments.data.length} departments, ${nPrograms} programs, ${nFacts} budget-cycle facts`);

// ---------- indexes ----------
db.exec(`
CREATE INDEX award_date ON award (award_date DESC);
CREATE INDEX award_contractor ON award (contractor_id, award_date DESC);
CREATE INDEX award_agency ON award (agency_id, award_date DESC);
CREATE INDEX award_mun ON award (mun, award_date DESC);
CREATE INDEX award_prov ON award (prov, award_date DESC);
CREATE INDEX award_brgy ON award (brgy);
CREATE INDEX award_amount ON award (amount DESC);
CREATE INDEX award_ref ON award (reference);
CREATE INDEX project_start ON project (start DESC);
CREATE INDEX project_contractor ON project (contractor_id, start DESC);
CREATE INDEX project_agency ON project (agency_id, start DESC);
CREATE INDEX project_mun ON project (mun, start DESC);
CREATE INDEX project_prov ON project (prov, start DESC);
CREATE INDEX project_amount ON project (amount DESC);
CREATE INDEX contractor_total ON contractor (total DESC);
CREATE INDEX agency_amount ON agency (amount DESC);
CREATE INDEX geo_parent ON geo (parent);
CREATE INDEX demo_tx_block ON demo_tx (height, tx_index);
CREATE INDEX demo_block_date ON demo_block (date);
CREATE INDEX program_dept ON program (dept_id, amount_2026 DESC);
CREATE INDEX cycle_fact_row ON cycle_fact (row_id, year);
CREATE INDEX cycle_program_dept ON cycle_program (dept_id);
`);
log("indexes");

// ---------- stats ----------
const setMeta = db.prepare("INSERT INTO meta VALUES (?,?)");
const sortY = (m) => [...m.entries()].filter(([y]) => /^\d{4}$/.test(y)).sort((a, b) => a[0].localeCompare(b[0])).map(([y, [n, amt]]) => ({ year: Number(y), count: n, amount: amt }));
const stats = {
  builtAt: new Date().toISOString(),
  philgeps: { rows: pg.rows.length, amount: pgTotal, source: pg.meta.source, sourceUrl: pg.meta.sourceUrl, byYear: sortY(pgYear), byLevel: [...pgLevel.entries()].map(([level, [count, amount]]) => ({ level, count, amount })), maxDate: db.prepare("SELECT max(award_date) d FROM award").get().d },
  dpwh: { rows: dp.rows.length, amount: dpTotal, source: dp.meta.source, sourceUrl: dp.meta.sourceUrl, notice: dp.meta.notice, byYear: sortY(dpYear), byStatus: [...dpStatus.entries()].map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count), byCategory: [...dpCat.entries()].map(([category, [count, amount]]) => ({ category, count, amount })).sort((a, b) => b.amount - a.amount).slice(0, 15), maxDate: db.prepare("SELECT max(start) d FROM project").get().d },
  contractors: contractors.size,
  agencies: agencies.size,
  coa: { rows: coa.rows.length, years: [...new Set(coa.rows.map((r) => r.year))] },
  gaa: { yearly: api.gaa.data, source: api.source, license: api.license, fetchedAt: api.fetchedAt },
  nep2027: api.nep2027national,
  agenciesFetchedAt: api.agenciesFetchedAt ?? null,
  regionsFetchedAt: api.regionsFetchedAt ?? null,
  cycle: { meta: api.cycle.meta, note: api.cycle.note },
};
setMeta.run("stats", JSON.stringify(stats));
setMeta.run("budgetHistory", JSON.stringify(budget.budgetHistory2027));
setMeta.run("dpwhRegions", JSON.stringify(budget.dpwhRegions));
db.exec("ANALYZE");
db.close();
renameSync(TMP, OUT);
log(`done → ${OUT}`);
