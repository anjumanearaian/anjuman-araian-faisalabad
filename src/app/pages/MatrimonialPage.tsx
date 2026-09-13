import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ArrowLeft, CheckCircle, ChevronDown, FileCheck2, Heart, Loader2, LockKeyhole, Save, ShieldCheck, Upload } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { PasswordlessSignIn } from "../components/PasswordlessSignIn";
import { MultiImageUpload } from "../components/ui/MultiImageUpload";
import { apiClient } from "../lib/apiClient";
import { uploadFile } from "../lib/upload";
import { createMatrimonial, fetchMyMatrimonialProfiles, MatrimonialProfile } from "../lib/matrimonialStore";
import { fetchSiteSettings, getSiteSettings, SiteSettings } from "../lib/settingsStore";
import { citiesForProvince, pakistanCitiesByProvince } from "../lib/pakistanLocations";
import {
  CONTACT_PRIVACY_OPTIONS, EDUCATION_OPTIONS, EMPLOYMENT_TYPE_OPTIONS, FAMILY_SETUP_OPTIONS, IMPORTANCE_OPTIONS, INCOME_BANDS,
  MARITAL_STATUS_OPTIONS, PHOTO_PRIVACY_OPTIONS, PROFESSION_OPTIONS, RESIDENCE_STATUS_OPTIONS, SECT_OPTIONS,
} from "../lib/matrimonialOptions";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";
const PROVINCES = Object.keys(pakistanCitiesByProvince);
const COMMON_COUNTRIES = ["Pakistan", "United Arab Emirates", "Saudi Arabia", "Qatar", "Oman", "Bahrain", "Kuwait", "United Kingdom", "United States", "Canada", "Australia", "Germany", "Other"];
const RELATIONS = ["Self", "Son", "Daughter", "Brother", "Sister", "Other family member"];

type Layer = { primary: string; secondary: string; acceptable: string; importance: string };
type FormState = {
  profileId: string;
  name: string; relationToCandidate: string; candidateConsent: boolean; gender: "male" | "female"; age: string; dateOfBirth: string; heightCm: string;
  maritalStatus: string; country: string; province: string; city: string; nationality: string; residenceStatus: string;
  education: string; profession: string; employmentType: string; employerType: string; incomeBand: string; currency: string;
  contact: string; familySetup: string; sect: string; languages: string; hobbies: string; familyNotes: string; marriageTimeline: string; relocation: string;
  photoUrl: string; additionalPhotos: string[]; paymentProofUrl: string; paymentMethod: string;
  ageMin: string; ageMax: string; ageImportance: string; heightMin: string; heightMax: string; heightImportance: string;
  educationPref: Layer; professionPref: Layer; countryPref: Layer; cityPref: Layer; maritalPref: Layer; residencePref: Layer; familyPref: Layer; sectPref: Layer; relocationPref: Layer;
  incomeMinimum: string; incomeImportance: string; partnerNotes: string;
  photoVisibility: string; contactVisibility: string; broadLocation: boolean; showHeight: boolean;
};

const blankLayer = (): Layer => ({ primary: "", secondary: "", acceptable: "", importance: "preferred" });
const blank = (): FormState => ({
  profileId: "", name: "", relationToCandidate: "Self", candidateConsent: false, gender: "male", age: "", dateOfBirth: "", heightCm: "",
  maritalStatus: "Never Married", country: "Pakistan", province: "Punjab", city: "Faisalabad", nationality: "Pakistani", residenceStatus: "Pakistan Resident",
  education: "", profession: "", employmentType: "", employerType: "", incomeBand: "Prefer not to say", currency: "PKR",
  contact: "", familySetup: "", sect: "Prefer not to specify", languages: "", hobbies: "", familyNotes: "", marriageTimeline: "", relocation: "",
  photoUrl: "", additionalPhotos: [], paymentProofUrl: "", paymentMethod: "",
  ageMin: "", ageMax: "", ageImportance: "must", heightMin: "", heightMax: "", heightImportance: "nice to have",
  educationPref: blankLayer(), professionPref: blankLayer(), countryPref: blankLayer(), cityPref: blankLayer(), maritalPref: blankLayer(), residencePref: blankLayer(), familyPref: blankLayer(), sectPref: blankLayer(), relocationPref: blankLayer(),
  incomeMinimum: "", incomeImportance: "preferred", partnerNotes: "",
  photoVisibility: "mutual_interest", contactVisibility: "mutual_interest", broadLocation: true, showHeight: true,
});

function splitValues(value: string) { return value.split(",").map((v) => v.trim()).filter(Boolean); }
function layerObject(v: Layer) { return { primary: splitValues(v.primary), secondary: splitValues(v.secondary), acceptable: splitValues(v.acceptable), importance: v.importance }; }
function layerFrom(data: any): Layer { return { primary: Array.isArray(data?.primary) ? data.primary.join(", ") : "", secondary: Array.isArray(data?.secondary) ? data.secondary.join(", ") : "", acceptable: Array.isArray(data?.acceptable) ? data.acceptable.join(", ") : "", importance: data?.importance || "preferred" }; }

function fromProfile(p: MatrimonialProfile): FormState {
  const profile = p.profileData || {};
  const pref = p.preferenceData || {};
  const privacy = p.privacyData || {};
  return {
    ...blank(), profileId: p.id, name: p.name || "", relationToCandidate: p.relationToCandidate || "Self", candidateConsent: Boolean(p.candidateConsent), gender: (p.gender as any) || "male", age: p.age || "", dateOfBirth: p.dateOfBirth || "", heightCm: p.heightCm ? String(p.heightCm) : "",
    maritalStatus: p.maritalStatus || profile.maritalStatus || "Never Married", country: p.country || "Pakistan", province: p.province || "", city: p.city || "", nationality: p.nationality || profile.nationality || "", residenceStatus: p.residenceStatus || profile.residenceStatus || "",
    education: p.education || "", profession: p.profession || "", employmentType: p.employmentType || profile.employmentType || "", employerType: p.employerType || profile.employerType || "", incomeBand: p.incomeBand || profile.incomeBand || "Prefer not to say", currency: p.currency || "PKR",
    contact: p.contact || "", familySetup: profile.familySetup || "", sect: profile.sect || "Prefer not to specify", languages: Array.isArray(profile.languages) ? profile.languages.join(", ") : "", hobbies: profile.hobbies || "", familyNotes: profile.familyNotes || p.familyBackground || "", marriageTimeline: profile.marriageTimeline || "", relocation: profile.relocation || "",
    photoUrl: p.photoUrl || "", additionalPhotos: p.additionalPhotos || [], paymentProofUrl: p.paymentProofUrl || "", paymentMethod: "",
    ageMin: pref.age?.min ? String(pref.age.min) : "", ageMax: pref.age?.max ? String(pref.age.max) : "", ageImportance: pref.age?.importance || "must",
    heightMin: pref.height?.min ? String(pref.height.min) : "", heightMax: pref.height?.max ? String(pref.height.max) : "", heightImportance: pref.height?.importance || "nice to have",
    educationPref: layerFrom(pref.education), professionPref: layerFrom(pref.profession), countryPref: layerFrom(pref.country), cityPref: layerFrom(pref.city), maritalPref: layerFrom(pref.maritalStatus), residencePref: layerFrom(pref.residenceStatus), familyPref: layerFrom(pref.familySetup), sectPref: layerFrom(pref.sect), relocationPref: layerFrom(pref.relocation),
    incomeMinimum: pref.income?.minimum ? String(pref.income.minimum) : "", incomeImportance: pref.income?.importance || "preferred", partnerNotes: pref.notes || "",
    photoVisibility: privacy.photoVisibility || "mutual_interest", contactVisibility: privacy.contactVisibility || "mutual_interest", broadLocation: privacy.broadLocation !== false, showHeight: privacy.showHeight !== false,
  };
}

export function MatrimonialPage() {
  const [params] = useSearchParams();
  const requestedId = params.get("profileId") || "";
  const [authenticated, setAuthenticated] = useState(() => Boolean(localStorage.getItem("araian_member_token")));
  const [settings, setSettings] = useState<SiteSettings>(() => getSiteSettings());
  const [form, setForm] = useState<FormState>(() => blank());
  const [initializing, setInitializing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState("");
  const [submitted, setSubmitted] = useState<MatrimonialProfile | null>(null);
  const hydrated = useRef(false);

  const pakistanCities = useMemo(() => form.country === "Pakistan" ? citiesForProvince(form.province) : [], [form.country, form.province]);
  const completion = useMemo(() => {
    const values = [form.name, form.age, form.city, form.education, form.profession, form.contact, form.maritalStatus, form.photoUrl, form.candidateConsent];
    return Math.round((values.filter(Boolean).length / values.length) * 100);
  }, [form]);

  useEffect(() => {
    if (!authenticated) { setInitializing(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const [site, profiles] = await Promise.all([fetchSiteSettings(), fetchMyMatrimonialProfiles()]);
        if (cancelled) return;
        setSettings(site);
        const existing = requestedId ? profiles.find((p) => p.id === requestedId) : undefined;
        const next = existing ? fromProfile(existing) : blank();
        if (!next.paymentMethod && site.paymentMethods?.[0]?.bankName) next.paymentMethod = site.paymentMethods[0].bankName;
        const draftType = `matrimonial:${requestedId || "new"}`;
        const draft = await apiClient<any>(`/forms/${encodeURIComponent(draftType)}`).catch(() => null);
        setForm(draft?.data && draft.status !== "submitted" ? { ...next, ...draft.data, profileId: requestedId || draft.data.profileId || "" } : next);
        hydrated.current = true;
        setSaveState(existing ? "Editing existing candidate profile" : "New private candidate profile");
      } catch (e: any) {
        if (e?.status === 401) { localStorage.removeItem("araian_member_token"); setAuthenticated(false); }
        else setErrors({ form: e?.message || "Could not load the matrimonial form." });
      } finally { if (!cancelled) setInitializing(false); }
    })();
    return () => { cancelled = true; };
  }, [authenticated, requestedId]);

  useEffect(() => {
    if (!authenticated || !hydrated.current || initializing || submitted) return;
    setSaveState("Saving draft...");
    const timer = window.setTimeout(() => {
      const draftType = `matrimonial:${form.profileId || "new"}`;
      apiClient(`/forms/${encodeURIComponent(draftType)}`, { method: "PUT", body: JSON.stringify({ data: form, completion, currentStep: completion < 55 ? 1 : 2, status: "incomplete", paymentStatus: form.paymentProofUrl ? "submitted" : "pending" }) })
        .then(() => setSaveState("Draft saved securely"))
        .catch(() => setSaveState("Draft could not be saved"));
    }, 800);
    return () => window.clearTimeout(timer);
  }, [form, authenticated, initializing, submitted, completion]);

  const set = (key: keyof FormState, value: any) => { setForm((old) => ({ ...old, [key]: value })); setErrors((old) => ({ ...old, [key]: "" })); };
  const setLayer = (key: keyof Pick<FormState, "educationPref" | "professionPref" | "countryPref" | "cityPref" | "maritalPref" | "residencePref" | "familyPref" | "sectPref" | "relocationPref">, child: keyof Layer, value: string) => setForm((old) => ({ ...old, [key]: { ...(old[key] as Layer), [child]: value } }));
  const changeProvince = (province: string) => { const cities = citiesForProvince(province); setForm((old) => ({ ...old, province, city: cities.includes(old.city) ? old.city : (cities[0] || "") })); };

  const upload = (key: "photoUrl" | "paymentProofUrl") => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const max = file.type.startsWith("image/") ? 12 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > max) { setErrors((old) => ({ ...old, [key]: "File is too large." })); return; }
    setUploading((old) => ({ ...old, [key]: true }));
    try { set(key, await uploadFile(file, key === "photoUrl" ? "matrimonial-photo" : "matrimonial-payment-proof")); }
    catch (e: any) { setErrors((old) => ({ ...old, [key]: e?.message || "Upload failed." })); }
    finally { setUploading((old) => ({ ...old, [key]: false })); e.target.value = ""; }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Candidate name is required.";
    if (!form.age || Number(form.age) < 18) next.age = "Candidate must be 18 or above.";
    if (!form.city.trim()) next.city = "City is required.";
    if (!form.education) next.education = "Education is required.";
    if (!form.profession) next.profession = "Profession is required.";
    if (!form.contact.trim()) next.contact = "A private contact / WhatsApp number is required.";
    if (!form.photoUrl) next.photoUrl = "A candidate photograph is required for verification. It remains private under your photo setting.";
    if (!form.candidateConsent) next.candidateConsent = "Confirm that the candidate has consented to this profile and matchmaking process.";
    if (form.ageMin && form.ageMax && Number(form.ageMin) > Number(form.ageMax)) next.ageMax = "Maximum preferred age must be greater than minimum age.";
    if (form.heightMin && form.heightMax && Number(form.heightMin) > Number(form.heightMax)) next.heightMax = "Maximum preferred height must be greater than minimum height.";
    setErrors(next);
    if (Object.keys(next).length) window.setTimeout(() => document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (saving || !validate()) return;
    setSaving(true); setErrors({});
    const profileData = {
      familySetup: form.familySetup, sect: form.sect, languages: splitValues(form.languages), hobbies: form.hobbies, familyNotes: form.familyNotes,
      marriageTimeline: form.marriageTimeline, relocation: form.relocation, employmentType: form.employmentType, employerType: form.employerType,
      incomeBand: form.incomeBand, nationality: form.nationality, residenceStatus: form.residenceStatus,
    };
    const preferenceData = {
      age: { min: Number(form.ageMin || 0) || undefined, max: Number(form.ageMax || 0) || undefined, importance: form.ageImportance },
      height: { min: Number(form.heightMin || 0) || undefined, max: Number(form.heightMax || 0) || undefined, importance: form.heightImportance },
      education: layerObject(form.educationPref), profession: layerObject(form.professionPref), country: layerObject(form.countryPref), city: layerObject(form.cityPref),
      maritalStatus: layerObject(form.maritalPref), residenceStatus: layerObject(form.residencePref), familySetup: layerObject(form.familyPref), sect: layerObject(form.sectPref), relocation: layerObject(form.relocationPref),
      income: { minimum: Number(form.incomeMinimum || 0) || undefined, importance: form.incomeImportance }, notes: form.partnerNotes,
    };
    const familyBackground = [`Family setup: ${form.familySetup || "Not specified"}`, form.sect && form.sect !== "Prefer not to specify" ? `Sect: ${form.sect}` : "", form.familyNotes].filter(Boolean).join(" | ");
    const requirements = [`Age: ${form.ageMin || "Any"}-${form.ageMax || "Any"}`, form.educationPref.primary ? `Education priority: ${form.educationPref.primary}` : "", form.professionPref.primary ? `Profession priority: ${form.professionPref.primary}` : "", form.partnerNotes].filter(Boolean).join(" | ");
    try {
      const saved = await createMatrimonial({
        profileId: form.profileId || undefined, name: form.name.trim(), gender: form.gender, age: form.age, dateOfBirth: form.dateOfBirth || undefined,
        heightCm: form.heightCm ? Number(form.heightCm) : null, maritalStatus: form.maritalStatus, country: form.country, province: form.country === "Pakistan" ? form.province : undefined, city: form.city,
        nationality: form.nationality, residenceStatus: form.residenceStatus, education: form.education, profession: form.profession, employmentType: form.employmentType, employerType: form.employerType,
        incomeBand: form.incomeBand, currency: form.currency, contact: form.contact.trim(), relationToCandidate: form.relationToCandidate,
        familyBackground, requirements, profileData, preferenceData,
        privacyData: { profileVisibility: "matches_only", photoVisibility: form.photoVisibility, contactVisibility: form.contactVisibility, broadLocation: form.broadLocation, showHeight: form.showHeight },
        candidateConsent: form.candidateConsent, applicationSource: form.relationToCandidate === "Self" ? "self_service" : "guardian_service",
        photoUrl: form.photoUrl, additionalPhotos: form.additionalPhotos, paymentProofUrl: form.paymentProofUrl || undefined, paymentMethod: form.paymentMethod || undefined,
      });
      setSubmitted(saved);
      setSaveState("Submitted for review");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) { setErrors({ form: e?.message || "The profile could not be submitted." }); window.scrollTo({ top: 250, behavior: "smooth" }); }
    finally { setSaving(false); }
  };

  if (!authenticated) return <div><PageHeader title="Matrimonial Candidate Profile" subtitle="Private verified registration" breadcrumb={["Home", "Matrimonial", "Profile"]}/><section style={{ maxWidth: 520, margin: "46px auto", padding: "0 20px" }}><div style={card}><LockKeyhole size={32} color={GOLD}/><h2 style={title}>Verify your account</h2><p style={muted}>Sign in with a verified email before entering private matrimonial information.</p><PasswordlessSignIn onAuthenticated={() => setAuthenticated(true)} compact/></div></section></div>;
  if (initializing) return <div><PageHeader title="Matrimonial Candidate Profile" breadcrumb={["Home", "Matrimonial", "Profile"]}/><div style={{ minHeight: 300, display: "grid", placeItems: "center", color: "#777" }}><Loader2 className="spin"/> Loading secure form...</div></div>;
  if (submitted) return <div><PageHeader title="Profile Submitted" subtitle="Private matrimonial application" breadcrumb={["Home", "Matrimonial"]}/><section style={{ maxWidth: 680, margin: "52px auto", padding: "0 20px" }}><div style={{ ...card, textAlign: "center" }}><CheckCircle size={48} color={GREEN}/><h2 style={title}>Candidate profile received</h2><p style={muted}>Reference <strong>{submitted.profileCode}</strong>. The profile remains hidden until review, payment clearance where applicable, consent checks and manager approval are complete.</p><div style={{ display: "flex", gap: 9, justifyContent: "center", flexWrap: "wrap", marginTop: 18 }}><Link to="/matrimonial" style={secondaryLink}>Matrimonial Dashboard</Link><button onClick={() => window.print()} style={primaryButton}><Save size={14}/> Print / Save Record</button></div></div></section></div>;

  return <div>
    <PageHeader title={form.profileId ? "Edit Candidate Profile" : "Create Candidate Profile"} subtitle="Structured profile, layered partner preferences and privacy controls" breadcrumb={["Home", "Matrimonial", form.profileId ? "Edit Profile" : "New Profile"]}/>
    <section style={{ maxWidth: 1000, margin: "0 auto", padding: "30px 20px 72px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}><Link to="/matrimonial" style={{ color: GREEN, textDecoration: "none", fontWeight: 800, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}><ArrowLeft size={14}/> Dashboard</Link><span style={{ color: "#778078", fontSize: 11 }}>{saveState} · Required profile {completion}% complete</span></div>
      <div style={{ background: "#f0f7f3", border: "1px solid #d7e7dc", borderRadius: 11, padding: 13, marginBottom: 16, display: "flex", gap: 9 }}><ShieldCheck size={18} color={GREEN}/><div style={{ color: "#526159", fontSize: 12, lineHeight: 1.65 }}><strong>Privacy rule:</strong> candidate photographs, names and contacts are not public. The matching engine initially uses anonymized profile codes. Photo/contact release follows the privacy setting and mutual-consent workflow.</div></div>
      {errors.form && <div style={errorBox}>{errors.form}</div>}
      <form onSubmit={submit} style={card}>
        <Section n="1" title="Candidate & Guardian" subtitle="Who is the profile for, and who is managing it?"/>
        <div className="grid2" style={grid2}>
          <Field label="Profile managed for *"><select style={input} value={form.relationToCandidate} onChange={(e) => set("relationToCandidate", e.target.value)}>{RELATIONS.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Candidate Full Name *" error={errors.name}><input autoComplete="name" style={inputError(errors.name)} value={form.name} onChange={(e) => set("name", e.target.value)}/></Field>
          <Field label="Gender *"><select style={input} value={form.gender} onChange={(e) => set("gender", e.target.value)}><option value="male">Male</option><option value="female">Female</option></select></Field>
          <Field label="Age *" error={errors.age}><input type="number" min={18} max={80} style={inputError(errors.age)} value={form.age} onChange={(e) => set("age", e.target.value)}/></Field>
          <Field label="Date of Birth (optional)"><input type="date" style={input} value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)}/></Field>
          <Field label="Height cm"><input type="number" min={120} max={230} style={input} value={form.heightCm} onChange={(e) => set("heightCm", e.target.value)}/></Field>
          <Field label="Marital Status"><select style={input} value={form.maritalStatus} onChange={(e) => set("maritalStatus", e.target.value)}>{MARITAL_STATUS_OPTIONS.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Private Contact / WhatsApp *" error={errors.contact}><input inputMode="tel" style={inputError(errors.contact)} value={form.contact} onChange={(e) => set("contact", e.target.value)}/></Field>
        </div>
        <Consent error={errors.candidateConsent} checked={form.candidateConsent} onChange={(v) => set("candidateConsent", v)}/>

        <Section n="2" title="Location, Education & Career" subtitle="Works for Pakistan-based and overseas candidates across education and professional backgrounds."/>
        <div className="grid2" style={grid2}>
          <Field label="Country"><select style={input} value={form.country} onChange={(e) => set("country", e.target.value)}>{COMMON_COUNTRIES.map((x) => <option key={x}>{x}</option>)}</select></Field>
          {form.country === "Pakistan" ? <Field label="Province / Region"><select style={input} value={form.province} onChange={(e) => changeProvince(e.target.value)}>{PROVINCES.map((x) => <option key={x}>{x}</option>)}</select></Field> : <Field label="State / Province"><input style={input} value={form.province} onChange={(e) => set("province", e.target.value)}/></Field>}
          <Field label="City *" error={errors.city}>{form.country === "Pakistan" && pakistanCities.length ? <select style={inputError(errors.city)} value={form.city} onChange={(e) => set("city", e.target.value)}>{pakistanCities.map((x) => <option key={x}>{x}</option>)}</select> : <input style={inputError(errors.city)} value={form.city} onChange={(e) => set("city", e.target.value)}/>}</Field>
          <Field label="Nationality"><input style={input} value={form.nationality} onChange={(e) => set("nationality", e.target.value)}/></Field>
          <Field label="Residence / Visa Status"><select style={input} value={form.residenceStatus} onChange={(e) => set("residenceStatus", e.target.value)}><option value="">Select</option>{RESIDENCE_STATUS_OPTIONS.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Education *" error={errors.education}><select style={inputError(errors.education)} value={form.education} onChange={(e) => set("education", e.target.value)}><option value="">Select</option>{EDUCATION_OPTIONS.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Profession / Sector *" error={errors.profession}><select style={inputError(errors.profession)} value={form.profession} onChange={(e) => set("profession", e.target.value)}><option value="">Select</option>{PROFESSION_OPTIONS.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Employment Type"><select style={input} value={form.employmentType} onChange={(e) => set("employmentType", e.target.value)}><option value="">Select</option>{EMPLOYMENT_TYPE_OPTIONS.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Employer / Organization Type"><input placeholder="Government department, private company, own business, university..." style={input} value={form.employerType} onChange={(e) => set("employerType", e.target.value)}/></Field>
          <Field label="Income Band"><select style={input} value={form.incomeBand} onChange={(e) => set("incomeBand", e.target.value)}>{INCOME_BANDS.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Currency"><select style={input} value={form.currency} onChange={(e) => set("currency", e.target.value)}>{["PKR","AED","SAR","QAR","OMR","BHD","KWD","GBP","USD","CAD","AUD","EUR"].map((x) => <option key={x}>{x}</option>)}</select></Field>
        </div>

        <Section n="3" title="Family, Lifestyle & Marriage Intentions" subtitle="Optional structured details improve compatibility without making them public."/>
        <div className="grid2" style={grid2}>
          <Field label="Family Setup"><select style={input} value={form.familySetup} onChange={(e) => set("familySetup", e.target.value)}><option value="">Select</option>{FAMILY_SETUP_OPTIONS.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Sect (optional)"><select style={input} value={form.sect} onChange={(e) => set("sect", e.target.value)}>{SECT_OPTIONS.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Languages"><input placeholder="Urdu, Punjabi, English" style={input} value={form.languages} onChange={(e) => set("languages", e.target.value)}/></Field>
          <Field label="Relocation Preference"><input placeholder="Open to Lahore / Pakistan / Gulf / overseas..." style={input} value={form.relocation} onChange={(e) => set("relocation", e.target.value)}/></Field>
          <Field label="Marriage Timeline"><input placeholder="e.g. Within 6–12 months" style={input} value={form.marriageTimeline} onChange={(e) => set("marriageTimeline", e.target.value)}/></Field>
          <Field label="Hobbies / Interests"><input style={input} value={form.hobbies} onChange={(e) => set("hobbies", e.target.value)}/></Field>
          <div style={{ gridColumn: "span 2" }}><Field label="Family Notes"><textarea rows={3} style={{ ...input, resize: "vertical" }} value={form.familyNotes} onChange={(e) => set("familyNotes", e.target.value)}/></Field></div>
        </div>

        <Section n="4" title="Partner Preferences" subtitle="Use Primary → Secondary → Acceptable choices. This creates explainable two-way compatibility percentages."/>
        <div className="grid2" style={grid2}>
          <RangePreference title="Preferred Age" min={form.ageMin} max={form.ageMax} importance={form.ageImportance} onMin={(v) => set("ageMin", v)} onMax={(v) => set("ageMax", v)} onImportance={(v) => set("ageImportance", v)} error={errors.ageMax}/>
          <RangePreference title="Preferred Height (cm)" min={form.heightMin} max={form.heightMax} importance={form.heightImportance} onMin={(v) => set("heightMin", v)} onMax={(v) => set("heightMax", v)} onImportance={(v) => set("heightImportance", v)} error={errors.heightMax}/>
        </div>
        <PreferenceLayer title="Education" value={form.educationPref} onChange={(k,v) => setLayer("educationPref", k, v)} hint="e.g. Primary: MBA, MS / MPhil · Secondary: BS / BSc (Hons)"/>
        <PreferenceLayer title="Profession" value={form.professionPref} onChange={(k,v) => setLayer("professionPref", k, v)} hint="e.g. Government Service · Business / Entrepreneurship · Education / Teaching"/>
        <PreferenceLayer title="Country" value={form.countryPref} onChange={(k,v) => setLayer("countryPref", k, v)} hint="Pakistan, UAE, UK etc."/>
        <PreferenceLayer title="City" value={form.cityPref} onChange={(k,v) => setLayer("cityPref", k, v)} hint="Lahore, Faisalabad, Islamabad etc."/>
        <details style={detailsBox}><summary style={summaryStyle}><ChevronDown size={14}/>More matching criteria</summary><PreferenceLayer title="Marital Status" value={form.maritalPref} onChange={(k,v) => setLayer("maritalPref", k, v)}/><PreferenceLayer title="Residence Status" value={form.residencePref} onChange={(k,v) => setLayer("residencePref", k, v)}/><PreferenceLayer title="Family Setup" value={form.familyPref} onChange={(k,v) => setLayer("familyPref", k, v)}/><PreferenceLayer title="Sect" value={form.sectPref} onChange={(k,v) => setLayer("sectPref", k, v)}/><PreferenceLayer title="Relocation" value={form.relocationPref} onChange={(k,v) => setLayer("relocationPref", k, v)}/><div className="grid2" style={grid2}><Field label="Minimum Monthly Income"><input inputMode="numeric" style={input} value={form.incomeMinimum} onChange={(e) => set("incomeMinimum", e.target.value.replace(/[^0-9]/g, ""))}/></Field><Importance value={form.incomeImportance} onChange={(v) => set("incomeImportance", v)}/></div></details>
        <Field label="Other Partner Expectations"><textarea rows={3} style={{ ...input, resize: "vertical" }} value={form.partnerNotes} onChange={(e) => set("partnerNotes", e.target.value)} placeholder="Add expectations that are not covered by structured criteria."/></Field>

        <Section n="5" title="Privacy, Photo & Documents" subtitle="Sensitive media is uploaded for verification but never placed in the public profile."/>
        <div className="grid2" style={grid2}>
          <Field label="Photo Privacy"><select style={input} value={form.photoVisibility} onChange={(e) => set("photoVisibility", e.target.value)}>{PHOTO_PRIVACY_OPTIONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></Field>
          <Field label="Contact Privacy"><select style={input} value={form.contactVisibility} onChange={(e) => set("contactVisibility", e.target.value)}>{CONTACT_PRIVACY_OPTIONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></Field>
          <Toggle label="Allow broad city/region on anonymized match card" checked={form.broadLocation} onChange={(v) => set("broadLocation", v)}/>
          <Toggle label="Allow height on anonymized match card" checked={form.showHeight} onChange={(v) => set("showHeight", v)}/>
          <UploadBox title="Candidate Photo *" value={form.photoUrl} loading={Boolean(uploading.photoUrl)} accept="image/*" onChange={upload("photoUrl")} error={errors.photoUrl} image/>
          <UploadBox title="Payment Slip / Receipt (can be added before approval)" value={form.paymentProofUrl} loading={Boolean(uploading.paymentProofUrl)} accept="image/*,.pdf,application/pdf" onChange={upload("paymentProofUrl")}/>
        </div>
        <div style={{ marginTop: 12 }}><MultiImageUpload label="Additional Candidate Documents / Photos (private)" images={form.additionalPhotos} onChange={(images) => set("additionalPhotos", images)}/></div>
        {settings.paymentMethods?.length ? <div style={{ background: "#fff9ef", border: "1px solid #ead9a8", padding: 12, borderRadius: 9, marginTop: 14 }}><strong style={{ color: GREEN, fontSize: 12 }}>Official payment methods</strong><div style={{ display: "grid", gap: 5, marginTop: 6 }}>{settings.paymentMethods.map((pm) => <label key={pm.id} style={{ fontSize: 11, color: "#555" }}><input type="radio" name="paymentMethod" checked={form.paymentMethod === pm.bankName} onChange={() => set("paymentMethod", pm.bankName)}/> {pm.bankName}: {pm.accountTitle} · {pm.accountNo}</label>)}</div></div> : <div style={{ background: "#f8f5ef", padding: 11, borderRadius: 8, marginTop: 14, color: "#777", fontSize: 11 }}>Official payment details are not currently displayed. The profile may still be submitted for review; payment proof can be added before final approval.</div>}

        <div style={{ background: "#eef6ff", border: "1px solid #cfe4fb", color: "#315f7d", borderRadius: 9, padding: 12, fontSize: 11, lineHeight: 1.7, marginTop: 18 }}><ShieldCheck size={14} style={{ verticalAlign: "-2px", marginRight: 5 }}/>Compatibility scores are decision support, not a guarantee of suitability. Unknown information lowers confidence rather than being treated automatically as a mismatch. Candidate and family decisions remain voluntary.</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22, flexWrap: "wrap" }}><Link to="/matrimonial" style={secondaryLink}>Cancel</Link><button type="submit" disabled={saving || Object.values(uploading).some(Boolean)} style={{ ...primaryButton, opacity: saving ? .6 : 1 }}>{saving ? <><Loader2 size={14} className="spin"/> Saving...</> : <><Heart size={14}/> Save & Submit for Review</>}</button></div>
      </form>
    </section>
    <Responsive/>
  </div>;
}

function Section({ n, title: text, subtitle }: { n: string; title: string; subtitle: string }) { return <div style={{ borderBottom: "1px solid #eee", paddingBottom: 9, margin: "27px 0 15px" }}><div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ width: 25, height: 25, display: "grid", placeItems: "center", background: GREEN, color: "white", borderRadius: "50%", fontSize: 11, fontWeight: 900 }}>{n}</span><h3 style={{ margin: 0, color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 18 }}>{text}</h3></div><p style={{ margin: "5px 0 0 33px", color: "#777", fontSize: 11, lineHeight: 1.55 }}>{subtitle}</p></div>; }
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <div data-error={error ? "true" : undefined}><label style={labelStyle}>{label}</label>{children}{error && <div style={{ color: "#b91c1c", fontSize: 10, marginTop: 4 }}>{error}</div>}</div>; }
function Consent({ checked, onChange, error }: { checked: boolean; onChange: (v:boolean)=>void; error?: string }) { return <div data-error={error ? "true" : undefined} style={{ border: `1px solid ${error ? "#ef4444" : "#d8e5dc"}`, background: "#f7fbf8", borderRadius: 9, padding: 12, marginTop: 8 }}><label style={{ display: "flex", gap: 9, alignItems: "flex-start", cursor: "pointer", color: "#46544b", fontSize: 12, lineHeight: 1.6 }}><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: 3 }}/><span><strong style={{ color: GREEN }}>Candidate consent *</strong><br/>I confirm the adult candidate has authorized creation of this matrimonial profile and use of the supplied information for private matching and committee review.</span></label>{error && <div style={{ color: "#b91c1c", fontSize: 10, marginTop: 5 }}>{error}</div>}</div>; }
function Importance({ value, onChange }: { value: string; onChange: (v:string)=>void }) { return <Field label="Importance"><select style={input} value={value} onChange={(e) => onChange(e.target.value)}>{IMPORTANCE_OPTIONS.map((x) => <option key={x}>{x}</option>)}</select></Field>; }
function RangePreference({ title, min, max, importance, onMin, onMax, onImportance, error }: any) { return <div style={{ border: "1px solid #ece7de", borderRadius: 10, padding: 12 }}><strong style={{ color: GREEN, fontSize: 12 }}>{title}</strong><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}><input placeholder="Min" inputMode="numeric" style={input} value={min} onChange={(e) => onMin(e.target.value.replace(/[^0-9]/g,""))}/><input placeholder="Max" inputMode="numeric" style={inputError(error)} value={max} onChange={(e) => onMax(e.target.value.replace(/[^0-9]/g,""))}/></div><select style={{ ...input, marginTop: 8 }} value={importance} onChange={(e) => onImportance(e.target.value)}>{IMPORTANCE_OPTIONS.map((x) => <option key={x}>{x}</option>)}</select>{error && <div style={{ color: "#b91c1c", fontSize: 10, marginTop: 4 }}>{error}</div>}</div>; }
function PreferenceLayer({ title: text, value, onChange, hint }: { title: string; value: Layer; onChange: (k:keyof Layer,v:string)=>void; hint?: string }) { return <div style={{ border: "1px solid #ece7de", borderRadius: 10, padding: 13, marginBottom: 10 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}><strong style={{ color: GREEN, fontSize: 12 }}>{text}</strong><select style={{ ...input, width: 160 }} value={value.importance} onChange={(e) => onChange("importance", e.target.value)}>{IMPORTANCE_OPTIONS.map((x) => <option key={x}>{x}</option>)}</select></div>{hint && <div style={{ color: "#999", fontSize: 10, margin: "5px 0" }}>{hint}</div>}<div className="pref-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 8 }}><input style={input} placeholder="Primary choice(s)" value={value.primary} onChange={(e) => onChange("primary", e.target.value)}/><input style={input} placeholder="Secondary choice(s)" value={value.secondary} onChange={(e) => onChange("secondary", e.target.value)}/><input style={input} placeholder="Acceptable fallback(s)" value={value.acceptable} onChange={(e) => onChange("acceptable", e.target.value)}/></div></div>; }
function Toggle({ label, checked, onChange }: { label:string; checked:boolean; onChange:(v:boolean)=>void }) { return <label style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #e4e9e5", borderRadius: 8, padding: 11, color: "#556059", fontSize: 11, cursor: "pointer" }}><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}/>{label}</label>; }
function UploadBox({ title: text, value, loading, accept, onChange, error, image = false }: any) { return <div data-error={error ? "true" : undefined}><label style={labelStyle}>{text}</label><label style={{ minHeight: 112, border: `2px dashed ${error ? "#ef4444" : value ? GOLD : "#ccd8cf"}`, borderRadius: 9, display: "grid", placeItems: "center", cursor: "pointer", background: value ? "#fff9ef" : "#fafbf9", padding: 9, textAlign: "center" }}>{loading ? <Loader2 className="spin"/> : value ? (image ? <img src={value} alt="Private candidate preview" style={{ maxHeight: 95, maxWidth: "100%", objectFit: "contain" }}/> : <div style={{ color: GREEN, fontWeight: 800 }}><FileCheck2 size={20}/><div style={{ fontSize: 11 }}>File uploaded · click to replace</div></div>) : <div style={{ color: "#888", fontSize: 11 }}><Upload size={20}/><div>Click to upload</div></div>}<input type="file" accept={accept} style={{ display: "none" }} onChange={onChange}/></label>{error && <div style={{ color: "#b91c1c", fontSize: 10, marginTop: 4 }}>{error}</div>}</div>; }
function Responsive() { return <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin .9s linear infinite}@media(max-width:760px){.grid2,.pref-grid{grid-template-columns:1fr!important}.grid2>[style*="span 2"]{grid-column:span 1!important}input,select,textarea{font-size:16px!important}}`}</style>; }
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid rgba(26,77,46,.2)", borderRadius: 8, padding: "10px 11px", background: "white", color: "#26352d", fontSize: 12 };
const inputError = (error?: string): React.CSSProperties => error ? { ...input, borderColor: "#ef4444", boxShadow: "0 0 0 2px rgba(239,68,68,.08)" } : input;
const labelStyle: React.CSSProperties = { display: "block", color: GREEN, fontSize: 11, fontWeight: 800, marginBottom: 5 };
const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 };
const card: React.CSSProperties = { background: "white", border: "1px solid #e9e3da", borderRadius: 15, padding: 26, boxShadow: "0 6px 28px rgba(0,0,0,.055)" };
const title: React.CSSProperties = { color: GREEN, fontFamily: "'Playfair Display', serif", margin: "12px 0 8px" };
const muted: React.CSSProperties = { color: "#666", fontSize: 13, lineHeight: 1.7 };
const primaryButton: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, background: GREEN, color: "white", border: 0, borderRadius: 8, padding: "10px 15px", textDecoration: "none", fontSize: 12, fontWeight: 800, cursor: "pointer" };
const secondaryLink: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, background: "white", color: GREEN, border: "1px solid #d5ded8", borderRadius: 8, padding: "9px 14px", textDecoration: "none", fontSize: 12, fontWeight: 800 };
const detailsBox: React.CSSProperties = { border: "1px solid #e8e3da", borderRadius: 10, padding: "0 13px", marginBottom: 12 };
const summaryStyle: React.CSSProperties = { padding: "12px 0", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: GREEN, fontWeight: 800, fontSize: 12 };
const errorBox: React.CSSProperties = { background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: 9, padding: 12, marginBottom: 14, lineHeight: 1.6, fontSize: 12 };
