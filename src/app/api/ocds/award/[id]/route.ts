import { one, type Award } from "@/lib/db";
import { awardFingerprint } from "@/lib/verify";
import { toOcdsRelease } from "@/lib/ocds";

export const dynamic = "force-dynamic";

export function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!/^[0-9a-f]{24}$/.test(params.id)) return Response.json({ error: "not found" }, { status: 404 });
  const a = one<Award>("SELECT * FROM award WHERE id = ?", params.id);
  if (!a) return Response.json({ error: "not found" }, { status: 404 });
  const release = toOcdsRelease(a, awardFingerprint(a).hash);
  const pkg = {
    uri: `/api/ocds/award/${a.id}`,
    version: "1.1",
    publishedDate: new Date().toISOString(),
    publisher: { name: "PisoScan (independent; not an official publisher)" },
    license: "https://creativecommons.org/publicdomain/zero/1.0/",
    releases: [release],
  };
  return Response.json(pkg, { headers: { "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "*" } });
}
