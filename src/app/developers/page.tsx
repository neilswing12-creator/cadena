import Link from "next/link";
import { one } from "@/lib/db";
import { Card, PageTitle } from "@/components/ui";

export const metadata = { title: "Open data & OCDS export" };

export default function Developers() {
  const a = one<{ id: string }>("SELECT id FROM award ORDER BY award_date DESC LIMIT 1");
  const p = one<{ id: string }>("SELECT id FROM project ORDER BY start DESC LIMIT 1");
  const code = "rounded bg-canvas px-1.5 py-0.5 font-mono text-xs";
  return (
    <div className="wrap max-w-[1000px]">
      <PageTitle sub="Machine-readable records in open contracting standards">Open Data &amp; OCDS Export</PageTitle>
      <div className="mt-5 space-y-5">
        <Card title="Standards" bodyClass="space-y-3 p-4 text-sm leading-relaxed">
          <p>
            PisoScan publishes each record in the formats that BetterGov&apos;s <a href="https://govchain.bettergov.ph/" target="_blank" rel="noopener noreferrer">OpenGovChain</a> uses for its
            procurement and infrastructure modules: the <a href="https://standard.open-contracting.org/latest/en/" target="_blank" rel="noopener noreferrer">Open Contracting Data Standard (OCDS 1.1)</a> and the{" "}
            <a href="https://standard.open-contracting.org/infrastructure/latest/en/" target="_blank" rel="noopener noreferrer">Open Contracting for Infrastructure Data Standard (OC4IDS)</a>.
            OpenGovChain is marked pre-launch in its repository, so PisoScan does not read from or write to that chain. The exports are ready for it, or for any OCDS tool.
          </p>
        </Card>
        <Card title="Endpoints" bodyClass="divide-y divide-line text-sm">
          <div className="p-4"><div className="font-medium">OCDS release package for a contract award</div><div className="mt-1"><span className={code}>GET /api/ocds/award/&#123;recordId&#125;</span></div>{a ? <div className="mt-1 text-xs">Example: <Link href={`/api/ocds/award/${a.id}`}>/api/ocds/award/{a.id}</Link></div> : null}</div>
          <div className="p-4"><div className="font-medium">OC4IDS project package for a DPWH contract</div><div className="mt-1"><span className={code}>GET /api/oc4ids/project/&#123;contractId&#125;</span></div>{p ? <div className="mt-1 text-xs">Example: <Link href={`/api/oc4ids/project/${encodeURIComponent(p.id)}`}>/api/oc4ids/project/{p.id}</Link></div> : null}</div>
        </Card>
        <Card title="Verifying a record" bodyClass="space-y-3 p-4 text-sm leading-relaxed">
          <p>Every award and project page has a <em>Source record</em> tab showing the exact line that was hashed. To check it yourself:</p>
          <pre className="overflow-x-auto rounded-lg bg-canvas p-3 font-mono text-xs">{`printf '%s' '<hashed input from the page>' | sha256sum
# the first 24 characters must equal the award's record ID`}</pre>
          <p>The hashed line is the source row as JSON: <span className={code}>[&quot;philgeps&quot;, reference, contractNo, title, awardee, organization, area, amount, awardDate, orgLevel, prov, mun, brgy]</span>, or <span className={code}>[&quot;dpwh&quot;, …]</span> with the DPWH columns in source order. Identical duplicate rows get a trailing counter.</p>
        </Card>
        <Card title="Upstream data" bodyClass="p-4 text-sm leading-relaxed">
          <ul className="list-disc space-y-1 pl-5">
            <li>Budget: <a href="https://budget.bettergov.ph/docs" target="_blank" rel="noopener noreferrer">Philippine Budget Data API</a> (GAA, NEP, budget cycle, hearings). PisoScan stores a snapshot made with <span className={code}>npm run fetch:budget</span>.</li>
            <li>Procurement: <a href="https://huggingface.co/datasets/bettergovph/philgeps-data" target="_blank" rel="noopener noreferrer">Open PhilGEPS data</a> (CC0).</li>
            <li>Infrastructure: DPWH contract list via BetterGov.ph.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
