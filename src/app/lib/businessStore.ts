export type BusinessStatus = "pending" | "approved" | "rejected";
export type PaymentStatus = "pending" | "submitted" | "received" | "verified" | "rejected";
export type SponsorshipPackage = "basic" | "premium" | "vip";

export interface Business {
  id: string;
  businessName: string;
  ownerName: string;
  category: string;
  city: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  socialLinks: string;
  logoUrl: string;
  description: string;
  productsServices: string;
  discountOffer: string;
  sponsorshipPackage: SponsorshipPackage;
  paymentProofUrl: string;
  additionalPhotos?: string[];
  status: BusinessStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  adminNote?: string;
}

export interface BusinessAuditRow {
  id: string;
  businessId: string;
  action: string;
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  beforeData?: Record<string, any> | null;
  afterData?: Record<string, any> | null;
  createdAt: string;
}

import { apiClient } from "./apiClient";

export const businessCategories = [
  "Agriculture and Farming",
  "Retail and Wholesale",
  "Technology and Software",
  "Real Estate and Construction",
  "Healthcare and Medical",
  "Education and Training",
  "Textiles and Clothing",
  "Food and Restaurants",
  "Professional Services",
  "Logistics and Transport",
  "Other"
];

export const sponsorshipPackages: Record<SponsorshipPackage, { name: string; price: string; benefits: string }> = {
  basic: {
    name: "Basic Listing",
    price: "Rs. 1,000 / year",
    benefits: "Standard business listing in the directory."
  },
  premium: {
    name: "Premium Listing",
    price: "Rs. 5,000 / year",
    benefits: "Featured on top, highlighted badge, social media shoutout."
  },
  vip: {
    name: "VIP Sponsor",
    price: "Rs. 15,000 / year",
    benefits: "Banner on Homepage, VIP badge, special newsletter inclusion."
  }
};

export const businessStatusColors: Record<BusinessStatus, { bg: string; text: string; label: string }> = {
  pending:  { bg: "#fef9c3", text: "#854d0e", label: "Pending Review" },
  approved: { bg: "#dcfce7", text: "#15803d", label: "Approved" },
  rejected: { bg: "#fee2e2", text: "#b91c1c", label: "Rejected" }
};

export const paymentStatusColors: Record<PaymentStatus, { bg: string; text: string; label: string }> = {
  pending:  { bg: "#fef9c3", text: "#854d0e", label: "Pending Receipt" },
  submitted: { bg: "#fff7ed", text: "#9a3412", label: "Receipt Submitted" },
  received: { bg: "#dbeafe", text: "#1e40af", label: "Received / Admin Checked" },
  verified: { bg: "#dcfce7", text: "#15803d", label: "Finance Verified" },
  rejected: { bg: "#fee2e2", text: "#b91c1c", label: "Payment Rejected" }
};

function cleanOptionalFields<T extends Record<string, any>>(data: T): T {
  const copy: Record<string, any> = { ...data };
  for (const key of ["logoUrl", "paymentProofUrl", "paymentSenderName", "paymentMethod", "paymentReference", "website", "email", "whatsapp", "socialLinks"]) {
    if (typeof copy[key] === "string" && !copy[key].trim()) {
      if (key === "website" || key === "email" || key === "whatsapp" || key === "socialLinks") copy[key] = "";
      else delete copy[key];
    }
  }
  return copy as T;
}

export async function fetchAllBusinesses(page: number = 1, limit: number = 10, includePending: boolean = false) {
  const endpoint = includePending ? `/businesses?page=${page}&limit=${limit}` : `/businesses/published?page=${page}&limit=${limit}`;
  const res = (await apiClient(endpoint)) as any;
  return { data: res.businesses as Business[], total: res.pagination.total, totalPages: res.pagination.totalPages };
}

export async function createBusiness(data: Omit<Business, "id" | "createdAt" | "updatedAt" | "status" | "paymentStatus"> & {
  paymentSenderName?: string;
  paymentMethod?: string;
  paymentReference?: string;
}) {
  return apiClient<Business>("/businesses/submit", {
    method: "POST",
    body: JSON.stringify(cleanOptionalFields(data as any)),
  });
}

export async function createBusinessAdmin(data: Partial<Business> & Pick<Business, "businessName" | "ownerName" | "category" | "city" | "address" | "phone"> & {
  paymentSenderName?: string;
  paymentMethod?: string;
  paymentReference?: string;
}) {
  return apiClient<Business>("/businesses/admin", {
    method: "POST",
    body: JSON.stringify(cleanOptionalFields(data as any)),
  });
}

export async function updateBusinessStatus(id: string, status: BusinessStatus, paymentStatus?: PaymentStatus, adminNote?: string) {
  return apiClient<Business>(`/businesses/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, paymentStatus, adminNote }),
  });
}

export async function updateBusiness(id: string, partial: Partial<Business> & {
  paymentSenderName?: string;
  paymentMethod?: string;
  paymentReference?: string;
}) {
  return apiClient<Business>(`/businesses/${id}`, {
    method: "PUT",
    body: JSON.stringify(cleanOptionalFields(partial as any)),
  });
}

export async function fetchBusinessAudit(id: string) {
  return apiClient<BusinessAuditRow[]>(`/businesses/${id}/audit`);
}

export async function deleteBusiness(id: string) {
  return apiClient(`/businesses/${id}`, {
    method: "DELETE",
  });
}
