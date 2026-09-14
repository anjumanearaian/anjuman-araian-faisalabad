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

const SMALL_WORDS = new Set(["a", "an", "and", "as", "at", "by", "for", "from", "in", "of", "on", "or", "the", "to", "with"]);

export function normalizeSpaces(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function keyOf(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function hasOwn(record: Record<string, any>, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
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
    if (options?.smallWords && index > 0 && SMALL_WORDS.has(cleanKey)) {
      return word.replace(/[A-Za-z]+/, (part) => part.toLowerCase());
    }
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

function setFormatted(target: Record<string, any>, source: Record<string, any>, key: string, formatter: (value: unknown) => string) {
  if (hasOwn(source, key)) target[key] = formatter(source[key]);
}

function normalizeFamily(value: any) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const next = { ...value };
  setFormatted(next, value, "fatherName", formatPersonName);
  setFormatted(next, value, "spouseName", formatPersonName);
  setFormatted(next, value, "familyContactName", formatPersonName);
  setFormatted(next, value, "emergencyContactName", formatPersonName);
  setFormatted(next, value, "familyCity", formatPlaceName);
  setFormatted(next, value, "familyBranch", formatProfessionalLabel);
  setFormatted(next, value, "caste", formatProfessionalLabel);
  setFormatted(next, value, "religiousSect", formatProfessionalLabel);
  setFormatted(next, value, "emergencyRelationship", formatProfessionalLabel);
  return next;
}

function normalizeChild(value: any) {
  if (!value || typeof value !== "object") return value;
  const next = { ...value };
  setFormatted(next, value, "fullName", formatPersonName);
  setFormatted(next, value, "education", formatProfessionalLabel);
  return next;
}

export function normalizeMemberDisplay<T extends Record<string, any>>(record: T): T {
  if (!record || typeof record !== "object") return record;
  const next: Record<string, any> = { ...record };
  setFormatted(next, record, "fullName", formatPersonName);
  setFormatted(next, record, "fatherName", formatPersonName);
  setFormatted(next, record, "city", formatPlaceName);
  setFormatted(next, record, "district", formatPlaceName);
  setFormatted(next, record, "province", formatPlaceName);
  setFormatted(next, record, "localArea", formatPlaceName);
  setFormatted(next, record, "occupation", formatProfessionalLabel);
  setFormatted(next, record, "education", formatProfessionalLabel);
  setFormatted(next, record, "designation", formatProfessionalLabel);
  setFormatted(next, record, "institutionName", formatOrganizationName);
  setFormatted(next, record, "businessName", formatOrganizationName);
  if (hasOwn(record, "familyInfo")) next.familyInfo = normalizeFamily(record.familyInfo);
  if (hasOwn(record, "family")) next.family = normalizeFamily(record.family);
  if (hasOwn(record, "children") && Array.isArray(record.children)) next.children = record.children.map(normalizeChild);
  if (hasOwn(record, "referrerMember") && record.referrerMember && typeof record.referrerMember === "object") {
    const referrer = { ...record.referrerMember };
    setFormatted(referrer, record.referrerMember, "fullName", formatPersonName);
    setFormatted(referrer, record.referrerMember, "city", formatPlaceName);
    next.referrerMember = referrer;
  }
  return next as T;
}

export function normalizeMemberPayload<T extends Record<string, any>>(record: T): T {
  return normalizeMemberDisplay(record);
}

function normalizeLayer(layer: any, formatter: (value: unknown) => string) {
  if (!layer || typeof layer !== "object" || Array.isArray(layer)) return layer;
  const next = { ...layer };
  const mapList = (value: any) => Array.isArray(value) ? value.map(formatter).filter(Boolean) : value;
  if (hasOwn(layer, "primary")) next.primary = mapList(layer.primary);
  if (hasOwn(layer, "secondary")) next.secondary = mapList(layer.secondary);
  if (hasOwn(layer, "acceptable")) next.acceptable = mapList(layer.acceptable);
  return next;
}

function normalizePreferenceData(value: any) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const next = { ...value };
  if (hasOwn(value, "education")) next.education = normalizeLayer(value.education, formatProfessionalLabel);
  if (hasOwn(value, "profession")) next.profession = normalizeLayer(value.profession, formatProfessionalLabel);
  if (hasOwn(value, "country")) next.country = normalizeLayer(value.country, formatPlaceName);
  if (hasOwn(value, "city")) next.city = normalizeLayer(value.city, formatPlaceName);
  if (hasOwn(value, "maritalStatus")) next.maritalStatus = normalizeLayer(value.maritalStatus, formatProfessionalLabel);
  if (hasOwn(value, "familySetup")) next.familySetup = normalizeLayer(value.familySetup, formatProfessionalLabel);
  if (hasOwn(value, "residenceStatus")) next.residenceStatus = normalizeLayer(value.residenceStatus, formatProfessionalLabel);
  if (hasOwn(value, "relocation")) next.relocation = normalizeLayer(value.relocation, formatProfessionalLabel);
  return next;
}

function normalizeProfileData(value: any) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const next = { ...value };
  setFormatted(next, value, "familySetup", formatProfessionalLabel);
  setFormatted(next, value, "sect", formatProfessionalLabel);
  setFormatted(next, value, "relocation", formatProfessionalLabel);
  setFormatted(next, value, "employmentType", formatProfessionalLabel);
  setFormatted(next, value, "employerType", formatProfessionalLabel);
  setFormatted(next, value, "nationality", formatProfessionalLabel);
  setFormatted(next, value, "residenceStatus", formatProfessionalLabel);
  if (hasOwn(value, "languages") && Array.isArray(value.languages)) next.languages = value.languages.map(formatProfessionalLabel).filter(Boolean);
  return next;
}

export function normalizeMatrimonialDisplay<T extends Record<string, any>>(record: T): T {
  if (!record || typeof record !== "object") return record;
  const next: Record<string, any> = { ...record };
  setFormatted(next, record, "name", formatPersonName);
  setFormatted(next, record, "city", formatPlaceName);
  setFormatted(next, record, "country", formatPlaceName);
  setFormatted(next, record, "province", formatPlaceName);
  setFormatted(next, record, "nationality", formatProfessionalLabel);
  setFormatted(next, record, "education", formatProfessionalLabel);
  setFormatted(next, record, "profession", formatProfessionalLabel);
  setFormatted(next, record, "maritalStatus", formatProfessionalLabel);
  setFormatted(next, record, "residenceStatus", formatProfessionalLabel);
  setFormatted(next, record, "employmentType", formatProfessionalLabel);
  setFormatted(next, record, "employerType", formatProfessionalLabel);
  setFormatted(next, record, "relationToCandidate", formatProfessionalLabel);
  if (hasOwn(record, "profileData")) next.profileData = normalizeProfileData(record.profileData);
  if (hasOwn(record, "preferenceData")) next.preferenceData = normalizePreferenceData(record.preferenceData);
  return next as T;
}

export function normalizeMatrimonialPayload<T extends Record<string, any>>(record: T): T {
  return normalizeMatrimonialDisplay(record);
}

export function normalizeMatrimonialReference<T extends Record<string, any>>(record: T): T {
  if (!record || typeof record !== "object") return record;
  const next: Record<string, any> = { ...record };
  setFormatted(next, record, "name", formatPersonName);
  setFormatted(next, record, "profession", formatProfessionalLabel);
  setFormatted(next, record, "city", formatPlaceName);
  setFormatted(next, record, "memberName", formatPersonName);
  setFormatted(next, record, "memberCity", formatPlaceName);
  return next as T;
}
