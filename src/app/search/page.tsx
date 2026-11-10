import Link from "next/link";
import { redirect } from "next/navigation";
import { all, one, type Award, type Project } from "@/lib/db";
import { SearchBox, FILTERS } from "@/components/SearchHero";
import { AwardTable, ProjectTable } from "@/components/AwardTable";
import { Card, Empty, PageTitle, TableWrap } from "@/components/ui";
import { pesoShort } from "@/lib/format";

export const metadata = { title: "Search", robots: { index: false } };

type Hit = { label: string; kind: string; ref: string; sub: string; rank_hint: number };
const KIND_LABEL: Record<string, string> = { contractor: "Contractor", agency: "Procuring entity", program: "Budget program", lgu: "Place", department: "Department" };
const kindHref = (h: Hit) => (h.kind === "contractor" ? `/contractor/${h.ref}` : h.kind === "agency" ? `/agency/${h.ref}` : h.kind === "lgu" ? `/lgu/${h.ref}` : h.kind === "department" ? `/budget/${h.ref}` : `/budget/program/${h.ref}`);

function ftsQuery(q: string) {
  const toks = q.normalize("NFKC").split(/[^\p{L}\p{N}]+/u).filter(Boolean).slice(0, 8);
  return toks.length ? toks.map((t) => `"${t.replace(/"/g, "")}"*`).join(" ") : null;
}

export default function Search({ searchParams }: { searchParams: { q?: string; f?: string } }) {
  const q = (searchParams.q ?? "").trim().slice(0, 120);
  const f = FILTERS.some((x) => x.v === searchParams.f) ? searchParams.f ?? "" : "";

  if (q) {
    if (/^[0-9a-f]{8,64}$/i.test(q)) {
      const hit = all<{ id: string }>("SELECT id FROM award WHERE id >= ? AND id < ? LIMIT 2", q.toLowerCase().slice(0, 24), q.toLowerCase().slice(0, 24) + "g");
      if (hit.length === 1) redirect(`/award/${hit[0].id}`);
    }
    const proj = one<{ id: string }>("SELECT id FROM project WHERE id = ? COLLATE NOCASE", q);
    if (proj) redirect(`/project/${encodeURIComponent(proj.id)}`);
  }

  const fq = q ? ftsQuery(q) : null;
  const kinds = f === "contractor" ? ["contractor"] : f === "agency" ? ["agency"] : f === "program" ? ["program", "department"] : f === "lgu" ? ["lgu"] : f === "record" ? [] : ["contractor", "agency", "lgu", "department", "program"];
  let hits: Hit[] = [];
  if (fq && kinds.length) {
    hits = all<Hit>(
      `SELECT label, kind, ref, sub, rank_hint FROM entity_fts WHERE entity_fts MATCH ? AND kind IN (${kinds.map(() => "?").join(",")}) ORDER BY bm25(entity_fts) - (CASE WHEN kind = 'lgu' THEN 3 WHEN kind IN ('department') THEN 2 ELSE 0 END) - min(log(1 + rank_hint) / 10.0, 3) LIMIT 60`,
      fq, ...kinds);
  }
  const byRef = q && (f === "" || f === "record") ? all<Award>("SELECT * FROM award WHERE reference = ? OR contract_no = ? ORDER BY award_date DESC LIMIT 25", q, q) : [];
  let awards: Award[] = [];
  let projects: Project[] = [];
  if (fq && (f === "" || f === "record")) {
    const recs = all<{ kind: string; ref: string }>("SELECT kind, ref FROM record_fts WHERE record_fts MATCH ? ORDER BY rank LIMIT 200", fq);
    const aIds = recs.filter((r) => r.kind === "award").map((r) => r.ref).slice(0, 25);
    const pIds = recs.filter((r) => r.kind === "project").map((r) => r.ref).slice(0, 25);
    if (aIds.length) awards = all<Award>(`SELECT * FROM award WHERE id IN (${aIds.map(() => "?").join(",")}) ORDER BY award_date DESC`, ...aIds);
    if (pIds.length) projects = all<Project & { cname: string | null }>(`SELECT p.*, c.name AS cname FROM project p LEFT JOIN contractor c ON c.id = p.contractor_id WHERE p.id IN (${pIds.map(() => "?").join(",")}) ORDER BY p.start DESC`, ...pIds);
  }
  const groups = ["lgu", "department", "contractor", "agency", "program"].map((k) => ({ k, rows: hits.filter((h) => h.kind === k) })).filter((g) => g.rows.length);
  const nothing = q && !hits.length && !awards.length && !projects.length && !byRef.length;

  return (
    <div className="wrap">
      <PageTitle sub={q ? <>Results for <strong className="font-medium text-ink">&ldquo;{q}&rdquo;</strong></> : "Search contractors, agencies, budget programs, places, awards and projects"}>Search</PageTitle>
      <div className="mt-5 max-w-3xl"><SearchBox q={q} f={f} /></div>
      <div className="mt-5 space-y-5">
        {nothing ? <Card><Empty>No results. Try fewer words, or a contractor, agency or place name.</Empty></Card> : null}
        {byRef.length ? <Card title={`Awards with reference / contract no. "${q}"`}><AwardTable rows={byRef} /></Card> : null}
        {groups.map((g) => (
          <Card key={g.k} title={`${KIND_LABEL[g.k]}s`} right={<span className="text-xs text-ink-mute">{g.rows.length}{g.rows.length >= 60 ? "+" : ""} found</span>}>
            <TableWrap>
              <table className="tbl tbl-fixed min-w-[560px]">
                <colgroup><col className="w-[58%]" /><col className="w-[27%]" /><col className="w-[15%]" /></colgroup>
                <tbody>
                  {g.rows.slice(0, 15).map((h) => (
                    <tr key={h.kind + h.ref}>
                      <td><Link href={kindHref(h)} className="block truncate" title={h.label}>{h.label}</Link></td>
                      <td className="truncate text-sm text-ink-mute" title={h.sub}>{h.sub}</td>
                      <td className="whitespace-nowrap text-right tabular-nums">{h.kind === "lgu" || h.kind === "department" ? "" : pesoShort(h.rank_hint)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </Card>
        ))}
        {awards.length ? <Card title="Contract awards matching the title"><AwardTable rows={awards} /></Card> : null}
        {projects.length ? <Card title="DPWH projects matching the description"><ProjectTable rows={projects} /></Card> : null}
      </div>
    </div>
  );
}
