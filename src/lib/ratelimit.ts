import "server-only";

// Simple in-memory token bucket per client, for the open API (bill Sec. 14 asks for rate limiting).
const buckets = new Map<string, { tokens: number; at: number }>();
const RATE = 5; // tokens per second
const BURST = 60;

export function rateLimit(req: Request): Response | null {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
  const now = Date.now();
  const b = buckets.get(ip) ?? { tokens: BURST, at: now };
  b.tokens = Math.min(BURST, b.tokens + ((now - b.at) / 1000) * RATE);
  b.at = now;
  if (b.tokens < 1) {
    buckets.set(ip, b);
    return Response.json({ error: "rate_limited", message: "Too many requests. Slow down to about 5 per second." }, { status: 429, headers: { "Retry-After": "2" } });
  }
  b.tokens -= 1;
  buckets.set(ip, b);
  if (buckets.size > 10000) buckets.clear();
  return null;
}

const esc = (v: unknown) => {
  if (v == null) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export function csv(rows: Record<string, unknown>[], filename: string) {
  const cols = rows.length ? Object.keys(rows[0]) : [];
  const body = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\r\n");
  return new Response("﻿" + body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Access-Control-Allow-Origin": "*" } });
}
export const json = (data: unknown, filename?: string) =>
  Response.json(data, { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300", ...(filename ? { "Content-Disposition": `attachment; filename="${filename}"` } : {}) } });
