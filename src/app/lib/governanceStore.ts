import { apiClient } from "./apiClient";
import { formatPersonName, formatPlaceName, formatProfessionalLabel } from "./displayFormat";

export type OrganizationUnitType = "cabinet" | "committee" | "zone" | "area" | "working_group" | "chapter" | "other";

export interface OrganizationUnit {
  id: string;
  name: string;
  slug: string;
  type: OrganizationUnitType;
  parentId?: string | null;
  parent?: { id: string; name: string; type: string } | null;
  description?: string | null;
  areaName?: string | null;
  displayOrder: number;
  isActive: boolean;
  tenureStart?: string | null;
  tenureEnd?: string | null;
  _count?: { assignments: number; meetings: number; children: number };
}

export interface OrganizationAssignment {
  id: string;
  memberId: string;
  organizationId: string;
  role: string;
  rank: number;
  period?: string | null;
  notes?: string | null;
  isActive: boolean;
  member?: { id: string; memberNo: string; fullName: string; city: string; photoUrl?: string | null; status?: string };
  organization?: { id: string; name: string; type: string; areaName?: string | null; isActive?: boolean };
}

export interface GovernanceMeeting {
  id: string;
  organizationId?: string | null;
  organization?: { id: string; name: string; type: string } | null;
  title: string;
  meetingType: "meeting" | "agm" | "committee" | "emergency" | "other";
  date: string;
  time?: string | null;
  venue?: string | null;
  status: "announced" | "held" | "postponed" | "cancelled";
  notice?: string | null;
  agenda?: string | null;
  minutes?: string | null;
  images: string[];
  published: boolean;
  _count?: { attendance: number };
}

export interface MeetingAttendance {
  id?: string;
  meetingId?: string;
  memberId: string;
  status: "present" | "absent" | "excused";
  remarks?: string | null;
  member?: { id: string; memberNo: string; fullName: string; city?: string; photoUrl?: string | null };
}

export interface GovernanceSummary {
  units: number;
  activeAssignments: number;
  meetings: number;
  heldMeetings: number;
}

function normalizeGovernanceMember<T extends Record<string, any> | null | undefined>(member: T): T {
  if (!member || typeof member !== "object") return member;
  return {
    ...member,
    ...(Object.prototype.hasOwnProperty.call(member, "fullName") ? { fullName: formatPersonName(member.fullName) } : {}),
    ...(Object.prototype.hasOwnProperty.call(member, "city") ? { city: formatPlaceName(member.city) } : {}),
  } as T;
}

function normalizeAssignment<T extends OrganizationAssignment>(assignment: T): T {
  return {
    ...assignment,
    role: formatProfessionalLabel(assignment.role),
    member: normalizeGovernanceMember(assignment.member),
  } as T;
}

function normalizeAttendance<T extends MeetingAttendance>(entry: T): T {
  return { ...entry, member: normalizeGovernanceMember(entry.member) } as T;
}

function compareAssignments(a: OrganizationAssignment, b: OrganizationAssignment) {
  if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
  const rankA = Number.isFinite(Number(a.rank)) ? Number(a.rank) : 999;
  const rankB = Number.isFinite(Number(b.rank)) ? Number(b.rank) : 999;
  if (rankA !== rankB) return rankA - rankB;
  const unitCompare = String(a.organization?.name || "").localeCompare(String(b.organization?.name || ""), "en", { sensitivity: "base" });
  if (unitCompare !== 0) return unitCompare;
  return String(a.member?.fullName || "").localeCompare(String(b.member?.fullName || ""), "en", { sensitivity: "base" });
}

export const fetchGovernanceSummary = () => apiClient<GovernanceSummary>("/governance/summary");
export const fetchOrganizationUnits = () => apiClient<OrganizationUnit[]>("/governance/units");
export const createOrganizationUnit = (data: Partial<OrganizationUnit>) => apiClient<OrganizationUnit>("/governance/units", { method: "POST", body: JSON.stringify(data) });
export const updateOrganizationUnit = (id: string, data: Partial<OrganizationUnit>) => apiClient<OrganizationUnit>(`/governance/units/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const archiveOrganizationUnit = (id: string) => apiClient(`/governance/units/${id}`, { method: "DELETE" });

export async function fetchOrganizationAssignments() {
  const rows = await apiClient<OrganizationAssignment[]>("/governance/assignments");
  return (rows || []).map(normalizeAssignment).sort(compareAssignments);
}

export async function createOrganizationAssignment(data: Partial<OrganizationAssignment>) {
  const payload = { ...data, ...(Object.prototype.hasOwnProperty.call(data, "role") ? { role: formatProfessionalLabel(data.role) } : {}) };
  const result = await apiClient<OrganizationAssignment>("/governance/assignments", { method: "POST", body: JSON.stringify(payload) });
  return normalizeAssignment(result);
}

export async function updateOrganizationAssignment(id: string, data: Partial<OrganizationAssignment>) {
  const payload = { ...data, ...(Object.prototype.hasOwnProperty.call(data, "role") ? { role: formatProfessionalLabel(data.role) } : {}) };
  const result = await apiClient<OrganizationAssignment>(`/governance/assignments/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  return normalizeAssignment(result);
}

export const archiveOrganizationAssignment = (id: string) => apiClient(`/governance/assignments/${id}`, { method: "DELETE" });

export const fetchGovernanceMeetings = () => apiClient<GovernanceMeeting[]>("/governance/meetings");
export const createGovernanceMeeting = (data: Partial<GovernanceMeeting>) => apiClient<GovernanceMeeting>("/governance/meetings", { method: "POST", body: JSON.stringify(data) });
export const updateGovernanceMeeting = (id: string, data: Partial<GovernanceMeeting>) => apiClient<GovernanceMeeting>(`/governance/meetings/${id}`, { method: "PUT", body: JSON.stringify(data) });

export async function fetchMeetingAttendance(meetingId: string) {
  const rows = await apiClient<MeetingAttendance[]>(`/governance/meetings/${meetingId}/attendance`);
  return (rows || []).map(normalizeAttendance);
}

export const saveMeetingAttendance = (meetingId: string, entries: MeetingAttendance[]) => apiClient<{ message: string; count: number }>(`/governance/meetings/${meetingId}/attendance`, { method: "PUT", body: JSON.stringify({ entries: entries.map(({ memberId, status, remarks }) => ({ memberId, status, remarks: remarks || null })) }) });

export const bootstrapLegacyLeadership = () => apiClient<{ imported: number; skipped: number; message: string }>("/governance/bootstrap-legacy", { method: "POST" });
