import { useMemo, useState } from "react";
import { Link } from "react-router";
import { CheckCircle, Edit2, Eye, EyeOff, Loader2, Save, ShieldCheck, Upload, X } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { apiClient } from "../lib/apiClient";
import { MatrimonialProfile } from "../lib/matrimonialStore";
import { EDUCATION_OPTIONS, PROFESSION_OPTIONS } from "../lib/matrimonialOptions";
import { citiesForProvince, pakistanCitiesByProvince, suggestLocation } from "../lib/pakistanLocations";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";
const PROVINCES = Object.keys(pakistanCitiesByProvince);

type Props = {
  profile: MatrimonialProfile;
  onSaved?: (profile: MatrimonialProfile) => void;
};

export function MatrimonialExistingProfilePage({ profile, onSaved }: Props) {
  const initialProvince = suggestLocation(profile.city).province || "Punjab";
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [localProfile, setLocalProfile] = useState(profile);
  const [form, setForm] = useState({
    name: profile.name || "",
    age: profile.age || "",
    gender: profile.gender || "male",
    province: initialProvince,
    city: profile.city || "Faisalabad",
    education: profile.education || "",
    profession: profile.profession || "",
    contact: profile.contact || "",
    familyBackground: profile.familyBackground || "",
    requirements: profile.requirements || "",
    photoUrl: profile.photoUrl || "",
    paymentProofUrl: profile.paymentProofUrl || "",
    additionalPhotos: profile.additionalPhotos || [],
    relationToCandidate: profile.relationToCandidate || "Self",
  });
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  const cities = useMemo(() => citiesForProvince(form.province), [form.province]);

  const set = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  const changeProvince = (province: string) => {
    const nextCities = citiesForProvince(province);
    setForm((prev) => ({ ...prev, province, city: nextCities.includes(prev.city) ? prev.city : (nextCities[0] || "") }));
  };

  const upload = (key: "photoUrl" | "paymentProofUrl") => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { setError("File must be 4MB or smaller."); return; }
    setUploading((prev) => ({ ...prev, [key]: true }));
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: fd });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Upload failed.");
      set(key, body.url);
    } catch (e: any) {
      setError(e?.message || "Upload failed.");
    } finally {
      setUploading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const save = async () => {
    if (!form.name.trim() || !form.age || !form.city || !form.education || !form.profession || !form.contact.trim()) {
      setError("Name, age, city, education, profession and contact are required.");
      return;
    }
    setSaving(true); setError(""); setSuccess("");
    try {
      const updated = await apiClient<MatrimonialProfile>("/matrimonial/mine", {
        method: "PUT",
        body: JSON.stringify({
          name: form.name,
          age: form.age,
          gender: form.gender,
          city: form.city,
          education: form.education,
          profession: form.profession,
          contact: form.contact,
          familyBackground: form.familyBackground,
          requirements: form.requirements,
          photoUrl: form.photoUrl,
          paymentProofUrl: form.paymentProofUrl,
          additionalPhotos: form.additionalPhotos,
          relationToCandidate: form.relationToCandidate,
        }),
      });
      setLocalProfile(updated);
      setEditing(false);
      setSuccess("Changes saved. The profile has returned to committee review and remains hidden until the administrator approves and enables Show again.");
      onSaved?.(updated);
    } catch (e: any) {
      setError(e?.message || "Profile changes could not be saved.");
    } finally { setSaving(false); }
  };

  const status = String(localProfile.status || "pending");
  const payment = String(localProfile.paymentStatus || "pending");

  return <div>
    <PageHeader title="My Matrimonial Profile" subtitle="Private profile management for approved Anjuman members" breadcrumb={["Home", "Matrimonial", "My Profile"]} />
    <section style={{ maxWidth: 920, margin: "36px auto 80px", padding: "0 18px" }}>
      {error && <Notice bg="#fee2e2" color="#b91c1c">{error}</Notice>}
      {success && <Notice bg="#dcfce7" color="#166534">{success}</Notice>}

      <div style={{ background: "white", border: "1px solid #ebe5dc", borderRadius: 16, padding: 24, boxShadow: "0 7px 28px rgba(0,0,0,.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 15, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ width: 76, height: 76, borderRadius: "50%", overflow: "hidden", background: "#eef4ef", display: "grid", placeItems: "center" }}>{localProfile.photoUrl ? <img src={localProfile.photoUrl} alt="Candidate" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ShieldCheck color={GREEN} />}</div>
            <div><h2 style={{ margin: 0, color: GREEN, fontFamily: "'Playfair Display', serif" }}>{localProfile.name || "Candidate"}</h2><div style={{ color: "#777", fontSize: 12, marginTop: 5 }}>{localProfile.profileCode || "Matrimonial Profile"}</div></div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge label={`Status: ${status}`} good={status === "approved"} />
            <Badge label={`Payment: ${payment}`} good={["received", "verified"].includes(payment)} />
            <Badge label={localProfile.showOnPortal ? "Shown to Members" : "Hidden from Directory"} good={Boolean(localProfile.showOnPortal)} />
          </div>
        </div>

        <div style={{ marginTop: 18, background: "#eef6ff", color: "#315f7d", border: "1px solid #cfe4fb", borderRadius: 10, padding: 13, fontSize: 12, lineHeight: 1.7 }}><ShieldCheck size={15} style={{ verticalAlign: "middle", marginRight: 5 }} />This profile is never automatically public. Only approved members can access the directory, and this profile appears there only when the administrator has explicitly enabled <strong>Show</strong>.</div>

        {!editing ? <>
          <div className="profile-detail-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12, marginTop: 22 }}>
            <Info label="Gender / Age" value={`${localProfile.gender || "—"} · ${localProfile.age || "—"} years`} />
            <Info label="City" value={localProfile.city || "—"} />
            <Info label="Education" value={localProfile.education || "—"} />
            <Info label="Profession" value={localProfile.profession || "—"} />
            <Info label="Contact" value={localProfile.contact || "Private"} />
            <Info label="Applying For" value={localProfile.relationToCandidate || "Self"} />
          </div>
          {localProfile.familyBackground && <TextBlock title="Family Background" text={localProfile.familyBackground} />}
          {localProfile.requirements && <TextBlock title="Partner Requirements" text={localProfile.requirements} />}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}><button onClick={() => { setEditing(true); setError(""); setSuccess(""); }} style={primaryButton}><Edit2 size={14} /> Edit Profile</button><Link to="/matrimonial/requests" style={secondaryLink}>My Match Requests</Link><Link to="/member/portal" style={secondaryLink}>Member Portal</Link></div>
        </> : <>
          <div style={{ marginTop: 20, background: "#fff8e7", color: "#755510", border: "1px solid #ecd89e", borderRadius: 9, padding: 12, fontSize: 12, lineHeight: 1.6 }}>Editing a submitted or approved profile sends it back for committee review and automatically hides it from the matrimonial directory until Admin approves it again.</div>
          <div className="edit-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14, marginTop: 18 }}>
            <Field label="Full Name"><input style={inputStyle} value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="Applying For"><select style={inputStyle} value={form.relationToCandidate} onChange={(e) => set("relationToCandidate", e.target.value)}><option>Self</option><option>Son</option><option>Daughter</option><option>Brother</option><option>Sister</option><option>Other family member</option></select></Field>
            <Field label="Age"><input type="number" min={18} max={80} style={inputStyle} value={form.age} onChange={(e) => set("age", e.target.value)} /></Field>
            <Field label="Gender"><select style={inputStyle} value={form.gender} onChange={(e) => set("gender", e.target.value)}><option value="male">Male</option><option value="female">Female</option></select></Field>
            <Field label="Province / Region"><select style={inputStyle} value={form.province} onChange={(e) => changeProvince(e.target.value)}>{PROVINCES.map((v) => <option key={v}>{v}</option>)}</select></Field>
            <Field label="City"><select style={inputStyle} value={form.city} onChange={(e) => set("city", e.target.value)}>{cities.map((v) => <option key={v}>{v}</option>)}</select></Field>
            <Field label="Education"><select style={inputStyle} value={form.education} onChange={(e) => set("education", e.target.value)}>{!EDUCATION_OPTIONS.includes(form.education) && form.education && <option>{form.education}</option>}{EDUCATION_OPTIONS.map((v) => <option key={v}>{v}</option>)}</select></Field>
            <Field label="Profession / Sector"><select style={inputStyle} value={form.profession} onChange={(e) => set("profession", e.target.value)}>{!PROFESSION_OPTIONS.includes(form.profession) && form.profession && <option>{form.profession}</option>}{PROFESSION_OPTIONS.map((v) => <option key={v}>{v}</option>)}</select></Field>
            <Field label="Contact / WhatsApp"><input style={inputStyle} value={form.contact} onChange={(e) => set("contact", e.target.value)} /></Field>
          </div>
          <Field label="Family Background"><textarea rows={3} style={{ ...inputStyle, resize: "vertical" }} value={form.familyBackground} onChange={(e) => set("familyBackground", e.target.value)} /></Field>
          <Field label="Partner Requirements"><textarea rows={4} style={{ ...inputStyle, resize: "vertical" }} value={form.requirements} onChange={(e) => set("requirements", e.target.value)} /></Field>
          <div className="edit-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14, marginTop: 14 }}>
            <FileEdit title="Candidate Photo" value={form.photoUrl} loading={Boolean(uploading.photoUrl)} accept="image/*" onChange={upload("photoUrl")} />
            <FileEdit title="Payment Proof" value={form.paymentProofUrl} loading={Boolean(uploading.paymentProofUrl)} accept="image/*,application/pdf" onChange={upload("paymentProofUrl")} />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}><button disabled={saving || Object.values(uploading).some(Boolean)} onClick={save} style={primaryButton}>{saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Save & Send for Review</button><button onClick={() => setEditing(false)} style={cancelButton}><X size={14} /> Cancel</button></div>
        </>}
      </div>
    </section>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin .9s linear infinite}@media(max-width:720px){.profile-detail-grid,.edit-grid{grid-template-columns:1fr!important}input,select,textarea{font-size:16px!important}}`}</style>
  </div>;
}

function Notice({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) { return <div style={{ background: bg, color, borderRadius: 9, padding: 12, marginBottom: 12, fontSize: 13 }}>{children}</div>; }
function Badge({ label, good }: { label: string; good: boolean }) { return <span style={{ background: good ? "#dcfce7" : "#f3f4f6", color: good ? "#166534" : "#555", padding: "5px 9px", borderRadius: 20, fontSize: 10, fontWeight: 800, textTransform: "capitalize" }}>{label}</span>; }
function Info({ label, value }: { label: string; value: string }) { return <div style={{ background: "#f8f5ef", borderRadius: 9, padding: 12 }}><div style={{ color: "#888", fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>{label}</div><div style={{ color: "#34453a", marginTop: 5, fontSize: 13 }}>{value}</div></div>; }
function TextBlock({ title, text }: { title: string; text: string }) { return <div style={{ marginTop: 14, borderTop: "1px solid #eee", paddingTop: 14 }}><b style={{ color: GREEN, fontSize: 12 }}>{title}</b><p style={{ color: "#666", fontSize: 12, lineHeight: 1.7, marginBottom: 0 }}>{text}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div style={{ marginTop: 12 }}><label style={{ display: "block", color: GREEN, fontWeight: 800, fontSize: 11, marginBottom: 5 }}>{label}</label>{children}</div>; }
function FileEdit({ title, value, loading, accept, onChange }: { title: string; value: string; loading: boolean; accept: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) { return <div><label style={{ display: "block", color: GREEN, fontWeight: 800, fontSize: 11, marginBottom: 5 }}>{title}</label><label style={{ minHeight: 105, border: `2px dashed ${value ? GOLD : "#ccd8cf"}`, borderRadius: 9, display: "grid", placeItems: "center", padding: 10, cursor: "pointer", background: value ? "#fff9ef" : "#fafbf9" }}>{loading ? <Loader2 className="spin" /> : value ? <div style={{ textAlign: "center", color: GREEN }}><CheckCircle size={20} /><div style={{ fontSize: 11, marginTop: 5 }}>File uploaded · click to replace</div></div> : <div style={{ textAlign: "center", color: "#7b8780" }}><Upload size={20} /><div style={{ fontSize: 11, marginTop: 5 }}>Upload file</div></div>}<input type="file" accept={accept} onChange={onChange} style={{ display: "none" }} /></label></div>; }

const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid rgba(26,77,46,.22)", borderRadius: 8, padding: "10px 11px", fontSize: 13, background: "white" };
const primaryButton: React.CSSProperties = { border: 0, borderRadius: 8, background: GREEN, color: "white", padding: "10px 14px", fontSize: 12, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" };
const cancelButton: React.CSSProperties = { border: "1px solid #ddd", borderRadius: 8, background: "white", color: "#555", padding: "10px 14px", fontSize: 12, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" };
const secondaryLink: React.CSSProperties = { border: "1px solid rgba(26,77,46,.25)", borderRadius: 8, color: GREEN, background: "white", padding: "10px 14px", fontSize: 12, fontWeight: 800, textDecoration: "none", display: "inline-flex", alignItems: "center" };
