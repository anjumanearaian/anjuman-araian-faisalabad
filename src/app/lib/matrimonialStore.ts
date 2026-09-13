export type MatrimonialStatus = "pending" | "approved" | "rejected";
export type MatrimonialPaymentStatus = "pending" | "received" | "verified" | "rejected" | "submitted";
export type MatchRequestStatus = "pending_admin" | "awaiting_target" | "accepted" | "declined" | "rejected" | "closed";

export interface MatrimonialProfile {
  id: string;
  profileCode?: string;
  name?: string;
  gender: string;
  age: string;
  city: string;
  country?: string;
  province?: string;
  dateOfBirth?: string;
  heightCm?: number | null;
  maritalStatus?: string;
  nationality?: string;
  residenceStatus?: string;
  employmentType?: string;
  employerType?: string;
  incomeBand?: string;
  currency?: string;
  education: string;
  profession: string;
  familyBackground?: string;
  contact?: string;
  requirements?: string;
  photoUrl?: string;
  paymentProofUrl?: string;
  additionalPhotos?: string[];
  status?: MatrimonialStatus;
  paymentStatus?: MatrimonialPaymentStatus;
  createdAt: string;
  updatedAt?: string;
  adminNote?: string;
  showOnPortal?: boolean;
  isFeatured?: boolean;
  applicantType?: string;
  feeAmount?: number;
  relationToCandidate?: string;
  profileData?: Record<string, any>;
  preferenceData?: Record<string, any>;
  privacyData?: Record<string, any>;
  verificationStatus?: string;
  candidateConsent?: boolean;
  candidateConsentAt?: string | null;
  applicationSource?: string;
  profileCompleteness?: number;
  isActive?: boolean;
  mutualScore?: number;
  requesterToTargetScore?: number;
  targetToRequesterScore?: number;
  scoreConfidence?: number;
  eligible?: boolean;
  breakdown?: Record<string, any>;
}

export interface MatchRequestView {
  id: string;
  direction: "incoming" | "outgoing";
  status: MatchRequestStatus;
  requesterMessage?: string;
  requesterProfileId?: string;
  targetProfileId?: string;
  counterpart: MatrimonialProfile;
  mutualScore?: number | null;
  requesterToTargetScore?: number | null;
  targetToRequesterScore?: number | null;
  scoreConfidence?: number | null;
  createdAt: string;
  adminApprovedAt?: string | null;
  targetRespondedAt?: string | null;
  contactReleasedAt?: string | null;
  photoReleasedAt?: string | null;
}

export interface MatrimonialPublicStats {
  total: number;
  pakistan: number;
  overseas: number;
  verified: number;
  privacy: string;
}

import { apiClient } from "./apiClient";

export const matrimonialStatusColors: Record<MatrimonialStatus, { bg: string; text: string; label: string }> = {
  pending:  { bg: "#fef9c3", text: "#854d0e", label: "Pending Review" },
  approved: { bg: "#dcfce7", text: "#15803d", label: "Approved" },
  rejected: { bg: "#fee2e2", text: "#b91c1c", label: "Rejected" }
};

export async function fetchAllMatrimonials(page: number = 1, limit: number = 10) {
  const res = (await apiClient(`/matrimonial?page=${page}&limit=${limit}`)) as any;
  return { data: (res.profiles || []) as MatrimonialProfile[], total: res.pagination?.total || 0, totalPages: res.pagination?.totalPages || 0 };
}

export async function fetchPublicMatrimonialStats() {
  return apiClient<MatrimonialPublicStats>("/matrimonial/public-stats");
}

export async function fetchMyMatrimonialProfiles() {
  const res = await apiClient<{ profiles: MatrimonialProfile[]; profile?: MatrimonialProfile | null }>("/matrimonial/mine");
  return res.profiles || [];
}

export async function createMatrimonial(data: Record<string, unknown>) {
  return apiClient<MatrimonialProfile>("/matrimonial/submit", { method: "POST", body: JSON.stringify(data) });
}

export async function createMatrimonialAdmin(data: Record<string, unknown>) {
  return apiClient<MatrimonialProfile>("/matrimonial/admin", { method: "POST", body: JSON.stringify(data) });
}

export async function updateMyMatrimonial(id: string, data: Record<string, unknown>) {
  return apiClient<MatrimonialProfile>(`/matrimonial/mine/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function updateMatrimonialStatus(id: string, status: MatrimonialStatus, paymentStatus?: MatrimonialPaymentStatus, adminNote?: string, verificationStatus?: string) {
  return apiClient<MatrimonialProfile>(`/matrimonial/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, paymentStatus, adminNote, verificationStatus }) });
}

export async function updateMatrimonial(id: string, partial: Partial<MatrimonialProfile>) {
  return apiClient<MatrimonialProfile>(`/matrimonial/${id}`, { method: "PUT", body: JSON.stringify(partial) });
}

export async function deleteMatrimonial(id: string) {
  return apiClient(`/matrimonial/${id}`, { method: "DELETE" });
}

export async function fetchMatrimonialMatches(profileId: string) {
  const res = await apiClient<{ profile: MatrimonialProfile; matches: MatrimonialProfile[] }>(`/matrimonial/matches?profileId=${encodeURIComponent(profileId)}`);
  return res;
}

export async function requestMatrimonialMatch(requesterProfileId: string, targetProfileId: string, requesterMessage?: string) {
  return apiClient<{ id: string; status: MatchRequestStatus; target: MatrimonialProfile; mutualScore?: number }>("/matrimonial/match-requests", {
    method: "POST",
    body: JSON.stringify({ requesterProfileId, targetProfileId, requesterMessage }),
  });
}

export async function fetchMyMatchRequests() {
  const res = await apiClient<{ requests: MatchRequestView[] }>("/matrimonial/match-requests/mine");
  return res.requests || [];
}

export async function respondToMatchRequest(id: string, decision: "accept" | "decline") {
  return apiClient(`/matrimonial/match-requests/${id}/respond`, { method: "PATCH", body: JSON.stringify({ decision }) });
}

export async function fetchAdminMatchRequests() {
  const res = await apiClient<{ requests: any[] }>("/matrimonial/match-requests/admin/all");
  return res.requests || [];
}

export async function adminReviewMatchRequest(id: string, action: "forward" | "reject" | "close", adminNote?: string) {
  return apiClient(`/matrimonial/match-requests/${id}/admin`, { method: "PATCH", body: JSON.stringify({ action, adminNote }) });
}

export async function fetchMatrimonialAudit(id: string) {
  const res = await apiClient<{ audit: any[] }>(`/matrimonial/${id}/audit`);
  return res.audit || [];
}

export async function fetchMatrimonialManager() {
  return apiClient<any>("/matrimonial/manager");
}
