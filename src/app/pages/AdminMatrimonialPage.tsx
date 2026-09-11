import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, CheckCircle, Edit2, Eye, EyeOff, HeartHandshake, RefreshCw, Search, ShieldCheck, Star, X, XCircle } from "lucide-react";
import { useAdmin } from "../context/AdminContext";
import {
  adminReviewMatchRequest,
  fetchAdminMatchRequests,
  fetchAllMatrimonials,
  MatrimonialPaymentStatus,
  MatrimonialProfile,
  MatrimonialStatus,
  updateMatrimonial,
} from "../lib/matrimonialStore";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

type EditState = {
  name: string;
  gender: string;
  age: string;
  city: string;
  education: string;
  profession: string;
  familyBackground: string;
  requirements: string;
  contact: string;
  status: MatrimonialStatus;
  paymentStatus: MatrimonialPaymentStatus;
  showOnPortal: boolean;
  isFeatured: boolean;
  adminNote: string;
};

function toEdit(p: MatrimonialProfile): EditState {
  return {
    name: p.name || "",
    gender: p.gender || "male",
    age: p.age || "",
    city: p.city || "",
    education: p.education || "",
    profession: p.profession || "",
    familyBackground: p.familyBackground || "",
    requirements: p.requirements || "",
    contact: p.contact || "",
    status: p.status || "pending",
    paymentStatus: p.paymentStatus || "pending",
    showOnPortal: Boolean(p.showOnPortal),
    isFeatured: Boolean(p.isFeatured),
    adminNote: p.adminNote || "",
  };
}

function normalized(value: unknown) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}
function preferenceHit(requirements: unknown, value: unknown) {
  const req = normalized(requirements);
  const target = normalized(value);
  if (!req || !target) return false;
  if (req.includes(target)) return true;
  return target.split(" ").filter((v) => v.length >= 2).some((v) => req.includes(v));
}
function pairScore(a: any, b: any) {
  if (!a || !b || normalized(a.gender) === normalized(b.gender)) return 0;
  let score = 25;
  if (normalized(a.city) && normalized(a.city) === normalized(b.city)) score += 5;
  if (preferenceHit(a.requirements, b.city)) score += 10;
  if (preferenceHit(a.requirements, b.education)) score += 10;
  if (preferenceHit(a.requirements, b.profession)) score += 15;
  if (preferenceHit(b.requirements, a.city)) score += 10;
  if (preferenceHit(b.requirements, a.education)) score += 10;
  if (preferenceHit(b.requirements, a.profession)) score += 15;
  return Math.min(100, score);
}

export function AdminMatrimonialPage() {
  const { isAdmin } = useAdmin();
  const [tab, setTab] = useState<"profiles" | "requests">("profiles");
  const [profiles, setProfiles] = useState<MatrimonialProfile[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | MatrimonialStatus>("all");
  const [editing, setEditing] = useState<MatrimonialProfile | null>(null);
  const [form, setForm] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [p, r] = await Promise.all([fetchAllMatrimonials(1, 100, true), fetchAdminMatchRequests()]);
      setProfiles(p.data);
      setRequests(r);
    } catch (e: any) {
      setError(e?.message || "Matrimonial administration data could not be loaded.");
    } finally { setLoading(false); }
  };

  useEffect(() => { if (isAdmin) void load(); }, [isAdmin]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return profiles.filter((p) => (status === "all" || p.status === status) && (!q || `${p.profileCode || ""} ${p.name || ""} ${p.city} ${p.education} ${p.profession} ${p.contact || ""}`.toLowerCase().includes(q)));
  }, [profiles, search, status]);

  const openEdit = (p: MatrimonialProfile) => { setEditing(p); setForm(toEdit(p)); setError(""); setSuccess(""); };

  const save = async () => {
    if (!editing || !form) return;
    if (!form.name.trim() || !form.city.trim() || !form.education.trim() || !form.profession.trim() || !form.contact.trim()) {
      setError("Name, city, education, profession and contact are required."); return;
    }
    if (form.showOnPortal && form.status !== "approved") { setError("Approve the profile before turning Show on."); return; }
    if ((form.showOnPortal || form.status === "approved") && !["received", "verified"].includes(form.paymentStatus)) {
      setError("Payment must be received or verified before approval/publication."); return;
    }
    setSaving(true); setError("");
    try {
      await updateMatrimonial(editing.id, form);
      setSuccess(`${editing.profileCode || form.name} updated successfully.`);
      setEditing(null); setForm(null);
      await load();
    } catch (e: any) { setError(e?.message || "Profile changes could not be saved."); }
    finally { setSaving(false); }
  };

  const quickUpdate = async (p: MatrimonialProfile, changes: Partial<MatrimonialProfile>) => {
    setError(""); setSuccess("");
    try {
      await updateMatrimonial(p.id, changes);
      setSuccess(`${p.profileCode || "Profile"} updated.`);
      await load();
    } catch (e: any) { setError(e?.message || "The change could not be saved."); }
  };

  const review = async (r: any, action: "forward" | "reject" | "close") => {
    setReviewing(r.id); setError(""); setSuccess("");
    try {
      await adminReviewMatchRequest(r.id, action);
      setSuccess(action === "forward" ? "Request forwarded to the target profile for consent." : action === "reject" ? "Match request rejected." : "Match request closed.");
      await load();
    } catch (e: any) { setError(e?.message || "Match request could not be updated."); }
    finally { setReviewing(null); }
  };

  if (!isAdmin) return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f8f5ef", fontFamily: "Lato, sans-serif" }}><div style={{ textAlign: "center" }}><ShieldCheck size={38} color={GOLD} /><h2 style={{ color: GREEN }}>Admin access required</h2><Link to="/admin" style={{ color: GREEN, fontWeight: 700 }}>Return to Admin Login</Link></div></div>;

  return <div style={{ minHeight: "100vh", background: "#f8f5ef", fontFamily: "Lato, sans-serif" }}>
    <header style={{ background: GREEN, borderBottom: `4px solid ${GOLD}`, color: "white", padding: "18px 28px" }}><div style={{ maxWidth: 1320, margin: "0 auto", display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}><div><h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 25 }}>Matrimonial Control Center</h1><p style={{ margin: "4px 0 0", opacity: .75, fontSize: 12 }}>Profiles, privacy, payment verification and consent-based matching</p></div><div style={{ display: "flex", gap: 8 }}><button onClick={load} style={ghostButton}><RefreshCw size={14} /> Refresh</button><Link to="/admin" style={{ ...ghostButton, textDecoration: "none" }}><ArrowLeft size={14} /> Main Admin Panel</Link></div></div></header>

    <main style={{ maxWidth: 1320, margin: "0 auto", padding: "28px 22px 60px" }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}><button onClick={() => setTab("profiles")} style={tabButton(tab === "profiles")}>Profiles & Privacy ({profiles.length})</button><button onClick={() => setTab("requests")} style={tabButton(tab === "requests")}>Match Requests ({requests.length})</button></div>
      {error && <Notice color="#b91c1c" bg="#fee2e2">{error}</Notice>}
      {success && <Notice color="#166534" bg="#dcfce7">{success}</Notice>}
      {loading ? <div style={{ padding: 50, textAlign: "center", color: "#777" }}>Loading matrimonial control center...</div> : tab === "profiles" ? <>
        <section style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}><div><h2 style={sectionTitle}>Profile Registry</h2><p style={subText}>Show means the profile may appear only inside the approved-member directory. Hide removes it from that directory.</p></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><div style={{ position: "relative" }}><Search size={15} color="#888" style={{ position: "absolute", left: 10, top: 10 }} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search profile..." style={{ ...inputStyle, paddingLeft: 32, width: 250 }} /></div><select value={status} onChange={(e) => setStatus(e.target.value as any)} style={inputStyle}><option value="all">All Statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div></div>
          <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}><thead><tr style={{ background: "#f7f3eb" }}>{["Profile", "Candidate", "Location / Work", "Status", "Payment", "Directory", "Featured", "Actions"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead><tbody>{filtered.map((p) => <tr key={p.id} style={{ borderTop: "1px solid #eee" }}><td style={td}><strong style={{ color: GREEN }}>{p.profileCode || p.id.slice(0, 8)}</strong></td><td style={td}><div style={{ display: "flex", alignItems: "center", gap: 10 }}>{p.photoUrl ? <img src={p.photoUrl} alt="" style={{ width: 42, height: 42, objectFit: "cover", borderRadius: "50%" }} /> : <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#eef5f0" }} />}<div><b>{p.name || "Candidate"}</b><div style={{ color: "#777", fontSize: 11, textTransform: "capitalize" }}>{p.gender} · {p.age} yrs</div></div></div></td><td style={td}>{p.city}<div style={{ color: "#777", fontSize: 11 }}>{p.education} · {p.profession}</div></td><td style={td}><Badge text={p.status || "pending"} good={p.status === "approved"} /></td><td style={td}><Badge text={p.paymentStatus || "pending"} good={["received", "verified"].includes(p.paymentStatus || "")} /></td><td style={td}><button onClick={() => quickUpdate(p, { showOnPortal: !p.showOnPortal })} style={smallButton(p.showOnPortal ? GREEN : "#666")}>{p.showOnPortal ? <Eye size={13} /> : <EyeOff size={13} />}{p.showOnPortal ? "Show" : "Hide"}</button></td><td style={td}><button onClick={() => quickUpdate(p, { isFeatured: !p.isFeatured })} style={smallButton(p.isFeatured ? "#946b08" : "#666")}><Star size={13} />{p.isFeatured ? "Featured" : "Standard"}</button></td><td style={td}><button onClick={() => openEdit(p)} style={smallButton("#315fba")}><Edit2 size={13} /> Edit</button></td></tr>)}</tbody></table>{!filtered.length && <div style={{ padding: 38, textAlign: "center", color: "#999" }}>No matrimonial profiles match this filter.</div>}</div>
        </section>
      </> : <section style={cardStyle}><div style={{ marginBottom: 18 }}><h2 style={sectionTitle}>Consent-based Match Requests</h2><p style={subText}>The administrator reviews compatibility first. Forwarding asks the target profile for consent; contact is released only after acceptance.</p></div>{requests.length ? <div style={{ display: "grid", gap: 14 }}>{requests.map((r) => { const score = pairScore(r.requester, r.target); return <article key={r.id} style={{ border: "1px solid #e7e2d8", borderRadius: 12, padding: 18, background: "#fff" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}><div><strong style={{ color: GREEN }}>{r.requester?.profileCode}</strong> <span style={{ color: "#999" }}>→</span> <strong style={{ color: GREEN }}>{r.target?.profileCode}</strong><div style={{ color: "#777", fontSize: 12, marginTop: 3 }}>Received {new Date(r.createdAt).toLocaleString()}</div></div><div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ background: score >= 60 ? "#dcfce7" : "#f3f4f6", color: score >= 60 ? "#166534" : "#555", borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 800 }}>Requirement Match {score}%</span><Badge text={String(r.status).replace(/_/g, " ")} good={r.status === "accepted"} /></div></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="match-pair"><ProfileRequirement title="Requester" p={r.requester} /><ProfileRequirement title="Target" p={r.target} /></div>{r.requesterMessage && <p style={{ margin: "14px 0 0", background: "#f8f5ef", padding: 10, borderRadius: 7, color: "#555", fontSize: 12 }}><b>Requester note:</b> {r.requesterMessage}</p>}<div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>{r.status === "pending_admin" && <><button disabled={reviewing === r.id} onClick={() => review(r, "forward")} style={actionButton(GREEN)}><CheckCircle size={14} /> Forward for Consent</button><button disabled={reviewing === r.id} onClick={() => review(r, "reject")} style={actionButton("#b91c1c")}><XCircle size={14} /> Reject</button></>}{!["closed", "rejected"].includes(r.status) && <button disabled={reviewing === r.id} onClick={() => review(r, "close")} style={actionButton("#666")}><X size={14} /> Close</button>}</div></article>; })}</div> : <div style={{ padding: 45, textAlign: "center", color: "#999" }}><HeartHandshake size={34} style={{ marginBottom: 8 }} />No match requests yet.</div>}</section>}
    </main>

    {editing && form && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 1000, display: "grid", placeItems: "center", padding: 16 }}><div style={{ width: "min(900px, 96vw)", maxHeight: "92vh", overflowY: "auto", background: "white", borderRadius: 14, boxShadow: "0 24px 70px rgba(0,0,0,.25)" }}><div style={{ position: "sticky", top: 0, background: GREEN, color: "white", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 2 }}><div><strong style={{ fontSize: 18 }}>Edit Matrimonial Profile</strong><div style={{ opacity: .7, fontSize: 11 }}>{editing.profileCode}</div></div><button onClick={() => { setEditing(null); setForm(null); }} style={{ background: "none", border: 0, color: "white", cursor: "pointer" }}><X /></button></div><div style={{ padding: 22 }}><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="edit-grid"><Field label="Full Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} /><Field label="Age" value={form.age} onChange={(v) => setForm({ ...form, age: v })} /><SelectField label="Gender" value={form.gender} onChange={(v) => setForm({ ...form, gender: v })} options={["male", "female"]} /><Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} /><Field label="Education" value={form.education} onChange={(v) => setForm({ ...form, education: v })} /><Field label="Profession" value={form.profession} onChange={(v) => setForm({ ...form, profession: v })} /><Field label="Contact / WhatsApp" value={form.contact} onChange={(v) => setForm({ ...form, contact: v })} /><SelectField label="Payment Status" value={form.paymentStatus} onChange={(v) => setForm({ ...form, paymentStatus: v as MatrimonialPaymentStatus })} options={["pending", "submitted", "received", "verified", "rejected"]} /><SelectField label="Application Status" value={form.status} onChange={(v) => setForm({ ...form, status: v as MatrimonialStatus })} options={["pending", "approved", "rejected"]} /><div style={{ display: "flex", alignItems: "end", gap: 18, paddingBottom: 8 }}><label style={checkLabel}><input type="checkbox" checked={form.showOnPortal} onChange={(e) => setForm({ ...form, showOnPortal: e.target.checked })} /> Show in Member Directory</label><label style={checkLabel}><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /> Featured</label></div></div><TextArea label="Family Background" value={form.familyBackground} onChange={(v) => setForm({ ...form, familyBackground: v })} /><TextArea label="Partner Requirements" value={form.requirements} onChange={(v) => setForm({ ...form, requirements: v })} /><TextArea label="Admin Note" value={form.adminNote} onChange={(v) => setForm({ ...form, adminNote: v })} /><div style={{ background: "#fef9e8", border: "1px solid #ead28e", padding: 12, borderRadius: 8, color: "#765f20", fontSize: 12, lineHeight: 1.6 }}>Privacy rule: <b>Show in Member Directory</b> does not make the profile public. It only allows the privacy-safe card to appear to approved logged-in members. Name, phone and family details stay private.</div><div style={{ display: "flex", gap: 10, marginTop: 18 }}><button disabled={saving} onClick={save} style={actionButton(GREEN)}>{saving ? "Saving..." : "Save Changes"}</button><button disabled={saving} onClick={() => { setEditing(null); setForm(null); }} style={actionButton("#777")}>Cancel</button></div></div></div></div>}
    <style>{`@media(max-width:760px){.edit-grid,.match-pair{grid-template-columns:1fr!important}}`}</style>
  </div>;
}

function Notice({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) { return <div style={{ background: bg, color, borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, fontWeight: 600 }}>{children}</div>; }
function Badge({ text, good }: { text: string; good?: boolean }) { return <span style={{ display: "inline-block", background: good ? "#dcfce7" : "#f3f4f6", color: good ? "#166534" : "#555", borderRadius: 20, padding: "4px 9px", fontSize: 10, fontWeight: 800, textTransform: "capitalize" }}>{text}</span>; }
function ProfileRequirement({ title, p }: { title: string; p: any }) { return <div style={{ background: "#faf9f6", borderRadius: 9, padding: 13 }}><div style={{ color: GOLD, fontWeight: 800, fontSize: 11, textTransform: "uppercase", marginBottom: 6 }}>{title}</div><div style={{ color: GREEN, fontWeight: 800 }}>{p?.profileCode}</div><div style={{ color: "#555", fontSize: 12, lineHeight: 1.7, marginTop: 5 }}>{p?.city} · {p?.education} · {p?.profession}</div><div style={{ marginTop: 7, fontSize: 12, color: "#444" }}><b>Looking for:</b> {p?.requirements || "Not specified"}</div></div>; }
function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) { return <label style={labelStyle}>{label}<input value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} /></label>; }
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) { return <label style={labelStyle}>{label}<select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>{options.map((o) => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}</select></label>; }
function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) { return <label style={{ ...labelStyle, marginTop: 14 }}>{label}<textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, resize: "vertical" }} /></label>; }
const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, color: GREEN, fontSize: 12, fontWeight: 800 };
const checkLabel: React.CSSProperties = { display: "flex", gap: 7, alignItems: "center", color: GREEN, fontSize: 12, fontWeight: 700 };
const inputStyle: React.CSSProperties = { border: "1px solid #d9ddd9", borderRadius: 7, padding: "9px 11px", background: "white", fontSize: 13, boxSizing: "border-box" };
const cardStyle: React.CSSProperties = { background: "white", borderRadius: 14, boxShadow: "0 3px 18px rgba(0,0,0,.06)", padding: 20 };
const sectionTitle: React.CSSProperties = { margin: 0, color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 21 };
const subText: React.CSSProperties = { margin: "4px 0 0", color: "#777", fontSize: 12 };
const th: React.CSSProperties = { textAlign: "left", color: "#777", fontSize: 10, textTransform: "uppercase", padding: "12px 10px", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "12px 10px", fontSize: 12, color: "#444", verticalAlign: "middle" };
const ghostButton: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, color: "white", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.25)", borderRadius: 7, padding: "8px 11px", cursor: "pointer", fontSize: 12, fontWeight: 700 };
function tabButton(active: boolean): React.CSSProperties { return { border: active ? `1px solid ${GREEN}` : "1px solid #ddd", background: active ? GREEN : "white", color: active ? "white" : GREEN, borderRadius: 8, padding: "9px 15px", fontWeight: 800, cursor: "pointer" }; }
function smallButton(color: string): React.CSSProperties { return { display: "inline-flex", alignItems: "center", gap: 5, border: `1px solid ${color}35`, background: `${color}10`, color, borderRadius: 6, padding: "5px 8px", cursor: "pointer", fontSize: 11, fontWeight: 800 }; }
function actionButton(color: string): React.CSSProperties { return { display: "inline-flex", alignItems: "center", gap: 6, border: 0, background: color, color: "white", borderRadius: 7, padding: "9px 13px", cursor: "pointer", fontWeight: 800, fontSize: 12 }; }
