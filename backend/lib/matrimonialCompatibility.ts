const BEHAVIOR_KEYS = [
  "familyInvolvement",
  "communicationDirectness",
  "conflictPace",
  "financialPlanning",
  "socialLifestyle",
  "careerPriority",
  "relocationFlexibility",
  "religiousPractice",
] as const;

function clean(value: unknown) { return String(value ?? "").trim(); }
function norm(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim(); }
function object(value: any) { return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
function list(value: any): string[] { if (Array.isArray(value)) return value.map(clean).filter(Boolean); if (typeof value === "string") return value.split(",").map((x) => x.trim()).filter(Boolean); return []; }
function present(value: any) { if (Array.isArray(value)) return value.length > 0; if (typeof value === "boolean") return value; return clean(value).length > 0; }

function importance(value: unknown) {
  const key = norm(value);
  if (["must", "must have"].includes(key)) return 5;
  if (["very important", "high"].includes(key)) return 4;
  if (key === "important") return 3;
  if (["preferred", "preference"].includes(key)) return 2;
  if (["nice", "nice to have"].includes(key)) return 1;
  return 0;
}

function layered(pref: any, candidateValue: unknown) {
  const candidate = norm(candidateValue), primary = list(pref?.primary).map(norm), secondary = list(pref?.secondary).map(norm), acceptable = list(pref?.acceptable).map(norm);
  const configured = primary.length + secondary.length + acceptable.length > 0;
  if (!configured) return { configured: false, known: Boolean(candidate), score: 1, label: "No preference" };
  if (!candidate) return { configured: true, known: false, score: 0, label: "Not specified" };
  const hit = (values: string[]) => values.some((x) => x === candidate || candidate.includes(x) || x.includes(candidate));
  if (hit(primary)) return { configured: true, known: true, score: 1, label: "Primary preference" };
  if (hit(secondary)) return { configured: true, known: true, score: .8, label: "Secondary preference" };
  if (hit(acceptable)) return { configured: true, known: true, score: .6, label: "Acceptable preference" };
  return { configured: true, known: true, score: 0, label: "Outside preference" };
}

function ranged(pref: any, candidateValue: unknown) {
  const min = Number(pref?.min || 0), max = Number(pref?.max || 0), value = Number(candidateValue || 0);
  if (!min && !max) return { configured: false, known: Boolean(value), score: 1, label: "No preference" };
  if (!value) return { configured: true, known: false, score: 0, label: "Not specified" };
  if ((!min || value >= min) && (!max || value <= max)) return { configured: true, known: true, score: 1, label: "Within range" };
  const delta = min && value < min ? min - value : max && value > max ? value - max : 0;
  return { configured: true, known: true, score: delta <= 3 ? .5 : 0, label: delta <= 3 ? "Near preferred range" : "Outside range" };
}

function incomeNumber(value: unknown) {
  if (typeof value === "number") return value;
  const text = clean(value).replace(/,/g, ""), nums = text.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
  if (!nums.length) return 0;
  let n = Math.max(...nums);
  if (/\bk\b/i.test(text)) n *= 1000;
  if (/\bm\b/i.test(text)) n *= 1000000;
  return n;
}

function timelineDays(profile: any) {
  const data = object(profile?.profileData);
  const stored = Number(data.marriageTimelineDays || 0);
  if (stored > 0) return Math.min(stored, 3650);
  const value = Number(data.marriageTimelineValue || 0);
  const unit = norm(data.marriageTimelineUnit || "months");
  if (value > 0) {
    const factor = unit.startsWith("day") ? 1 : unit.startsWith("week") ? 7 : unit.startsWith("year") ? 365 : 30;
    return Math.min(3650, Math.round(value * factor));
  }
  const legacy = clean(data.marriageTimeline);
  if (!legacy) return 0;
  if (/asap|as soon|immediate/.test(legacy.toLowerCase())) return 30;
  const nums = (legacy.match(/\d+(?:\.\d+)?/g) || []).map(Number).filter(Number.isFinite);
  if (!nums.length) return 0;
  const amount = nums.length > 1 ? (Math.min(...nums) + Math.max(...nums)) / 2 : nums[0];
  const lower = legacy.toLowerCase(), factor = /day/.test(lower) ? 1 : /week/.test(lower) ? 7 : /year/.test(lower) ? 365 : 30;
  return Math.min(3650, Math.round(amount * factor));
}

function timelineCompatibility(a: any, b: any) {
  const aDays = timelineDays(a), bDays = timelineDays(b);
  const configured = Boolean(aDays || bDays);
  if (!configured) return { configured: false, known: false, score: 1, label: "Not provided" };
  if (!aDays || !bDays) return { configured: true, known: false, score: 0, label: "Timeline missing on one profile" };
  const diff = Math.abs(aDays - bDays);
  const flexA = norm(object(a.profileData).marriageTimelineFlexibility) !== "firm";
  const flexB = norm(object(b.profileData).marriageTimelineFlexibility) !== "firm";
  const tolerance = flexA || flexB ? 1.25 : 1;
  let score = diff <= 30 * tolerance ? 1 : diff <= 90 * tolerance ? .85 : diff <= 180 * tolerance ? .7 : diff <= 365 * tolerance ? .5 : .2;
  if (flexA && flexB && score < 1) score = Math.min(1, score + .08);
  return { configured: true, known: true, score, label: diff <= 30 ? "Very similar timeline" : diff <= 90 ? "Close timeline" : diff <= 180 ? "Manageable timeline difference" : diff <= 365 ? "Different timeline" : "Major timeline difference" };
}

function behaviorCompatibility(a: any, b: any) {
  const aAnswers = object(object(a?.profileData).behavior), bAnswers = object(object(b?.profileData).behavior);
  const any = BEHAVIOR_KEYS.some((key) => Number(aAnswers[key]) > 0 || Number(bAnswers[key]) > 0);
  if (!any) return { configured: false, known: false, score: 1, label: "Not provided", shared: 0 };
  const scores: number[] = [];
  for (const key of BEHAVIOR_KEYS) {
    const av = Number(aAnswers[key] || 0), bv = Number(bAnswers[key] || 0);
    if (av < 1 || av > 5 || bv < 1 || bv > 5) continue;
    const difference = Math.abs(av - bv);
    scores.push(difference === 0 ? 1 : difference === 1 ? .82 : difference === 2 ? .62 : difference === 3 ? .38 : .15);
  }
  if (!scores.length) return { configured: true, known: false, score: 0, label: "No shared behavior answers", shared: 0 };
  const score = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  return { configured: true, known: true, score, label: `${scores.length}/${BEHAVIOR_KEYS.length} shared lifestyle answers`, shared: scores.length };
}

function categoryAverage(details: any[], category: string) {
  const known = details.filter((item) => item.category === category && item.known);
  if (!known.length) return undefined;
  return Math.round(known.reduce((sum, item) => sum + Number(item.score || 0), 0) / known.length);
}

function directional(owner: any, candidate: any) {
  const pref = object(owner.preferenceData), profile = object(candidate.profileData), details: any[] = [];
  let earned = 0, knownWeight = 0, totalWeight = 0, mustFail = false;
  const add = (criterion: string, result: any, imp: unknown, category = "corePreferences") => {
    if (!result.configured) return;
    const weight = importance(imp) || 2;
    totalWeight += weight;
    if (result.known) { knownWeight += weight; earned += weight * result.score; }
    if (["must", "must have"].includes(norm(imp)) && result.known && result.score < 1) mustFail = true;
    details.push({ criterion, category, result: result.label, score: Math.round(result.score * 100), importance: clean(imp) || "preferred", known: result.known });
  };

  add("Age", ranged(pref.age, candidate.age), pref.age?.importance);
  add("Height", ranged(pref.height, candidate.heightCm || profile.heightCm), pref.height?.importance);
  add("Education", layered(pref.education, candidate.education), pref.education?.importance);
  add("Profession", layered(pref.profession, candidate.profession), pref.profession?.importance);
  add("Country", layered(pref.country, candidate.country || "Pakistan"), pref.country?.importance);
  add("City", layered(pref.city, candidate.city), pref.city?.importance);
  add("Marital status", layered(pref.maritalStatus, candidate.maritalStatus || profile.maritalStatus), pref.maritalStatus?.importance);
  add("Residence status", layered(pref.residenceStatus, candidate.residenceStatus || profile.residenceStatus), pref.residenceStatus?.importance);
  add("Family setup", layered(pref.familySetup, profile.familySetup), pref.familySetup?.importance);
  add("Sect", layered(pref.sect, profile.sect), pref.sect?.importance);
  add("Relocation", layered(pref.relocation, profile.relocation), pref.relocation?.importance);

  const incomeMin = Number(pref.income?.minimum || 0);
  if (incomeMin > 0) {
    const current = incomeNumber(profile.monthlyIncome || candidate.incomeBand);
    add("Income", current ? { configured: true, known: true, score: current >= incomeMin ? 1 : current >= incomeMin * .75 ? .6 : 0, label: current >= incomeMin ? "Meets income preference" : current >= incomeMin * .75 ? "Near income preference" : "Below income preference" } : { configured: true, known: false, score: 0, label: "Income not specified" }, pref.income?.importance);
  }

  add("Marriage timeline", timelineCompatibility(owner, candidate), "important", "marriageTiming");
  add("Lifestyle & behavior", behaviorCompatibility(owner, candidate), "important", "behaviorLifestyle");

  const raw = knownWeight ? Math.round(earned / knownWeight * 100) : 50;
  const confidence = totalWeight ? Math.round(knownWeight / totalWeight * 100) : 50;
  return {
    score: mustFail ? Math.min(39, raw) : raw,
    confidence,
    eligible: !mustFail,
    details,
    categoryScores: {
      corePreferences: categoryAverage(details, "corePreferences"),
      marriageTiming: categoryAverage(details, "marriageTiming"),
      behaviorLifestyle: categoryAverage(details, "behaviorLifestyle"),
    },
  };
}

export function matrimonialCompatibility(a: any, b: any) {
  const ab = directional(a, b), ba = directional(b, a), eligible = ab.eligible && ba.eligible;
  let mutual = Math.round((ab.score + ba.score) / 2);
  if (!eligible) mutual = Math.min(39, mutual);
  const keys = ["corePreferences", "marriageTiming", "behaviorLifestyle"] as const;
  const categoryScores: Record<string, number> = {};
  for (const key of keys) {
    const values = [ab.categoryScores[key], ba.categoryScores[key]].filter((v): v is number => typeof v === "number");
    if (values.length) categoryScores[key] = Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
  }
  return {
    requesterToTargetScore: ab.score,
    targetToRequesterScore: ba.score,
    mutualScore: mutual,
    scoreConfidence: Math.round((ab.confidence + ba.confidence) / 2),
    eligible,
    breakdown: { requesterToTarget: ab.details, targetToRequester: ba.details, categoryScores },
  };
}

function behaviorPercent(profileData: any) {
  const behavior = object(profileData?.behavior);
  const answered = BEHAVIOR_KEYS.filter((key) => Number(behavior[key]) >= 1 && Number(behavior[key]) <= 5).length;
  return Math.round(answered / BEHAVIOR_KEYS.length * 100);
}

export function matrimonialProfileCompleteness(payload: any) {
  const profile = object(payload?.profileData), pref = object(payload?.preferenceData);
  const core = [payload.name, payload.age, payload.gender, payload.city, payload.education, payload.profession, payload.contact, payload.maritalStatus, payload.candidateConsent];
  const profileFields = [payload.heightCm, payload.country, payload.province, payload.nationality, payload.residenceStatus, payload.employmentType, payload.incomeBand, profile.familySetup, profile.languages, profile.hobbies, payload.photoUrl];
  const preferenceFields = [
    pref.age?.min || pref.age?.max,
    pref.height?.min || pref.height?.max,
    list(pref.education?.primary).length || list(pref.education?.secondary).length || list(pref.education?.acceptable).length,
    list(pref.profession?.primary).length || list(pref.profession?.secondary).length || list(pref.profession?.acceptable).length,
    list(pref.country?.primary).length || list(pref.country?.secondary).length || list(pref.country?.acceptable).length,
    list(pref.city?.primary).length || list(pref.city?.secondary).length || list(pref.city?.acceptable).length,
    profile.marriageTimelineDays || profile.marriageTimeline,
    list(pref.relocation?.primary).length || list(pref.relocation?.secondary).length || list(pref.relocation?.acceptable).length,
  ];
  const corePercent = Math.round(core.filter(present).length / core.length * 100);
  const profilePercent = Math.round(profileFields.filter(present).length / profileFields.length * 100);
  const preferencePercent = Math.round(preferenceFields.filter(present).length / preferenceFields.length * 100);
  const behavior = behaviorPercent(profile);
  return Math.round(corePercent * .45 + profilePercent * .20 + preferencePercent * .25 + behavior * .10);
}
