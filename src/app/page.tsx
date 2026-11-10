import Link from "next/link";
import { Landmark, FileText, HardHat, Building2, ShieldCheck, TrendingUp, ArrowRight } from "lucide-react";
import { all, stats, type Award, type Project, type Dept, type Contractor } from "@/lib/db";
import { SearchBox } from "@/components/SearchHero";
import { Spark, HBar } from "@/components/charts";
import { StatusBadge } from "@/components/ui";
import { age, num, peso, pesoShort, pct, short } from "@/lib/format";

function Stat({ icon, label, value, sub, href }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode; href?: string }) {
  return (
    <div className="flex gap-3 py-3">
      <span className="mt-0.5 text-ink-faint">{icon}</span>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide text-ink-mute">{label}</div>
        <div className="text-[0.95rem] text-ink">{href ? <Link href={href} className="text-ink hover:text-ink">{value}</Link> : value}</div>
        {sub ? <div className="text-xs text-ink-mute">{sub}</div> : null}
      </div>
    </div>
  );
}

export default function Home() {
  const s = stats();
  const gaa26 = s.gaa.yearly.find((y) => y.year === 2026);
  const awards = all<Award>("SELECT * FROM award WHERE award_date IS NOT NULL ORDER BY award_date DESC LIMIT 8");
  const projects = all<Project & { cname: string | null }>("SELECT p.*, c.name AS cname FROM project p LEFT JOIN contractor c ON c.id = p.contractor_id WHERE p.start IS NOT NULL AND p.start <= date('now','+8 hours') ORDER BY p.start DESC LIMIT 8");
  const depts = all<Dept>("SELECT * FROM dept WHERE amount_2026 IS NOT NULL ORDER BY amount_2026 DESC LIMIT 6");
  const top = all<Contractor>("SELECT * FROM contractor ORDER BY total DESC LIMIT 6");
  const years = s.philgeps.byYear.filter((y) => y.year >= 2012 && y.year <= 2025);
  const maxDept = depts[0]?.amount_2026 ?? 1;

  return (
    <>
      <section className="relative overflow-hidden bg-navy pb-24 pt-10 sm:pt-12">
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]" aria-hidden="true">
          <defs>
            <pattern id="hex" width="28" height="48" patternUnits="userSpaceOnUse" patternTransform="scale(1.4)">
              <path d="M14 0 28 8v16L14 32 0 24V8z M14 32v16" fill="none" stroke="#fff" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hex)" />
        </svg>
        <div className="wrap relative">
          <h1 className="text-xl font-medium text-white sm:text-2xl">The Philippine Public Funds Explorer</h1>
          <div className="mt-4 max-w-3xl"><SearchBox big /></div>
          <p className="mt-3 text-sm text-white/70">
            Try: <Link href="/search?q=flood+control" className="text-white/90 underline-offset-2 hover:text-white hover:underline">flood control</Link>
            {" · "}<Link href="/search?q=Quezon+City" className="text-white/90 underline-offset-2 hover:text-white hover:underline">Quezon City</Link>
            {" · "}<Link href="/search?f=agency&q=DPWH+Bulacan" className="text-white/90 underline-offset-2 hover:text-white hover:underline">DPWH Bulacan</Link>
            {" · "}<Link href="/search?f=program&q=school+building" className="text-white/90 underline-offset-2 hover:text-white hover:underline">school buildings</Link>
          </p>
        </div>
      </section>

      <div className="wrap relative -mt-16 space-y-5">
        <section className="card grid grid-cols-1 divide-y divide-line px-4 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x [&>*]:lg:px-4 [&>*:first-child]:lg:pl-0">
          <div className="divide-y divide-line">
            <Stat icon={<Landmark size={22} />} label="FY2026 national budget" value={pesoShort(gaa26?.amount)} sub={`${num(gaa26?.line_items)} GAA line items`} href="/budget" />
            {s.nep2027 ? <Stat icon={<TrendingUp size={22} />} label="FY2027 proposed (NEP)" value={<>{pesoShort(s.nep2027.amount)} <span className="text-sm text-ok">({pct(s.nep2027.pct)})</span></>} href="/budget/nep-2027" /> : null}
          </div>
          <div className="divide-y divide-line">
            <Stat icon={<FileText size={22} />} label="Construction contract awards" value={num(s.philgeps.rows)} sub={`${pesoShort(s.philgeps.amount)} awarded · PhilGEPS`} href="/awards" />
            <Stat icon={<HardHat size={22} />} label="DPWH infrastructure contracts" value={num(s.dpwh.rows)} sub={`${pesoShort(s.dpwh.amount)} contract value · 2016–2026`} href="/projects" />
          </div>
          <div className="divide-y divide-line">
            <Stat icon={<Building2 size={22} />} label="Contractors" value={num(s.contractors)} sub={`${num(s.agencies)} procuring entities & offices`} href="/contractors" />
            <Stat icon={<ShieldCheck size={22} />} label="LGU audit opinions" value={num(s.coa.rows)} sub={`COA executive summaries, CY${s.coa.years.join(", ")}`} href="/audits" />
          </div>
          <div className="py-3">
            <div className="text-xs uppercase tracking-wide text-ink-mute">Construction awards per year</div>
            <Spark data={years.map((y) => ({ label: String(y.year), value: y.count }))} ariaLabel="Number of PhilGEPS construction awards per year, 2012 to 2025" />
          </div>
        </section>

        <p className="rounded-lg border border-warn/25 bg-warn-soft px-4 py-2.5 text-sm text-ink">
          <strong className="font-medium">Independent citizen project.</strong> PisoScan is not a government website and is not the CADENA portal
          proposed in Senate Bill No. 1506 (pending in the House). Every figure links to its published source. <Link href="/about">How to read this site</Link>
        </p>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="card">
            <div className="card-h"><h2 className="card-t">Latest contract awards</h2><span className="pill">PhilGEPS</span></div>
            <ul>
              {awards.map((a) => (
                <li key={a.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 border-b border-line px-4 py-3 last:border-0 sm:grid-cols-[auto_minmax(0,1.1fr)_minmax(0,1.5fr)_auto]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-canvas text-ink-mute"><FileText size={18} /></span>
                  <div className="min-w-0">
                    <Link href={`/award/${a.id}`} className="mono block truncate">{a.id.slice(0, 16)}…</Link>
                    <div className="text-xs text-ink-mute">{age(a.award_date)}</div>
                  </div>
                  <div className="col-span-2 min-w-0 text-sm sm:col-span-1">
                    <div className="truncate"><span className="text-ink-mute">By </span><Link href={`/agency/${a.agency_id}`}>{a.organization}</Link></div>
                    <div className="truncate"><span className="text-ink-mute">To </span><Link href={`/contractor/${a.contractor_id}`}>{a.awardee}</Link></div>
                  </div>
                  <div className="col-span-2 sm:col-span-1 sm:text-right"><span className="pill" title={peso(a.amount)}>{pesoShort(a.amount)}</span></div>
                </li>
              ))}
            </ul>
            <Link href="/awards" className="flex items-center justify-center gap-1 border-t border-line bg-canvas/60 py-3 text-xs font-medium uppercase tracking-wide text-ink-mute hover:text-ink">
              View all contract awards <ArrowRight size={14} />
            </Link>
          </section>

          <section className="card">
            <div className="card-h"><h2 className="card-t">Latest DPWH projects</h2><span className="pill">By start date</span></div>
            <ul>
              {projects.map((p) => (
                <li key={p.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 border-b border-line px-4 py-3 last:border-0 sm:grid-cols-[auto_minmax(0,1.1fr)_minmax(0,1.5fr)_auto]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-canvas text-ink-mute"><HardHat size={18} /></span>
                  <div className="min-w-0">
                    <Link href={`/project/${encodeURIComponent(p.id)}`} className="mono block truncate">{p.id}</Link>
                    <div className="text-xs text-ink-mute">{age(p.start)}</div>
                  </div>
                  <div className="col-span-2 min-w-0 text-sm sm:col-span-1">
                    <div className="truncate" title={p.description ?? ""}>{p.description}</div>
                    <div className="truncate"><span className="text-ink-mute">To </span>{p.contractor_id ? <Link href={`/contractor/${p.contractor_id}`}>{p.cname}</Link> : <span className="text-ink-mute">not listed</span>}</div>
                  </div>
                  <div className="col-span-2 flex items-center gap-2 sm:col-span-1 sm:flex-col sm:items-end"><span className="pill">{pesoShort(p.amount)}</span><StatusBadge status={p.status} /></div>
                </li>
              ))}
            </ul>
            <Link href="/projects" className="flex items-center justify-center gap-1 border-t border-line bg-canvas/60 py-3 text-xs font-medium uppercase tracking-wide text-ink-mute hover:text-ink">
              View all infrastructure projects <ArrowRight size={14} />
            </Link>
          </section>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="card">
            <div className="card-h"><h2 className="card-t">Largest departments, FY2026 GAA</h2><Link href="/budget" className="text-sm">All departments</Link></div>
            <ul className="divide-y divide-line">
              {depts.map((d) => (
                <li key={d.id} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <Link href={`/budget/${d.id}`} className="truncate">{d.name}</Link>
                    <span className="shrink-0 tabular-nums">{pesoShort(d.amount_2026)}</span>
                  </div>
                  <div className="mt-1.5"><HBar value={d.amount_2026 ?? 0} max={maxDept} /></div>
                </li>
              ))}
            </ul>
          </section>
          <section className="card">
            <div className="card-h"><h2 className="card-t">Top contractors by recorded value</h2><Link href="/contractors" className="text-sm">View all</Link></div>
            <ul className="divide-y divide-line">
              {top.map((c, i) => (
                <li key={c.id} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-sm">
                  <span className="text-ink-mute">{i + 1}</span>
                  <div className="min-w-0">
                    <Link href={`/contractor/${c.id}`} className="block truncate">{c.name}</Link>
                    <span className="text-xs text-ink-mute">{num(c.pg_count + c.dp_count)} records · {num(c.agencies)} offices</span>
                  </div>
                  <span className="tabular-nums">{pesoShort(c.total)}</span>
                </li>
              ))}
            </ul>
            <p className="border-t border-line px-4 py-2.5 text-xs text-ink-mute">Sum of PhilGEPS awards and DPWH contract amounts as listed. These can overlap, since a DPWH contract may also appear in PhilGEPS.</p>
          </section>
        </div>
      </div>
    </>
  );
}
