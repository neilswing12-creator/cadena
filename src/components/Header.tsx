import Link from "next/link";
import { ChevronDown, Menu } from "lucide-react";
import { Logo } from "./ui";
import { HeaderSearch } from "./HeaderSearch";
import { stats } from "@/lib/db";
import { pesoShort, date, pct } from "@/lib/format";

const NAV: { label: string; items: { href: string; label: string; note?: string }[] }[] = [
  { label: "Records", items: [
    { href: "/awards", label: "Contract awards", note: "PhilGEPS construction awards" },
    { href: "/projects", label: "Infrastructure projects", note: "DPWH contracts" },
    { href: "/charts", label: "Charts & statistics" },
  ] },
  { label: "Entities", items: [
    { href: "/contractors", label: "Top contractors" },
    { href: "/agencies", label: "Procuring entities" },
    { href: "/lgu", label: "Regions, provinces & LGUs" },
  ] },
  { label: "Budget", items: [
    { href: "/budget", label: "National budget (GAA)", note: "FY2020–2026 by department" },
    { href: "/budget/agencies", label: "Agency budgets", note: "389 agencies, FY2026 GAA" },
    { href: "/budget/regions", label: "Regions & LGUs", note: "Regional allocation and LGU directory" },
    { href: "/budget/cycle", label: "Follow the money", note: "NEP → GAA → allotment → spending" },
    { href: "/budget/stages", label: "Budget stages", note: "NEP vs House vs Senate vs GAA" },
    { href: "/budget/nep-2027", label: "FY2027 proposed budget" },
  ] },
  { label: "Blockchain demo", items: [
    { href: "/demo", label: "Overview", note: "Demo for public education" },
    { href: "/demo/blocks", label: "Blocks", note: "One block per award day" },
    { href: "/demo/txs", label: "Transactions", note: "Contract awards as transactions" },
    { href: "/demo/how-it-works", label: "How it works" },
    { href: "/demo/verify", label: "Verify the chain" },
    { href: "/demo/open-data", label: "API & mirror kit", note: "Open API, CSV, run your own copy" },
  ] },
  { label: "Audits", items: [
    { href: "/audits", label: "COA audit opinions (LGUs)" },
  ] },
  { label: "More", items: [
    { href: "/about", label: "About PisoScan" },
    { href: "/about#sources", label: "Data sources" },
    { href: "/developers", label: "Open data & OCDS export" },
  ] },
];

export function Header() {
  const s = stats();
  const gaa26 = s.gaa.yearly.find((y) => y.year === 2026);
  return (
    <header className="border-b border-line bg-white">
      <div className="wrap flex min-h-[44px] flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-line py-1.5 text-xs text-ink-mute">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {gaa26 ? <span>FY2026 GAA: <Link href="/budget" className="font-medium">{pesoShort(gaa26.amount)}</Link></span> : null}
          {s.nep2027 ? <span className="hidden sm:inline">FY2027 NEP: <Link href="/budget/nep-2027" className="font-medium">{pesoShort(s.nep2027.amount)}</Link> <span className="text-ok">({pct(s.nep2027.pct)})</span></span> : null}
          <span className="hidden md:inline">Latest award: <span className="text-ink">{date(s.philgeps.maxDate)}</span></span>
        </div>
        <HeaderSearch />
      </div>
      <div className="wrap flex h-[60px] items-center justify-between gap-4">
        <Link href="/" aria-label="PisoScan home" className="shrink-0"><Logo /></Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          <Link href="/" className="rounded-md px-3 py-2 text-sm text-ink hover:text-ink">Home</Link>
          {NAV.map((g) => (
            <div key={g.label} className="group relative">
              <button type="button" className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm text-ink hover:text-ink group-focus-within:text-ink">
                {g.label} <ChevronDown size={14} className="transition-transform group-hover:rotate-180" />
              </button>
              <div className="invisible absolute right-0 top-full z-40 min-w-[260px] rounded-xl border border-line bg-white p-2 opacity-0 shadow-card transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                {g.items.map((i) => (
                  <Link key={i.href} href={i.href} className="block rounded-lg px-3 py-2 text-sm text-ink hover:bg-canvas hover:text-ink">
                    {i.label}
                    {i.note ? <span className="block text-xs text-ink-mute">{i.note}</span> : null}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <details className="relative lg:hidden">
          <summary className="btn cursor-pointer list-none px-2.5" aria-label="Open menu"><Menu size={18} /></summary>
          <div className="absolute right-0 top-full z-40 mt-2 max-h-[75vh] w-[min(320px,calc(100vw-24px))] overflow-y-auto rounded-xl border border-line bg-white p-2 shadow-card">
            <Link href="/" className="block rounded-lg px-3 py-2 text-sm text-ink">Home</Link>
            {NAV.map((g) => (
              <div key={g.label} className="border-t border-line pt-1">
                <div className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-ink-mute">{g.label}</div>
                {g.items.map((i) => <Link key={i.href} href={i.href} className="block rounded-lg px-3 py-2 text-sm text-ink hover:bg-canvas">{i.label}</Link>)}
              </div>
            ))}
          </div>
        </details>
      </div>
    </header>
  );
}
