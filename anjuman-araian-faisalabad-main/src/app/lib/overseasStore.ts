export interface OverseasChapter {
  id: string;
  country: string;
  flag: string;
  city: string;
  established: string;
  coordinator: string;
  phone: string;
  email: string;
  members: number;
}

import { apiClient } from "./apiClient";

export async function fetchOverseasChapters(): Promise<OverseasChapter[]> {
  return apiClient("/overseas") as Promise<OverseasChapter[]>;
}

export async function createOverseasChapter(data: Partial<OverseasChapter> | Partial<OverseasChapter>[]) {
  return apiClient("/overseas", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function updateOverseasChapter(id: string, data: Partial<OverseasChapter>) {
  return apiClient(`/overseas/${id}`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export async function deleteOverseasChapter(id: string) {
  return apiClient(`/overseas/${id}`, {
    method: "DELETE"
  });
}

// Deprecated local storage methods
export function getOverseasChapters(): OverseasChapter[] { return []; }
export function saveOverseasChapters(chapters: OverseasChapter[]) {}
