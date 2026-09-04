export type MatrimonialStatus = "pending" | "approved" | "rejected";
export type MatrimonialPaymentStatus = "pending" | "received" | "verified" | "rejected";

export interface MatrimonialProfile {
  id: string;
  name: string;
  gender: string;
  age: string;
  city: string;
  education: string;
  profession: string;
  familyBackground: string;
  contact: string;
  requirements: string;
  photoUrl: string; // base64 photo
  paymentProofUrl: string; // base64 payment proof receipt
  additionalPhotos?: string[];
  status: MatrimonialStatus;
  paymentStatus: MatrimonialPaymentStatus;
  createdAt: string;
  updatedAt: string;
  adminNote?: string;
  showOnPortal?: boolean;
  isFeatured?: boolean;
  packageId: string;
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
  return { data: res.profiles as MatrimonialProfile[], total: res.pagination.total, totalPages: res.pagination.totalPages };
}

export async function createMatrimonial(data: Omit<MatrimonialProfile, "id" | "createdAt" | "updatedAt" | "status" | "paymentStatus">) {
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
