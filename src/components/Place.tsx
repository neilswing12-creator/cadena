import Link from "next/link";
import { geoChain } from "@/lib/db";

/** "Barangay X › Municipality › Province › Region" with links to place pages. */
export function Place({ id, fallback }: { id: string | null | undefined; fallback?: string | null }) {
  const chain = geoChain(id);
  if (!chain.length) return <span className={fallback ? "" : "muted"}>{fallback || "Not stated in the source"}</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1">
      {[...chain].reverse().map((g, i) => (
        <span key={g.id} className="inline-flex items-center gap-1">
          {i ? <span className="text-ink-faint">›</span> : null}
          {g.level === "barangay" ? <span>Brgy. {g.name}</span> : <Link href={`/lgu/${g.id}`}>{g.name}</Link>}
        </span>
      ))}
    </span>
  );
}
