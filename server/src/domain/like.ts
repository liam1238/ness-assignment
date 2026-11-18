/**
 * Escape \, %, and _ for use in ILIKE ... ESCAPE '\'
 * Then wrap in % for substring search.
 */
export function buildTitleSearchPattern(q: string): string {
  let escaped = "";
  for (const ch of q) {
    if (ch === "\\" || ch === "%" || ch === "_") {
      escaped += "\\" + ch;
    } else {
      escaped += ch;
    }
  }
  return `%${escaped}%`;
}