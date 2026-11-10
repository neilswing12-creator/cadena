import Link from "next/link";
import { FlaskConical } from "lucide-react";

export const metadata = { title: { default: "Blockchain demo", template: "%s | Blockchain demo | PisoScan" } };

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="border-b border-warn/30 bg-warn-soft">
        <div className="wrap flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded bg-ink px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-white"><FlaskConical size={13} /> Demo</span>
          <span className="text-ink">
            For public education only. These blocks are built by PisoScan from published PhilGEPS records to show how a budget ledger like CADENA would work.
            No government agency created or signed them, and this is not an official ledger. <Link href="/demo/how-it-works">How it works</Link>
          </span>
        </div>
      </div>
      <nav className="border-b border-line bg-white" aria-label="Demo sections">
        <div className="wrap flex gap-1 overflow-x-auto py-2">
          {[["/demo", "Overview"], ["/demo/blocks", "Blocks"], ["/demo/txs", "Transactions"], ["/demo/how-it-works", "How it works"], ["/demo/verify", "Verify the chain"], ["/demo/open-data", "API & mirror kit"]].map(([h, l]) => (
            <Link key={h} href={h} className="tab">{l}</Link>
          ))}
        </div>
      </nav>
      {children}
    </>
  );
}
