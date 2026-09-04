export interface LeadershipProfile {
  id: string;
  name: string;
  role: string;
  city: string;
  tier?: number; // For cabinet hierarchy (0 = President, 1 = VP/GenSec, etc)
  category: "cabinet" | "executive" | "advisory" | "founder" | "expresident";
  image?: string; // Base64
  period?: string; // For founders and ex-presidents
  description?: string; // For founders/patrons description or ex-presidents highlight
}

const defaultProfiles: LeadershipProfile[] = [
  { id: "1", name: "Ch. Muhammad Rafiq", role: "Central President", city: "Lahore", tier: 0, category: "cabinet" },
  { id: "2", name: "Ch. Imran Butt", role: "Senior Vice President", city: "Gujranwala", tier: 1, category: "cabinet" },
  { id: "3", name: "Ch. Tariq Mahmood", role: "General Secretary", city: "Faisalabad", tier: 1, category: "cabinet" },
  { id: "4", name: "Ch. Asif Nawaz", role: "Finance Secretary", city: "Sialkot", tier: 1, category: "cabinet" },
  { id: "5", name: "Ch. Khalid Rana", role: "VP — Punjab North", city: "Rawalpindi", tier: 2, category: "cabinet" },
  { id: "6", name: "Ch. Sajjad Ali", role: "VP — Punjab South", city: "Multan", tier: 2, category: "cabinet" },
  // Founders
  { id: "f1", name: "Ch. Ghulam Muhammad", role: "Founding President", city: "Lahore", category: "founder", period: "1947–1955", description: "The visionary leader who convened the first gathering of Araian community elders in August 1947 and drafted the founding charter of the organization." },
  { id: "f2", name: "Ch. Abdul Ghafoor", role: "Co-Founder and Secretary", city: "Gujranwala", category: "founder", period: "1947–1960", description: "Served as the first General Secretary, establishing the organizational structure and opening the first three district branches." },
  { id: "f3", name: "Ch. Muhammad Din", role: "Founding Treasurer", city: "Faisalabad", category: "founder", period: "1947–1952", description: "Set up the community welfare fund and introduced the first membership fee structure that sustained the organization in its early years." },
  { id: "f4", name: "Ch. Noor Muhammad", role: "Founding Patron", city: "Sialkot", category: "founder", period: "1947–1965", description: "A prominent agriculturalist and businessman who provided significant financial support to the fledgling organization in its formative years." },
  // Patrons (handled as founders with Patron role)
  { id: "p1", name: "Ch. Akhtar Hussain", role: "Patron-in-Chief", city: "Lahore", category: "founder", description: "Donated the land for the Anjuman Central Office in 1972." },
  { id: "p2", name: "Ch. Riaz Ahmad", role: "Life Patron", city: "Multan", category: "founder", description: "Established the first scholarship endowment fund of Rs. 10 million." },
  { id: "p3", name: "Ch. Ejaz Butt", role: "Distinguished Patron", city: "Rawalpindi", category: "founder", description: "Funded the construction of the Anjuman Community Centre, Rawalpindi." },
  { id: "p4", name: "Ch. Nasir Iqbal", role: "Life Patron", city: "Karachi", category: "founder", description: "Founded the Sindh chapter and funded the first medical camp in Hyderabad." },
  { id: "p5", name: "Ch. Khalid Mehmood", role: "Distinguished Patron", city: "Faisalabad", category: "founder", description: "Donated the Anjuman library and reading room in Faisalabad." },
  { id: "p6", name: "Ch. Amjad Ali", role: "Life Patron", city: "Gujranwala", category: "founder", description: "Supported over 500 students through his personal scholarship fund." },
  // Ex-Presidents
  { id: "e1", name: "Ch. Ghulam Muhammad", role: "President", city: "Lahore", category: "expresident", period: "1947–1955", description: "Founded the organization and established its constitutional framework." },
  { id: "e2", name: "Ch. Allah Ditta", role: "President", city: "Gujranwala", category: "expresident", period: "1955–1962", description: "Expanded branches to all districts of West Punjab." },
  { id: "e3", name: "Ch. Fazal Din", role: "President", city: "Faisalabad", category: "expresident", period: "1962–1968", description: "Launched the first community welfare fund." },
  { id: "e4", name: "Ch. Muhammad Yusuf", role: "President", city: "Sialkot", category: "expresident", period: "1968–1975", description: "Led post-1971 relief operations for displaced families." },
  { id: "e5", name: "Ch. Abdul Qadir", role: "President", city: "Multan", category: "expresident", period: "1975–1982", description: "Established the first women's welfare desk." },
  { id: "e6", name: "Ch. Iqbal Ahmad", role: "President", city: "Lahore", category: "expresident", period: "1982–1989", description: "Inaugurated the Anjuman Central Office building." },
  { id: "e7", name: "Ch. Munir Hussain", role: "President", city: "Rawalpindi", category: "expresident", period: "1989–1996", description: "Formalized the scholarship programme into a structured endowment." },
  { id: "e8", name: "Ch. Shahbaz Butt", role: "President", city: "Lahore", category: "expresident", period: "1996–2003", description: "Launched the first overseas chapter in the United Kingdom." },
  { id: "e9", name: "Ch. Zulfiqar Ali", role: "President", city: "Gujranwala", category: "expresident", period: "2003–2010", description: "Oversaw expansion to Sindh, KPK, and Balochistan." },
  { id: "e10", name: "Ch. Asif Nawaz", role: "President", city: "Faisalabad", category: "expresident", period: "2010–2017", description: "Digitized membership records and launched the official website." },
  { id: "e11", name: "Ch. Imran Butt", role: "President", city: "Lahore", category: "expresident", period: "2017–2024", description: "Doubled the scholarship fund and established the legal aid cell." },
];

export interface MessageAttribute {
  label: string;
  value: string;
}

export interface LeadershipMessageData {
  name: string;
  body: string;
  photo?: string;
  attributes?: MessageAttribute[];
}

import { apiClient } from "./apiClient";

export async function fetchLeadershipProfiles(): Promise<LeadershipProfile[]> {
  return apiClient("/leadership/profiles") as Promise<LeadershipProfile[]>;
}

export async function createLeadershipProfile(data: Partial<LeadershipProfile> | Partial<LeadershipProfile>[]) {
  return apiClient("/leadership/profiles", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function updateLeadershipProfile(id: string, data: Partial<LeadershipProfile>) {
  return apiClient(`/leadership/profiles/${id}`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export async function deleteLeadershipProfile(id: string) {
  return apiClient(`/leadership/profiles/${id}`, {
    method: "DELETE"
  });
}

export async function fetchLeadershipMessages(): Promise<(LeadershipMessageData & { type: string })[]> {
  return apiClient("/leadership/messages") as Promise<(LeadershipMessageData & { type: string })[]>;
}

export async function updateLeadershipMessage(type: "president" | "secretary", data: Partial<LeadershipMessageData>) {
  return apiClient(`/leadership/messages/${type}`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

// Deprecated synchronous local storage functions
export function getLeadershipProfiles(): LeadershipProfile[] { return []; }
export function saveLeadershipProfiles(profiles: LeadershipProfile[]) {}
export function getPresidentMessage(): LeadershipMessageData { return { name: "President", body: "" }; }
export function savePresidentMessage(data: LeadershipMessageData) {}
export function getSecretaryMessage(): LeadershipMessageData { return { name: "Secretary", body: "" }; }
export function saveSecretaryMessage(data: LeadershipMessageData) {}
