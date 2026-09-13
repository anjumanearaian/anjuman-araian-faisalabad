export function normalizeSearchText(value: unknown) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactSearchText(value: unknown) {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

function numericSearchVariants(value: unknown) {
  const raw = String(value || "").replace(/\D/g, "");
  if (raw.length < 3) return [] as string[];
  const variants = new Set<string>([raw]);
  let phone = raw;
  if (phone.startsWith("0092")) phone = phone.slice(2);
  variants.add(phone);
  if (phone.startsWith("92") && phone.length > 4) {
    variants.add(`0${phone.slice(2)}`);
    variants.add(phone.slice(2));
  } else if (phone.startsWith("0") && phone.length > 4) {
    variants.add(`92${phone.slice(1)}`);
    variants.add(phone.slice(1));
  }
  return [...variants].filter((item) => item.length >= 3);
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
  if (/^[a-z]+$/.test(needle) && needle.length >= 3) {
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
  const compactCombined = values.map(compactSearchText).filter(Boolean).join(" ");
  const compactQuery = compactSearchText(query);
  const tokens = combined.split(" ").filter(Boolean);
  const terms = normalizedQuery.split(" ").filter(Boolean);

  let score = 0;
  if (combined === normalizedQuery) score += 500;
  else if (combined.startsWith(normalizedQuery)) score += 240;
  else if (combined.includes(normalizedQuery)) score += 160;

  if (compactQuery.length >= 3) {
    if (compactCombined === compactQuery) score += 220;
    else if (compactCombined.includes(compactQuery)) score += 120;
  }

  const queryNumbers = numericSearchVariants(query);
  let numericMatched = false;
  if (queryNumbers.length) {
    const valueNumbers = values.flatMap(numericSearchVariants);
    let numericScore = -1;
    for (const needle of queryNumbers) {
      for (const candidate of valueNumbers) {
        if (candidate === needle) numericScore = Math.max(numericScore, 180);
        else if (candidate.startsWith(needle)) numericScore = Math.max(numericScore, 145);
        else if (candidate.includes(needle)) numericScore = Math.max(numericScore, 115);
      }
    }
    if (numericScore >= 0) { score += numericScore; numericMatched = true; }
  }

  for (const term of terms) {
    if (/^\d+$/.test(term) && numericMatched) continue;
    let best = -1;
    for (const token of tokens) best = Math.max(best, tokenScore(term, token));
    if (best < 0) {
      // Compact ID/member-number matching may legitimately join punctuation-separated tokens.
      if (term.length >= 3 && compactCombined.includes(term)) best = 62;
      else return -1;
    }
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
    .map((item) => ({ item, score: smartSearchScore(values(item), query) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => {
      if (normalizedQuery && b.score !== a.score) return b.score - a.score;
      return alpha(a.item).localeCompare(alpha(b.item), undefined, { sensitivity: "base" });
    })
    .map((entry) => entry.item);
}
