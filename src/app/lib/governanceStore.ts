import { apiClient } from "./apiClient";

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

export const fetchGovernanceSummary = () => apiClient<GovernanceSummary>("/governance/summary");
export const fetchOrganizationUnits = () => apiClient<OrganizationUnit[]>("/governance/units");
export const createOrganizationUnit = (data: Partial<OrganizationUnit>) => apiClient<OrganizationUnit>("/governance/units", { method: "POST", body: JSON.stringify(data) });
export const updateOrganizationUnit = (id: string, data: Partial<OrganizationUnit>) => apiClient<OrganizationUnit>(`/governance/units/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const archiveOrganizationUnit = (id: string) => apiClient(`/governance/units/${id}`, { method: "DELETE" });

export const fetchOrganizationAssignments = () => apiClient<OrganizationAssignment[]>("/governance/assignments");
export const createOrganizationAssignment = (data: Partial<OrganizationAssignment>) => apiClient<OrganizationAssignment>("/governance/assignments", { method: "POST", body: JSON.stringify(data) });
export const updateOrganizationAssignment = (id: string, data: Partial<OrganizationAssignment>) => apiClient<OrganizationAssignment>(`/governance/assignments/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const archiveOrganizationAssignment = (id: string) => apiClient(`/governance/assignments/${id}`, { method: "DELETE" });

export const fetchGovernanceMeetings = () => apiClient<GovernanceMeeting[]>("/governance/meetings");
export const createGovernanceMeeting = (data: Partial<GovernanceMeeting>) => apiClient<GovernanceMeeting>("/governance/meetings", { method: "POST", body: JSON.stringify(data) });
export const updateGovernanceMeeting = (id: string, data: Partial<GovernanceMeeting>) => apiClient<GovernanceMeeting>(`/governance/meetings/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const fetchMeetingAttendance = (meetingId: string) => apiClient<MeetingAttendance[]>(`/governance/meetings/${meetingId}/attendance`);
export const saveMeetingAttendance = (meetingId: string, entries: MeetingAttendance[]) => apiClient<{ message: string; count: number }>(`/governance/meetings/${meetingId}/attendance`, { method: "PUT", body: JSON.stringify({ entries: entries.map(({ memberId, status, remarks }) => ({ memberId, status, remarks: remarks || null })) }) });

export const bootstrapLegacyLeadership = () => apiClient<{ imported: number; skipped: number; message: string }>("/governance/bootstrap-legacy", { method: "POST" });
