import { apiClient } from "./apiClient";

export type MessageType = "contact" | "forgot_password";
export type MessageStatus = "unread" | "resolved";

export interface MessageRequest {
  id: string;
  type: MessageType;
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: MessageStatus;
  createdAt: string;
  updatedAt: string;
}

export async function fetchAllMessages(page: number = 1, limit: number = 20, dateFilter?: string, startDate?: string, endDate?: string) {
  let url = `/messages?page=${page}&limit=${limit}`;
  if (dateFilter && dateFilter !== "all") url += `&filter=${dateFilter}`;
  if (startDate) url += `&startDate=${startDate}`;
  if (endDate) url += `&endDate=${endDate}`;
  
  const res = (await apiClient(url)) as any;
  return {
    data: res.messages as MessageRequest[],
    total: res.pagination.total,
    totalPages: res.pagination.totalPages,
  };
}

export async function createMessage(data: Omit<MessageRequest, "id" | "createdAt" | "updatedAt" | "status">) {
  return apiClient("/messages", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateMessageStatus(id: string, status: MessageStatus) {
  return apiClient(`/messages/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function deleteMessage(id: string) {
  return apiClient(`/messages/${id}`, {
    method: "DELETE",
  });
}

// Deprecated fallback methods to prevent frontend crashes before full update
export function getMessages(): MessageRequest[] { return []; }
export function saveMessages(items: MessageRequest[]) {}
