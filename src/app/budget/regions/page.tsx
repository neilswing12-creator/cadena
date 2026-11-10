import Link from "next/link";
import { MapPin, Landmark, Building2 } from "lucide-react";
import { all, one, stats, type Geo, type Audit } from "@/lib/db";
import { placeTotals } from "@/lib/places";
import { ISLAND, isCity, deptShort } from "@/lib/budget";
import { Card, Hash, OpinionBadge, Pager, SourceNote, TableWrap } from "@/components/ui";
import { HBar } from "@/components/charts";
import { date, num, peso, pesoShort, pct, qs } from "@/lib/format";

export const metadata = { title: "Regional budgets & LGU directory" };
const PER = 50;

type RB = { code: string; psgc: string | null; name: string; gaa_2026: number; nep_2027: number; delta: number; pct: number; items: number };
type RD = { dept_id: string; dept_name: string; gaa_2026: number; nep_2027: number };

export default function Regions({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const s = stats();
  const tot = placeTotals();
  const regions = all<Geo>("SELECT * FROM geo WHERE level = 'region'");
  const provs = all<Geo>("SELECT * FROM geo WHERE level = 'province'");
  const muns = all<Geo>("SELECT * FROM geo WHERE level = 'municipality'");
  const regionOf = new Map<string, string>();
  for (const p of provs) regionOf.set(p.id, p.parent!);
  const lgusIn = (rid: string) => {
    const ps = provs.filter((p) => p.parent === rid);
    const ms = muns.filter((m) => m.parent === rid || regionOf.get(m.parent ?? "") === rid);
    return { ps, ms, cities: ms.filter((m) => isCity(m.name)) };
  };
  const rb = all<RB>("SELECT * FROM region_budget");
  const rbBy = new Map(rb.filter((r) => r.psgc).map((r) => [r.psgc!, r]));
  const central = rb.find((r) => r.code === "00");
  const group = ["Luzon", "Visayas", "Mindanao"].includes(searchParams.g ?? "") ? searchParams.g! : null;
  const shown = regions.filter((r) => !group || ISLAND[r.id] === group);
  const region = regions.find((r) => r.id === searchParams.r) ?? null;
  const base = { g: group ?? undefined, r: region?.id };

  return (
    <div className="wrap">
      <nav className="pt-5 text-sm text-ink-mute" aria-label="Breadcrumb"><Link href="/">Home</Link> / <Link href="/budget">Budget</Link> / Regions &amp; LGUs</nav>
      <section className="card mt-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-brand"><MapPin size={14} /> Geographic distribution</div>
            <h1 className="mt-1 text-xl font-medium sm:text-[1.35rem]">Philippine Regional Budget &amp; LGU Directory</h1>
            <p className="mt-1 text-sm text-ink-mute">Pick a region to see its share of the national budget and every province, city and municipality in it.</p>
          </div>
          <span className="badge badge-info">{regions.length} regions · {num(provs.length + muns.length)} LGUs</span>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <nav className="flex flex-wrap gap-1 rounded-lg border border-line bg-canvas p-1" aria-label="Island group">
            {[null, "Luzon", "Visayas", "Mindanao"].map((gname) => {
              const n = regions.filter((r) => !gname || ISLAND[r.id] === gname).length;
              return <Link key={gname ?? "all"} href={`/budget/regions${qs({ g: gname ?? undefined })}`} scroll={false} className={`tab py-1 ${gname === group ? "tab-on" : ""}`}>{gname ?? "All regions"} ({n})</Link>;
            })}
          </nav>
          <span className="text-sm text-ink-mute">Showing <strong className="font-medium text-ink">{shown.length}</strong> of {regions.length} regions</span>
        </div>
        <nav className="mt-3 flex flex-wrap gap-2" aria-label="Regions">
          {shown.map((r) => {
            const l = lgusIn(r.id);
            const on = region?.id === r.id;
            return (
              <Link key={r.id} href={`/budget/regions${qs({ g: group ?? undefined, r: r.id })}`} scroll={false} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${on ? "border-brand bg-brand text-white hover:text-white" : "border-line bg-white text-ink hover:border-brand hover:text-ink"}`}>
                {r.name}
                <span className={`rounded px-1.5 text-xs ${on ? "bg-white/20" : "bg-canvas text-ink-mute"}`}>{l.ps.length + l.ms.length} LGUs</span>
              </Link>
            );
          })}
        </nav>

        {!region ? (
          <div className="mt-5">
            <TableWrap>
              <table className="tbl">
                <thead><tr><th>Region</th><th className="text-right">FY2026 GAA in region</th><th className="text-right">FY2027 NEP</th><th className="text-right">Change</th><th className="text-right">LGUs</th><th className="text-right">DPWH contracts</th><th className="text-right">Construction awards</th></tr></thead>
                <tbody>
                  {shown.map((r) => {
                    const b = rbBy.get(r.id), l = lgusIn(r.id), t = tot.get(r.id);
                    return (
                      <tr key={r.id}>
                        <td><Link href={`/budget/regions${qs({ g: group ?? undefined, r: r.id })}`} scroll={false}>{r.name}</Link> <span className="text-xs text-ink-mute">{ISLAND[r.id]}</span></td>
                        <td className="whitespace-nowrap text-right tabular-nums" title={peso(b?.gaa_2026)}>{pesoShort(b?.gaa_2026)}</td>
                        <td className="whitespace-nowrap text-right tabular-nums">{pesoShort(b?.nep_2027)}</td>
                        <td className={`whitespace-nowrap text-right tabular-nums ${b ? (b.delta >= 0 ? "text-ok" : "text-bad") : ""}`}>{b ? pct(b.pct) : "—"}</td>
                        <td className="text-right tabular-nums">{num(l.ps.length + l.ms.length)}</td>
                        <td className="whitespace-nowrap text-right tabular-nums">{pesoShort(t?.amt_pr ?? 0)}</td>
                        <td className="whitespace-nowrap text-right tabular-nums">{pesoShort(t?.amt_aw ?? 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
            {central ? <p className="mt-3 text-xs text-ink-mute">Not assigned to any region: {pesoShort(central.gaa_2026)} in FY2026 is budgeted to central offices nationwide. NCR&apos;s figure includes national agencies whose head offices are in Metro Manila, so it is much larger than what is spent in Metro Manila itself.</p> : null}
          </div>
        ) : (
          <RegionDetail region={region} sp={searchParams} base={base} />
        )}
      </section>
      <SourceNote>
        Regional budget: FY2027 NEP regional rollup with its FY2026 GAA baseline, {s.gaa.source} ({s.gaa.license}), snapshot {date(s.regionsFetchedAt ?? s.gaa.fetchedAt)}. LGU lists: PSA PSGC. Contracts and awards: DPWH and PhilGEPS records located in each place.
        Per-LGU budgets (each LGU&apos;s National Tax Allotment from DBM&apos;s Local Budget Memorandum, and income and spending from BLGF) are not loaded yet, so the table does not show an &quot;allocated&quot; or &quot;disbursed&quot; amount per LGU.
      </SourceNote>
    </div>
  );

  function RegionDetail({ region, sp, base }: { region: Geo; sp: Record<string, string | undefined>; base: Record<string, string | undefined> }) {
    const b = rbBy.get(region.id);
    const l = lgusIn(region.id);
    const t = tot.get(region.id);
    const dep = b ? all<RD>("SELECT dept_id, dept_name, gaa_2026, nep_2027 FROM region_dept WHERE code = ? AND dept_id != 'AUTO' ORDER BY gaa_2026 DESC LIMIT 6", b.code) : [];
    const auto = b ? one<RD>("SELECT dept_id, dept_name, gaa_2026, nep_2027 FROM region_dept WHERE code = ? AND dept_id = 'AUTO'", b.code) : undefined;
    const bgy = one<{ n: number }>(`SELECT count(*) n FROM geo WHERE level = 'barangay' AND parent IN (${l.ms.map(() => "?").join(",") || "''"})`, ...l.ms.map((m) => m.id))!.n;
    const tier = ["province", "city", "municipality"].includes(sp.tier ?? "") ? sp.tier! : null;
    const q = (sp.q ?? "").trim().toLowerCase().slice(0, 60);
    const sort = sp.sort === "awards" ? "awards" : sp.sort === "name" ? "name" : "dpwh";
    const audits = new Map(all<Audit>("SELECT * FROM audit").map((a) => [a.lgu_id, a]));
    const provName = new Map(l.ps.map((p) => [p.id, p.name]));
    let rows = [
      ...l.ps.map((p) => ({ g: p, tier: region.id === "1300000000" ? "District" : "Province", parent: "" })),
      ...l.ms.map((m) => ({ g: m, tier: isCity(m.name) ? "City" : "Municipality", parent: provName.get(m.parent ?? "") ?? "" })),
    ].map((x) => ({ ...x, t: tot.get(x.g.id), a: audits.get(x.g.id) }));
    const counts = { all: rows.length, province: rows.filter((r) => r.tier === "Province" || r.tier === "District").length, city: rows.filter((r) => r.tier === "City").length, municipality: rows.filter((r) => r.tier === "Municipality").length };
    if (tier) rows = rows.filter((r) => (tier === "province" ? r.tier === "Province" || r.tier === "District" : r.tier.toLowerCase() === tier));
    if (q) rows = rows.filter((r) => r.g.name.toLowerCase().includes(q) || r.parent.toLowerCase().includes(q));
    rows.sort((x, y) => (sort === "name" ? x.g.name.localeCompare(y.g.name) : sort === "awards" ? (y.t?.amt_aw ?? 0) - (x.t?.amt_aw ?? 0) : (y.t?.amt_pr ?? 0) - (x.t?.amt_pr ?? 0)));
    const page = Math.max(1, Math.min(Math.ceil(rows.length / PER) || 1, Number(sp.p) || 1));
    const maxPr = Math.max(...rows.map((r) => r.t?.amt_pr ?? 0), 1);
    const tierLink = (v: string | undefined) => `/budget/regions${qs({ ...base, tier: v, q: sp.q, sort: sp.sort })}`;

    return (
      <>
        <div className="mt-5 grid gap-4 rounded-xl border border-line bg-canvas/60 p-4 lg:grid-cols-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-brand"><MapPin size={14} /> Region overview</div>
            <h2 className="mt-2 text-lg font-medium">{region.name}</h2>
            <p className="text-sm text-ink-mute">Island group: <strong className="font-medium text-ink">{ISLAND[region.id]}</strong> · PSGC <span className="mono text-brand">{region.id.padStart(10, "0")}</span></p>
            {dep.length ? (
              <>
                <div className="mt-3 text-xs font-medium uppercase tracking-wide text-ink-mute">Largest national budgets in this region (FY2026)</div>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {dep.map((d) => <li key={d.dept_id}><Link href={`/budget/${d.dept_id}`} className="pill py-1 text-ink hover:border-brand hover:text-ink">{deptShort(d.dept_name.replace(/\s*\([^)]*\)$/, ""))} <span className="text-ink-mute">{pesoShort(d.gaa_2026, 1)}</span></Link></li>)}
                </ul>
              </>
            ) : null}
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-brand"><Landmark size={14} /> Financial snapshot</div>
            <div className="card mt-2 p-4">
              <div className="text-sm text-ink-mute">National budget allocated to the region (FY2026 GAA)</div>
              <div className="text-2xl font-medium tabular-nums" title={peso(b?.gaa_2026)}>{pesoShort(b?.gaa_2026)}</div>
              {b ? <div className="text-xs text-ink-mute">FY2027 NEP proposes {pesoShort(b.nep_2027)} <span className={b.delta >= 0 ? "text-ok" : "text-bad"}>({pct(b.pct)})</span></div> : null}
              {auto ? <div className="mt-1 text-xs text-ink-mute">Includes {pesoShort(auto.gaa_2026)} in automatic appropriations (e.g. LGU tax shares).</div> : null}
              <div className="mt-3 border-t border-line pt-3 text-sm">
                <div className="flex justify-between"><span className="text-ink-mute">DPWH contracts located here</span><span className="tabular-nums">{pesoShort(t?.amt_pr ?? 0)}</span></div>
                <div className="flex justify-between"><span className="text-ink-mute">Construction awards located here</span><span className="tabular-nums">{pesoShort(t?.amt_aw ?? 0)}</span></div>
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-brand"><Building2 size={14} /> LGU composition</div>
            <div className="card mt-2 p-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-[#f4f4f5] p-2"><div className="text-lg font-medium text-[#404040]">{counts.province}</div><div className="text-[0.65rem] uppercase tracking-wide text-[#404040]">{region.id === "1300000000" ? "Districts" : "Provinces"}</div></div>
                <div className="rounded-lg bg-brand-soft p-2"><div className="text-lg font-medium text-brand">{counts.city}</div><div className="text-[0.65rem] uppercase tracking-wide text-brand">Cities</div></div>
                <div className="rounded-lg bg-ok-soft p-2"><div className="text-lg font-medium text-ok">{counts.municipality}</div><div className="text-[0.65rem] uppercase tracking-wide text-ok">Municipalities</div></div>
              </div>
              <div className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
                <div className="flex justify-between"><span className="text-ink-mute">Barangays</span><span className="tabular-nums">{num(bgy)}</span></div>
                <div className="flex justify-between"><span className="text-ink-mute">DPWH contracts</span><Link href={`/lgu/${region.id}?tab=projects`} className="tabular-nums">{num(t?.n_pr ?? 0)}</Link></div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3">
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="mr-1 text-xs uppercase tracking-wide text-ink-mute">Filter:</span>
            {([[undefined, `All LGUs (${counts.all})`], ["province", `${region.id === "1300000000" ? "Districts" : "Provinces"} (${counts.province})`], ["city", `Cities (${counts.city})`], ["municipality", `Municipalities (${counts.municipality})`]] as const).map(([v, label]) => (
              <Link key={label} href={tierLink(v)} scroll={false} className={`tab border border-line py-1 ${(v ?? null) === tier ? "tab-on" : "bg-white"}`}>{label}</Link>
            ))}
          </div>
          <form method="get" className="flex flex-wrap gap-2">
            {group ? <input type="hidden" name="g" value={group} /> : null}
            <input type="hidden" name="r" value={region.id} />
            {tier ? <input type="hidden" name="tier" value={tier} /> : null}
            <label htmlFor="lq" className="sr-only">Search LGUs</label>
            <input id="lq" name="q" defaultValue={sp.q ?? ""} placeholder={`Search in ${region.name.split(" (")[0]}…`} className="input w-48 py-1.5" />
            <label htmlFor="ls" className="sr-only">Sort</label>
            <select id="ls" name="sort" defaultValue={sp.sort ?? ""} className="select py-1.5"><option value="">Sort: DPWH contract value</option><option value="awards">Sort: construction awards</option><option value="name">Sort: name</option></select>
            <button className="btn-primary">Apply</button>
          </form>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-line">
          <TableWrap>
            <table className="tbl">
              <thead><tr><th>Local government unit</th><th>Tier</th><th>PSGC code</th><th className="text-right">DPWH contracts</th><th className="min-w-[110px]" /><th className="text-right">Construction awards</th><th>COA 2024 opinion</th><th /></tr></thead>
              <tbody>
                {rows.slice((page - 1) * PER, page * PER).map((r) => (
                  <tr key={r.g.id}>
                    <td className="min-w-[200px]"><Link href={`/lgu/${r.g.id}`}>{r.g.name}</Link>{r.parent ? <div className="text-xs text-ink-mute">{r.parent}</div> : null}</td>
                    <td><span className={`badge ${r.tier === "City" ? "badge-info" : r.tier === "Municipality" ? "badge-ok" : "border-[#404040]/30 bg-[#f4f4f5] text-[#404040]"}`}>{r.tier}</span></td>
                    <td className="text-xs"><Hash value={r.g.id.padStart(10, "0")} full /></td>
                    <td className="whitespace-nowrap text-right tabular-nums" title={peso(r.t?.amt_pr ?? 0)}>{pesoShort(r.t?.amt_pr ?? 0)}<div className="text-xs text-ink-mute">{num(r.t?.n_pr ?? 0)} contracts</div></td>
                    <td><HBar value={r.t?.amt_pr ?? 0} max={maxPr} /></td>
                    <td className="whitespace-nowrap text-right tabular-nums">{pesoShort(r.t?.amt_aw ?? 0)}<div className="text-xs text-ink-mute">{num(r.t?.n_aw ?? 0)} awards</div></td>
                    <td>{r.a ? <OpinionBadge opinion={r.a.opinion} /> : <span className="text-xs text-ink-faint">no summary</span>}</td>
                    <td><Link href={`/lgu/${r.g.id}`} className="btn px-2.5 py-1 text-xs">Details</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3">
            <span className="text-xs text-ink-mute">{num(rows.length)} LGUs · Province totals include the records of their cities and towns.</span>
            <Pager page={page} pages={Math.ceil(rows.length / PER)} base="/budget/regions" params={{ ...base, tier: tier ?? undefined, q: sp.q, sort: sp.sort }} />
          </div>
        </div>
      </>
    );
  }
}
