import { normalizeSearchText, smartSearchMatch, smartSearchScore, smartSearchSort } from "./smartSearch";

export function normalizeSearch(value: unknown) {
  return normalizeSearchText(value);
}

export function fuzzySearch(values: unknown[] | unknown, query: string) {
  const list = Array.isArray(values) ? values : [values];
  return smartSearchMatch(list, query);
}

export { smartSearchMatch, smartSearchScore, smartSearchSort };
