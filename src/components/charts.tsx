import { pesoShort, num } from "@/lib/format";

type Pt = { label: string; value: number; title?: string };

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

/** Simple responsive SVG column chart. `money` formats the axis in pesos. */
export function BarChart({ data, money = true, height = 220, color = "#111111", highlightLast = false, ariaLabel }: { data: Pt[]; money?: boolean; height?: number; color?: string; highlightLast?: boolean; ariaLabel: string }) {
  const W = 640, H = height, L = 58, R = 8, T = 10, B = 26;
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const iw = W - L - R, ih = H - T - B;
  const bw = iw / Math.max(data.length, 1);
  const every = Math.ceil(data.length / 12);
  const fmt = (v: number) => (money ? pesoShort(v, v >= 1e12 ? 1 : 0) : v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : v >= 1e3 ? Math.round(v / 1e3) + "K" : String(v));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={ariaLabel}>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const y = T + ih - f * ih;
        return (
          <g key={f}>
            <line x1={L} x2={W - R} y1={y} y2={y} stroke="#e5e5e5" />
            <text x={L - 6} y={y + 4} textAnchor="end" fontSize="10.5" fill="#6b6b6b">{fmt(max * f)}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const h = (d.value / max) * ih;
        const x = L + i * bw + bw * 0.15;
        return (
          <g key={d.label + i}>
            <rect x={x} y={T + ih - h} width={bw * 0.7} height={Math.max(h, d.value > 0 ? 1 : 0)} rx={Math.min(3, bw * 0.15)} fill={highlightLast && i !== data.length - 1 ? "#a3a3a3" : color}>
              <title>{d.title ?? `${d.label}: ${money ? pesoShort(d.value) : num(d.value)}`}</title>
            </rect>
            {i % every === 0 || i === data.length - 1 ? (
              <text x={L + i * bw + bw / 2} y={H - 8} textAnchor="middle" fontSize={data.length > 10 ? 9.5 : 10.5} fill="#6b6b6b">{d.label}</text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

/** Small area line like the "transaction history" sparkline on explorer home pages. */
export function Spark({ data, ariaLabel }: { data: Pt[]; ariaLabel: string }) {
  const W = 260, H = 64, P = 4;
  const max = Math.max(...data.map((d) => d.value), 1);
  const step = (W - 2 * P) / Math.max(data.length - 1, 1);
  const pts = data.map((d, i) => [P + i * step, H - P - (d.value / max) * (H - 2 * P - 12)] as const);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-16 w-full" role="img" aria-label={ariaLabel}>
      <path d={`${line} L${W - P},${H - P} L${P},${H - P} Z`} fill="#111111" opacity="0.08" />
      <path d={line} fill="none" stroke="#111111" strokeWidth="1.6" />
      {data.length ? <text x={P} y={H - 1} fontSize="9" fill="#6b6b6b">{data[0].label}</text> : null}
      {data.length ? <text x={W - P} y={H - 1} fontSize="9" fill="#6b6b6b" textAnchor="end">{data[data.length - 1].label}</text> : null}
    </svg>
  );
}

/** Horizontal stacked bar for stage comparisons (e.g. GAA vs disbursed). */
export function HBar({ value, max, color = "#111111" }: { value: number; max: number; color?: string }) {
  const w = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <span className="block h-2 w-full overflow-hidden rounded-full bg-line">
      <span className="block h-full rounded-full" style={{ width: `${w}%`, background: color }} />
    </span>
  );
}
