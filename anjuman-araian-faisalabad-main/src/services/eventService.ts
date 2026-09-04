import { apiRequest } from "./apiClient";

export function fetchEvents(){
 return apiRequest("/api/events");
}