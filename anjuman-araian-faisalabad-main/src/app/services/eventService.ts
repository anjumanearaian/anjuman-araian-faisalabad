import { apiGet } from "../lib/api";

export const getEvents = () => apiGet("/api/events");