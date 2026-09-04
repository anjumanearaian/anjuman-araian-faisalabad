import { apiRequest } from "./apiClient";

export function fetchSettings(){
 return apiRequest("/api/settings");
}