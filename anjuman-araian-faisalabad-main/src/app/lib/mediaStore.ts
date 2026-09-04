import { apiClient } from "./apiClient";

export interface MediaItem {
  id: string;
  title: string;
  date: string;
  type: "photo" | "video";
  url: string;
  caption: string;
  createdAt?: string;
}

export async function fetchMediaGallery(page: number = 1, limit: number = 24, type?: string) {
  let endpoint = `/media?page=${page}&limit=${limit}`;
  if (type) endpoint += `&type=${type}`;
  
  const res = (await apiClient(endpoint)) as any;
  return {
    data: res.media as MediaItem[],
    total: res.pagination.total,
    totalPages: res.pagination.totalPages,
    hasMore: res.pagination.hasMore,
    page
  };
}

export async function createMedia(data: Partial<MediaItem> | Partial<MediaItem>[]) {
  return apiClient("/media", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function updateMedia(id: string, data: Partial<MediaItem>) {
  return apiClient(`/media/${id}`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export async function deleteMedia(id: string) {
  return apiClient(`/media/${id}`, {
    method: "DELETE"
  });
}

// Deprecated local storage methods
export function getMediaGallery(): MediaItem[] { return []; }
export function saveMediaGallery(items: MediaItem[]) {}
