import Link from "next/link";
import type { Award, Project } from "@/lib/db";
import { age, date, peso, pesoShort } from "@/lib/format";
import { Empty, StatusBadge, TableWrap } from "./ui";

export function AwardTable({ rows, hide = [] }: { rows: Award[]; hide?: ("agency" | "contractor")[] }) {
  if (!rows.length) return <Empty>No contract awards match.</Empty>;
  return (
    <TableWrap>
      <table className="tbl">
        <thead>
          <tr>
            <th>Record ID</th>
            <th>Reference</th>
            <th>Age</th>
            <th>Project title</th>
            {hide.includes("agency") ? null : <th>Procuring entity</th>}
            {hide.includes("contractor") ? null : <th>Awarded to</th>}
            <th className="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id}>
              <td><Link href={`/award/${a.id}`} className="mono whitespace-nowrap">{a.id.slice(0, 12)}…</Link></td>
              <td><span className="pill max-w-[140px] truncate" title={a.reference ?? ""}>{a.reference || "—"}</span></td>
              <td className="whitespace-nowrap" title={date(a.award_date)}>{age(a.award_date)}</td>
              <td className="min-w-[220px] max-w-[360px]"><span className="line-clamp-2" title={a.title ?? ""}>{a.title}</span></td>
              {hide.includes("agency") ? null : <td className="min-w-[180px] max-w-[260px]"><Link href={`/agency/${a.agency_id}`} className="line-clamp-2">{a.organization}</Link></td>}
              {hide.includes("contractor") ? null : <td className="min-w-[180px] max-w-[260px]"><Link href={`/contractor/${a.contractor_id}`} className="line-clamp-2">{a.awardee}</Link></td>}
              <td className="whitespace-nowrap text-right tabular-nums" title={peso(a.amount)}>{pesoShort(a.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrap>
  );
}

export function ProjectTable({ rows, hide = [] }: { rows: (Project & { cname?: string | null })[]; hide?: ("contractor" | "office")[] }) {
  if (!rows.length) return <Empty>No infrastructure projects match.</Empty>;
  return (
    <TableWrap>
      <table className="tbl">
        <thead>
          <tr>
            <th>Contract ID</th>
            <th>Start</th>
            <th>Description</th>
            <th>Status</th>
            {hide.includes("office") ? null : <th>Office</th>}
            {hide.includes("contractor") ? null : <th>Contractor</th>}
            <th className="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td><Link href={`/project/${encodeURIComponent(p.id)}`} className="mono whitespace-nowrap">{p.id}</Link></td>
              <td className="whitespace-nowrap" title={date(p.start)}>{p.start ? age(p.start) : "—"}</td>
              <td className="min-w-[240px] max-w-[380px]"><span className="line-clamp-2" title={p.description ?? ""}>{p.description}</span><span className="text-xs text-ink-mute">{p.category}</span></td>
              <td><StatusBadge status={p.status} /></td>
              {hide.includes("office") ? null : <td className="whitespace-nowrap"><Link href={`/agency/${p.agency_id}`}>{p.office}</Link></td>}
              {hide.includes("contractor") ? null : <td className="min-w-[180px] max-w-[240px]">{p.contractor_id ? <Link href={`/contractor/${p.contractor_id}`} className="line-clamp-2">{p.cname}</Link> : <span className="muted">—</span>}</td>}
              <td className="whitespace-nowrap text-right tabular-nums" title={peso(p.amount)}>{pesoShort(p.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrap>
  );
}
