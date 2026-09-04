import { apiGet, apiPost } from "../lib/api";

export const getMembers = () => apiGet("/api/members");
export const registerMember = (data:any) => apiPost("/api/members/register", data);