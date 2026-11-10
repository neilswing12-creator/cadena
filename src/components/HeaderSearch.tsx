"use client";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";

/** Compact search in the top strip; hidden on the home page, which has the big one. */
export function HeaderSearch() {
  const path = usePathname();
  if (path === "/") return null;
  return (
    <form action="/search" method="get" role="search" className="flex w-full items-center sm:w-auto">
      <label htmlFor="hq" className="sr-only">Search</label>
      <input id="hq" name="q" placeholder="Search by contractor / agency / project / reference / LGU" className="input h-9 rounded-r-none py-1.5 text-xs sm:w-[420px]" />
      <button type="submit" className="flex h-9 items-center rounded-r-lg bg-brand px-3 text-white hover:bg-brand-dark" aria-label="Search"><Search size={15} /></button>
    </form>
  );
}
