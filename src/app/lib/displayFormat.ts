const PERSON_TITLES: Record<string, string> = {
  dr: "Dr.", doctor: "Dr.", prof: "Prof.", professor: "Prof.", mr: "Mr.", mrs: "Mrs.", ms: "Ms.", miss: "Miss",
  engr: "Engr.", engineer: "Engr.", adv: "Adv.", advocate: "Adv.", ch: "Ch.", chd: "Ch.", chaudhry: "Chaudhry", choudhary: "Choudhary",
};

const WORD_FORMS: Record<string, string> = {
  pvt: "Pvt.", ltd: "Ltd.", inc: "Inc.", co: "Co.", bros: "Bros.", govt: "Govt.", dept: "Dept.",
};

const ACRONYMS: Record<string, string> = {
  ab: "AB", aaf: "AAF", ai: "AI", bba: "BBA", bds: "BDS", bsc: "BSc", cnic: "CNIC", ceo: "CEO", cfo: "CFO", cio: "CIO", cmo: "CMO", coo: "COO", cto: "CTO",
  dha: "DHA", dvm: "DVM", fcps: "FCPS", fcci: "FCCI", fcsti: "FCSTI", frcs: "FRCS", gm: "GM", hr: "HR", ict: "ICT", it: "IT", kpk: "KPK",
  llb: "LLB", llm: "LLM", mba: "MBA", mbbs: "MBBS", md: "MD", mphil: "MPhil", msc: "MSc", ms: "MS", ngo: "NGO", phd: "PhD", pkr: "PKR",
  pmdc: "PMDC", pvmc: "PVMC", uaf: "UAF", uae: "UAE", uk: "UK", usa: "USA", uvas: "UVAS", vp: "VP", svp: "SVP",
};

const PLACE_ALIASES: Record<string, string> = {
  fsd: "Faisalabad", faislabad: "Faisalabad", faisalabad: "Faisalabad",
  lhr: "Lahore", lahor: "Lahore", lahore: "Lahore",
  khi: "Karachi", karachi: "Karachi",
  isb: "Islamabad", islamabad: "Islamabad",
  rwp: "Rawalpindi", rawalpindi: "Rawalpindi",
  gujranwala: "Gujranwala", sialkot: "Sialkot", multan: "Multan", peshawar: "Peshawar", quetta: "Quetta",
  punjab: "Punjab", sindh: "Sindh", kpk: "KPK", "khyber pakhtunkhwa": "Khyber Pakhtunkhwa", balochistan: "Balochistan",
  "azad kashmir": "Azad Kashmir", "gilgit baltistan": "Gilgit-Baltistan", federal: "Federal",
  pakistan: "Pakistan", "united arab emirates": "United Arab Emirates", uae: "UAE", "saudi arabia": "Saudi Arabia",
  qatar: "Qatar", oman: "Oman", bahrain: "Bahrain", kuwait: "Kuwait", "united kingdom": "United Kingdom", uk: "UK",
  "united states": "United States", usa: "USA", canada: "Canada", australia: "Australia", germany: "Germany",
};

const SMALL_WORDS = new Set(["a", "an", "and", "as", "at", "by", "for", "from", "in", "of", "on", "or", "the", "to", "with", "&"]);

export function normalizeSpaces(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function keyOf(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function titleSegment(segment: string, person = false) {
  if (!segment || !/[A-Za-z]/.test(segment)) return segment;
  if (/^[IVXLCDM]+$/i.test(segment) && segment.length <= 5) return segment.toUpperCase();

  const match = segment.match(/^([^A-Za-z0-9]*)(.*?)([^A-Za-z0-9.]*)$/);
  const prefix = match?.[1] || "";
  const core = match?.[2] || segment;
  const suffix = match?.[3] || "";
  const coreKey = keyOf(core);
  if (!coreKey) return segment;

  if (person && PERSON_TITLES[coreKey]) return `${prefix}${PERSON_TITLES[coreKey]}${suffix}`;
  if (ACRONYMS[coreKey]) return `${prefix}${ACRONYMS[coreKey]}${suffix}`;
  if (WORD_FORMS[coreKey]) return `${prefix}${WORD_FORMS[coreKey]}${suffix}`;

  // Preserve intentional mixed-case brands or surnames such as eBay, iPhone or McDonald.
  const plainCore = core.replace(/[^A-Za-z]/g, "");
  if (/[a-z][A-Z]/.test(plainCore) || (/^[a-z]/.test(plainCore) && /[A-Z]/.test(plainCore.slice(1)))) {
    return `${prefix}${core}${suffix}`;
  }

  const parts = core.split(/([-’'])/);
  const formatted = parts.map((part) => {
    if (part === "-" || part === "'" || part === "’" || !/[A-Za-z]/.test(part)) return part;
    const partKey = keyOf(part);
    if (person && PERSON_TITLES[partKey]) return PERSON_TITLES[partKey];
    if (ACRONYMS[partKey]) return ACRONYMS[partKey];
    if (WORD_FORMS[partKey]) return WORD_FORMS[partKey];
    if (/^[A-Za-z]\.?$/.test(part)) return `${part.charAt(0).toUpperCase()}${part.endsWith(".") ? "." : ""}`;
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }).join("");

  return `${prefix}${formatted}${suffix}`;
}

function formatWords(value: unknown, options?: { person?: boolean; smallWords?: boolean }) {
  const raw = normalizeSpaces(value);
  if (!raw || !/[A-Za-z]/.test(raw)) return raw;
  const words = raw.split(" ");
  return words.map((word, index) => {
    const cleanKey = keyOf(word);
    if (options?.smallWords && index > 0 && SMALL_WORDS.has(cleanKey)) return cleanKey === "" ? word : cleanKey;
    return titleSegment(word, Boolean(options?.person));
  }).join(" ");
}

export function formatPersonName(value: unknown) {
  return formatWords(value, { person: true });
}

export function formatPlaceName(value: unknown) {
  const raw = normalizeSpaces(value);
  if (!raw) return "";
  const alias = PLACE_ALIASES[raw.toLowerCase().replace(/[._]+/g, " ").replace(/\s+/g, " ").trim()];
  if (alias) return alias;
  return formatWords(raw, { smallWords: false });
}

export function formatProfessionalLabel(value: unknown) {
  return formatWords(value, { smallWords: true });
}

export function formatOrganizationName(value: unknown) {
  return formatWords(value, { smallWords: true });
}

function normalizeFamily(value: any) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  return {
    ...value,
    fatherName: formatPersonName(value.fatherName),
    spouseName: formatPersonName(value.spouseName),
    familyContactName: formatPersonName(value.familyContactName),
    emergencyContactName: formatPersonName(value.emergencyContactName),
    familyCity: formatPlaceName(value.familyCity),
    familyBranch: formatProfessionalLabel(value.familyBranch),
    caste: formatProfessionalLabel(value.caste),
    religiousSect: formatProfessionalLabel(value.religiousSect),
    emergencyRelationship: formatProfessionalLabel(value.emergencyRelationship),
  };
}

function normalizeChild(value: any) {
  if (!value || typeof value !== "object") return value;
  return { ...value, fullName: formatPersonName(value.fullName), education: formatProfessionalLabel(value.education) };
}

export function normalizeMemberDisplay<T extends Record<string, any>>(record: T): T {
  if (!record || typeof record !== "object") return record;
  const familyInfo = normalizeFamily(record.familyInfo);
  const family = normalizeFamily(record.family);
  const referrerMember = record.referrerMember && typeof record.referrerMember === "object"
    ? { ...record.referrerMember, fullName: formatPersonName(record.referrerMember.fullName), city: formatPlaceName(record.referrerMember.city) }
    : record.referrerMember;
  return {
    ...record,
    fullName: formatPersonName(record.fullName),
    fatherName: formatPersonName(record.fatherName),
    city: formatPlaceName(record.city),
    district: formatPlaceName(record.district),
    province: formatPlaceName(record.province),
    localArea: formatPlaceName(record.localArea),
    occupation: formatProfessionalLabel(record.occupation),
    education: formatProfessionalLabel(record.education),
    designation: formatProfessionalLabel(record.designation),
    institutionName: formatOrganizationName(record.institutionName),
    businessName: formatOrganizationName(record.businessName),
    familyInfo,
    family,
    children: Array.isArray(record.children) ? record.children.map(normalizeChild) : record.children,
    referrerMember,
  } as T;
}

export function normalizeMemberPayload<T extends Record<string, any>>(record: T): T {
  return normalizeMemberDisplay(record);
}

function normalizeLayer(layer: any, formatter: (value: unknown) => string) {
  if (!layer || typeof layer !== "object" || Array.isArray(layer)) return layer;
  const mapList = (value: any) => Array.isArray(value) ? value.map(formatter).filter(Boolean) : value;
  return { ...layer, primary: mapList(layer.primary), secondary: mapList(layer.secondary), acceptable: mapList(layer.acceptable) };
}

function normalizePreferenceData(value: any) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  return {
    ...value,
    education: normalizeLayer(value.education, formatProfessionalLabel),
    profession: normalizeLayer(value.profession, formatProfessionalLabel),
    country: normalizeLayer(value.country, formatPlaceName),
    city: normalizeLayer(value.city, formatPlaceName),
    maritalStatus: normalizeLayer(value.maritalStatus, formatProfessionalLabel),
    familySetup: normalizeLayer(value.familySetup, formatProfessionalLabel),
    residenceStatus: normalizeLayer(value.residenceStatus, formatProfessionalLabel),
    relocation: normalizeLayer(value.relocation, formatProfessionalLabel),
  };
}

function normalizeProfileData(value: any) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  return {
    ...value,
    familySetup: formatProfessionalLabel(value.familySetup),
    sect: formatProfessionalLabel(value.sect),
    languages: Array.isArray(value.languages) ? value.languages.map(formatProfessionalLabel).filter(Boolean) : value.languages,
    relocation: formatProfessionalLabel(value.relocation),
    employmentType: formatProfessionalLabel(value.employmentType),
    employerType: formatProfessionalLabel(value.employerType),
    nationality: formatProfessionalLabel(value.nationality),
    residenceStatus: formatProfessionalLabel(value.residenceStatus),
  };
}

export function normalizeMatrimonialDisplay<T extends Record<string, any>>(record: T): T {
  if (!record || typeof record !== "object") return record;
  return {
    ...record,
    name: formatPersonName(record.name),
    city: formatPlaceName(record.city),
    country: formatPlaceName(record.country),
    province: formatPlaceName(record.province),
    nationality: formatProfessionalLabel(record.nationality),
    education: formatProfessionalLabel(record.education),
    profession: formatProfessionalLabel(record.profession),
    maritalStatus: formatProfessionalLabel(record.maritalStatus),
    residenceStatus: formatProfessionalLabel(record.residenceStatus),
    employmentType: formatProfessionalLabel(record.employmentType),
    employerType: formatProfessionalLabel(record.employerType),
    relationToCandidate: formatProfessionalLabel(record.relationToCandidate),
    profileData: normalizeProfileData(record.profileData),
    preferenceData: normalizePreferenceData(record.preferenceData),
  } as T;
}

export function normalizeMatrimonialPayload<T extends Record<string, any>>(record: T): T {
  return normalizeMatrimonialDisplay(record);
}

export function normalizeMatrimonialReference<T extends Record<string, any>>(record: T): T {
  if (!record || typeof record !== "object") return record;
  return {
    ...record,
    name: formatPersonName(record.name),
    profession: formatProfessionalLabel(record.profession),
    city: formatPlaceName(record.city),
    memberName: formatPersonName(record.memberName),
    memberCity: formatPlaceName(record.memberCity),
  } as T;
}
