import Link from "next/link";
import { HelpCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { CopyButton } from "./CopyButton";
import { qs, short } from "@/lib/format";

/** Monochrome mark: a coin with a peso sign, read through a magnifier ("scan"). */
export function LogoMark({ size = 28, color = "#111111", knockout = "#ffffff" }: { size?: number; color?: string; knockout?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <circle cx="13.5" cy="13.5" r="11.5" fill={color} />
      <path d="M22 22 L29.5 29.5" stroke={color} strokeWidth="4.2" strokeLinecap="round" />
      <g stroke={knockout} fill="none" strokeLinecap="round" strokeLinejoin="round" transform="translate(0.5 0.3)">
        <path d="M10.5 19.5V7.5h3.9a3.4 3.4 0 0 1 0 6.8h-3.9" strokeWidth="2.3" />
        <path d="M8 9.6h11M8 12.2h11" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={30} color={light ? "#ffffff" : "#111111"} knockout={light ? "#0a0a0a" : "#ffffff"} />
      <span className={`text-[1.4rem] font-bold leading-none tracking-[-0.035em] ${light ? "text-white" : "text-[#111111]"}`}>PisoScan</span>
    </span>
  );
}

export function Tip({ text }: { text: string }) {
  return (
    <span title={text} aria-label={text} className="mr-1 inline-flex align-[-2px] text-ink-faint">
      <HelpCircle size={14} />
    </span>
  );
}

/** One label/value line of a detail card (Etherscan "overview" style). */
export function Row({ label, tip, children }: { label: string; tip?: string; children: React.ReactNode }) {
  return (
    <div className="row">
      <div className="label flex items-start">{tip ? <Tip text={tip} /> : null}{label}:</div>
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}

export function Hash({ value, href, head = 10, tail = 8, full = false }: { value: string; href?: string; head?: number; tail?: number; full?: boolean }) {
  const text = full ? value : short(value, head, tail);
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1 align-middle">
      {href ? <Link href={href} className="mono truncate" title={value}>{text}</Link> : <span className="mono break-all" title={value}>{text}</span>}
      <CopyButton value={value} />
    </span>
  );
}

export function Card({ title, right, children, className = "", bodyClass = "" }: { title?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={`card ${className}`}>
      {title || right ? (
        <div className="card-h">
          {title ? <h2 className="card-t">{title}</h2> : <span />}
          {right}
        </div>
      ) : null}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function PageTitle({ children, sub, right }: { children: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4 pt-6">
      <div className="min-w-0">
        <h1 className="text-xl font-medium text-ink sm:text-[1.35rem]">{children}</h1>
        {sub ? <div className="mt-1 text-sm text-ink-mute">{sub}</div> : null}
      </div>
      {right}
    </div>
  );
}

export function Tabs({ items, active }: { items: { key: string; label: string; href: string; count?: number }[]; active: string }) {
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 py-3" aria-label="Sections">
      {items.map((t) => (
        <Link key={t.key} href={t.href} scroll={false} className={`tab ${t.key === active ? "tab-on" : ""}`} aria-current={t.key === active ? "page" : undefined}>
          {t.label}
          {t.count != null ? <span className={`ml-1 text-xs ${t.key === active ? "text-white/80" : "text-ink-mute"}`}>({t.count.toLocaleString("en-PH")})</span> : null}
        </Link>
      ))}
    </nav>
  );
}

/** Pager in the explorer style: First < Page x of y > Last */
export function Pager({ page, pages, base, params }: { page: number; pages: number; base: string; params: Record<string, string | number | undefined> }) {
  if (pages <= 1) return null;
  const link = (p: number) => base + qs(params, { p: p === 1 ? undefined : p });
  const cls = "btn px-2 py-1 text-xs";
  const off = "btn pointer-events-none px-2 py-1 text-xs opacity-40";
  return (
    <nav className="flex flex-wrap items-center gap-1" aria-label="Pagination">
      <Link href={link(1)} className={page > 1 ? cls : off} aria-disabled={page <= 1}>First</Link>
      <Link href={link(Math.max(1, page - 1))} className={page > 1 ? cls : off} aria-label="Previous page"><ChevronLeft size={14} /></Link>
      <span className="pill px-2.5 py-1">Page {page.toLocaleString("en-PH")} of {pages.toLocaleString("en-PH")}</span>
      <Link href={link(Math.min(pages, page + 1))} className={page < pages ? cls : off} aria-label="Next page"><ChevronRight size={14} /></Link>
      <Link href={link(pages)} className={page < pages ? cls : off} aria-disabled={page >= pages}>Last</Link>
    </nav>
  );
}

export function StatusBadge({ status }: { status: string | null }) {
  const s = status || "Not stated";
  const cls = /complete/i.test(s) ? "badge-ok" : /terminat/i.test(s) ? "badge-bad" : /going/i.test(s) ? "badge-info" : /procure|not yet/i.test(s) ? "badge-warn" : "badge-mute";
  return <span className={`badge ${cls}`}>{s}</span>;
}

export function OpinionBadge({ opinion }: { opinion: string | null }) {
  const o = opinion || "not stated";
  const cls = o === "unmodified" ? "badge-ok" : o === "qualified" || o === "modified" ? "badge-warn" : o === "adverse" || o === "disclaimer" ? "badge-bad" : "badge-mute";
  return <span className={`badge ${cls} capitalize`}>{o}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-10 text-center text-sm text-ink-mute">{children}</div>;
}

export function SourceNote({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-xs leading-relaxed text-ink-mute">{children}</p>;
}

export function Progress({ value }: { value: number | null }) {
  if (value == null) return <span className="muted">—</span>;
  const v = Math.max(0, Math.min(100, value));
  return (
    <span className="inline-flex w-full max-w-[220px] items-center gap-2">
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"><span className="block h-full rounded-full bg-ok" style={{ width: `${v}%` }} /></span>
      <span className="text-xs tabular-nums text-ink-mute">{value.toFixed(value % 1 ? 1 : 0)}%</span>
    </span>
  );
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}
