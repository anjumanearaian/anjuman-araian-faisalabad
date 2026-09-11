export function stripHtml(html: string): string {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(value: string): string {
  const latin = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return latin || "update";
}

export function contentDetailPath(item: { id: string; title: string }): string {
  return `/updates/${encodeURIComponent(item.id)}/${slugify(item.title)}`;
}

export function excerptFromHtml(html: string, maxLength = 180): string {
  const text = stripHtml(html);
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}…` : text;
}
