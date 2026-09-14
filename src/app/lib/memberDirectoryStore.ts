import { apiClient } from "./apiClient";
import { normalizeMemberDisplay } from "./displayFormat";
import type { Member } from "./memberStore";

export interface MemberDirectorySummary {
  approvedMembers: number;
  menMembers: number;
  womenMembers: number;
  lifeMembers: number;
}

export interface DirectoryMember extends Pick<Member,
  "id" | "memberNo" | "fullName" | "fatherName" | "city" | "district" | "province" | "localArea" |
  "occupation" | "education" | "designation" | "institutionName" | "businessName" | "memberCell" |
  "membershipType" | "photoUrl" | "isFeatured" | "isFeaturedPortal" | "approvedAt" | "createdAt"
> {
  phone?: string;
  whatsapp?: string;
  email?: string;
  leadershipRole?: string | null;
  leadershipRank?: number | null;
  leadershipTier?: number | null;
  leadershipUnit?: string | null;
}

export interface MemberDirectoryResponse {
  members: DirectoryMember[];
  summary: MemberDirectorySummary;
  privacy: { contactDetailsVisible: boolean; publicFields: string[] };
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export async function fetchMemberDirectory(page = 1, limit = 500) {
  const response = await apiClient<MemberDirectoryResponse>(`/homepage/member-directory?page=${page}&limit=${limit}`);
  return { ...response, members: (response.members || []).map((member) => normalizeMemberDisplay(member as any) as DirectoryMember) };
}

export async function fetchHomepageStatistics() {
  const data = await apiClient<{ statistics: MemberDirectorySummary }>("/homepage");
  return data.statistics;
}
