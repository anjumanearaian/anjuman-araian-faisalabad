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
  
  const mapped = res.content.map((item: any) => ({
    ...item,
    desc: item.type === "event" ? item.body : undefined,
  }));
  
  return { 
    data: mapped, 
    total: res.pagination.total, 
    totalPages: res.pagination.totalPages, 
    hasMore: page < res.pagination.totalPages, 
    page 
  };
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

// Deprecated synchronous fallbacks to prevent immediate crashes before components are fully updated
export function getNews(): NewsItem[] { return []; }
export function getEvents(): EventItem[] { return []; }
export function paginateData<T>(items: T[], page: number = 1, limit: number = 10): PaginatedResult<T> { 
  return { data: items, total: items.length, hasMore: false, page: 1, totalPages: 1 }; 
}
