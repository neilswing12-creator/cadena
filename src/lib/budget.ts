/** Kind of GAA department, for the small badge next to agencies. */
export function deptKind(id: string): { label: string; cls: string } {
  if (id === "01") return { label: "Legislative", cls: "badge-info" };
  if (id === "29") return { label: "Judiciary", cls: "badge-info" };
  if (["30", "31", "32", "33", "34"].includes(id)) return { label: "Constitutional", cls: "badge-warn" };
  if (id === "04") return { label: "Automatic", cls: "badge-mute" };
  if (id === "35") return { label: "Gov't corporations", cls: "badge-mute" };
  if (id === "36") return { label: "LGU allocation", cls: "badge-mute" };
  if (id === "08") return { label: "State universities", cls: "badge-ok" };
  return { label: "Executive", cls: "badge-mute" };
}

/** Short department name: "Department of Education (DepEd)" → "Dept. of Education (DepEd)". */
export const deptShort = (s: string) => s.replace(/^Department of /, "Dept. of ");

export const ISLAND: Record<string, "Luzon" | "Visayas" | "Mindanao"> = {
  "100000000": "Luzon", "200000000": "Luzon", "300000000": "Luzon", "400000000": "Luzon", "500000000": "Luzon",
  "1300000000": "Luzon", "1400000000": "Luzon", "1700000000": "Luzon",
  "600000000": "Visayas", "700000000": "Visayas", "800000000": "Visayas", "1800000000": "Visayas",
  "900000000": "Mindanao", "1000000000": "Mindanao", "1100000000": "Mindanao", "1200000000": "Mindanao", "1600000000": "Mindanao", "1900000000": "Mindanao",
};

/** Cities are named "City of X" or "X City" in PSGC. */
export const isCity = (name: string) => /\bcity\b/i.test(name);
