import { apiClient } from "./apiClient";

export interface LeadershipProfile {
  id: string;
  memberId?: string | null;
  name: string;
  role: string;
  city: string;
  tier?: number;
  category: string;
  image?: string;
  period?: string;
  description?: string;
}

export interface LeadershipMemberOption {
  id: string;
  memberNo: string;
  fullName: string;
  city: string;
  photoUrl?: string | null;
  occupation?: string | null;
  designation?: string | null;
  membershipType?: string | null;
}

export interface MessageAttribute {
  label: string;
  value: string;
}

export interface LeadershipMessageData {
  name: string;
  body: string;
  photo?: string;
  attributes?: MessageAttribute[];
}

export async function fetchLeadershipProfiles(): Promise<LeadershipProfile[]> {
  return apiClient("/leadership/profiles") as Promise<LeadershipProfile[]>;
}

export async function searchLeadershipMembers(query: string): Promise<LeadershipMemberOption[]> {
  const q = query.trim();
  if (!q) return [];
  const result = await apiClient<{ members: LeadershipMemberOption[] }>(`/leadership/member-options?q=${encodeURIComponent(q)}`);
  return result.members || [];
}

export async function createLeadershipProfile(data: Partial<LeadershipProfile> | Partial<LeadershipProfile>[]) {
  return apiClient("/leadership/profiles", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function updateLeadershipProfile(id: string, data: Partial<LeadershipProfile>) {
  return apiClient(`/leadership/profiles/${id}`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export async function deleteLeadershipProfile(id: string) {
  return apiClient(`/leadership/profiles/${id}`, {
    method: "DELETE"
  });
}

export async function fetchLeadershipMessages(): Promise<(LeadershipMessageData & { type: string })[]> {
  return apiClient("/leadership/messages") as Promise<(LeadershipMessageData & { type: string })[]>;
}

export async function updateLeadershipMessage(type: "president" | "secretary", data: Partial<LeadershipMessageData>) {
  return apiClient(`/leadership/messages/${type}`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

// Deprecated local-storage compatibility exports. Leadership is database-driven.
export function getLeadershipProfiles(): LeadershipProfile[] { return []; }
export function saveLeadershipProfiles(_profiles: LeadershipProfile[]) {}
export function getPresidentMessage(): LeadershipMessageData { return { name: "President", body: "" }; }
export function savePresidentMessage(_data: LeadershipMessageData) {}
export function getSecretaryMessage(): LeadershipMessageData { return { name: "Secretary", body: "" }; }
export function saveSecretaryMessage(_data: LeadershipMessageData) {}
