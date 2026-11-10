"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, RotateCcw } from "lucide-react";

// Small SHA-256 so the demo also works where crypto.subtle is unavailable (plain http on a LAN address).
function sha256(msg: string): string {
  const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const bytes = new TextEncoder().encode(msg);
  const l = bytes.length, n = (((l + 9) >> 6) + 1) << 4, w = new Uint32Array(n);
  for (let i = 0; i < l; i++) w[i >> 2] |= bytes[i] << (24 - (i % 4) * 8);
  w[l >> 2] |= 0x80 << (24 - (l % 4) * 8);
  w[n - 1] = l * 8; w[n - 2] = Math.floor((l * 8) / 2 ** 32);
  let [a, b, c, d, e, f, g, h] = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const H = [a, b, c, d, e, f, g, h], W = new Uint32Array(64), r = (x: number, k: number) => (x >>> k) | (x << (32 - k));
  for (let i = 0; i < n; i += 16) {
    for (let t = 0; t < 64; t++) {
      W[t] = t < 16 ? w[i + t] : (r(W[t - 2], 17) ^ r(W[t - 2], 19) ^ (W[t - 2] >>> 10)) + W[t - 7] + (r(W[t - 15], 7) ^ r(W[t - 15], 18) ^ (W[t - 15] >>> 3)) + W[t - 16];
    }
    [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t++) {
      const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[t] + W[t]) >>> 0;
      const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  return H.map((x) => x.toString(16).padStart(8, "0")).join("");
}

type Props = {
  row: unknown[]; dup: number; leaf: string;
  proof: { hash: string; side: "left" | "right" }[];
  block: { height: number; date: string; prev_hash: string; merkle_root: string; hash: string; tx_count: number };
  nextPrev: string | null; blocksAfter: number;
};

const shortH = (s: string) => `${s.slice(0, 10)}…${s.slice(-6)}`;

export function TamperTest({ row, dup, leaf, proof, block, nextPrev, blocksAfter }: Props) {
  const original = row[6] as number | null;
  const [amount, setAmount] = useState(original == null ? "" : String(original));
  const [res, setRes] = useState<{ leaf: string; root: string; hash: string } | null>(null);

  useEffect(() => {
    const v = amount.trim() === "" ? null : Number(amount);
    const edited = [...row];
    edited[6] = v != null && Number.isFinite(v) ? v : amount;
    const input = JSON.stringify(dup ? ["philgeps", ...edited, dup] : ["philgeps", ...edited]);
    const l = sha256(input);
    let node = l;
    for (const p of proof) node = p.side === "left" ? sha256(p.hash + node) : sha256(node + p.hash);
    const hash = sha256(JSON.stringify(["pisoscan-demo", block.height, block.date, block.prev_hash, node, block.tx_count]));
    setRes({ leaf: l, root: node, hash });
  }, [amount, row, dup, proof, block]);

  const changed = res && res.leaf !== leaf;
  const step = (label: string, now: string | undefined, stored: string) => {
    const ok = now === stored;
    return (
      <li className={`rounded-md border p-3 ${ok ? "border-line" : "border-bad/40 bg-bad-soft"}`}>
        <div className="flex items-center justify-between gap-2 text-sm font-medium">{label}{ok ? <span className="badge badge-ok"><CheckCircle2 size={12} /> matches</span> : <span className="badge badge-bad"><AlertTriangle size={12} /> changed</span>}</div>
        <div className="mt-1 grid gap-0.5 font-mono text-xs">
          <span className="text-ink-mute">stored&nbsp;&nbsp; {shortH(stored)}</span>
          <span className={ok ? "text-ink-mute" : "text-bad"}>now&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {now ? shortH(now) : "…"}</span>
        </div>
      </li>
    );
  };

  return (
    <section className="card">
      <div className="card-h"><h2 className="card-t">Tamper test: try changing this record</h2><span className="badge badge-warn">Demo</span></div>
      <div className="space-y-4 p-4">
        <p className="text-sm text-ink-mute">Edit the amount as if someone quietly changed the record. Your browser re-hashes it and walks up the chain. Nothing is saved.</p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            <span className="mb-1 block text-ink-mute">Contract amount (₱)</span>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="input mono w-full max-w-60" />
          </label>
          <button type="button" className="btn" onClick={() => setAmount(original == null ? "" : String(original + 1))}>Add ₱1</button>
          <button type="button" className="btn" onClick={() => setAmount(original == null ? "" : String(original))}><RotateCcw size={14} /> Reset</button>
        </div>
        <ol className="grid gap-2 md:grid-cols-3">
          {step("1. Record fingerprint", res?.leaf, leaf)}
          {step("2. Block Merkle root", res?.root, block.merkle_root)}
          {step(`3. Block #${block.height} hash`, res?.hash, block.hash)}
        </ol>
        <div className={`rounded-md border p-3 text-sm ${changed ? "border-bad/40 bg-bad-soft" : "border-ok/30 bg-ok-soft"}`}>
          {changed ? (
            <><strong className="font-medium">Chain broken.</strong> {nextPrev ? <>Block #{block.height + 1} still points to <span className="font-mono text-xs">{shortH(nextPrev)}</span>, which no longer matches. </> : null}
              Hiding the edit would mean recomputing this block{blocksAfter ? <> and all {blocksAfter.toLocaleString("en-PH")} blocks after it</> : null}, and every independent copy of the chain would still disagree.</>
          ) : (
            <><strong className="font-medium">Chain intact.</strong> The record matches its fingerprint, so the block and every block after it still line up.</>
          )}
        </div>
      </div>
    </section>
  );
}
