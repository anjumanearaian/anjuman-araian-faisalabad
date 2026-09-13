export const EDUCATION_OPTIONS = [
  "No formal schooling", "Primary / Middle", "Matric / O-Level", "Intermediate / A-Level", "Diploma / Technical", "Bachelor / BA / BSc", "BS / BSc (Hons)",
  "BBA", "B.Com", "BE / BSc Engineering", "MBBS", "BDS", "DVM", "Pharm-D", "LLB", "MA / MSc", "MBA", "MS / MPhil",
  "FCPS / Medical Specialization", "PhD", "Hafiz / Aalim / Religious Education", "Other"
];

export const PROFESSION_OPTIONS = [
  "Student", "Agriculture / Farming", "Livestock / Dairy", "Poultry", "Veterinary / Animal Health", "Medical / Healthcare",
  "Pharmacy", "Engineering", "Information Technology / Software", "Education / Teaching", "Research / Academia", "Banking / Finance",
  "Accounting / Audit", "Business / Entrepreneurship", "Trade / Import Export", "Government Service", "Armed Forces", "Law / Legal",
  "Media / Journalism", "Sales / Marketing", "Human Resources", "Administration / Management", "Real Estate / Construction",
  "Textile / Manufacturing", "Transport / Logistics", "Food / Hospitality", "Overseas Professional", "Skilled Trade / Technical Work",
  "Self-employed", "Homemaker", "Retired", "Other"
];

export const MARITAL_STATUS_OPTIONS = ["Never Married", "Divorced", "Widowed", "Separated"];
export const FAMILY_SETUP_OPTIONS = ["Nuclear Family", "Joint Family", "Flexible / No Preference"];
export const SECT_OPTIONS = ["Sunni", "Shia", "Other", "Prefer not to specify"];
export const EMPLOYMENT_TYPE_OPTIONS = ["Government", "Private Sector", "Business / Self-employed", "Academic / Research", "Freelance / Remote", "Not currently employed", "Other"];
export const RESIDENCE_STATUS_OPTIONS = ["Citizen", "Permanent Resident", "Work Visa", "Student Visa", "Dependent Visa", "Temporary Residence", "Pakistan Resident", "Other"];
export const INCOME_BANDS = ["Prefer not to say", "Below 50,000", "50,000–100,000", "100,000–150,000", "150,000–200,000", "200,000–300,000", "300,000–500,000", "500,000–1,000,000", "Above 1,000,000"];
export const IMPORTANCE_OPTIONS = ["must", "very important", "important", "preferred", "nice to have"];
export const PHOTO_PRIVACY_OPTIONS = [
  { value: "mutual_interest", label: "Show only after mutual interest" },
  { value: "admin_only", label: "Keep photo visible to authorized manager only" },
];
export const CONTACT_PRIVACY_OPTIONS = [
  { value: "mutual_interest", label: "Release only after mutual consent" },
  { value: "admin_only", label: "Keep contact with authorized manager only" },
];

export const PARTNER_EDUCATION_OPTIONS = ["No Preference", ...EDUCATION_OPTIONS];
export const PARTNER_PROFESSION_OPTIONS = ["No Preference", ...PROFESSION_OPTIONS.filter((v) => v !== "Student")];
export const PARTNER_MARITAL_OPTIONS = ["No Preference", ...MARITAL_STATUS_OPTIONS];

export function buildFamilyBackground(input: {
  maritalStatus?: string;
  familySetup?: string;
  sect?: string;
  notes?: string;
}) {
  const parts = [
    input.maritalStatus ? `Marital Status: ${input.maritalStatus}` : "",
    input.familySetup ? `Family Setup: ${input.familySetup}` : "",
    input.sect && input.sect !== "Prefer not to specify" ? `Sect: ${input.sect}` : "",
    input.notes ? `Family Notes: ${input.notes.trim()}` : "",
  ].filter(Boolean);
  return parts.join(" | ");
}

export function buildPartnerRequirements(input: {
  ageMin?: string;
  ageMax?: string;
  education?: string;
  profession?: string;
  province?: string;
  city?: string;
  maritalStatus?: string;
  familySetup?: string;
  notes?: string;
}) {
  const age = input.ageMin || input.ageMax ? `${input.ageMin || "Any"}-${input.ageMax || "Any"}` : "No Preference";
  const parts = [
    `Preferred Age: ${age}`,
    `Preferred Education: ${input.education || "No Preference"}`,
    `Preferred Profession: ${input.profession || "No Preference"}`,
    `Preferred Province: ${input.province || "No Preference"}`,
    `Preferred City: ${input.city || "No Preference"}`,
    `Preferred Marital Status: ${input.maritalStatus || "No Preference"}`,
    `Preferred Family Setup: ${input.familySetup || "No Preference"}`,
    input.notes ? `Other Requirements: ${input.notes.trim()}` : "",
  ].filter(Boolean);
  return parts.join(" | ");
}
