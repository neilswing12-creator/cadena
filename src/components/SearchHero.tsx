import { Search } from "lucide-react";

export const FILTERS = [
  { v: "", l: "All Filters" },
  { v: "contractor", l: "Contractors" },
  { v: "agency", l: "Procuring entities" },
  { v: "program", l: "Budget programs" },
  { v: "lgu", l: "Places (LGUs)" },
  { v: "record", l: "Awards & projects" },
];

export function SearchBox({ q = "", f = "", big = false }: { q?: string; f?: string; big?: boolean }) {
  return (
    <form action="/search" method="get" role="search" className={`flex w-full items-stretch overflow-hidden rounded-xl border border-line bg-white ${big ? "p-1.5 shadow-lg" : ""}`}>
      <label htmlFor={big ? "sf-big" : "sf"} className="sr-only">Filter</label>
      <select id={big ? "sf-big" : "sf"} name="f" defaultValue={f} className="hidden border-0 bg-transparent px-2 text-sm text-ink outline-none sm:block">
        {FILTERS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
      <span className="my-2 hidden w-px bg-line sm:block" />
      <label htmlFor={big ? "sq-big" : "sq"} className="sr-only">Search</label>
      <input
        id={big ? "sq-big" : "sq"}
        name="q"
        defaultValue={q}
        placeholder="Search by contractor / agency / program / project ID / reference no. / LGU"
        className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm outline-none"
        autoComplete="off"
      />
      <button type="submit" className="flex items-center justify-center rounded-lg bg-brand px-4 text-white hover:bg-brand-dark" aria-label="Search">
        <Search size={18} />
      </button>
    </form>
  );
}
