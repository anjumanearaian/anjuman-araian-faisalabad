import { apiClient } from "./apiClient";
import { formatPersonName, formatPlaceName, formatProfessionalLabel, normalizeMemberDisplay, normalizeMemberPayload } from "./displayFormat";

export type MemberStatus = "pending" | "approved" | "rejected" | "inactive" | "suspended" | "deceased";
export type MemberVisibility = "public" | "private";
export type MembershipType = "ordinary" | "life" | "patron" | "overseas";

export interface MemberChild { id?: string; fullName: string; dob: string; education: string; }
export interface FamilyInfo {
  fatherName: string; familyBranch: string; caste: string; religiousSect: string; spouseName: string; childrenCount: string; childrenDetails: string;
  familyContactName: string; familyContactNumber: string; familyCity: string; emergencyContactName: string; emergencyContactNumber: string; emergencyRelationship: string;
}
export interface ReferralCandidate { id: string; memberNo: string; fullName: string; city: string; }
export interface Member {
  id: string; formNo?: string; memberNo: string; fullName: string; fatherName: string; cnic: string; dob: string; gender: string; bloodGroup: string;
  email: string; phone: string; whatsapp: string; whatsappPublic: boolean; address: string; localArea?: string; city: string; district: string; province: string;
  occupation: string; education: string; membershipType: MembershipType; password?: string; designation?: string; institutionName?: string; businessName?: string;
  memberCell?: "male" | "women"; paymentStatus?: string; family?: FamilyInfo; familyInfo?: FamilyInfo; children?: MemberChild[]; familyInfoPublic: boolean;
  referrerMemberId?: string | null; referrerMember?: ReferralCandidate | null; referralStatus?: string; status: MemberStatus; visibility: MemberVisibility;
  showOnWeb: boolean; showOnPortal: boolean; isFeatured?: boolean; isFeaturedPortal?: boolean; photoUrl: string; cnicFrontUrl: string; cnicBackUrl: string;
  paymentProofUrl?: string; additionalPhotos?: string[]; createdAt: string; updatedAt: string; approvedAt: string; rejectionReason: string; adminNote: string;
  isArchived?: boolean; archivedAt?: string | null; archivedByName?: string | null; archiveReason?: string | null;
}

export interface MemberAuditRow {
  id: string; memberId?: string | null; action: string; actorAdminId?: string | null; actorName?: string | null; actorRole?: string | null;
  reason?: string | null; beforeData?: Record<string, unknown> | null; afterData?: Record<string, unknown> | null; createdAt: string;
}

export const blankFamily = (): FamilyInfo => ({ fatherName: "", familyBranch: "", caste: "", religiousSect: "", spouseName: "", childrenCount: "0", childrenDetails: "", familyContactName: "", familyContactNumber: "", familyCity: "", emergencyContactName: "", emergencyContactNumber: "", emergencyRelationship: "" });
export const provinces = ["Punjab", "Sindh", "KPK", "Balochistan", "Azad Kashmir", "Gilgit-Baltistan", "Federal"];
export const bloodGroups = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
export const educationLevels = ["Primary", "Middle", "Matric", "Intermediate", "Diploma / Certificate", "Bachelor's", "Master's", "MPhil / MS", "PhD", "Professional Qualification", "Other"];
export const childEducationLevels = ["Not Started", "Pre-School", "Primary", "Middle", "Matric", "Intermediate", "Diploma / Certificate", "Bachelor's", "Master's", "MPhil / MS", "PhD", "Professional Qualification", "Other"];
export const occupations = ["Agriculture", "Business", "Government Service", "Private Service", "Doctor", "Veterinarian", "Engineer", "Lawyer", "Teacher", "Banking / Finance", "IT / Technology", "Armed Forces", "Self-Employed", "Homemaker", "Retired", "Student", "Other"];
export const designationSuggestions = ["Chairman", "President", "Vice President", "Senior Vice President", "General Secretary", "Joint Secretary", "Finance Secretary", "Information Secretary", "Chief Executive Officer", "Managing Director", "Executive Director", "Director", "General Manager", "Deputy General Manager", "Manager", "Assistant Manager", "Owner / Proprietor", "Partner", "Consultant", "Professor", "Associate Professor", "Assistant Professor", "Lecturer", "Researcher", "Officer", "Other"];

export function canonicalDesignation(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const key = raw.toLowerCase().replace(/[.\-_]/g, " ").replace(/\s+/g, " ").trim();
  const aliases: Record<string, string> = {
    ceo: "Chief Executive Officer", "chief executive": "Chief Executive Officer", "chief executive officer": "Chief Executive Officer",
    md: "Managing Director", "managing director": "Managing Director", gm: "General Manager", "general manager": "General Manager",
    svp: "Senior Vice President", "senior vice president": "Senior Vice President", vp: "Vice President", "vice president": "Vice President",
    "gen sec": "General Secretary", "general secretary": "General Secretary", owner: "Owner / Proprietor", proprietor: "Owner / Proprietor", "owner proprietor": "Owner / Proprietor",
  };
  return aliases[key] || formatProfessionalLabel(raw);
}

export const relationships = ["Father", "Mother", "Brother", "Sister", "Son", "Daughter", "Spouse", "Uncle", "Aunt", "Friend", "Other"];
export const casteBiradariSuggestions = ["Araian", "Jatt", "Rajput", "Gujjar", "Syed", "Sheikh", "Mughal", "Pathan / Pashtun", "Awan", "Kamboh", "Kashmiri", "Qureshi", "Ansari", "Malik", "Rana", "Chaudhry", "Other"];
export const religiousSectSuggestions = ["Prefer not to say", "Sunni", "Sunni - Barelvi", "Sunni - Deobandi", "Sunni - Ahl-e-Hadith", "Shia", "Ismaili", "Other"];
export const OPTION_DETAIL_SEPARATOR = " — ";
export function splitStructuredOption(value?: string | null) { const raw = String(value || "").trim(); if (!raw) return { base: "", detail: "" }; const index = raw.indexOf(OPTION_DETAIL_SEPARATOR); if (index < 0) return { base: raw, detail: "" }; return { base: raw.slice(0, index).trim(), detail: raw.slice(index + OPTION_DETAIL_SEPARATOR.length).trim() }; }
export function structuredOptionForEdit(value: string | null | undefined, options: readonly string[]) { const raw = String(value || "").trim(); const parsed = splitStructuredOption(raw); if (parsed.base && options.includes(parsed.base)) return parsed; return { base: "Other", detail: raw }; }
export function joinStructuredOption(base?: string | null, detail?: string | null) { const cleanBase = String(base || "").trim(); const cleanDetail = String(detail || "").trim(); if (!cleanBase) return cleanDetail; return cleanDetail ? `${cleanBase}${OPTION_DETAIL_SEPARATOR}${cleanDetail}` : cleanBase; }

export const statusColors: Record<MemberStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: "#fef9c3", text: "#854d0e", label: "Pending Approval" }, approved: { bg: "#dcfce7", text: "#15803d", label: "Approved" }, rejected: { bg: "#fee2e2", text: "#b91c1c", label: "Rejected" }, inactive: { bg: "#f3f4f6", text: "#6b7280", label: "Inactive" }, suspended: { bg: "#ffedd5", text: "#9a3412", label: "Suspended" }, deceased: { bg: "#e5e7eb", text: "#374151", label: "Deceased" },
};

function showActionError(error: any, fallback: string) {
  const message = error?.message || fallback;
  if (typeof window !== "undefined") window.alert(message);
  return error;
}

async function fetchMembersPage(page: number, limit: number, archived: "active" | "only" | "all" = "active") {
  const response = await apiClient<any>(`/members?page=${page}&limit=${limit}&archived=${archived}`);
  return { ...response, members: (response.members || []).map((member: Member) => normalizeMemberDisplay(member)) };
}

async function fetchEveryAdminMember(archived: "active" | "only" | "all" = "active") {
  const perPage = 100;
  const first = await fetchMembersPage(1, perPage, archived);
  const firstRows: Member[] = first.members || [];
  const total = Number(first.pagination?.total || firstRows.length || 0);
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (totalPages === 1) return { data: firstRows, total };

  const remaining = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => fetchMembersPage(index + 2, perPage, archived))
  );
  const data = [firstRows, ...remaining.map((result) => (result.members || []) as Member[])].flat();
  return { data, total };
}

export async function fetchAllMembers(page: number = 1, limit: number = 10) {
  try {
    if (limit >= 100 && page === 1) return await fetchEveryAdminMember("active");
    const data = await fetchMembersPage(page, Math.min(100, Math.max(1, limit)), "active");
    return { data: data.members || [], total: data.pagination?.total || 0 };
  }
  catch (e) { console.error("Failed to fetch members", e); return { data: [], total: 0 }; }
}

export async function fetchAdminMembers() {
  return (await fetchEveryAdminMember("active")).data;
}

export async function fetchArchivedMembers() {
  return (await fetchEveryAdminMember("only")).data;
}

export async function searchReferralMembers(query: string) {
  const q = query.trim();
  if (q.length < 2) return [] as ReferralCandidate[];
  const data = await apiClient<{ members: ReferralCandidate[] }>(`/members/referral-search?q=${encodeURIComponent(q)}`);
  return (data.members || []).map((member) => ({ ...member, fullName: formatPersonName(member.fullName), city: formatPlaceName(member.city) }));
}

export async function createAdminMember(data: Partial<Member> & Record<string, unknown>) {
  const payload = normalizeMemberPayload(data as Record<string, any>);
  const member = await apiClient<Member>("/members/admin-create", { method: "POST", body: JSON.stringify(payload) });
  return normalizeMemberDisplay(member);
}

export async function updateMemberStatus(id: string, status: MemberStatus, rejectionReason?: string, adminNote?: string) {
  try {
    const member = await apiClient<any>(`/members/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, rejectionReason, adminNote }) });
    return member && typeof member === "object" ? normalizeMemberDisplay(member) : member;
  } catch (error: any) {
    showActionError(error, status === "approved" ? "Member approval failed." : "Member status update failed.");
    throw error;
  }
}

export async function updateMember(id: string, partial: Partial<Member> & Record<string, unknown>) {
  try {
    const payload = normalizeMemberPayload({ ...partial } as Record<string, any>);
    if (typeof payload.designation === "string") payload.designation = canonicalDesignation(payload.designation);
    const member = await apiClient<Member>(`/members/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
    return normalizeMemberDisplay(member);
  } catch (error: any) {
    showActionError(error, "Member changes could not be saved.");
    throw error;
  }
}

// Kept under the historical function name so older admin screens cannot hard-delete.
// The backend implements DELETE as a reversible Super Admin archive operation.
export async function deleteMember(id: string, reason = "Archived from Member Center") {
  return apiClient(`/members/${id}`, { method: "DELETE", body: JSON.stringify({ reason }) });
}

export async function restoreMember(id: string, reason = "Restored after Super Admin review") {
  return apiClient(`/members/${id}/restore`, { method: "PATCH", body: JSON.stringify({ reason }) });
}

export async function fetchMemberAudit(id: string) {
  return apiClient<MemberAuditRow[]>(`/members/${id}/audit`);
}
