import { one, type Project } from "@/lib/db";
import { projectFingerprint } from "@/lib/verify";
import { toOc4idsProject } from "@/lib/ocds";

export const dynamic = "force-dynamic";

export function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id).slice(0, 64);
  const p = one<Project & { cname: string | null }>("SELECT p.*, c.name AS cname FROM project p LEFT JOIN contractor c ON c.id = p.contractor_id WHERE p.id = ?", id);
  if (!p) return Response.json({ error: "not found" }, { status: 404 });
  const pkg = {
    uri: `/api/oc4ids/project/${encodeURIComponent(p.id)}`,
    version: "0.9",
    publishedDate: new Date().toISOString(),
    publisher: { name: "PisoScan (independent; not an official publisher)" },
    projects: [toOc4idsProject(p, projectFingerprint(p).hash, p.cname)],
  };
  return Response.json(pkg, { headers: { "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "*" } });
}
