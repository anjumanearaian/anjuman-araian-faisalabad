export function normalizeSearchText(value: unknown) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(dr|doctor|mr|mrs|ms|mian|ch|chaudhry|rana|prof|professor)\.?\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function editDistanceWithin(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return false;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMinimum = current[0];
    for (let j = 1; j <= b.length; j++) {
      const value = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      current[j] = value;
      rowMinimum = Math.min(rowMinimum, value);
    }
    if (rowMinimum > max) return false;
    previous = current;
  }
  return previous[b.length] <= max;
}

function tokenScore(needle: string, token: string) {
  if (!needle || !token) return -1;
  if (token === needle) return 100;
  if (token.startsWith(needle)) return 82;
  if (token.includes(needle)) return 66;
  if (needle.length >= 3) {
    const max = needle.length <= 4 ? 1 : needle.length <= 7 ? 2 : 3;
    if (editDistanceWithin(needle, token, max)) return 40;
  }
  return -1;
}

export function smartSearchScore(values: unknown[], query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return 1;

  const normalizedValues = values.map(normalizeSearchText).filter(Boolean);
  const combined = normalizedValues.join(" ");
  const tokens = combined.split(" ").filter(Boolean);
  const terms = normalizedQuery.split(" ").filter(Boolean);

  let score = 0;
  if (combined === normalizedQuery) score += 500;
  else if (combined.startsWith(normalizedQuery)) score += 240;
  else if (combined.includes(normalizedQuery)) score += 160;

  for (const term of terms) {
    let best = -1;
    for (const token of tokens) best = Math.max(best, tokenScore(term, token));
    if (best < 0) return -1;
    score += best;
  }

  return score;
}

export function smartSearchMatch(values: unknown[], query: string) {
  return smartSearchScore(values, query) >= 0;
}

export function smartSearchSort<T>(items: T[], query: string, values: (item: T) => unknown[], alpha: (item: T) => string) {
  const normalizedQuery = normalizeSearchText(query);
  return [...items]
    .map((item) => ({ item, score: smartSearchScore(values(item), normalizedQuery) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => {
      if (normalizedQuery && b.score !== a.score) return b.score - a.score;
      return alpha(a.item).localeCompare(alpha(b.item), undefined, { sensitivity: "base" });
    })
    .map((entry) => entry.item);
}
