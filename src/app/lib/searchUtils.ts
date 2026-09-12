export function normalizeSearch(value: unknown) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function distanceWithin(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur: number[] = [i];
    let rowMin = cur[0];
    for (let j = 1; j <= b.length; j++) {
      const value = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur[j] = value;
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > max) return false;
    prev = cur;
  }
  return prev[b.length] <= max;
}

export function fuzzySearch(values: unknown[] | unknown, query: string) {
  const q = normalizeSearch(query);
  if (!q) return true;
  const list = Array.isArray(values) ? values : [values];
  const hay = normalizeSearch(list.filter(Boolean).join(" "));
  if (hay.includes(q)) return true;
  const hayTokens = hay.split(" ").filter(Boolean);
  return q.split(" ").filter(Boolean).every((needle) => {
    if (hayTokens.some((token) => token.includes(needle))) return true;
    if (needle.length < 3) return false;
    const max = needle.length <= 4 ? 1 : needle.length <= 7 ? 2 : 3;
    return hayTokens.some((token) => distanceWithin(needle, token, max));
  });
}
