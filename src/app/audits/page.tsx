import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { all, one, type Audit } from "@/lib/db";
import { pageOf, PAGE_SIZE } from "@/lib/lists";
import { Card, OpinionBadge, PageTitle, Pager, SourceNote, TableWrap } from "@/components/ui";
import { num } from "@/lib/format";

export const metadata = { title: "COA audit opinions for LGUs" };
const OPINIONS = ["unmodified", "qualified", "modified", "adverse", "disclaimer", "not stated"];

export default function Audits({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const op = OPINIONS.includes(searchParams.opinion ?? "") ? searchParams.opinion! : null;
  const level = ["province", "city", "municipality"].includes(searchParams.level ?? "") ? searchParams.level! : null;
  const conds = [op ? (op === "not stated" ? "opinion IS NULL" : "opinion = ?") : null, level ? "level = ?" : null].filter(Boolean);
  const args = [op && op !== "not stated" ? op : null, level].filter(Boolean);
  const w = conds.length ? "WHERE " + conds.join(" AND ") : "";
  const page = pageOf(searchParams.p);
  const total = one<{ n: number }>(`SELECT count(*) n FROM audit ${w}`, ...args)!.n;
  const rows = all<Audit & { prov: string | null }>(`SELECT a.*, g.name prov FROM audit a LEFT JOIN geo g ON g.id = a.province_id ${w.replace(/\b(opinion|level)\b/g, "a.$1")} ORDER BY a.lgu_name LIMIT ? OFFSET ?`, ...args, PAGE_SIZE, (page - 1) * PAGE_SIZE);
  const dist = all<{ opinion: string | null; n: number }>("SELECT opinion, count(*) n FROM audit GROUP BY opinion ORDER BY n DESC");
  return (
    <div className="wrap">
      <PageTitle sub="Audit opinions on the financial statements of provinces, cities and municipalities, CY2024 (COA executive summaries)">COA Audit Opinions</PageTitle>
      <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {dist.map((d) => (
          <Link key={d.opinion ?? "none"} href={`/audits?opinion=${encodeURIComponent(d.opinion ?? "not stated")}`} className="card px-4 py-3 text-ink hover:border-brand hover:text-ink">
            <OpinionBadge opinion={d.opinion} />
            <div className="mt-1 text-lg tabular-nums">{num(d.n)}</div>
          </Link>
        ))}
      </div>
      <section className="card mt-5">
        <div className="card-h">
          <span className="text-sm">{num(total)} LGUs</span>
          <form method="get" className="flex flex-wrap gap-2">
            <label htmlFor="opinion" className="sr-only">Opinion</label>
            <select id="opinion" name="opinion" defaultValue={op ?? ""} className="select py-1.5"><option value="">All opinions</option>{OPINIONS.map((o) => <option key={o} value={o} className="capitalize">{o}</option>)}</select>
            <label htmlFor="level" className="sr-only">Level</label>
            <select id="level" name="level" defaultValue={level ?? ""} className="select py-1.5"><option value="">All levels</option><option value="province">Provinces</option><option value="city">Cities</option><option value="municipality">Municipalities</option></select>
            <button className="btn-primary">Apply</button>
          </form>
        </div>
        <TableWrap>
          <table className="tbl">
            <thead><tr><th>LGU</th><th>Province</th><th>Year</th><th>Opinion</th><th className="text-right">Prior-year recommendations fully implemented</th><th>Source</th></tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.lgu_id + a.year}>
                  <td><Link href={`/lgu/${a.lgu_id}`}>{a.lgu_name}</Link> <span className="text-xs capitalize text-ink-mute">{a.level}</span></td>
                  <td>{a.prov ?? "—"}</td>
                  <td>{a.year}</td>
                  <td><OpinionBadge opinion={a.opinion} /></td>
                  <td className="text-right tabular-nums">{a.recs_total ? `${num(a.recs_fully)} of ${num(a.recs_total)}` : <span className="muted">not stated</span>}</td>
                  <td>{a.source_url ? <a href={a.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">PDF <ExternalLink size={12} /></a> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <div className="flex justify-end border-t border-line px-4 py-3"><Pager page={page} pages={Math.ceil(total / PAGE_SIZE)} base="/audits" params={{ opinion: op ?? undefined, level: level ?? undefined }} /></div>
      </section>
      <SourceNote>
        COA states that an audit opinion is not a rating, score or grade, so PisoScan does not rank LGUs by it. An opinion is about the fairness of the financial statements and is
        not proof of wrongdoing. &quot;Modified&quot; means the summary says the opinion was modified without naming the type. Read the linked COA summary for the findings.
      </SourceNote>
    </div>
  );
}
