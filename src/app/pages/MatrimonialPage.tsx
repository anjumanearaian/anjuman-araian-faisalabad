import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { CheckCircle, DollarSign, Heart, Loader2, LockKeyhole, Send, ShieldCheck, Upload } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { MultiImageUpload } from "../components/ui/MultiImageUpload";
import { apiClient } from "../lib/apiClient";
import { uploadFile } from "../lib/upload";
import { createMatrimonial } from "../lib/matrimonialStore";
import { getSiteSettings } from "../lib/settingsStore";
import { citiesForProvince, pakistanCitiesByProvince, suggestLocation } from "../lib/pakistanLocations";
import {
  EDUCATION_OPTIONS, FAMILY_SETUP_OPTIONS, MARITAL_STATUS_OPTIONS, PARTNER_EDUCATION_OPTIONS, PARTNER_MARITAL_OPTIONS,
  PARTNER_PROFESSION_OPTIONS, PROFESSION_OPTIONS, SECT_OPTIONS, buildFamilyBackground, buildPartnerRequirements,
} from "../lib/matrimonialOptions";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";
const PROVINCES = Object.keys(pakistanCitiesByProvince);

type MatrimonialFormState = {
  name: string; age: string; gender: "male" | "female"; province: string; city: string; education: string; profession: string;
  maritalStatus: string; familySetup: string; sect: string; familyNotes: string; contact: string; relationToCandidate: string;
  preferredAgeMin: string; preferredAgeMax: string; preferredEducation: string; preferredProfession: string; preferredProvince: string;
  preferredCity: string; preferredMaritalStatus: string; preferredFamilySetup: string; partnerNotes: string; photoUrl: string;
  paymentSenderName: string; paymentMethod: string; paymentReference: string; paymentProofUrl: string; additionalPhotos: string[]; packageId: string;
};

const blank: MatrimonialFormState = {
  name: "", age: "", gender: "male", province: "Punjab", city: "Faisalabad", education: "", profession: "",
  maritalStatus: "Never Married", familySetup: "", sect: "", familyNotes: "", contact: "", relationToCandidate: "Self",
  preferredAgeMin: "", preferredAgeMax: "", preferredEducation: "No Preference", preferredProfession: "No Preference",
  preferredProvince: "No Preference", preferredCity: "No Preference", preferredMaritalStatus: "No Preference", preferredFamilySetup: "No Preference",
  partnerNotes: "", photoUrl: "", paymentSenderName: "", paymentMethod: "Bank Transfer", paymentReference: "", paymentProofUrl: "", additionalPhotos: [], packageId: "",
};

export function MatrimonialPage() {
  const settings = getSiteSettings();
  const [form, setForm] = useState<MatrimonialFormState>(blank);
  const [initializing, setInitializing] = useState(true);
  const [submittedExisting, setSubmittedExisting] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveState, setSaveState] = useState("");
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const hydrated = useRef(false);
  const submitting = useRef(false);
  const packageInfo = settings.matrimonialPackages?.[0];
  const cityOptions = useMemo(() => citiesForProvince(form.province), [form.province]);
  const preferredCityOptions = useMemo(() => form.preferredProvince !== "No Preference" ? citiesForProvince(form.preferredProvince) : [], [form.preferredProvince]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [draft, member] = await Promise.all([apiClient<any>("/forms/matrimonial").catch(() => null), apiClient<any>("/members/me")]);
        if (cancelled) return;
        const saved = draft?.data || {};
        const memberCity = String(member?.city || "");
        const memberProvince = String(member?.province || suggestLocation(memberCity).province || "Punjab");
        setForm({ ...blank, ...saved, packageId: saved.packageId || packageInfo?.id || "", province: saved.province || memberProvince, city: saved.city || memberCity || "Faisalabad", contact: saved.contact || member?.whatsapp || member?.phone || "", additionalPhotos: Array.isArray(saved.additionalPhotos) ? saved.additionalPhotos : [] });
        const already = draft?.status === "submitted";
        setSubmittedExisting(already); setSubmittedAt(draft?.submittedAt || null); hydrated.current = true;
        setSaveState(already ? "Application already submitted" : "All changes saved");
      } catch (error: any) { setErrors({ form: error?.message || "Could not load your matrimonial application." }); }
      finally { if (!cancelled) setInitializing(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hydrated.current || submittedExisting || initializing) return;
    setSaveState("Saving changes...");
    const timer = window.setTimeout(() => {
      apiClient("/forms/matrimonial", { method: "PUT", body: JSON.stringify({ data: form, completion: Math.min(95, Math.round((Object.values(form).filter((v) => Array.isArray(v) ? v.length > 0 : Boolean(v)).length / Object.keys(form).length) * 100)), status: "incomplete" }) })
        .then(() => setSaveState("All changes saved")).catch(() => setSaveState("Could not save draft"));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [form, submittedExisting, initializing]);

  const set = (key: keyof MatrimonialFormState, value: any) => { setForm((old) => ({ ...old, [key]: value })); if (errors[key]) setErrors((old) => ({ ...old, [key]: "" })); };
  const changeProvince = (province: string) => { const cities = citiesForProvince(province); setForm((old) => ({ ...old, province, city: cities.includes(old.city) ? old.city : (cities[0] || "") })); };
  const changePreferredProvince = (province: string) => { const cities = province === "No Preference" ? [] : citiesForProvince(province); setForm((old) => ({ ...old, preferredProvince: province, preferredCity: province === "No Preference" ? "No Preference" : (cities[0] || "No Preference") })); };

  const handleFileUpload = (key: "photoUrl" | "paymentProofUrl") => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const max = file.type.startsWith("image/") ? 12 * 1024 * 1024 : 4 * 1024 * 1024;
    if (file.size > max) { setErrors((old) => ({ ...old, [key]: file.type.startsWith("image/") ? "Image source must be 12 MB or smaller." : "PDF must be 4 MB or smaller." })); return; }
    setUploading((old) => ({ ...old, [key]: true }));
    try { set(key, await uploadFile(file, key === "photoUrl" ? "matrimonial-photo" : "matrimonial-payment-proof")); }
    catch (error: any) { setErrors((old) => ({ ...old, [key]: error?.message || "Upload failed." })); }
    finally { setUploading((old) => ({ ...old, [key]: false })); e.target.value = ""; }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Candidate name is required.";
    if (!form.age || Number(form.age) < 18) next.age = "Candidate age must be 18 or above.";
    if (!form.city) next.city = "City is required.";
    if (!form.education) next.education = "Education is required.";
    if (!form.profession) next.profession = "Profession is required.";
    if (!form.contact.trim()) next.contact = "Contact / WhatsApp number is required.";
    if (form.paymentSenderName.trim().length < 2) next.paymentSenderName = "Enter the sender/account-holder name shown on the payment slip.";
    if (!form.paymentMethod.trim()) next.paymentMethod = "Select the payment method.";
    if (form.paymentMethod !== "Cash" && form.paymentReference.trim().length < 2) next.paymentReference = "Enter the bank/wallet transaction or reference ID.";
    if (!form.paymentProofUrl) next.paymentProofUrl = "Payment proof is required.";
    if (form.preferredAgeMin && form.preferredAgeMax && Number(form.preferredAgeMin) > Number(form.preferredAgeMax)) next.preferredAgeMax = "Maximum preferred age must be greater than minimum age.";
    setErrors(next); return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (submitting.current || loading || submittedExisting || !validate()) return;
    submitting.current = true; setLoading(true); setErrors({});
    try {
      await createMatrimonial({
        name: form.name, age: form.age, gender: form.gender, city: form.city, education: form.education, profession: form.profession,
        contact: form.contact, relationToCandidate: form.relationToCandidate,
        familyBackground: buildFamilyBackground({ maritalStatus: form.maritalStatus, familySetup: form.familySetup, sect: form.sect, notes: form.familyNotes }),
        requirements: buildPartnerRequirements({ ageMin: form.preferredAgeMin, ageMax: form.preferredAgeMax, education: form.preferredEducation, profession: form.preferredProfession, province: form.preferredProvince, city: form.preferredCity, maritalStatus: form.preferredMaritalStatus, familySetup: form.preferredFamilySetup, notes: form.partnerNotes }),
        photoUrl: form.photoUrl, paymentSenderName: form.paymentSenderName, paymentMethod: form.paymentMethod, paymentReference: form.paymentReference,
        paymentProofUrl: form.paymentProofUrl, additionalPhotos: form.additionalPhotos, packageId: form.packageId || packageInfo?.id || "",
      } as any);
      setSubmittedExisting(true); setSubmittedAt(new Date().toISOString()); setSaveState("Application submitted for committee and finance review");
    } catch (error: any) { setErrors({ form: error?.message || "Submission failed. Please try again." }); }
    finally { submitting.current = false; setLoading(false); }
  };

  const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid rgba(26,77,46,.22)", borderRadius: 8, padding: "11px 12px", fontSize: 13, background: "#fff", color: "#26352d" };

  if (initializing) return <div><PageHeader title="Matrimonial Service" subtitle="Private service for approved Anjuman members" breadcrumb={["Home", "Matrimonial"]} /><div style={{ padding: 70, textAlign: "center", color: "#666" }}><Loader2 className="spin" size={28} /><p>Loading your matrimonial record...</p></div></div>;

  if (submittedExisting) return <div>
    <PageHeader title="Matrimonial Service" subtitle="Private service for approved Anjuman members" breadcrumb={["Home", "Matrimonial"]} />
    <section style={{ maxWidth: 780, margin: "42px auto 80px", padding: "0 18px" }}><div style={{ background: "white", border: "1px solid #e8e2d8", borderRadius: 16, padding: 30, boxShadow: "0 8px 32px rgba(0,0,0,.07)" }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 20 }}><CheckCircle size={36} color={GREEN} /><div><h2 style={{ margin: 0, color: GREEN, fontFamily: "'Playfair Display', serif" }}>Matrimonial Application Submitted</h2><p style={{ color: "#666", margin: "6px 0 0", lineHeight: 1.65 }}>Your profile is under committee review and the payment slip is under Finance verification. The uploaded amount is not treated as paid and does not enter the ledger until Finance matches the sender/reference and approves the proof.</p></div></div>
      <div style={{ background: "#eef6ff", border: "1px solid #cfe4fb", borderRadius: 10, padding: 14, color: "#315f7d", fontSize: 13, lineHeight: 1.7 }}><ShieldCheck size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />Directory publication still requires payment verification, committee approval and Admin <strong>Show</strong> permission. Contact and family details remain private.</div>
      {submittedAt && <p style={{ color: "#999", fontSize: 11 }}>Submitted: {new Date(submittedAt).toLocaleString()}</p>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}><Link to="/member/portal" style={primaryLink}>Member Portal</Link><Link to="/matrimonial/requests" style={secondaryLink}>My Match Requests</Link></div>
      <p style={{ color: "#777", fontSize: 12, lineHeight: 1.7, marginTop: 18 }}><LockKeyhole size={14} style={{ verticalAlign: "middle", marginRight: 5 }} />Corrections remain tied to the same profile, avoiding duplicate matrimonial records.</p>
    </div></section><ResponsiveStyles />
  </div>;

  return <div>
    <PageHeader title="Matrimonial Service" subtitle="A privacy-controlled service for approved Anjuman members" breadcrumb={["Home", "Matrimonial"]} />
    <div style={{ background: "#f0f7f3", borderTop: `3px solid ${GOLD}`, padding: "18px 20px" }}><div style={{ maxWidth: 900, margin: "0 auto", display: "flex", gap: 10 }}><ShieldCheck size={19} color={GOLD} /><p style={{ margin: 0, color: "#47534b", fontSize: 13, lineHeight: 1.7 }}><strong>Approved members only.</strong> Payment proof is reviewed by Finance separately from the matrimonial committee. A profile is never published merely because a slip was uploaded.</p></div></div>
    <section className="mat-section" style={{ maxWidth: 940, margin: "0 auto", padding: "34px 18px 70px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 18 }}><div><h2 style={{ margin: 0, color: GREEN, fontFamily: "'Playfair Display', serif" }}>Register Matrimonial Profile</h2><p style={{ margin: "6px 0 0", color: "#777", fontSize: 13 }}>Structured information improves review and matching.</p></div><span style={{ fontSize: 11, color: "#6f7c73" }}>{saveState}</span></div>
      {errors.form && <div style={{ background: "#fee2e2", color: "#b91c1c", borderRadius: 8, padding: 12, marginBottom: 16 }}>{errors.form}</div>}
      {packageInfo && <section style={sectionCard}><h3 style={sectionTitle}>Application Package</h3><div style={{ border: `1px solid ${GOLD}`, background: "#fff9ef", borderRadius: 10, padding: 16 }}><strong style={{ color: GREEN }}>{packageInfo.name}</strong><div style={{ color: "#a87d1d", fontSize: 18, fontWeight: 800, marginTop: 5 }}>{packageInfo.fee}</div><p style={{ color: "#666", fontSize: 12, marginBottom: 0 }}>{packageInfo.description}</p></div></section>}
      <section style={sectionCard}><h3 style={sectionTitle}><DollarSign size={17} /> Fee Payment Instructions</h3><div className="payment-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>{settings.paymentMethods?.length ? settings.paymentMethods.map((pm: any) => <div key={pm.id} style={{ background: "#f8f5ef", borderRadius: 9, padding: 14 }}><strong style={{ color: GREEN }}>{pm.bankName}</strong><div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>Title: {pm.accountTitle}</div><b style={{ fontSize: 13 }}>{pm.accountNo}</b></div>) : <div style={{ color: "#777", fontSize: 13 }}>No payment methods configured.</div>}</div></section>

      <form onSubmit={handleSubmit}>
        <section style={sectionCard}><h3 style={sectionTitle}>Candidate Information</h3><div className="form-grid" style={grid2}>
          <Field label="Applying For"><select style={inputStyle} value={form.relationToCandidate} onChange={(e)=>set("relationToCandidate",e.target.value)}><option>Self</option><option>Son</option><option>Daughter</option><option>Brother</option><option>Sister</option><option>Other family member</option></select></Field>
          <Field label="Full Name *" error={errors.name}><input style={inputStyle} value={form.name} onChange={(e)=>set("name",e.target.value)} /></Field>
          <Field label="Age *" error={errors.age}><input type="number" min={18} max={80} style={inputStyle} value={form.age} onChange={(e)=>set("age",e.target.value)} /></Field>
          <Field label="Gender *"><select style={inputStyle} value={form.gender} onChange={(e)=>set("gender",e.target.value)}><option value="male">Male</option><option value="female">Female</option></select></Field>
          <Field label="Marital Status"><select style={inputStyle} value={form.maritalStatus} onChange={(e)=>set("maritalStatus",e.target.value)}>{MARITAL_STATUS_OPTIONS.map((v)=><option key={v}>{v}</option>)}</select></Field>
          <Field label="Education *" error={errors.education}><select style={inputStyle} value={form.education} onChange={(e)=>set("education",e.target.value)}><option value="">Select education</option>{EDUCATION_OPTIONS.map((v)=><option key={v}>{v}</option>)}</select></Field>
          <Field label="Profession / Sector *" error={errors.profession}><select style={inputStyle} value={form.profession} onChange={(e)=>set("profession",e.target.value)}><option value="">Select profession</option>{PROFESSION_OPTIONS.map((v)=><option key={v}>{v}</option>)}</select></Field>
          <Field label="Province / Region"><select style={inputStyle} value={form.province} onChange={(e)=>changeProvince(e.target.value)}>{PROVINCES.map((v)=><option key={v}>{v}</option>)}</select></Field>
          <Field label="City *" error={errors.city}><select style={inputStyle} value={form.city} onChange={(e)=>set("city",e.target.value)}>{cityOptions.map((v)=><option key={v}>{v}</option>)}</select></Field>
          <Field label="Contact / WhatsApp *" error={errors.contact}><input style={inputStyle} value={form.contact} onChange={(e)=>set("contact",e.target.value)} /></Field>
          <Field label="Family Setup"><select style={inputStyle} value={form.familySetup} onChange={(e)=>set("familySetup",e.target.value)}><option value="">Select family setup</option>{FAMILY_SETUP_OPTIONS.map((v)=><option key={v}>{v}</option>)}</select></Field>
          <Field label="Sect (optional)"><select style={inputStyle} value={form.sect} onChange={(e)=>set("sect",e.target.value)}><option value="">Select / Prefer not to specify</option>{SECT_OPTIONS.map((v)=><option key={v}>{v}</option>)}</select></Field>
        </div><Field label="Family Background / Notes"><textarea rows={3} style={{...inputStyle,resize:"vertical"}} value={form.familyNotes} onChange={(e)=>set("familyNotes",e.target.value)} /></Field></section>

        <section style={sectionCard}><h3 style={sectionTitle}>Partner Preferences for Matching</h3><div className="form-grid" style={grid2}>
          <Field label="Preferred Age From"><input type="number" min={18} max={80} style={inputStyle} value={form.preferredAgeMin} onChange={(e)=>set("preferredAgeMin",e.target.value)} /></Field>
          <Field label="Preferred Age To" error={errors.preferredAgeMax}><input type="number" min={18} max={80} style={inputStyle} value={form.preferredAgeMax} onChange={(e)=>set("preferredAgeMax",e.target.value)} /></Field>
          <Field label="Preferred Education"><select style={inputStyle} value={form.preferredEducation} onChange={(e)=>set("preferredEducation",e.target.value)}>{PARTNER_EDUCATION_OPTIONS.map((v)=><option key={v}>{v}</option>)}</select></Field>
          <Field label="Preferred Profession"><select style={inputStyle} value={form.preferredProfession} onChange={(e)=>set("preferredProfession",e.target.value)}>{PARTNER_PROFESSION_OPTIONS.map((v)=><option key={v}>{v}</option>)}</select></Field>
          <Field label="Preferred Province"><select style={inputStyle} value={form.preferredProvince} onChange={(e)=>changePreferredProvince(e.target.value)}><option>No Preference</option>{PROVINCES.map((v)=><option key={v}>{v}</option>)}</select></Field>
          <Field label="Preferred City"><select style={inputStyle} value={form.preferredCity} onChange={(e)=>set("preferredCity",e.target.value)} disabled={form.preferredProvince==="No Preference"}><option>No Preference</option>{preferredCityOptions.map((v)=><option key={v}>{v}</option>)}</select></Field>
          <Field label="Preferred Marital Status"><select style={inputStyle} value={form.preferredMaritalStatus} onChange={(e)=>set("preferredMaritalStatus",e.target.value)}>{PARTNER_MARITAL_OPTIONS.map((v)=><option key={v}>{v}</option>)}</select></Field>
          <Field label="Preferred Family Setup"><select style={inputStyle} value={form.preferredFamilySetup} onChange={(e)=>set("preferredFamilySetup",e.target.value)}><option>No Preference</option>{FAMILY_SETUP_OPTIONS.filter((v)=>!v.startsWith("Flexible")).map((v)=><option key={v}>{v}</option>)}</select></Field>
        </div><Field label="Other Partner Requirements"><textarea rows={3} style={{...inputStyle,resize:"vertical"}} value={form.partnerNotes} onChange={(e)=>set("partnerNotes",e.target.value)} /></Field></section>

        <section style={sectionCard}><h3 style={sectionTitle}>Photo & Payment Verification</h3>
          <div style={{ background:"#fff9e9",border:"1px solid #ead39a",borderRadius:10,padding:14,marginBottom:16 }}><div className="payment-detail-grid" style={{display:"grid",gridTemplateColumns:"1.2fr 1fr 1.2fr",gap:12}}>
            <Field label="Sender / Account-Holder Name *" error={errors.paymentSenderName}><input style={inputStyle} value={form.paymentSenderName} onChange={(e)=>set("paymentSenderName",e.target.value)} placeholder="Exact name shown on slip" /></Field>
            <Field label="Payment Method *" error={errors.paymentMethod}><select style={inputStyle} value={form.paymentMethod} onChange={(e)=>set("paymentMethod",e.target.value)}><option>Bank Transfer</option><option>JazzCash</option><option>Easypaisa</option><option>Cheque</option><option>Cash</option><option>Other</option></select></Field>
            <Field label="Transaction / Reference ID" error={errors.paymentReference}><input style={inputStyle} value={form.paymentReference} onChange={(e)=>set("paymentReference",e.target.value)} placeholder={form.paymentMethod==="Cash"?"Optional for cash":"Required"} /></Field>
          </div><p style={{margin:"10px 0 0",fontSize:11,color:"#775e25",lineHeight:1.6}}>The slip remains pending until Finance/Accounts matches these details. Uploading proof alone does not make the payment verified.</p></div>
          <div className="upload-grid" style={grid2}><UploadBox title="Candidate Photo (optional)" value={form.photoUrl} loading={Boolean(uploading.photoUrl)} accept="image/*" onChange={handleFileUpload("photoUrl")} error={errors.photoUrl} /><UploadBox title="Payment Proof / Receipt *" value={form.paymentProofUrl} loading={Boolean(uploading.paymentProofUrl)} accept="image/*,.pdf,application/pdf" onChange={handleFileUpload("paymentProofUrl")} error={errors.paymentProofUrl} /></div>
          <div style={{marginTop:18}}><MultiImageUpload label="Additional Candidate Photos / Relevant Documents (optional)" images={form.additionalPhotos} onChange={(images)=>set("additionalPhotos",images)} /></div>
        </section>

        <section style={{...sectionCard,background:"#f8f5ef"}}><h3 style={sectionTitle}>Private Directory Card Preview</h3><div style={{display:"flex",gap:14,alignItems:"center",background:"white",border:"1px solid #e6dccb",borderRadius:10,padding:15}}><div style={{width:64,height:64,borderRadius:"50%",overflow:"hidden",background:"#eef4ef",display:"grid",placeItems:"center"}}>{form.photoUrl?<img src={form.photoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<Heart size={20} color={GREEN}/>}</div><div><b style={{color:GREEN}}>Private Proposal Preview</b><div style={{color:"#777",fontSize:12,marginTop:4}}>{form.gender} · {form.age||"—"} yrs · {form.city||"—"}</div><div style={{color:"#555",fontSize:12,marginTop:4}}>{form.education||"Education"} · {form.profession||"Profession"}</div></div></div></section>
        <div className="submit-row" style={{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:12,flexWrap:"wrap"}}><span style={{color:"#777",fontSize:11}}>Profile and payment verification are separate approvals.</span><button type="submit" disabled={loading||Object.values(uploading).some(Boolean)} style={{border:0,borderRadius:9,padding:"12px 22px",background:loading?"#6e927a":GREEN,color:"white",fontWeight:800,cursor:loading?"not-allowed":"pointer",display:"inline-flex",alignItems:"center",gap:7}}>{loading?<><Loader2 size={15} className="spin"/>Submitting...</>:<><Send size={15}/>Submit Matrimonial Profile</>}</button></div>
      </form>
    </section><ResponsiveStyles />
  </div>;
}

function Field({label,error,children}:{label:string;error?:string;children:React.ReactNode}) { return <div style={{minWidth:0}}><label style={{display:"block",marginBottom:6,color:GREEN,fontSize:12,fontWeight:800}}>{label}</label>{children}{error&&<div style={{color:"#b91c1c",fontSize:11,marginTop:4}}>{error}</div>}</div>; }
function UploadBox({title,value,loading,accept,onChange,error}:{title:string;value:string;loading:boolean;accept:string;onChange:(e:React.ChangeEvent<HTMLInputElement>)=>void;error?:string}) { const pdf=value?.toLowerCase().includes(".pdf"); return <div><label style={{display:"block",marginBottom:6,color:GREEN,fontSize:12,fontWeight:800}}>{title}</label><label style={{minHeight:120,border:`2px dashed ${error?"#b91c1c":value?GOLD:"#ccd8cf"}`,borderRadius:10,background:value?"#fff9ef":"#fafbf9",display:"grid",placeItems:"center",cursor:loading?"wait":"pointer",padding:12,textAlign:"center"}}>{loading?<Loader2 className="spin" color={GREEN}/>:value?(pdf?<div><CheckCircle color={GREEN}/><div style={{marginTop:7,fontSize:12,color:GREEN}}>PDF receipt uploaded</div></div>:<img src={value} alt="Uploaded" style={{maxWidth:"100%",maxHeight:95,objectFit:"contain"}}/>):<div><Upload size={22} color="#8a9a90"/><div style={{marginTop:7,fontSize:12,color:"#7b8780"}}>Click to upload</div></div>}<input type="file" accept={accept} style={{display:"none"}} onChange={onChange} disabled={loading}/></label>{error&&<div style={{color:"#b91c1c",fontSize:11,marginTop:4}}>{error}</div>}</div>; }
function ResponsiveStyles() { return <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin .9s linear infinite}@media(max-width:720px){.mat-section{padding:24px 12px 60px!important}.form-grid,.upload-grid,.payment-grid,.payment-detail-grid{grid-template-columns:1fr!important}.submit-row{align-items:stretch!important;flex-direction:column!important}.submit-row button{width:100%;justify-content:center}input,select,textarea{font-size:16px!important}}`}</style>; }
const grid2:React.CSSProperties={display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:15,marginBottom:15};
const sectionCard:React.CSSProperties={background:"white",border:"1px solid #ece7df",borderRadius:14,padding:22,marginBottom:18,boxShadow:"0 3px 16px rgba(0,0,0,.04)"};
const sectionTitle:React.CSSProperties={display:"flex",alignItems:"center",gap:7,color:GREEN,fontFamily:"'Playfair Display', serif",fontSize:18,margin:"0 0 16px"};
const primaryLink:React.CSSProperties={display:"inline-flex",background:GREEN,color:"white",padding:"10px 14px",borderRadius:8,textDecoration:"none",fontWeight:800,fontSize:12};
const secondaryLink:React.CSSProperties={display:"inline-flex",background:"white",color:GREEN,border:"1px solid rgba(26,77,46,.25)",padding:"10px 14px",borderRadius:8,textDecoration:"none",fontWeight:800,fontSize:12};
