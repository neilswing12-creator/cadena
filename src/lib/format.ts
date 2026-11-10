const nf = new Intl.NumberFormat("en-PH");
const pf = new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const num = (n: number | null | undefined) => (n == null ? "—" : nf.format(n));

/** Full peso amount, e.g. ₱1,234,567.89 */
export const peso = (n: number | null | undefined) => (n == null ? "—" : "₱" + pf.format(n));

/** Short peso amount, e.g. ₱6.79T, ₱1.25B, ₱340.5M */
export function pesoShort(n: number | null | undefined, digits = 2): string {
  if (n == null) return "—";
  const a = Math.abs(n);
  const s = n < 0 ? "-" : "";
  if (a >= 1e12) return `${s}₱${(a / 1e12).toFixed(digits)}T`;
  if (a >= 1e9) return `${s}₱${(a / 1e9).toFixed(digits)}B`;
  if (a >= 1e6) return `${s}₱${(a / 1e6).toFixed(digits === 2 ? 1 : digits)}M`;
  if (a >= 1e3) return `${s}₱${(a / 1e3).toFixed(1)}K`;
  return `${s}₱${a.toFixed(0)}`;
}

export const pct = (n: number | null | undefined, d = 1) => (n == null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(d)}%`);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function date(d: string | null | undefined): string {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  if (!y || !m || !day) return d;
  return `${MONTHS[m - 1]} ${day}, ${y}`;
}

/** "3 days ago", "2 yrs 1 mo ago" — measured from today in Manila. */
export function age(d: string | null | undefined): string {
  if (!d) return "—";
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const then = new Date(d.slice(0, 10) + "T00:00:00");
  const days = Math.floor((now.getTime() - then.getTime()) / 86400000);
  if (days < 0) return "in " + -days + (days === -1 ? " day" : " days");
  if (days === 0) return "today";
  if (days < 31) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30.44);
  if (months < 12) return `${months} mo${months === 1 ? "" : "s"} ago`;
  const y = Math.floor(months / 12), mo = months % 12;
  return `${y} yr${y === 1 ? "" : "s"}${mo ? ` ${mo} mo` : ""} ago`;
}

/** abc123…ef89 */
export const short = (s: string, head = 8, tail = 6) => (s.length <= head + tail + 1 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`);

export function title(s: string | null | undefined): string {
  if (!s) return "";
  return s;
}

export const qs = (base: Record<string, string | number | undefined | null>, patch: Record<string, string | number | undefined | null> = {}) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...base, ...patch })) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? "?" + s : "";
};
