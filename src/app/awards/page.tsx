import { stats } from "@/lib/db";
import { listAwards, pageOf, MAX_ROWS } from "@/lib/lists";
import { AwardTable } from "@/components/AwardTable";
import { PageTitle, Pager } from "@/components/ui";
import { num, pesoShort } from "@/lib/format";

export const metadata = { title: "Contract awards" };

export default function Awards({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const s = stats();
  const f = { year: searchParams.year, level: searchParams.level, sort: searchParams.sort, min: searchParams.min };
  const page = pageOf(searchParams.p);
  const r = listAwards(f, page);
  const years = s.philgeps.byYear.map((y) => y.year).filter((y) => y >= 2006).reverse();
  return (
    <div className="wrap">
      <PageTitle sub={<>Construction awards published on PhilGEPS · {s.philgeps.source}</>}>Contract Awards</PageTitle>
      <section className="card mt-5">
        <div className="card-h">
          <div className="text-sm">
            {r.total > MAX_ROWS ? <>More than {num(r.total)} awards found <span className="muted">(showing the first {num(MAX_ROWS)} records)</span></> : <>{num(r.total)} awards found</>}
            <div className="text-xs text-ink-mute">Total listed value {pesoShort(r.sum)}</div>
          </div>
          <form method="get" className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="year">Year</label>
            <select id="year" name="year" defaultValue={f.year ?? ""} className="select py-1.5"><option value="">All years</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
            <label className="sr-only" htmlFor="level">Level</label>
            <select id="level" name="level" defaultValue={f.level ?? ""} className="select py-1.5">
              <option value="">All levels</option><option value="national">National & other</option><option value="province">Provinces</option><option value="city">Cities</option><option value="municipality">Municipalities</option><option value="barangay">Barangays</option>
            </select>
            <label className="sr-only" htmlFor="min">Minimum amount</label>
            <select id="min" name="min" defaultValue={f.min ?? ""} className="select py-1.5"><option value="">Any amount</option><option value="1000000">₱1M+</option><option value="10000000">₱10M+</option><option value="100000000">₱100M+</option><option value="1000000000">₱1B+</option></select>
            <label className="sr-only" htmlFor="sort">Sort</label>
            <select id="sort" name="sort" defaultValue={f.sort ?? ""} className="select py-1.5"><option value="">Newest</option><option value="oldest">Oldest</option><option value="amount">Largest amount</option></select>
            <button className="btn-primary">Apply</button>
          </form>
        </div>
        <AwardTable rows={r.rows} />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
          <span className="text-xs text-ink-mute">Amounts are award values as listed, not payments.</span>
          <Pager page={page} pages={r.pages} base="/awards" params={f} />
        </div>
      </section>
    </div>
  );
}
