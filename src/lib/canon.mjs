// Shared by the importer and the web app. Keep these functions stable:
// record IDs and fingerprints are derived from them.

/**
 * The exact string that is hashed (SHA-256) to fingerprint a source row.
 * @param {"philgeps"|"dpwh"} dataset
 * @param {unknown[]} row  the row exactly as it appears in the source file
 * @param {number} dup     0, or n for the n-th identical copy of the same row
 */
export function fingerprintInput(dataset, row, dup) {
  return JSON.stringify(dup ? [dataset, ...row, dup] : [dataset, ...row]);
}

/** Display name: drops DPWH's trailing contractor code "(12345)" and extra spaces. */
export function cleanName(s) {
  return String(s).trim().replace(/\s*\(\d{3,}\)\s*$/, "").replace(/\s+/g, " ");
}

/** DPWH's own contractor code, e.g. "UKC BUILDERS, INC. (10759)" → "10759". */
export function dpwhCode(s) {
  const m = String(s).match(/\((\d{3,})\)\s*$/);
  return m ? m[1] : null;
}

/**
 * Grouping key for contractor names. Only spelling noise is removed
 * (case, punctuation, "&" vs "AND", "(FORMERLY: …)" notes). Different legal
 * names stay separate.
 */
export function nameKey(s) {
  return cleanName(s)
    .toUpperCase()
    .replace(/\((FORMERLY|FOR|FKA|FORMERLY KNOWN AS)\b[^)]*\)/g, " ")
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9Ñ]+/g, " ")
    .trim();
}
