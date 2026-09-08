export type MemberStatus = "pending" | "approved" | "rejected" | "inactive";
export type MemberVisibility = "public" | "private";
export type MembershipType = "ordinary" | "life" | "patron" | "overseas";

export interface FamilyInfo {
  fatherName: string;
  familyBranch: string;
  spouseName: string;
  childrenCount: string;
  childrenDetails: string;
  familyContactName: string;
  familyContactNumber: string;
  familyCity: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  emergencyRelationship: string;
}

export interface Member {
  id: string;
  memberNo: string;
  // Personal
  fullName: string;
  fatherName: string;
  cnic: string;
  dob: string;
  gender: string;
  bloodGroup: string;
  // Contact
  email: string;
  phone: string;
  whatsapp: string;
  whatsappPublic: boolean;
  address: string;
  city: string;
  district: string;
  province: string;
  // Professional
  occupation: string;
  education: string;
  // Membership
  membershipType: MembershipType;
  // Auth
  password?: string;
  designation?: string;
  institutionName?: string;
  businessName?: string;
  memberCell?: "male" | "women";
  paymentStatus?: string;
  // Family info (private — admin only by default)
  family: FamilyInfo;
  familyInfoPublic: boolean;
  // Status
  status: MemberStatus;
  visibility: MemberVisibility; // Keep for legacy
  showOnWeb: boolean;
  showOnPortal: boolean;
  isFeatured?: boolean;
  isFeaturedPortal?: boolean;
  // Documents (base64)
  photoUrl: string;
  cnicFrontUrl: string;
  cnicBackUrl: string;
  paymentProofUrl?: string;
  additionalPhotos?: string[];
  // Meta
  createdAt: string;
  updatedAt: string;
  approvedAt: string;
  rejectionReason: string;
  adminNote: string;
}

export const blankFamily = (): FamilyInfo => ({
  fatherName: "",
  familyBranch: "",
  spouseName: "",
  childrenCount: "",
  childrenDetails: "",
  familyContactName: "",
  familyContactNumber: "",
  familyCity: "",
  emergencyContactName: "",
  emergencyContactNumber: "",
  emergencyRelationship: "",
});

export const provinces = ["Punjab", "Sindh", "KPK", "Balochistan", "Azad Kashmir", "Gilgit-Baltistan", "Federal"];
export const bloodGroups = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

// Canonical master lists used wherever member education/occupation is edited.
// A member may select Other and provide a detail, but that detail is not silently
// promoted to the master list. An administrator can review it first, preventing
// duplicate variants such as MBA/M.B.A. being treated as separate education levels.
export const educationLevels = [
  "Primary",
  "Middle",
  "Matric",
  "Intermediate",
  "Diploma / Certificate",
  "Bachelor's",
  "Master's",
  "MPhil / MS",
  "PhD",
  "Professional Qualification",
  "Other",
];

export const occupations = [
  "Agriculture",
  "Business",
  "Government Service",
  "Private Service",
  "Doctor",
  "Veterinarian",
  "Engineer",
  "Lawyer",
  "Teacher",
  "Banking / Finance",
  "IT / Technology",
  "Armed Forces",
  "Self-Employed",
  "Homemaker",
  "Retired",
  "Student",
  "Other",
];

export const relationships = ["Father", "Mother", "Brother", "Sister", "Son", "Daughter", "Spouse", "Uncle", "Friend", "Other"];

export const OPTION_DETAIL_SEPARATOR = " — ";

export function splitStructuredOption(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return { base: "", detail: "" };
  const index = raw.indexOf(OPTION_DETAIL_SEPARATOR);
  if (index < 0) return { base: raw, detail: "" };
  return {
    base: raw.slice(0, index).trim(),
    detail: raw.slice(index + OPTION_DETAIL_SEPARATOR.length).trim(),
  };
}

export function structuredOptionForEdit(value: string | null | undefined, options: readonly string[]) {
  const raw = String(value || "").trim();
  const parsed = splitStructuredOption(raw);
  if (parsed.base && options.includes(parsed.base)) return parsed;
  // Legacy or free-text values are preserved under Other instead of being lost.
  return { base: "Other", detail: raw };
}

export function joinStructuredOption(base?: string | null, detail?: string | null) {
  const cleanBase = String(base || "").trim();
  const cleanDetail = String(detail || "").trim();
  if (!cleanBase) return cleanDetail;
  return cleanDetail ? `${cleanBase}${OPTION_DETAIL_SEPARATOR}${cleanDetail}` : cleanBase;
}

export const statusColors: Record<MemberStatus, { bg: string; text: string; label: string }> = {
  pending:  { bg: "#fef9c3", text: "#854d0e", label: "Pending Approval" },
  approved: { bg: "#dcfce7", text: "#15803d", label: "Approved" },
  rejected: { bg: "#fee2e2", text: "#b91c1c", label: "Rejected" },
  inactive: { bg: "#f3f4f6", text: "#6b7280", label: "Inactive" },
};

import { apiClient } from "./apiClient";

export async function fetchAllMembers(page: number = 1, limit: number = 10) {
  try {
    const data = await apiClient<any>(`/members?page=${page}&limit=${limit}`);
    return { data: data.members || [], total: data.pagination?.total || 0 };
  } catch (e) {
    console.error("Failed to fetch members", e);
    return { data: [], total: 0 };
  }
}

export async function updateMemberStatus(id: string, status: MemberStatus, rejectionReason?: string, adminNote?: string) {
  await apiClient(`/members/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, rejectionReason, adminNote })
  });
}

export async function updateMember(id: string, partial: Partial<Member>) {
  await apiClient(`/members/${id}`, {
    method: "PATCH",
    body: JSON.stringify(partial)
  });
}

export async function deleteMember(id: string) {
  await apiClient(`/members/${id}`, {
    method: "DELETE"
  });
}
