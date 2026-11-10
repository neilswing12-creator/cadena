import { stats } from "@/lib/db";
import { listProjects, pageOf, MAX_ROWS } from "@/lib/lists";
import { ProjectTable } from "@/components/AwardTable";
import { PageTitle, Pager } from "@/components/ui";
import { num, pesoShort } from "@/lib/format";

export const metadata = { title: "Infrastructure projects" };

export default function Projects({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const s = stats();
  const f = { year: searchParams.year, status: searchParams.status, category: searchParams.category, sort: searchParams.sort };
  const page = pageOf(searchParams.p);
  const r = listProjects(f, page);
  const years = s.dpwh.byYear.map((y) => y.year).reverse();
  return (
    <div className="wrap">
      <PageTitle sub={<>DPWH contracts 2016–2026 · {s.dpwh.source}</>}>Infrastructure Projects</PageTitle>
      <section className="card mt-5">
        <div className="card-h">
          <div className="text-sm">
            {r.total > MAX_ROWS ? <>More than {num(r.total)} contracts found <span className="muted">(showing the first {num(MAX_ROWS)})</span></> : <>{num(r.total)} contracts found</>}
            <div className="text-xs text-ink-mute">Total contract value {pesoShort(r.sum)}</div>
          </div>
          <form method="get" className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="year">Budget year</label>
            <select id="year" name="year" defaultValue={f.year ?? ""} className="select py-1.5"><option value="">All years</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
            <label className="sr-only" htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={f.status ?? ""} className="select py-1.5"><option value="">All statuses</option>{s.dpwh.byStatus.map((x) => <option key={x.status} value={x.status}>{x.status} ({num(x.count)})</option>)}</select>
            <label className="sr-only" htmlFor="category">Category</label>
            <select id="category" name="category" defaultValue={f.category ?? ""} className="select max-w-[220px] py-1.5"><option value="">All categories</option>{s.dpwh.byCategory.map((x) => <option key={x.category} value={x.category}>{x.category}</option>)}</select>
            <label className="sr-only" htmlFor="sort">Sort</label>
            <select id="sort" name="sort" defaultValue={f.sort ?? ""} className="select py-1.5"><option value="">Newest</option><option value="oldest">Oldest</option><option value="amount">Largest amount</option></select>
            <button className="btn-primary">Apply</button>
          </form>
        </div>
        <ProjectTable rows={r.rows} />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
          <span className="text-xs text-ink-mute">{s.dpwh.notice}</span>
          <Pager page={page} pages={r.pages} base="/projects" params={f} />
        </div>
      </section>
    </div>
  );
}
