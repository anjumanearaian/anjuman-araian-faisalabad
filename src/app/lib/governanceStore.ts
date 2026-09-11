import { apiClient } from "./apiClient";

export type MeetingStatus = "draft" | "announced" | "held" | "minutes_draft" | "published" | "cancelled";
export type AttendanceStatus = "invited" | "present" | "absent" | "leave" | "late";

export interface GovernanceGroupSummary {
  key: string;
  label: string;
  members: number;
}

export interface MeetingAttendance {
  id?: string;
  meetingId?: string;
  memberId: string;
  status: AttendanceStatus;
  notes?: string | null;
  roleSnapshot?: string | null;
  member?: {
    id: string;
    fullName: string;
    photoUrl?: string | null;
    city?: string | null;
    designation?: string | null;
  };
}

export interface GovernanceMeeting {
  id: string;
  title: string;
  groupKey: string;
  meetingType: string;
  meetingNo?: string | null;
  scheduledAt: string;
  venue?: string | null;
  agenda?: string | null;
  noticeBody?: string | null;
  noticePublishedAt?: string | null;
  status: MeetingStatus;
  minutesBody?: string | null;
  minutesPublishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  attendances?: MeetingAttendance[];
}

export async function fetchGovernanceGroups(): Promise<GovernanceGroupSummary[]> {
  const data = await apiClient<{ groups: GovernanceGroupSummary[] }>("/leadership/governance/groups");
  return data.groups || [];
}

export async function fetchMeetings(): Promise<GovernanceMeeting[]> {
  const data = await apiClient<{ meetings: GovernanceMeeting[] }>("/leadership/governance/meetings");
  return data.meetings || [];
}

export async function createMeeting(data: Partial<GovernanceMeeting>) {
  return apiClient<GovernanceMeeting>("/leadership/governance/meetings", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateMeeting(id: string, data: Partial<GovernanceMeeting>) {
  return apiClient<GovernanceMeeting>(`/leadership/governance/meetings/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function announceMeeting(id: string) {
  return apiClient<GovernanceMeeting>(`/leadership/governance/meetings/${id}/announce`, { method: "PATCH" });
}

export async function deleteMeeting(id: string) {
  return apiClient(`/leadership/governance/meetings/${id}`, { method: "DELETE" });
}

export async function buildMeetingRoster(id: string) {
  return apiClient<{ meeting: GovernanceMeeting }>(`/leadership/governance/meetings/${id}/roster`, { method: "POST" });
}

export async function saveMeetingAttendance(id: string, attendance: MeetingAttendance[]) {
  return apiClient<{ meeting: GovernanceMeeting }>(`/leadership/governance/meetings/${id}/attendance`, {
    method: "PUT",
    body: JSON.stringify({ attendance }),
  });
}

export async function publishMeetingMinutes(id: string, minutesBody: string) {
  return apiClient<GovernanceMeeting>(`/leadership/governance/meetings/${id}/publish-minutes`, {
    method: "PATCH",
    body: JSON.stringify({ minutesBody }),
  });
}

export async function fetchPublishedMeetingMinutes(): Promise<GovernanceMeeting[]> {
  const data = await apiClient<{ meetings: GovernanceMeeting[] }>("/leadership/governance/member-minutes");
  return data.meetings || [];
}

export async function fetchMemberHistory(memberId: string) {
  return apiClient<any>(`/leadership/governance/member-history/${memberId}`);
}
