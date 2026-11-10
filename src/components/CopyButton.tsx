"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        } catch {
          /* clipboard blocked: ignore */
        }
      }}
      className="shrink-0 rounded p-0.5 text-ink-faint hover:text-ink"
      aria-label={done ? "Copied" : "Copy to clipboard"}
      title={done ? "Copied" : "Copy"}
    >
      {done ? <Check size={13} className="text-ok" /> : <Copy size={13} />}
    </button>
  );
}
