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
  paymentMethods: [
    { id: "p1", bankName: "Meezan Bank", accountTitle: "Anjuman-e-Araian", accountNo: "0123456789" },
    { id: "p2", bankName: "EasyPaisa", accountTitle: "Admin", accountNo: "0300 000 0000" }
  ],
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

export async function fetchSiteSettings(): Promise<SiteSettings> {
  try {
    const data = await apiClient("/settings") as any;
    if (!data.paymentMethods) data.paymentMethods = defaultSettings.paymentMethods;
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
  cachedSettings = { ...cachedSettings, ...data };
  return cachedSettings;
}

export function getSiteSettings(): SiteSettings {
  return cachedSettings;
}

export function saveSiteSettings(settings: SiteSettings) {
  cachedSettings = settings;
}
