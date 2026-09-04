import { apiRequest } from "./apiClient";

export function fetchMembers(){
 return apiRequest("/api/members");
}

export function createMember(data:unknown){
 return apiRequest("/api/members",{
  method:"POST",
  body:JSON.stringify(data)
 });
}