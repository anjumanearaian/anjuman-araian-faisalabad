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
  minutesStatus?: string;
  chairName?: string | null;
  chairDesignation?: string | null;
  preparedByName?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  publishedAt?: string | null;
  _count?: { attendance: number };
}

export interface MeetingAttendance {
  id?: string;
  meetingId?: string;
  memberId?: string | null;
  attendeeType: "member" | "volunteer" | "guest" | "special_invitee" | "observer";
  guestName?: string | null;
  guestDesignation?: string | null;
  status: "not_marked" | "present" | "absent" | "leave" | "late" | "online" | "excused";
  remarks?: string | null;
  markedByName?: string | null;
  markedAt?: string | null;
  organizationRole?: string | null;
  organizationRank?: number | null;
  member?: { id: string; memberNo: string; fullName: string; city?: string; photoUrl?: string | null };
}

export interface ChairSuggestion {
  memberId: string;
  name: string;
  designation: string;
  priority: number;
  rank: number;
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

export const fetchGovernanceSummary = () => apiClient<GovernanceSummary>("/governance/summary");
export const fetchOrganizationUnits = () => apiClient<OrganizationUnit[]>("/governance/units");
export const createOrganizationUnit = (data: Partial<OrganizationUnit>) => apiClient<OrganizationUnit>("/governance/units", { method: "POST", body: JSON.stringify(data) });
export const updateOrganizationUnit = (id: string, data: Partial<OrganizationUnit>) => apiClient<OrganizationUnit>(`/governance/units/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const archiveOrganizationUnit = (id: string) => apiClient(`/governance/units/${id}`, { method: "DELETE" });

export async function fetchOrganizationAssignments() {
  const rows = await apiClient<OrganizationAssignment[]>("/governance/assignments");
  return (rows || []).map(normalizeAssignment);
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

export const initializeMeetingAttendance = (meetingId: string) => apiClient<{ message: string; count: number }>(`/governance/meetings/${meetingId}/attendance/initialize`, { method: "POST" });

export const saveMeetingAttendance = (meetingId: string, entries: MeetingAttendance[]) => apiClient<{ message: string; count: number }>(`/governance/meetings/${meetingId}/attendance`, {
  method: "PUT",
  body: JSON.stringify({
    entries: entries.map(({ id, memberId, attendeeType, guestName, guestDesignation, status, remarks }) => ({
      id,
      memberId: memberId || null,
      attendeeType: attendeeType || "member",
      guestName: guestName || null,
      guestDesignation: guestDesignation || null,
      status,
      remarks: remarks || null,
    })),
  }),
});

export const fetchChairSuggestion = (meetingId: string) => apiClient<{ suggestion: ChairSuggestion | null }>(`/governance/meetings/${meetingId}/chair-suggestion`);
export const confirmMeetingChair = (meetingId: string, data: Pick<ChairSuggestion, "memberId" | "name" | "designation">) => apiClient(`/governance/meetings/${meetingId}/chair`, { method: "PUT", body: JSON.stringify(data) });

export const bootstrapLegacyLeadership = () => apiClient<{ imported: number; skipped: number; message: string }>("/governance/bootstrap-legacy", { method: "POST" });


export type MeetingDocumentType = "notice" | "agenda" | "attendance" | "minutes" | "decisions" | "package";

export function meetingDocumentUrl(meetingId: string, type: MeetingDocumentType, mode: "view" | "download" = "view") {
  const encodedPath = ["governance", "meetings", meetingId, "document.pdf"].map(encodeURIComponent).join("__");
  return `/api/__proxy__${encodedPath}?type=${encodeURIComponent(type)}&mode=${mode}`;
}

export function publicMeetingDocumentUrl(meetingId: string, type: Exclude<MeetingDocumentType, "attendance"> = "minutes") {
  return `/api/governance/public/meetings/${encodeURIComponent(meetingId)}/document.pdf?type=${encodeURIComponent(type)}`;
}

export const finalizeMeetingMinutes = (meetingId: string, data?: { preparedByName?: string; approvedByName?: string }) =>
  apiClient<GovernanceMeeting>(`/governance/meetings/${meetingId}/finalize-minutes`, { method: "PUT", body: JSON.stringify(data || {}) });
