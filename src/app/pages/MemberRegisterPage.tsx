import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { PageHeader } from "../components/PageHeader";
import { CheckCircle, Upload, User, Phone, BookOpen, FileText, Users, UserCheck } from "lucide-react";
import {
  provinces,
  bloodGroups,
  educationLevels,
  childEducationLevels,
  occupations,
  relationships,
  blankFamily,
  casteBiradariSuggestions,
  religiousSectSuggestions,
  joinStructuredOption,
  searchReferralMembers,
} from "../lib/memberStore";
import type { MembershipType, FamilyInfo, MemberChild, ReferralCandidate } from "../lib/memberStore";
import { pakistanDistricts, pakistanMajorCities, suggestLocation } from "../lib/pakistanLocations";
import { getSiteSettings } from "../lib/settingsStore";
import { MultiImageUpload } from "../components/ui/MultiImageUpload";
import { ApiError, apiClient } from "../lib/apiClient";
import { uploadFile } from "../lib/upload";
import { PasswordlessSignIn } from "../components/PasswordlessSignIn";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "1px solid rgba(26,77,46,0.2)",
  borderRadius: 7,
  fontSize: 14,
  boxSizing: "border-box",
  fontFamily: "'Lato', sans-serif",
  backgroundColor: "white",
};
const labelStyle: React.CSSProperties = { display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 };
const steps = ["Personal Info", "Contact and Location", "Education and Work", "Membership", "Family Info", "Documents"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 34, flexWrap: "wrap", gap: 4 }}>
      {steps.map((label, i) => (
        <div key={label} style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: i < current ? GREEN : i === current ? GOLD : "#e5e7eb", color: i <= current ? "white" : "#9ca3af", fontWeight: 700, fontSize: 13 }}>
              {i < current ? <CheckCircle size={15} /> : i + 1}
            </div>
            <span style={{ fontSize: 10, color: i === current ? GREEN : "#9ca3af", marginTop: 4, fontWeight: i === current ? 700 : 400, whiteSpace: "nowrap" }}>{label}</span>
          </div>
          {i < steps.length - 1 && <div style={{ width: 32, height: 2, backgroundColor: i < current ? GREEN : "#e5e7eb", margin: "0 4px", marginBottom: 20 }} />}
        </div>
      ))}
    </div>
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
      {hint && <p style={{ color: "#8b8b8b", fontSize: 11, lineHeight: 1.5, margin: "5px 0 0" }}>{hint}</p>}
      {error && <p style={{ color: "#dc2626", fontSize: 12, margin: "5px 0 0" }}>{error}</p>}
    </div>
  );
}

function SectionHead({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, paddingBottom: 14, borderBottom: "2px solid #f5f5f5" }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "#f0f7f3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={18} color={GREEN} /></div>
      <div>
        <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, margin: 0 }}>{title}</h3>
        {subtitle && <p style={{ color: "#888", fontSize: 13, margin: "3px 0 0" }}>{subtitle}</p>}
      </div>
    </div>
  );
}

const newChild = (): MemberChild => ({ fullName: "", dob: "", education: "Not Started" });

export function MemberRegisterPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const settings = getSiteSettings();
  const [authenticated, setAuthenticated] = useState(() => Boolean(localStorage.getItem("araian_member_token")));
  const [saveState, setSaveState] = useState<"loading" | "saved" | "saving" | "error">("loading");
  const hydrated = useRef(false);

  const [form, setForm] = useState({
    fullName: "", fatherName: "", cnic: "", dob: "", gender: "Male", bloodGroup: "O+",
    email: localStorage.getItem("araian_verified_email") || "", phone: "", whatsapp: "",
    address: "", localArea: "", city: "Faisalabad", district: "Faisalabad", province: "Punjab",
    occupation: "Agriculture", occupationDetail: "", education: "Bachelor's", educationDetail: "",
    designation: "", institutionName: "", businessName: "", memberCell: "male" as "male" | "women",
    membershipType: "ordinary" as MembershipType,
    photoUrl: "", cnicFrontUrl: "", cnicBackUrl: "", paymentProofUrl: "", additionalPhotos: [] as string[]
  });
  const [family, setFamily] = useState<FamilyInfo>(blankFamily());
  const [children, setChildren] = useState<MemberChild[]>([]);
  const [referralQuery, setReferralQuery] = useState("");
  const [referralResults, setReferralResults] = useState<ReferralCandidate[]>([]);
  const [selectedReferrer, setSelectedReferrer] = useState<ReferralCandidate | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);

  useEffect(() => {
    if (!authenticated) return;
    apiClient<any>("/forms/membership").then((draft) => {
      if (draft?.data) {
        if (draft.data.form) setForm((old) => ({ ...old, ...draft.data.form }));
        if (draft.data.family) setFamily((old) => ({ ...old, ...draft.data.family }));
        if (Array.isArray(draft.data.children)) setChildren(draft.data.children);
        if (draft.data.selectedReferrer) setSelectedReferrer(draft.data.selectedReferrer);
        if (typeof draft.currentStep === "number") setStep(Math.min(5, draft.currentStep));
      }
      setSaveState("saved");
      hydrated.current = true;
    }).catch((e) => {
      setSaveState("error");
      if (e instanceof ApiError && e.status === 401) {
        setAuthenticated(false);
        localStorage.removeItem("araian_member_token");
      }
    });
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated || !hydrated.current || done) return;
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      const meaningful = Object.values(form).filter(Boolean).length + Object.values(family).filter(Boolean).length + children.filter((c) => c.fullName).length;
      apiClient("/forms/membership", {
        method: "PUT",
        body: JSON.stringify({
          data: { form, family, children, selectedReferrer },
          currentStep: step,
          completion: Math.min(95, Math.round((meaningful / 38) * 100)),
          status: "incomplete"
        })
      }).then(() => setSaveState("saved")).catch(() => setSaveState("error"));
    }, 800);
    return () => window.clearTimeout(timer);
  }, [form, family, children, selectedReferrer, step, authenticated, done]);

  useEffect(() => {
    const q = referralQuery.trim();
    if (selectedReferrer || q.length < 2) { setReferralResults([]); return; }
    const timer = window.setTimeout(async () => {
      setReferralLoading(true);
      try { setReferralResults(await searchReferralMembers(q)); }
      catch { setReferralResults([]); }
      finally { setReferralLoading(false); }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [referralQuery, selectedReferrer]);

  const set = (k: keyof typeof form, v: any) => {
    setForm((f) => ({ ...f, [k]: v } as any));
    setErrors((e) => ({ ...e, [k]: "" }));
  };
  const setFam = (k: keyof FamilyInfo, v: string) => setFamily((f) => ({ ...f, [k]: v }));

  const onCityChange = (city: string) => {
    const hint = suggestLocation(city);
    setForm((old) => ({
      ...old,
      city,
      district: hint.district || old.district,
      province: hint.province || old.province,
    }));
    setErrors((e) => ({ ...e, city: "" }));
  };

  const setChildrenCount = (raw: string) => {
    const count = Math.max(0, Math.min(20, Number(raw) || 0));
    setFamily((f) => ({ ...f, childrenCount: String(count) }));
    setChildren((old) => Array.from({ length: count }, (_, i) => old[i] || newChild()));
  };

  const setChild = (index: number, key: keyof MemberChild, value: string) => {
    setChildren((old) => old.map((child, i) => i === index ? { ...child, [key]: value } : child));
  };

  const handleBlur = (field: keyof typeof form) => {
    const errs = { ...errors };
    if (field === "cnic" && form.cnic && !/^\d{13}$/.test(form.cnic.replace(/-/g, ""))) errs.cnic = "Enter a valid 13-digit CNIC (e.g. 35201-1234567-1).";
    if (field === "phone" && form.phone && !/^\+?[0-9]{10,15}$/.test(form.phone.replace(/[\s-]/g, ""))) errs.phone = "Enter a valid phone number (e.g. +92 300 1234567).";
    setErrors(errs);
  };

  const handleFile = (key: keyof typeof form) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { setErrors((err) => ({ ...err, [key]: "File must be under 4MB." })); return; }
    setUploading((u) => ({ ...u, [String(key)]: true }));
    try { set(key, await uploadFile(file)); }
    catch (err: any) { setErrors((prev) => ({ ...prev, [String(key)]: err?.message || "Upload failed. Please try again." })); }
    finally { setUploading((u) => ({ ...u, [String(key)]: false })); e.target.value = ""; }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (step === 0) {
      if (!form.fullName.trim()) errs.fullName = "Full name is required.";
      if (!form.fatherName.trim()) errs.fatherName = "Father's name is required.";
      if (!/^\d{13}$/.test(form.cnic.replace(/-/g, ""))) errs.cnic = "Enter a valid 13-digit CNIC.";
      if (!form.dob) errs.dob = "Date of birth is required.";
    }
    if (step === 1) {
      if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "A verified email is required.";
      if (!/^\+?[0-9]{10,15}$/.test(form.phone.replace(/[\s-]/g, ""))) errs.phone = "Enter a valid phone number.";
      if (!form.city.trim()) errs.city = "City / town is required.";
      if (!form.address.trim()) errs.address = "Full address is required.";
    }
    if (step === 4) {
      children.forEach((child, index) => {
        if (!child.fullName.trim()) errs[`child_${index}`] = `Enter the name of child ${index + 1}.`;
      });
    }
    if (step === 5) {
      if (!form.photoUrl) errs.photoUrl = "Passport photo is required.";
      if (!form.cnicFrontUrl) errs.cnicFrontUrl = "CNIC Front image is required.";
      if (!form.cnicBackUrl) errs.cnicBackUrl = "CNIC Back image is required.";
      if (!form.paymentProofUrl) errs.paymentProofUrl = "Payment proof is required.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => { if (!Object.values(uploading).some(Boolean) && validate()) setStep((s) => s + 1); };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const submit = async () => {
    if (loading || Object.values(uploading).some(Boolean) || !validate()) return;
    setLoading(true);
    try {
      const formattedCnic = form.cnic.replace(/-/g, "").replace(/^(\d{5})(\d{7})(\d{1})$/, "$1-$2-$3");
      await apiClient("/members/register", {
        method: "POST",
        body: JSON.stringify({
          fullName: form.fullName,
          fatherName: form.fatherName,
          cnic: formattedCnic,
          dob: form.dob,
          gender: form.gender.toLowerCase(),
          bloodGroup: form.bloodGroup,
          email: form.email,
          phone: form.phone,
          whatsapp: form.whatsapp || form.phone,
          whatsappPublic: false,
          address: form.address,
          localArea: form.localArea,
          city: form.city,
          district: form.district,
          province: form.province,
          occupation: joinStructuredOption(form.occupation, form.occupationDetail),
          education: joinStructuredOption(form.education, form.educationDetail),
          designation: form.designation,
          institutionName: form.institutionName,
          businessName: form.businessName,
          memberCell: form.memberCell,
          membershipType: form.membershipType,
          familyInfoPublic: false,
          referrerMemberId: selectedReferrer?.id || null,
          photoUrl: form.photoUrl,
          cnicFrontUrl: form.cnicFrontUrl,
          cnicBackUrl: form.cnicBackUrl,
          paymentProofUrl: form.paymentProofUrl,
          additionalPhotos: form.additionalPhotos,
          familyInfo: { ...family, childrenCount: String(children.length), childrenDetails: "" },
          children: children.map(({ fullName, dob, education }) => ({ fullName, dob, education })),
        })
      });
      setDone(true);
    } catch (e: any) {
      if (e.details) {
        const apiErrors: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(e.details)) apiErrors[key] = (msgs as string[])[0];
        setErrors(apiErrors);
      } else alert("Registration failed: " + (e.message || "Please try again."));
    } finally { setLoading(false); }
  };

  if (!authenticated) {
    return <div><PageHeader title="Verify Your Email" subtitle="Sign in once, then your registration saves automatically" breadcrumb={["Home", "Member Portal", "Register"]} /><section style={{ maxWidth: 480, margin: "48px auto", padding: "0 24px" }}><div style={{ background: "white", borderRadius: 14, padding: 32, boxShadow: "0 6px 30px rgba(0,0,0,.08)" }}><h2 style={{ color: GREEN, marginTop: 0 }}>Start or resume your form</h2><p style={{ color: "#666", fontSize: 14, lineHeight: 1.7 }}>Use Google or any email address. We will restore every saved answer automatically.</p><PasswordlessSignIn onAuthenticated={(session) => { set("email", session.user.email); setAuthenticated(true); }} compact /></div></section></div>;
  }

  if (done) {
    return <div><PageHeader title="Registration Submitted" breadcrumb={["Home", "Member Portal", "Register"]} /><div style={{ maxWidth: 560, margin: "70px auto", padding: "0 24px", textAlign: "center" }}><div style={{ width: 78, height: 78, borderRadius: "50%", background: "#dcfce7", display: "grid", placeItems: "center", margin: "0 auto 22px" }}><CheckCircle size={38} color="#15803d" /></div><h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif" }}>Application Received</h2><p style={{ color: "#555", lineHeight: 1.8 }}>Your form is saved and is now pending payment verification and administrative approval. You may sign in with the same verified email to review your status.</p><Link to="/member/login" style={{ display: "inline-block", marginTop: 18, background: GREEN, color: "white", padding: "11px 24px", borderRadius: 8, textDecoration: "none", fontWeight: 700 }}>Member Login</Link></div></div>;
  }

  return (
    <div>
      <PageHeader title="Member Registration" subtitle="Join the Anjuman-e-Araian family" breadcrumb={["Home", "Member Portal", "Register"]} />
      <section style={{ maxWidth: 820, margin: "0 auto", padding: "42px 24px" }}>
        <div aria-live="polite" style={{ textAlign: "right", color: saveState === "error" ? "#b91c1c" : "#64748b", fontSize: 12, marginBottom: 10 }}>{saveState === "saving" ? "Saving changes…" : saveState === "saved" ? "✓ All changes saved" : saveState === "error" ? "Could not save — check connection" : "Restoring saved form…"}</div>
        <StepIndicator current={step} />
        <div style={{ backgroundColor: "white", borderRadius: 14, padding: "34px 38px", boxShadow: "0 4px 24px rgba(0,0,0,0.07)", border: "1px solid rgba(26,77,46,0.08)" }}>

          {step === 0 && <div><SectionHead icon={User} title="Personal Information" /><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="form-grid">
            <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 12 }}><div style={{ width: 96, height: 96, borderRadius: "50%", background: "#f5f5f5", border: `2px dashed ${GOLD}`, display: "grid", placeItems: "center", overflow: "hidden", marginBottom: 10 }}>{form.photoUrl ? <img src={form.photoUrl} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <User size={30} color="#aaa" />}</div><label style={{ backgroundColor: "#f0f7f3", color: GREEN, padding: "8px 15px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Upload Profile Photo<input type="file" accept="image/*" onChange={handleFile("photoUrl")} style={{ display: "none" }} /></label></div>
            <Field label="Full Name *" error={errors.fullName}><input style={inputStyle} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} /></Field>
            <Field label="Father's Name *" error={errors.fatherName}><input style={inputStyle} value={form.fatherName} onChange={(e) => set("fatherName", e.target.value)} /></Field>
            <Field label="CNIC Number *" error={errors.cnic}><input style={inputStyle} value={form.cnic} onChange={(e) => set("cnic", e.target.value)} onBlur={() => handleBlur("cnic")} placeholder="35201-1234567-1" maxLength={15} /></Field>
            <Field label="Date of Birth *" error={errors.dob}><input type="date" style={inputStyle} value={form.dob} onChange={(e) => set("dob", e.target.value)} /></Field>
            <Field label="Gender *"><select style={inputStyle} value={form.gender} onChange={(e) => set("gender", e.target.value)}><option>Male</option><option>Female</option><option>Other</option></select></Field>
            <Field label="Blood Group"><select style={inputStyle} value={form.bloodGroup} onChange={(e) => set("bloodGroup", e.target.value)}>{bloodGroups.map((b) => <option key={b}>{b}</option>)}</select></Field>
          </div></div>}

          {step === 1 && <div><SectionHead icon={Phone} title="Contact and Location" subtitle="Choose the major city/town; type the exact locality, tehsil, village or area separately." /><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="form-grid">
            <Field label="Verified Email Address *"><input type="email" readOnly style={{ ...inputStyle, background: "#f0f7f3" }} value={form.email} /></Field>
            <Field label="Phone Number *" error={errors.phone}><input type="tel" style={inputStyle} value={form.phone} onChange={(e) => set("phone", e.target.value)} onBlur={() => handleBlur("phone")} placeholder="+92 300 000 0000" /></Field>
            <Field label="WhatsApp Number" hint="Leave blank if it is the same as your phone number."><input type="tel" style={inputStyle} value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} /></Field>
            <Field label="City / Town *" error={errors.city} hint="Search a major Pakistan city/town. If it is not listed, type it manually."><input list="pakistan-cities" style={inputStyle} value={form.city} onChange={(e) => onCityChange(e.target.value)} /><datalist id="pakistan-cities">{pakistanMajorCities.map((x) => <option key={x} value={x} />)}</datalist></Field>
            <Field label="District" hint="For Karachi, select the relevant district; for smaller places you may type the district manually."><input list="pakistan-districts" style={inputStyle} value={form.district} onChange={(e) => set("district", e.target.value)} /><datalist id="pakistan-districts">{pakistanDistricts.map((x) => <option key={x} value={x} />)}</datalist></Field>
            <Field label="Province / Region"><select style={inputStyle} value={form.province} onChange={(e) => set("province", e.target.value)}>{provinces.map((p) => <option key={p}>{p}</option>)}</select></Field>
            <div style={{ gridColumn: "span 2" }}><Field label="Local Area / Tehsil / Town / Village" hint="Examples: Iqbal Town, Samundri, Mamu Kanjan, Chak 456 GB. This keeps village-level data flexible without an enormous dropdown."><input style={inputStyle} value={form.localArea} onChange={(e) => set("localArea", e.target.value)} placeholder="Area, tehsil, town, village or chak" /></Field></div>
            <div style={{ gridColumn: "span 2" }}><Field label="Full Address *" error={errors.address}><textarea rows={2} style={{ ...inputStyle, resize: "vertical" }} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="House / street / road / area and any other details" /></Field></div>
          </div></div>}

          {step === 2 && <div><SectionHead icon={BookOpen} title="Education and Occupation" /><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="form-grid">
            <Field label="Highest Education"><select style={inputStyle} value={form.education} onChange={(e) => set("education", e.target.value)}>{educationLevels.map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Specialization / Degree"><input style={inputStyle} value={form.educationDetail} onChange={(e) => set("educationDetail", e.target.value)} placeholder="e.g. MBA, Computer Science" /></Field>
            <Field label="Occupation"><select style={inputStyle} value={form.occupation} onChange={(e) => set("occupation", e.target.value)}>{occupations.map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Occupation Field / Specialty"><input style={inputStyle} value={form.occupationDetail} onChange={(e) => set("occupationDetail", e.target.value)} placeholder="e.g. Poultry, Software, Trading" /></Field>
            <Field label="Designation / Role"><input style={inputStyle} value={form.designation} onChange={(e) => set("designation", e.target.value)} /></Field>
            <Field label="Institute / Organization"><input style={inputStyle} value={form.institutionName} onChange={(e) => set("institutionName", e.target.value)} /></Field>
            <div style={{ gridColumn: "span 2" }}><Field label="Business Name (if applicable)"><input style={inputStyle} value={form.businessName} onChange={(e) => set("businessName", e.target.value)} /></Field></div>
          </div></div>}

          {step === 3 && <div><SectionHead icon={FileText} title="Membership and Referral" subtitle="Referral is optional. It helps verification but never automatically approves or rejects an application." />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14, marginBottom: 24 }} className="mem-grid">{(settings.membershipTiers || []).map((tier) => <div key={tier.id} onClick={() => set("membershipType", tier.type)} style={{ border: `2px solid ${form.membershipType === tier.type ? GOLD : "#e5e7eb"}`, borderRadius: 10, padding: 14, cursor: "pointer", backgroundColor: form.membershipType === tier.type ? "#fff9ef" : "white" }}><strong style={{ color: GREEN, fontSize: 13 }}>{tier.name}</strong><div style={{ color: GOLD, fontWeight: 800, marginTop: 5 }}>{tier.fee}</div><p style={{ color: "#666", fontSize: 11, lineHeight: 1.5 }}>{tier.description}</p></div>)}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 22 }} className="form-grid"><Field label="Member Category"><select style={inputStyle} value={form.membershipType} onChange={(e) => set("membershipType", e.target.value)}><option value="ordinary">Regular / Annual Member</option><option value="life">Life Member</option><option value="patron">Patron Member</option><option value="overseas">Overseas Member</option></select></Field><Field label="Community Cell"><select style={inputStyle} value={form.memberCell} onChange={(e) => set("memberCell", e.target.value)}><option value="male">Men's Cell</option><option value="women">Women's Cell</option></select></Field></div>
            <div style={{ borderTop: "1px solid #eee", paddingTop: 20 }}><div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}><UserCheck size={17} color={GREEN} /><strong style={{ color: GREEN, fontSize: 14 }}>Referred by an Existing Member (Optional)</strong></div>{selectedReferrer ? <div style={{ background: "#f0f7f3", border: "1px solid #cfe2d6", borderRadius: 9, padding: 13, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}><div><strong>{selectedReferrer.fullName}</strong><div style={{ color: "#777", fontSize: 12 }}>{selectedReferrer.memberNo} · {selectedReferrer.city}</div></div><button onClick={() => { setSelectedReferrer(null); setReferralQuery(""); }} style={{ border: 0, background: "transparent", color: "#b91c1c", cursor: "pointer", fontWeight: 700 }}>Remove</button></div> : <div style={{ position: "relative" }}><input style={inputStyle} value={referralQuery} onChange={(e) => setReferralQuery(e.target.value)} placeholder="Type member name or Registration No." />{(referralLoading || referralResults.length > 0) && <div style={{ position: "absolute", zIndex: 30, top: "100%", left: 0, right: 0, background: "white", border: "1px solid #ddd", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,.12)", overflow: "hidden" }}>{referralLoading ? <div style={{ padding: 12, color: "#777", fontSize: 12 }}>Searching members…</div> : referralResults.map((m) => <button key={m.id} onClick={() => { setSelectedReferrer(m); setReferralResults([]); }} style={{ width: "100%", textAlign: "left", padding: "10px 12px", background: "white", border: 0, borderBottom: "1px solid #f3f3f3", cursor: "pointer" }}><strong>{m.fullName}</strong><span style={{ color: "#777", fontSize: 12 }}> · {m.memberNo} · {m.city}</span></button>)}</div>}</div>}<p style={{ color: "#888", fontSize: 11, lineHeight: 1.6, marginTop: 7 }}>If selected, the member may receive a notification and the office can verify the relationship. Referral is not compulsory.</p></div>
          </div>}

          {step === 4 && <div><SectionHead icon={Users} title="Family Information" subtitle="Private data for administration and future member services. Optional fields can be left blank." />
            <div style={{ background: "#fef9c3", border: "1px solid #fde047", borderRadius: 8, padding: "11px 14px", marginBottom: 20, color: "#854d0e", fontSize: 12, lineHeight: 1.7 }}>Caste/Biradari and religious affiliation are optional and private. They are not shown publicly and should not be used to automatically approve, reject or rank a member.</div>
            <p style={{ color: GREEN, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em" }}>Spouse and Children</p><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="form-grid"><Field label="Spouse Name (if married)"><input style={inputStyle} value={family.spouseName} onChange={(e) => setFam("spouseName", e.target.value)} /></Field><Field label="Number of Children"><select style={inputStyle} value={String(children.length)} onChange={(e) => setChildrenCount(e.target.value)}>{Array.from({ length: 21 }, (_, i) => <option key={i} value={i}>{i}</option>)}</select></Field></div>
            {children.length > 0 && <div style={{ display: "grid", gap: 10, margin: "16px 0 24px" }}>{children.map((child, i) => <div key={i} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 14, background: "#fcfcfa" }}><div style={{ color: GREEN, fontWeight: 800, fontSize: 12, marginBottom: 10 }}>Child {i + 1}</div><div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 10 }} className="child-grid"><Field label="Full Name *" error={errors[`child_${i}`]}><input style={inputStyle} value={child.fullName} onChange={(e) => setChild(i, "fullName", e.target.value)} /></Field><Field label="Date of Birth"><input type="date" style={inputStyle} value={child.dob} onChange={(e) => setChild(i, "dob", e.target.value)} /></Field><Field label="Education"><select style={inputStyle} value={child.education} onChange={(e) => setChild(i, "education", e.target.value)}>{childEducationLevels.map((x) => <option key={x}>{x}</option>)}</select></Field></div></div>)}</div>}
            <p style={{ color: GREEN, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", marginTop: 24 }}>Family / Biradari</p><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="form-grid"><Field label="Araian Family Branch / Biradari"><input style={inputStyle} value={family.familyBranch} onChange={(e) => setFam("familyBranch", e.target.value)} placeholder="Type if known" /></Field><Field label="Caste / Biradari (Optional)" hint="Choose a suggestion or type your own if it is not listed."><input list="caste-options" style={inputStyle} value={family.caste} onChange={(e) => setFam("caste", e.target.value)} /><datalist id="caste-options">{casteBiradariSuggestions.map((x) => <option key={x} value={x} />)}</datalist></Field><Field label="Religious Affiliation / Maslak (Optional)" hint="Private. You may also choose Prefer not to say."><input list="sect-options" style={inputStyle} value={family.religiousSect} onChange={(e) => setFam("religiousSect", e.target.value)} /><datalist id="sect-options">{religiousSectSuggestions.map((x) => <option key={x} value={x} />)}</datalist></Field><Field label="Family City / Area"><input style={inputStyle} value={family.familyCity} onChange={(e) => setFam("familyCity", e.target.value)} /></Field><Field label="Family Contact Person"><input style={inputStyle} value={family.familyContactName} onChange={(e) => setFam("familyContactName", e.target.value)} /></Field><Field label="Family Contact Number"><input type="tel" style={inputStyle} value={family.familyContactNumber} onChange={(e) => setFam("familyContactNumber", e.target.value)} /></Field></div>
            <p style={{ color: GREEN, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", marginTop: 24 }}>Emergency Contact</p><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="form-grid"><Field label="Emergency Contact Name"><input style={inputStyle} value={family.emergencyContactName} onChange={(e) => setFam("emergencyContactName", e.target.value)} /></Field><Field label="Emergency Contact Number"><input type="tel" style={inputStyle} value={family.emergencyContactNumber} onChange={(e) => setFam("emergencyContactNumber", e.target.value)} /></Field><Field label="Relationship"><select style={inputStyle} value={family.emergencyRelationship} onChange={(e) => setFam("emergencyRelationship", e.target.value)}><option value="">Select relationship…</option>{relationships.map((x) => <option key={x}>{x}</option>)}</select></Field></div>
          </div>}

          {step === 5 && <div><SectionHead icon={Upload} title="Documents and Payment Proof" subtitle="Maximum 4MB each. Accepted: JPG, PNG, WebP or PDF." /><div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }} className="doc-grid">{[
            { key: "photoUrl", label: "Passport Photo *" }, { key: "cnicFrontUrl", label: "CNIC Front *" }, { key: "cnicBackUrl", label: "CNIC Back *" }, { key: "paymentProofUrl", label: "Payment Proof *" }
          ].map(({ key, label }) => <div key={key}><label style={labelStyle}>{label}</label><label style={{ display: "block", border: `2px dashed ${form[key as keyof typeof form] ? GOLD : "#d9d9d9"}`, borderRadius: 10, padding: 12, textAlign: "center", cursor: "pointer", background: "#fafaf8" }}>{form[key as keyof typeof form] ? <div style={{ color: GREEN, fontSize: 12, fontWeight: 800, padding: 24 }}>✓ Uploaded</div> : <div style={{ padding: 16 }}><Upload size={22} color="#aaa" /><div style={{ color: "#999", fontSize: 11, marginTop: 5 }}>Click to upload</div></div>}<input type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={handleFile(key as keyof typeof form)} /></label>{errors[key] && <p style={{ color: "#dc2626", fontSize: 11 }}>{errors[key]}</p>}</div>)}</div><div style={{ marginTop: 22 }}><MultiImageUpload label="Additional Photos / Certificates (Optional)" images={form.additionalPhotos} onChange={(imgs) => set("additionalPhotos", imgs)} /></div><div style={{ background: "#f0f7f3", borderRadius: 10, padding: "13px 16px", marginTop: 20, color: "#555", fontSize: 12, lineHeight: 1.7 }}>By submitting, I confirm that the information is accurate and I consent to secure administrative storage of the information supplied in this form.</div></div>}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 30, paddingTop: 22, borderTop: "1px solid #f0f0f0", alignItems: "center" }}><div>{step > 0 && <button onClick={back} style={{ background: "#f5f5f5", border: 0, borderRadius: 8, padding: "10px 22px", fontWeight: 700, cursor: "pointer" }}>← Back</button>}</div><div style={{ display: "flex", gap: 12, alignItems: "center" }}><span style={{ color: "#aaa", fontSize: 12 }}>Step {step + 1} of {steps.length}</span>{step < steps.length - 1 ? <button onClick={next} style={{ background: GREEN, color: "white", border: 0, borderRadius: 8, padding: "10px 26px", fontWeight: 800, cursor: "pointer" }}>Next →</button> : <button onClick={submit} disabled={loading} style={{ background: loading ? "#e5e7eb" : GOLD, color: loading ? "#999" : "#1a1a1a", border: 0, borderRadius: 8, padding: "10px 26px", fontWeight: 800, cursor: loading ? "wait" : "pointer" }}>{loading ? "Submitting..." : "Submit Application"}</button>}</div></div>
        </div>
        <p style={{ textAlign: "center", color: "#888", fontSize: 14, marginTop: 20 }}>Already registered? <Link to="/member/login" style={{ color: GREEN, fontWeight: 700 }}>Login here</Link></p>
      </section>
      <style>{`@media(max-width:700px){.form-grid,.mem-grid,.doc-grid,.child-grid{grid-template-columns:1fr!important}.form-grid>[style*="span 2"]{grid-column:span 1!important}}`}</style>
    </div>
  );
}
