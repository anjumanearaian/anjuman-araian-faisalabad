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

export interface MediaAlbum {
  key: string;
  title: string;
  date: string;
  caption: string;
  coverUrl: string;
  photos: MediaItem[];
  videos: MediaItem[];
  items: MediaItem[];
}

function albumKeyPart(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function mediaAlbumKey(item: Pick<MediaItem, "title" | "date">) {
  return `${albumKeyPart(item.title) || "untitled"}__${String(item.date || "").slice(0, 10)}`;
}

export function groupMediaIntoAlbums(items: MediaItem[]): MediaAlbum[] {
  const grouped = new Map<string, MediaAlbum>();
  for (const item of items) {
    const key = mediaAlbumKey(item);
    let album = grouped.get(key);
    if (!album) {
      album = {
        key,
        title: item.title || "Untitled Event",
        date: item.date,
        caption: item.caption || "",
        coverUrl: "",
        photos: [],
        videos: [],
        items: [],
      };
      grouped.set(key, album);
    }
    album.items.push(item);
    if (!album.caption && item.caption) album.caption = item.caption;
    if (item.type === "video") album.videos.push(item);
    else album.photos.push(item);
  }

  for (const album of grouped.values()) {
    album.photos.sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
    album.videos.sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
    album.coverUrl = album.photos[0]?.url || album.videos[0]?.url || "";
  }

  return Array.from(grouped.values()).sort((a, b) => {
    const byDate = String(b.date).localeCompare(String(a.date));
    if (byDate) return byDate;
    return a.title.localeCompare(b.title);
  });
}

export async function fetchMediaAlbums() {
  const all: MediaItem[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore && page <= 100) {
    const batch = await fetchMediaGallery(page, 100);
    all.push(...batch.data);
    hasMore = batch.hasMore;
    page += 1;
  }
  return groupMediaIntoAlbums(all);
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
