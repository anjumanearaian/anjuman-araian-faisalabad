export type BusinessStatus = "pending" | "approved" | "rejected";
export type PaymentStatus = "pending" | "received" | "verified" | "rejected";
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
  socialLinks: string; // social media links
  logoUrl: string; // base64 logo
  description: string;
  productsServices: string;
  discountOffer: string; // discount for members
  sponsorshipPackage: SponsorshipPackage;
  paymentProofUrl: string; // base64 payment proof receipt
  additionalPhotos?: string[];
  status: BusinessStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  adminNote?: string;
}

import { apiClient } from "./apiClient";

// Removed localStorage helper functions getBusinesses, saveBusinesses, getMockBusinesses

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
  received: { bg: "#dbeafe", text: "#1e40af", label: "Payment Received" },
  verified: { bg: "#dcfce7", text: "#15803d", label: "Payment Verified" },
  rejected: { bg: "#fee2e2", text: "#b91c1c", label: "Payment Rejected" }
};

export async function fetchAllBusinesses(page: number = 1, limit: number = 10, includePending: boolean = false) {
  const endpoint = includePending ? `/businesses?page=${page}&limit=${limit}` : `/businesses/published?page=${page}&limit=${limit}`;
  const res = (await apiClient(endpoint)) as any;
  return { data: res.businesses as Business[], total: res.pagination.total, totalPages: res.pagination.totalPages };
}

export async function createBusiness(data: Omit<Business, "id" | "createdAt" | "updatedAt" | "status" | "paymentStatus">) {
  return apiClient("/businesses/submit", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateBusinessStatus(id: string, status: BusinessStatus, paymentStatus?: PaymentStatus, adminNote?: string) {
  return apiClient(`/businesses/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, paymentStatus, adminNote }),
  });
}

export async function updateBusiness(id: string, partial: Partial<Business>) {
  return apiClient(`/businesses/${id}`, {
    method: "PUT",
    body: JSON.stringify(partial),
  });
}

export async function deleteBusiness(id: string) {
  return apiClient(`/businesses/${id}`, {
    method: "DELETE",
  });
}
