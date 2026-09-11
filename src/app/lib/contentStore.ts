import { apiClient } from "./apiClient";

export type ContentStatus = "draft" | "published" | "rejected";

export interface NewsItem {
  id: string;
  type: string;
  title: string;
  date: string;
  category: string;
  body: string;
  status: ContentStatus;
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EventItem {
  id: string;
  type: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  category: string;
  desc: string; // mapped from body
  status: ContentStatus;
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  hasMore: boolean;
  page: number;
  totalPages: number;
}

export const statusColors: Record<ContentStatus, { bg: string; text: string; label: string }> = {
  published: { bg: "#dcfce7", text: "#15803d", label: "Published" },
  draft:     { bg: "#fef9c3", text: "#854d0e", label: "Draft" },
  rejected:  { bg: "#fee2e2", text: "#b91c1c", label: "Rejected" },
};

export async function fetchAllContent(type: "news" | "event", page: number = 1, limit: number = 10, includeDrafts: boolean = false) {
  const endpoint = includeDrafts ? `/content?type=${type}&page=${page}&limit=${limit}` : `/content/published?type=${type}&page=${page}&limit=${limit}`;
  const res = (await apiClient(endpoint)) as any;

  const mapped = (res.content || []).map((item: any) => ({
    ...item,
    desc: item.type === "event" ? item.body : undefined,
  }));

  const total = Number(res.pagination?.total || 0);
  const totalPages = Number(res.pagination?.totalPages || (total ? Math.ceil(total / limit) : 0));
  return {
    data: mapped,
    total,
    totalPages,
    hasMore: page < totalPages,
    page
  };
}


export type PublicContentType = "news" | "event";

export async function fetchPublishedContentAll(type: PublicContentType, maxPages: number = 20): Promise<(NewsItem | EventItem)[]> {
  const results: (NewsItem | EventItem)[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const res = await fetchAllContent(type, page, 50, false);
    results.push(...(res.data as (NewsItem | EventItem)[]));
    if (!res.hasMore) break;
  }
  return results;
}

export async function fetchPublishedContentHub(): Promise<(NewsItem | EventItem)[]> {
  const [news, events] = await Promise.all([fetchPublishedContentAll("news"), fetchPublishedContentAll("event")]);
  return [...news, ...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function createContent(data: any) {
  const payload = { ...data };
  if (data.type === "event" && data.desc) {
    payload.body = data.desc;
    delete payload.desc;
  }
  return apiClient("/content", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateContent(id: string, partial: any) {
  const payload = { ...partial };
  if (payload.desc !== undefined) {
    payload.body = payload.desc;
    delete payload.desc;
  }
  return apiClient(`/content/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function deleteContent(id: string) {
  return apiClient(`/content/${id}`, { method: "DELETE" });
}

export function getNews(): NewsItem[] { return []; }
export function getEvents(): EventItem[] { return []; }

// Local pagination is used by the Admin and public News screens after they load
// a bounded working set from the API. The previous placeholder returned every
// item and always reported one page, so Prev/Next never actually paged anything.
export function paginateData<T>(items: T[], page: number = 1, limit: number = 10): PaginatedResult<T> {
  const safeLimit = Math.max(1, Number(limit) || 10);
  const total = items.length;
  const totalPages = total ? Math.ceil(total / safeLimit) : 0;
  const safePage = totalPages ? Math.min(Math.max(1, Number(page) || 1), totalPages) : 1;
  const start = (safePage - 1) * safeLimit;
  return {
    data: items.slice(start, start + safeLimit),
    total,
    hasMore: safePage < totalPages,
    page: safePage,
    totalPages,
  };
}
