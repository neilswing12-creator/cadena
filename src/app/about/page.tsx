import Link from "next/link";
import { stats } from "@/lib/db";
import { Card, PageTitle } from "@/components/ui";
import { date, num } from "@/lib/format";

export const metadata = { title: "About PisoScan" };

export default function About() {
  const s = stats();
  const sources = [
    { name: "PhilGEPS construction awards", rows: s.philgeps.rows, by: s.philgeps.source, url: s.philgeps.sourceUrl, lic: "CC0 1.0", note: `Awards up to ${date(s.philgeps.maxDate)}. Category "Construction Projects" only.` },
    { name: "DPWH infrastructure contracts", rows: s.dpwh.rows, by: s.dpwh.source, url: s.dpwh.sourceUrl, lic: "Public data", note: "Contract amounts as DPWH lists them, not payments." },
    { name: "GAA FY2020–2026, FY2027 NEP, budget cycle", rows: null, by: s.gaa.source, url: "https://budget.bettergov.ph/docs", lic: s.gaa.license, note: `Snapshot taken ${date(s.gaa.fetchedAt)}. Derived from DBM publications.` },
    { name: "COA audit opinions (LGUs, CY2024)", rows: s.coa.rows, by: "Commission on Audit executive summaries (coa.gov.ph), compiled by Pilipiknow", url: "https://www.coa.gov.ph/", lic: "Public documents", note: "Opinion and recommendation counts read from each LGU's executive summary; each row links its PDF." },
    { name: "Place boundaries and names", rows: null, by: "PSA PSGC via philippines-json-maps", url: "https://github.com/faeldon/philippines-json-maps", lic: "See source", note: "Regions, provinces, cities/municipalities and barangays." },
  ];
  return (
    <div className="wrap max-w-[1000px]">
      <PageTitle sub="What this site is, what it is not, and how to read it">About PisoScan</PageTitle>
      <div className="mt-5 space-y-5">
        <Card title="What it is" bodyClass="space-y-3 p-4 text-sm leading-relaxed">
          <p>PisoScan is an independent, non-partisan explorer for Philippine public funds. It is laid out like a block explorer: every record has an ID and a page, every contractor and government office has an address-style profile, and everything is searchable.</p>
          <p>It joins datasets that are usually spread across different sites: the national budget (what Congress approved), budget execution (what was released and spent), procurement (who won contracts), DPWH infrastructure (what is being built and where) and COA audit results.</p>
          <p>
            The idea follows the <strong className="font-medium">CADENA Act</strong> (Citizen Access and Disclosure of Expenditures for National Accountability, Senate Bill No. 1506),
            which proposes a government budget portal backed by a distributed ledger. The Senate approved it 17–0 on 15 December 2025; reports from mid-2026 say it was
            still pending in House committee (<a href="https://www.onebullex.com/news/articles/philippine-senate-cadena-act-17-0-vote-stalls-in-house-for-seven-months" target="_blank" rel="noopener noreferrer">report</a>). Until such a system exists, PisoScan shows what can already be built from published data.
          </p>
        </Card>

        <Card title="What it is not" bodyClass="space-y-2 p-4 text-sm leading-relaxed">
          <ul className="list-disc space-y-2 pl-5">
            <li><strong className="font-medium">Not a government website</strong>, not the official CADENA portal, and not affiliated with DBM, DPWH, PhilGEPS, COA or BetterGov.ph.</li>
            <li><strong className="font-medium">Not a blockchain.</strong> Each record carries a SHA-256 fingerprint of its source row, so anyone can check that PisoScan has not altered it. That proves the copy matches the source, not that the source is true.</li>
            <li><strong className="font-medium">Not an accusation.</strong> A contract award, a large amount, a low spending rate or a modified audit opinion is not evidence of wrongdoing. Records show what was published, nothing more.</li>
          </ul>
        </Card>

        <Card title="How to read the numbers" bodyClass="p-4 text-sm leading-relaxed">
          <dl className="grid gap-3 sm:grid-cols-[180px_1fr]">
            <dt className="font-medium">Appropriation (GAA)</dt><dd>The authority to spend that Congress enacted. Not the same as money spent.</dd>
            <dt className="font-medium">Allotment</dt><dd>Authority released by DBM to an agency to commit funds.</dd>
            <dt className="font-medium">Obligation</dt><dd>Funds committed, for example by signing a contract.</dd>
            <dt className="font-medium">Disbursement</dt><dd>Money actually paid out.</dd>
            <dt className="font-medium">Award amount</dt><dd>The value of a contract when it was awarded. Contracts can later be amended, delayed or terminated.</dd>
            <dt className="font-medium">Contractor grouping</dt><dd>Records are grouped when names match after removing case, punctuation and notes such as &quot;(formerly …)&quot;. Two companies with the same name would be grouped; one company with two legal names would not.</dd>
            <dt className="font-medium">Totals across datasets</dt><dd>PhilGEPS and DPWH can list the same contract, so adding them can count it twice. Pages say so where it matters.</dd>
          </dl>
        </Card>

        <Card title="Data sources" bodyClass="p-0">
          <div id="sources" className="divide-y divide-line">
            {sources.map((x) => (
              <div key={x.name} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[220px_1fr]">
                <div className="font-medium">{x.name}{x.rows != null ? <div className="text-xs font-normal text-ink-mute">{num(x.rows)} records</div> : null}</div>
                <div><a href={x.url} target="_blank" rel="noopener noreferrer">{x.by}</a> · <span className="text-ink-mute">{x.lic}</span><div className="text-xs text-ink-mute">{x.note}</div></div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Not yet available" bodyClass="p-4 text-sm leading-relaxed">
          <p>Some records the CADENA bill lists are not published in bulk, so they are not here: SAROs and NCAs per project, disbursement vouchers, programs of work and bills of quantities, completion certificates, LGU budgets and barangay spending. PisoScan shows gaps as gaps instead of estimating them. <Link href="/developers">See the open data formats</Link> for how new sources can be added.</p>
        </Card>
      </div>
    </div>
  );
}
