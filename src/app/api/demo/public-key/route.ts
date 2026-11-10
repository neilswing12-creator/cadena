import { demoPublicKeyPem } from "@/lib/demo";

export const dynamic = "force-dynamic";

export function GET() {
  return new Response(demoPublicKeyPem(), { headers: { "Content-Type": "application/x-pem-file", "Content-Disposition": 'inline; filename="pisoscan-DEMO-public-key.pem"', "Access-Control-Allow-Origin": "*" } });
}
