import Link from "next/link";
import { Logo } from "./ui";
import { stats } from "@/lib/db";
import { date } from "@/lib/format";

export function Footer() {
  const s = stats();
  return (
    <footer className="mt-12 bg-white">
      <div className="border-t border-line">
        <div className="wrap grid gap-8 py-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-md text-sm text-ink-mute">
              An independent, non-partisan explorer for Philippine public funds. It connects published budget, procurement,
              infrastructure and audit records so anyone can follow the money. <strong className="font-medium text-ink">Not a government website</strong> and
              not the official CADENA portal proposed in Senate Bill No. 1506.
            </p>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-medium">Records</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/awards">Contract awards</Link></li>
              <li><Link href="/projects">Infrastructure projects</Link></li>
              <li><Link href="/contractors">Contractors</Link></li>
              <li><Link href="/audits">COA audits</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-medium">Budget</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/budget">National budget</Link></li>
              <li><Link href="/budget/cycle">Follow the money</Link></li>
              <li><Link href="/budget/stages">Budget stages</Link></li>
              <li><Link href="/budget/nep-2027">FY2027 NEP</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-medium">About</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about">How to read this site</Link></li>
              <li><Link href="/about#sources">Data sources & licences</Link></li>
              <li><Link href="/developers">Open data & OCDS</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="wrap flex flex-wrap justify-between gap-2 py-4 text-xs text-ink-mute">
          <span>Data: DPWH and PhilGEPS via BetterGov.ph · GAA/NEP via the Philippine Budget Data API (CC BY 4.0) · COA executive summaries. Database built {date(s.builtAt)}.</span>
          <span>Amounts are as published by the source. A record alone is not evidence of wrongdoing.</span>
        </div>
      </div>
    </footer>
  );
}
