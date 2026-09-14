import { apiClient } from "./apiClient";
import { normalizeMatrimonialDisplay, normalizeMatrimonialPayload, normalizeMatrimonialReference } from "./displayFormat";

export type MatrimonialStatus = "pending" | "approved" | "rejected";
export type MatrimonialPaymentStatus = "pending" | "received" | "verified" | "rejected" | "submitted";
export type MatchRequestStatus = "pending_admin" | "awaiting_target" | "accepted" | "declined" | "rejected" | "closed";

export interface MatrimonialReference {
  name: string;
  profession: string;
  phone: string;
  city: string;
  address: string;
  isMember?: boolean;
  memberId?: string | null;
  memberNo?: string | null;
  memberName?: string | null;
  memberPhone?: string | null;
  memberCity?: string | null;
  memberVerified?: boolean;
  verifiedAt?: string | null;
}

export interface MatrimonialProfile {
  id: string;
  profileCode?: string;
  name?: string;
  email?: string;
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
  lastProfileEmailAt?: string | null;
  lastMatchNotificationAt?: string | null;
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

function normalizeProfile<T extends MatrimonialProfile | null | undefined>(profile: T): T {
  return profile ? normalizeMatrimonialDisplay(profile as any) as T : profile;
}

function normalizeMatchRequest<T extends MatchRequestView>(request: T): T {
  return { ...request, counterpart: normalizeProfile(request.counterpart) } as T;
}

function normalizeAdminRequest(request: any) {
  if (!request || typeof request !== "object") return request;
  return {
    ...request,
    counterpart: request.counterpart ? normalizeProfile(request.counterpart) : request.counterpart,
    requester: request.requester ? normalizeProfile(request.requester) : request.requester,
    target: request.target ? normalizeProfile(request.target) : request.target,
    requesterProfile: request.requesterProfile ? normalizeProfile(request.requesterProfile) : request.requesterProfile,
    targetProfile: request.targetProfile ? normalizeProfile(request.targetProfile) : request.targetProfile,
  };
}

function emitSaved(profile: MatrimonialProfile, source: "admin" | "self") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("araian-matrimonial-profile-saved", { detail: { profile, source } }));
}

export const matrimonialStatusColors: Record<MatrimonialStatus, { bg: string; text: string; label: string }> = {
  pending:  { bg: "#fef9c3", text: "#854d0e", label: "Pending Review" },
  approved: { bg: "#dcfce7", text: "#15803d", label: "Approved" },
  rejected: { bg: "#fee2e2", text: "#b91c1c", label: "Rejected" }
};

export async function fetchAllMatrimonials(page: number = 1, limit: number = 10) {
  const res = (await apiClient(`/matrimonial?page=${page}&limit=${limit}`)) as any;
  return { data: (res.profiles || []).map((profile: MatrimonialProfile) => normalizeProfile(profile)), total: res.pagination?.total || 0, totalPages: res.pagination?.totalPages || 0 };
}

export async function fetchPublicMatrimonialStats() {
  return apiClient<MatrimonialPublicStats>("/matrimonial/public-stats");
}

export async function claimMatrimonialProfilesByEmail() {
  return apiClient<{ claimed: number; profileIds: string[]; email?: string }>("/matrimonial-lifecycle", { method: "POST", body: JSON.stringify({ action: "claim_profile" }) });
}

export async function fetchMyMatrimonialProfiles() {
  await claimMatrimonialProfilesByEmail().catch(() => null);
  const res = await apiClient<{ profiles: MatrimonialProfile[]; profile?: MatrimonialProfile | null }>("/matrimonial/mine");
  return (res.profiles || []).map((profile) => normalizeProfile(profile));
}

export async function createMatrimonial(data: Record<string, unknown>) {
  const payload = normalizeMatrimonialPayload(data as Record<string, any>);
  const profile = normalizeProfile(await apiClient<MatrimonialProfile>("/matrimonial/submit", { method: "POST", body: JSON.stringify(payload) })) as MatrimonialProfile;
  emitSaved(profile, "self");
  return profile;
}

export async function createMatrimonialAdmin(data: Record<string, unknown>) {
  const payload = normalizeMatrimonialPayload(data as Record<string, any>);
  const profile = normalizeProfile(await apiClient<MatrimonialProfile>("/matrimonial/admin", { method: "POST", body: JSON.stringify(payload) })) as MatrimonialProfile;
  emitSaved(profile, "admin");
  return profile;
}

export async function updateMyMatrimonial(id: string, data: Record<string, unknown>) {
  const payload = normalizeMatrimonialPayload(data as Record<string, any>);
  const profile = normalizeProfile(await apiClient<MatrimonialProfile>(`/matrimonial/mine/${id}`, { method: "PUT", body: JSON.stringify(payload) })) as MatrimonialProfile;
  emitSaved(profile, "self");
  return profile;
}

export async function updateMatrimonialStatus(id: string, status: MatrimonialStatus, paymentStatus?: MatrimonialPaymentStatus, adminNote?: string, verificationStatus?: string) {
  return normalizeProfile(await apiClient<MatrimonialProfile>(`/matrimonial/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, paymentStatus, adminNote, verificationStatus }) })) as MatrimonialProfile;
}

export async function updateMatrimonial(id: string, partial: Partial<MatrimonialProfile>) {
  const payload = normalizeMatrimonialPayload(partial as Record<string, any>);
  const profile = normalizeProfile(await apiClient<MatrimonialProfile>(`/matrimonial/${id}`, { method: "PUT", body: JSON.stringify(payload) })) as MatrimonialProfile;
  if (typeof window !== "undefined" && window.location.pathname.includes("/admin/matrimonial/edit/")) emitSaved(profile, "admin");
  return profile;
}

export async function deleteMatrimonial(id: string) {
  return apiClient(`/matrimonial/${id}`, { method: "DELETE" });
}

export async function syncMatrimonialProfileLifecycle(profileId: string, email: string, references: MatrimonialReference[], sendProfileEmail = true) {
  const cleanReferences = references.map((reference) => normalizeMatrimonialReference(reference as any));
  const result = await apiClient<{ profile: MatrimonialProfile; references: MatrimonialReference[]; email: { sent: boolean; reason?: string }; matching: { checked: number; notifications: number } }>("/matrimonial-lifecycle", {
    method: "POST",
    body: JSON.stringify({ action: "sync_profile", profileId, email, references: cleanReferences, sendEmail: sendProfileEmail }),
  });
  return {
    ...result,
    profile: normalizeProfile(result.profile) as MatrimonialProfile,
    references: (result.references || []).map((reference) => normalizeMatrimonialReference(reference as any)) as MatrimonialReference[],
  };
}

export async function emailMatrimonialProfile(profileId: string) {
  return apiClient<{ email: { sent: boolean; reason?: string } }>("/matrimonial-lifecycle", { method: "POST", body: JSON.stringify({ action: "email_profile", profileId }) });
}

export async function fetchSuccessfulMatrimonialConnections() {
  const res = await apiClient<{ connections: any[] }>("/matrimonial-lifecycle?action=list_connections");
  return (res.connections || []).map(normalizeAdminRequest);
}

export async function completeMatrimonialConnection(data: { requestId: string; requesterRating?: number | null; targetRating?: number | null; managerRating: number; successNote?: string }) {
  return apiClient<{ connection: any; emails: Array<{ sent: boolean; reason?: string }> }>("/matrimonial-lifecycle", { method: "POST", body: JSON.stringify({ action: "complete_connection", ...data }) });
}

export async function fetchMatrimonialMatches(profileId: string) {
  const res = await apiClient<{ profile: MatrimonialProfile; matches: MatrimonialProfile[] }>(`/matrimonial/matches?profileId=${encodeURIComponent(profileId)}`);
  return { ...res, profile: normalizeProfile(res.profile) as MatrimonialProfile, matches: (res.matches || []).map((profile) => normalizeProfile(profile)) as MatrimonialProfile[] };
}

export async function requestMatrimonialMatch(requesterProfileId: string, targetProfileId: string, requesterMessage?: string) {
  const result = await apiClient<{ id: string; status: MatchRequestStatus; target: MatrimonialProfile; mutualScore?: number }>("/matrimonial/match-requests", {
    method: "POST",
    body: JSON.stringify({ requesterProfileId, targetProfileId, requesterMessage }),
  });
  return { ...result, target: normalizeProfile(result.target) as MatrimonialProfile };
}

export async function fetchMyMatchRequests() {
  const res = await apiClient<{ requests: MatchRequestView[] }>("/matrimonial/match-requests/mine");
  return (res.requests || []).map(normalizeMatchRequest);
}

export async function respondToMatchRequest(id: string, decision: "accept" | "decline") {
  return apiClient(`/matrimonial/match-requests/${id}/respond`, { method: "PATCH", body: JSON.stringify({ decision }) });
}

export async function fetchAdminMatchRequests() {
  const res = await apiClient<{ requests: any[] }>("/matrimonial/match-requests/admin/all");
  return (res.requests || []).map(normalizeAdminRequest);
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
