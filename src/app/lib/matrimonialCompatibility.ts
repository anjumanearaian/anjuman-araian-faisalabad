export type TimelineUnit = "days" | "weeks" | "months" | "years";
export type TimelineFlexibility = "firm" | "flexible";

export const TIMELINE_UNITS: Array<{ value: TimelineUnit; label: string; urdu: string }> = [
  { value: "days", label: "Days", urdu: "دن" },
  { value: "weeks", label: "Weeks", urdu: "ہفتے" },
  { value: "months", label: "Months", urdu: "ماہ" },
  { value: "years", label: "Years", urdu: "سال" },
];

export const TIMELINE_FLEXIBILITY_OPTIONS: Array<{ value: TimelineFlexibility; label: string; urdu: string }> = [
  { value: "firm", label: "Target is fairly firm", urdu: "وقت کافی حد تک طے ہے" },
  { value: "flexible", label: "Flexible if the match is suitable", urdu: "مناسب رشتہ ہو تو وقت میں لچک ہے" },
];

export const BEHAVIOR_QUESTIONS = [
  {
    key: "familyInvolvement",
    label: "Family involvement in major decisions",
    urdu: "اہم فیصلوں میں خاندان کی شمولیت کتنی پسند ہے؟",
    low: "Mostly independent",
    high: "Strong family involvement",
  },
  {
    key: "communicationDirectness",
    label: "Communication style",
    urdu: "بات چیت میں انداز کتنا کھلا اور براہِ راست ہے؟",
    low: "Reserved / indirect",
    high: "Direct / open",
  },
  {
    key: "conflictPace",
    label: "Conflict resolution pace",
    urdu: "اختلاف کی صورت میں بات کتنی جلد حل کرنا پسند کرتے ہیں؟",
    low: "Need time and space",
    high: "Discuss quickly",
  },
  {
    key: "financialPlanning",
    label: "Financial planning style",
    urdu: "خرچ اور بچت میں منصوبہ بندی کتنی اہم ہے؟",
    low: "Flexible / spontaneous",
    high: "Planned / savings focused",
  },
  {
    key: "socialLifestyle",
    label: "Social lifestyle",
    urdu: "سماجی میل جول اور تقریبات میں دلچسپی کتنی ہے؟",
    low: "Home-centered",
    high: "Very social",
  },
  {
    key: "careerPriority",
    label: "Career priority after marriage",
    urdu: "شادی کے بعد کیریئر کو کتنی ترجیح دینا چاہتے ہیں؟",
    low: "Flexible / family-led",
    high: "Strong career focus",
  },
  {
    key: "relocationFlexibility",
    label: "Relocation flexibility",
    urdu: "دوسرے شہر یا ملک منتقل ہونے میں کتنی لچک ہے؟",
    low: "Not open",
    high: "Very open",
  },
  {
    key: "religiousPractice",
    label: "Religious practice in daily married life",
    urdu: "ازدواجی زندگی میں دینی معمولات کی اہمیت کتنی ہے؟",
    low: "Personal / flexible",
    high: "Central / structured",
  },
] as const;

export type BehaviorKey = typeof BEHAVIOR_QUESTIONS[number]["key"];
export type BehaviorAnswers = Partial<Record<BehaviorKey, number>>;

export function blankBehaviorAnswers(): BehaviorAnswers {
  return Object.fromEntries(BEHAVIOR_QUESTIONS.map((q) => [q.key, undefined])) as BehaviorAnswers;
}

export function normalizeTimelineDays(value: string | number | undefined | null, unit: TimelineUnit | string = "months") {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const factor = unit === "days" ? 1 : unit === "weeks" ? 7 : unit === "years" ? 365 : 30;
  return Math.max(1, Math.min(3650, Math.round(amount * factor)));
}

export function timelineLabel(value: string | number | undefined | null, unit: TimelineUnit | string, flexibility: TimelineFlexibility | string = "flexible") {
  const n = Number(value || 0);
  if (!n) return "";
  const singular = n === 1;
  const unitLabel = unit === "days" ? (singular ? "day" : "days") : unit === "weeks" ? (singular ? "week" : "weeks") : unit === "years" ? (singular ? "year" : "years") : (singular ? "month" : "months");
  return `Within ${n} ${unitLabel}${flexibility === "flexible" ? " (flexible)" : ""}`;
}

export function parseLegacyTimeline(raw: unknown): { value: string; unit: TimelineUnit; flexibility: TimelineFlexibility } {
  const text = String(raw || "").trim().toLowerCase();
  if (!text) return { value: "", unit: "months", flexibility: "flexible" };
  if (/asap|as soon|immediate|جلد/.test(text)) return { value: "1", unit: "months", flexibility: "flexible" };
  const nums = (text.match(/\d+(?:\.\d+)?/g) || []).map(Number).filter((n) => Number.isFinite(n));
  const amount = nums.length > 1 ? Math.round((Math.min(...nums) + Math.max(...nums)) / 2) : (nums[0] || 0);
  const unit: TimelineUnit = /day/.test(text) ? "days" : /week/.test(text) ? "weeks" : /year/.test(text) ? "years" : "months";
  return { value: amount ? String(amount) : "", unit, flexibility: /firm|fixed|exact/.test(text) ? "firm" : "flexible" };
}

export function behaviorAnsweredCount(answers: BehaviorAnswers | Record<string, any> | undefined | null) {
  const source = answers || {};
  return BEHAVIOR_QUESTIONS.filter((q) => Number((source as any)[q.key]) >= 1 && Number((source as any)[q.key]) <= 5).length;
}

export function behaviorCompletion(answers: BehaviorAnswers | Record<string, any> | undefined | null) {
  return Math.round((behaviorAnsweredCount(answers) / BEHAVIOR_QUESTIONS.length) * 100);
}

function present(value: any) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "boolean") return value;
  return String(value ?? "").trim().length > 0;
}

export function calculateMatrimonialReadiness(form: Record<string, any>) {
  const core = [form.name, form.age, form.gender, form.city, form.education, form.profession, form.contact, form.maritalStatus, form.candidateConsent];
  const corePercent = Math.round((core.filter(present).length / core.length) * 100);

  const profile = [form.heightCm, form.country, form.province, form.nationality, form.residenceStatus, form.employmentType, form.incomeBand, form.familySetup, form.languages, form.hobbies, form.photoUrl];
  const profilePercent = Math.round((profile.filter(present).length / profile.length) * 100);

  const preferences = [
    form.ageMin || form.ageMax,
    form.heightMin || form.heightMax,
    form.educationPref?.primary || form.educationPref?.secondary || form.educationPref?.acceptable,
    form.professionPref?.primary || form.professionPref?.secondary || form.professionPref?.acceptable,
    form.countryPref?.primary || form.countryPref?.secondary || form.countryPref?.acceptable,
    form.cityPref?.primary || form.cityPref?.secondary || form.cityPref?.acceptable,
    form.timelineValue || form.marriageTimeline,
    form.relocationPref?.primary || form.relocationPref?.secondary || form.relocationPref?.acceptable,
  ];
  const preferencePercent = Math.round((preferences.filter(present).length / preferences.length) * 100);
  const behaviorPercent = behaviorCompletion(form.behaviorAnswers || form.behavior || {});

  const overall = Math.round(corePercent * 0.45 + profilePercent * 0.20 + preferencePercent * 0.25 + behaviorPercent * 0.10);
  return { overall, core: corePercent, profile: profilePercent, preferences: preferencePercent, behavior: behaviorPercent };
}

export function scoreBand(score = 0) {
  if (score >= 80) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Good";
  if (score >= 40) return "Broader";
  return "Low";
}
