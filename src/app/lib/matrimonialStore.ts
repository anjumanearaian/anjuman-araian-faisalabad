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
  packageId?: string;
  applicantType?: string;
  feeAmount?: number;
  relationToCandidate?: string;
}

export interface MatchRequestView {
  id: string;
  direction: "incoming" | "outgoing";
  status: MatchRequestStatus;
  requesterMessage?: string;
  counterpart: MatrimonialProfile;
  createdAt: string;
  adminApprovedAt?: string | null;
  targetRespondedAt?: string | null;
  contactReleasedAt?: string | null;
}

import { apiClient } from "./apiClient";

export const matrimonialStatusColors: Record<MatrimonialStatus, { bg: string; text: string; label: string }> = {
  pending:  { bg: "#fef9c3", text: "#854d0e", label: "Pending Review" },
  approved: { bg: "#dcfce7", text: "#15803d", label: "Approved" },
  rejected: { bg: "#fee2e2", text: "#b91c1c", label: "Rejected" }
};

export async function fetchAllMatrimonials(page: number = 1, limit: number = 10, includePending: boolean = false) {
  const endpoint = includePending ? `/matrimonial?page=${page}&limit=${limit}` : `/matrimonial/published?page=${page}&limit=${limit}`;
  const res = (await apiClient(endpoint)) as any;
  return { data: (res.profiles || []) as MatrimonialProfile[], total: res.pagination?.total || 0, totalPages: res.pagination?.totalPages || 0 };
}

export async function createMatrimonial(data: Record<string, unknown>) {
  return apiClient("/matrimonial/submit", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateMatrimonialStatus(id: string, status: MatrimonialStatus, paymentStatus?: MatrimonialPaymentStatus, adminNote?: string) {
  return apiClient(`/matrimonial/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, paymentStatus, adminNote }),
  });
}

export async function updateMatrimonial(id: string, partial: Partial<MatrimonialProfile>) {
  return apiClient(`/matrimonial/${id}`, {
    method: "PUT",
    body: JSON.stringify(partial),
  });
}

export async function deleteMatrimonial(id: string) {
  return apiClient(`/matrimonial/${id}`, {
    method: "DELETE",
  });
}

export async function requestMatrimonialMatch(targetProfileId: string, requesterMessage?: string) {
  return apiClient<{ id: string; status: MatchRequestStatus; target: MatrimonialProfile }>("/matrimonial/match-requests", {
    method: "POST",
    body: JSON.stringify({ targetProfileId, requesterMessage }),
  });
}

export async function fetchMyMatchRequests() {
  const res = await apiClient<{ requests: MatchRequestView[] }>("/matrimonial/match-requests/mine");
  return res.requests || [];
}

export async function respondToMatchRequest(id: string, decision: "accept" | "decline") {
  return apiClient(`/matrimonial/match-requests/${id}/respond`, {
    method: "PATCH",
    body: JSON.stringify({ decision }),
  });
}

export async function fetchAdminMatchRequests() {
  const res = await apiClient<{ requests: any[] }>("/matrimonial/match-requests/admin/all");
  return res.requests || [];
}

export async function adminReviewMatchRequest(id: string, action: "forward" | "reject" | "close", adminNote?: string) {
  return apiClient(`/matrimonial/match-requests/${id}/admin`, {
    method: "PATCH",
    body: JSON.stringify({ action, adminNote }),
  });
}
