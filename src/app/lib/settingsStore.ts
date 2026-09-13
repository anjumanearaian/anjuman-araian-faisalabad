export interface PaymentMethod {
  id: string;
  bankName: string;
  accountTitle: string;
  accountNo: string;
}

export interface MembershipTier {
  id: string;
  type: string;
  name: string;
  fee: string;
  description: string;
}

export interface MatrimonialPackage {
  id: string;
  name: string;
  fee: string;
  description: string;
  isFeatured: boolean;
}

export interface SiteSettings {
  whatsappNumber: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  facebookUrl: string;
  twitterUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  heroSlides?: string[];
  paymentMethods?: PaymentMethod[];
  membershipTiers?: MembershipTier[];
  matrimonialPackages?: MatrimonialPackage[];
  constitutionPdfUrl?: string;
  constitutionPdfName?: string;
  memorandumPdfUrl?: string;
  memorandumPdfName?: string;
  rulesPdfUrl?: string;
  rulesPdfName?: string;
}

const defaultSettings: SiteSettings = {
  whatsappNumber: "923008655522",
  contactEmail: "anjumanearaianfaisalabad@gmail.com",
  contactPhone: "+92 300 865 5522",
  address: "Central Secretariat, Anjuman-e-Araian, Faisalabad, Pakistan",
  facebookUrl: "https://facebook.com",
  twitterUrl: "https://twitter.com",
  instagramUrl: "https://instagram.com",
  linkedinUrl: "https://linkedin.com",
  // Never fall back to demo bank/wallet details. If official payment details are
  // not configured, the public forms ask the applicant to contact the office.
  paymentMethods: [],
  membershipTiers: [
    { id: "t1", type: "ordinary", name: "Regular / Annual Member", fee: "Rs. 1,000 / year", description: "Voting rights, welfare access and member directory" },
    { id: "t2", type: "life", name: "Life Member", fee: "Rs. 3,000 once", description: "Permanent membership with all regular-member benefits" },
    { id: "t3", type: "patron", name: "Patron Member", fee: "Rs. 25,000 once", description: "All life benefits + advisory seat + VIP access" },
    { id: "t4", type: "overseas", name: "Overseas Member", fee: "$100 / year", description: "International networking, overseas chapter access, newsletter" }
  ],
  matrimonialPackages: [
    { id: "mp1", name: "Member Matrimonial Application", fee: "Rs. 3,000 once", description: "For an approved member or their son/daughter; member data is prefilled.", isFeatured: false },
    { id: "mp2", name: "Non-Member Matrimonial Application", fee: "Rs. 5,000 once", description: "For a new applicant, including verification and office processing.", isFeatured: false }
  ]
};

let cachedSettings: SiteSettings = defaultSettings;

import { apiClient } from "./apiClient";

const DEMO_PAYMENT_NUMBERS = new Set([
  "0123456789",
  "03000000000",
]);

function normalizeAccountNo(value: string) {
  return String(value || "").replace(/[^0-9a-z]/gi, "").toLowerCase();
}

function publicSafePaymentMethods(methods: unknown): PaymentMethod[] {
  if (!Array.isArray(methods)) return [];
  return methods.filter((method: any) => {
    const bankName = String(method?.bankName || "").trim();
    const accountTitle = String(method?.accountTitle || "").trim();
    const accountNo = String(method?.accountNo || "").trim();
    if (!bankName || !accountTitle || !accountNo) return false;
    return !DEMO_PAYMENT_NUMBERS.has(normalizeAccountNo(accountNo));
  });
}

export async function fetchSiteSettings(): Promise<SiteSettings> {
  try {
    const data = await apiClient("/settings") as any;
    data.paymentMethods = publicSafePaymentMethods(data.paymentMethods);
    if (!data.membershipTiers) data.membershipTiers = defaultSettings.membershipTiers;
    if (!data.matrimonialPackages) data.matrimonialPackages = defaultSettings.matrimonialPackages;
    cachedSettings = data as SiteSettings;
    return cachedSettings;
  } catch (e) {
    console.error("Failed to fetch settings:", e);
    return cachedSettings;
  }
}

export async function updateSiteSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
  const data = await apiClient("/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  }) as SiteSettings;
  cachedSettings = { ...cachedSettings, ...data, paymentMethods: publicSafePaymentMethods(data.paymentMethods ?? settings.paymentMethods ?? cachedSettings.paymentMethods) };
  return cachedSettings;
}

export function getSiteSettings(): SiteSettings {
  return cachedSettings;
}

export function saveSiteSettings(settings: SiteSettings) {
  cachedSettings = { ...settings, paymentMethods: publicSafePaymentMethods(settings.paymentMethods) };
}
