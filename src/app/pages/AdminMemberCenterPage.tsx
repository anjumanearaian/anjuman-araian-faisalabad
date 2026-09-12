import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAdmin } from "../context/AdminContext";
import {
  Member,
  MemberStatus,
  createAdminMember,
  deleteMember,
  fetchAdminMembers,
  updateMember,
  updateMemberStatus,
  educationLevels,
  occupations,
  provinces,
  bloodGroups,
  blankFamily,
  childEducationLevels,
  casteBiradariSuggestions,
  religiousSectSuggestions,
  structuredOptionForEdit,
  joinStructuredOption,
} from "../lib/memberStore";
import { citiesForProvince, districtForCity } from "../lib/pakistanLocations";
import { adminReviewMatchRequest, fetchAdminMatchRequests } from "../lib/matrimonialStore";
import { fetchFinanceLedger, FinanceLedgerRow } from "../lib/financeStore";
import logo from "../../imports/logo.png";
import { ArrowLeft, CheckCircle, Heart, MessageCircle, Plus, Printer, RefreshCw, Search, ShieldCheck, Trash2, UserCog, Users, Crown } from "lucide-react";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

const MEMBERSHIP_LABELS: Record<string, string> = {
  ordinary: "Annual Membership",
  annual: "Annual Membership",
  life: "Lifetime Membership",
  lifetime: "Lifetime Membership",
  patron: "Patron Membership",
  overseas: "Overseas Membership",
};

function membershipTypeLabel(value?: string | null) {
  const key = String(value || "").trim().toLowerCase();
  return MEMBERSHIP_LABELS[key] || (value ? String(value) : "Not specified");
}

function membershipStandardFee(value?: string | null) {
  const key = String(value || "").trim().toLowerCase();
  if (["ordinary", "annual"].includes(key)) return 1000;
  if (["life", "lifetime"].includes(key)) return 3000;
  return null;
}

const blankMember = () => ({
  formNo: "", memberNo: "", fullName: "", fatherName: "", cnic: "", dob: "", gender: "male", bloodGroup: "",
  email: "", phone: "", whatsapp: "", address: "", localArea: "", city: "Faisalabad", district: "Faisalabad", province: "Punjab",
  education: "Other", educationDetail: "", occupation: "Other", occupationDetail: "", designation: "", institutionName: "", businessName: "",
  membershipType: "ordinary", paymentStatus: "pending", status: "pending", showOnPortal: true, showOnWeb: false, photoUrl: "", adminNote: "",
  referrerMemberId: "", referralStatus: "not_provided", familyInfo: blankFamily(), children: [] as any[],
});

export function AdminMemberCenterPage() {
  const { isAdmin } = useAdmin();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | MemberStatus>("all");
  const [view, setView] = useState<"members" | "matches">("members");
  const [selected, setSelected] = useState<Member | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, any>>(blankMember());
  const [saving, setSaving] = useState(false);
  const [matchRequests, setMatchRequests] = useState<any[]>([]);

  const loadMembers = async () => {
    if (!isAdmin) return;
    setLoading(true); setError("");
    try { setMembers(await fetchAdminMembers()); }
    catch (e: any) { setError(e?.message || "Could not load members."); }
    finally { setLoading(false); }
  };

  const loadMatches = async () => {
    if (!isAdmin) return;
    setLoading(true); setError("");
    try { setMatchRequests(await fetchAdminMatchRequests()); }
    catch (e: any) { setError(e?.message || "Could not load match requests."); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadMembers(); }, [isAdmin]);
  useEffect(() => { if (view === "matches") void loadMatches(); }, [view, isAdmin]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      const statusOk = statusFilter === "all" || m.status === statusFilter;
      const text = [m.formNo, m.memberNo, m.fullName, m.fatherName, m.cnic, m.phone, m.whatsapp, m.email, m.city, m.district, m.localArea].filter(Boolean).join(" ").toLowerCase();
      return statusOk && (!q || text.includes(q));
    });
  }, [members, search, statusFilter]);

  const startAdd = () => { setSelected(null); setForm(blankMember()); setShowForm(true); setMessage(""); setError(""); };
  const startEdit = (m: Member) => {
    const edu = structuredOptionForEdit(m.education, educationLevels);
    const occ = structuredOptionForEdit(m.occupation, occupations);
    setSelected(m);
    setForm({
      formNo: m.formNo || "", memberNo: m.memberNo || "", fullName: m.fullName || "", fatherName: m.fatherName || "", cnic: m.cnic || "", dob: m.dob || "",
      gender: m.gender || "male", bloodGroup: m.bloodGroup || "", email: m.email || "", phone: m.phone || "", whatsapp: m.whatsapp || "", address: m.address || "",
      localArea: m.localArea || "", city: m.city || "", district: m.district || districtForCity(m.city || ""), province: m.province || "Punjab",
      education: edu.base || "Other", educationDetail: edu.detail || "", occupation: occ.base || "Other", occupationDetail: occ.detail || "",
      designation: m.designation || "", institutionName: m.institutionName || "", businessName: m.businessName || "",
      membershipType: m.membershipType || "ordinary", paymentStatus: m.paymentStatus || "pending", status: m.status,
      showOnPortal: Boolean(m.showOnPortal), showOnWeb: Boolean(m.showOnWeb), photoUrl: m.photoUrl || "", adminNote: m.adminNote || "",
      referrerMemberId: m.referrerMemberId || "", referralStatus: m.referralStatus || (m.referrerMemberId ? "pending" : "not_provided"),
      familyInfo: { ...blankFamily(), ...(m.familyInfo || m.family || {}) }, children: (m.children || []).map((c) => ({ ...c })),
    });
    setShowForm(true); setMessage(""); setError("");
  };

  const saveMember = async () => {
    if (saving) return;
    if (!form.fullName?.trim() || !form.fatherName?.trim() || !form.cnic?.trim() || !form.phone?.trim()) {
      setError("Full name, father name, CNIC and phone are required."); return;
    }
    setSaving(true); setError(""); setMessage("");
    const payload: Record<string, any> = {
      ...form,
      district: districtForCity(form.city),
      education: joinStructuredOption(form.education, form.educationDetail),
      occupation: joinStructuredOption(form.occupation, form.occupationDetail),
      referrerMemberId: form.referrerMemberId || null,
      referralStatus: form.referrerMemberId ? form.referralStatus : "not_provided",
      familyInfo: { ...form.familyInfo, childrenCount: String((form.children || []).filter((c: any) => String(c.fullName || "").trim()).length), childrenDetails: "" },
      children: (form.children || []).filter((c: any) => String(c.fullName || "").trim()).map((c: any) => ({ fullName: c.fullName, dob: c.dob || "", education: c.education || "" })),
    };
    delete payload.educationDetail; delete payload.occupationDetail; delete payload.status;
    try {
      if (selected) {
        await updateMember(selected.id, payload as any);
        if (form.status && form.status !== selected.status) await updateMemberStatus(selected.id, form.status, undefined, form.adminNote);
        setMessage("Member record updated successfully.");
      } else {
        await createAdminMember({ ...payload, status: form.status });
        setMessage("Member added successfully. Blank form/registration numbers were generated automatically.");
      }
      setShowForm(false); setSelected(null); await loadMembers();
    } catch (e: any) { setError(e?.message || "Could not save member."); }
    finally { setSaving(false); }
  };

  const approve = async (m: Member) => {
    if (!confirm(`Confirm that the membership fee for ${m.fullName} has been received. The system will mark payment verified and approve this member now.`)) return;
    try { await updateMemberStatus(m.id, "approved", undefined, m.adminNote); setMessage(`${m.fullName} approved.`); await loadMembers(); }
    catch (e: any) { setError(e?.message || "Approval failed."); }
  };

  const reject = async (m: Member) => {
    const reason = prompt(`Reason for rejecting ${m.fullName}:`, m.rejectionReason || "");
    if (reason === null) return;
    try { await updateMemberStatus(m.id, "rejected", reason, m.adminNote); setMessage(`${m.fullName} application rejected.`); await loadMembers(); }
    catch (e: any) { setError(e?.message || "Rejection failed."); }
  };

  const toggleSuspend = async (m: Member) => {
    const nextStatus: MemberStatus = m.status === "suspended" ? "approved" : "suspended";
    if (!confirm(`${nextStatus === "suspended" ? "Suspend" : "Reactivate"} ${m.fullName}?`)) return;
    try { await updateMemberStatus(m.id, nextStatus, undefined, m.adminNote); setMessage(`${m.fullName} is now ${nextStatus}.`); await loadMembers(); }
    catch (e: any) { setError(e?.message || "Status update failed."); }
  };

  const removeMember = async (m: Member) => {
    if (!confirm(`Permanently delete ${m.fullName} (${m.memberNo})? This cannot be undone.`)) return;
    if (!confirm("Final confirmation: permanently delete this member record and linked family/children data?")) return;
    try { await deleteMember(m.id); setMessage(`${m.fullName} deleted.`); await loadMembers(); }
    catch (e: any) { setError(e?.message || "Delete failed."); }
  };

  const quickUpdate = async (m: Member, partial: Record<string, any>) => {
    try { await updateMember(m.id, partial as any); await loadMembers(); }
    catch (e: any) { setError(e?.message || "Update failed."); }
  };

  const reviewMatch = async (id: string, action: "forward" | "reject" | "close") => {
    const note = action === "reject" ? (prompt("Admin note / rejection reason (optional):") || "") : "";
    try { await adminReviewMatchRequest(id, action, note); await loadMatches(); setMessage(`Match request updated.`); }
    catch (e: any) { setError(e?.message || "Could not update match request."); }
  };

  if (!isAdmin) {
    return <div style={{ minHeight: "100vh", background: "#f8f5ef", display: "grid", placeItems: "center", padding: 24 }}><div style={{ background: "white", maxWidth: 520, padding: 34, borderRadius: 14, boxShadow: "0 8px 35px rgba(0,0,0,.08)", textAlign: "center" }}><ShieldCheck size={38} color={GREEN} /><h2 style={{ color: GREEN }}>Admin authorization required</h2><p style={{ color: "#666", lineHeight: 1.7 }}>Sign in from the main Admin Panel first, then open the Member & Approval Center.</p><Link to="/admin" style={{ display: "inline-block", background: GREEN, color: "white", padding: "10px 18px", borderRadius: 8, textDecoration: "none", fontWeight: 700 }}>Open Admin Panel</Link></div></div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8f5ef", fontFamily: "'Lato', sans-serif" }}>
      <header style={{ background: GREEN, color: "white", borderBottom: `4px solid ${GOLD}` }}><div style={{ maxWidth: 1240, margin: "0 auto", padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}><div style={{ display: "flex", alignItems: "center", gap: 14 }}><img src={logo} alt="Anjuman e Araian" style={{ width: 52, height: 52, objectFit: "contain", background: "white", borderRadius: 50, padding: 3 }} /><div><h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 23 }}>Member & Approval Center</h1><p style={{ margin: "4px 0 0", color: "rgba(255,255,255,.72)", fontSize: 12 }}>Anjuman-e-Araian Faisalabad</p></div></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Link to="/admin/operations" style={{ color: "white", textDecoration: "none", border: `1px solid ${GOLD}`, padding: "8px 12px", borderRadius: 7, fontWeight: 700, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}><Crown size={14} /> Governance & Operations</Link><Link to="/admin" style={{ color: "white", textDecoration: "none", border: "1px solid rgba(255,255,255,.25)", padding: "8px 12px", borderRadius: 7, fontWeight: 700, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}><ArrowLeft size={14} /> Main Admin Panel</Link></div></div></header>
      <main style={{ maxWidth: 1240, margin: "0 auto", padding: "26px 22px 60px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}><button onClick={() => setView("members")} style={tabButton(view === "members")}><Users size={15} /> Members & Approvals</button><button onClick={() => setView("matches")} style={tabButton(view === "matches")}><Heart size={15} /> Matrimonial Match Requests</button></div>
        {message && <Notice success text={message} />}{error && <Notice text={error} />}

        {view === "members" && <>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 20 }} className="stats-grid"><Stat label="Total" value={members.length} /><Stat label="Pending" value={members.filter((m) => m.status === "pending").length} /><Stat label="Approved" value={members.filter((m) => m.status === "approved").length} /><Stat label="Suspended" value={members.filter((m) => m.status === "suspended").length} /><Stat label="Payment Pending" value={members.filter((m) => !["received", "verified", "recorded"].includes(String(m.paymentStatus || ""))).length} /></section>
          <section style={panelStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}><div><h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", margin: 0, fontSize: 20 }}>Member Registry</h2><p style={{ color: "#777", fontSize: 12, margin: "4px 0 0" }}>Approve, edit, suspend, print, publish or delete from one screen.</p></div><div style={{ display: "flex", gap: 8 }}><button onClick={() => void loadMembers()} style={secondaryButton}><RefreshCw size={14} /> Refresh</button><button onClick={startAdd} style={primaryButton}><Plus size={14} /> Add Member</button></div></div>
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr .7fr", gap: 10, marginBottom: 16 }} className="filter-grid"><div style={{ position: "relative" }}><Search size={16} color="#999" style={{ position: "absolute", left: 12, top: 11 }} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, CNIC, phone, city, Form No. or Registration No." style={{ ...fieldStyle, paddingLeft: 36 }} /></div><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} style={fieldStyle}><option value="all">All Statuses</option>{["pending","approved","rejected","inactive","suspended","deceased"].map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1120 }}><thead><tr style={{ background: "#f8f5ef" }}>{["Form / Registration", "Member", "Location", "Status", "Payment", "Publishing", "Actions"].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead><tbody>{filtered.map((m) => <tr key={m.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={tdStyle}><strong style={{ color: GREEN }}>{m.formNo || "Auto pending"}</strong><br /><span style={{ fontSize: 11, color: "#777" }}>{m.memberNo}</span></td>
              <td style={tdStyle}><div style={{ display: "flex", gap: 9, alignItems: "center" }}>{m.photoUrl ? <img src={m.photoUrl} alt="" style={{ width: 38, height: 38, borderRadius: 50, objectFit: "cover" }} /> : <div style={{ width: 38, height: 38, borderRadius: 50, background: "#f0f7f3", display: "grid", placeItems: "center", color: GREEN, fontWeight: 800 }}>{m.fullName?.[0]}</div>}<div><strong>{m.fullName}</strong><div style={{ fontSize: 11, color: "#888" }}>{m.cnic}</div></div></div></td>
              <td style={tdStyle}>{m.city || "—"}<br /><span style={{ fontSize: 11, color: "#777" }}>{[m.localArea,m.province].filter(Boolean).join(" · ")}</span></td>
              <td style={tdStyle}><StatusBadge status={m.status} /></td>
              <td style={tdStyle}><select value={m.paymentStatus || "pending"} onChange={(e) => void quickUpdate(m, { paymentStatus: e.target.value })} style={{ ...miniSelect, minWidth: 100 }}>{["pending","submitted","received","verified","recorded","rejected"].map((x) => <option key={x} value={x}>{x}</option>)}</select></td>
              <td style={tdStyle}><label style={checkLabel}><input type="checkbox" checked={Boolean(m.showOnPortal)} onChange={(e) => void quickUpdate(m, { showOnPortal: e.target.checked })} /> Portal</label><label style={checkLabel}><input type="checkbox" checked={Boolean(m.showOnWeb)} onChange={(e) => void quickUpdate(m, { showOnWeb: e.target.checked })} /> Web</label></td>
              <td style={tdStyle}><div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}><button onClick={() => startEdit(m)} style={tinyButton}>Edit</button>{m.status !== "approved" && <button onClick={() => void approve(m)} style={{ ...tinyButton, color: "#166534", borderColor: "#86efac" }}>Approve</button>}{m.status !== "rejected" && <button onClick={() => void reject(m)} style={{ ...tinyButton, color: "#b91c1c", borderColor: "#fecaca" }}>Reject</button>}<button onClick={() => void toggleSuspend(m)} style={tinyButton}>{m.status === "suspended" ? "Reactivate" : "Suspend"}</button><button onClick={() => void printMemberForm(m)} style={tinyButton}><Printer size={12} /> Membership PDF</button><button onClick={() => shareWhatsApp(m)} style={tinyButton}><MessageCircle size={12} /> WhatsApp</button><button onClick={() => void removeMember(m)} style={{ ...tinyButton, color: "#b91c1c", borderColor: "#fecaca" }}><Trash2 size={12} /> Delete</button></div></td>
            </tr>)}</tbody></table>{!loading && filtered.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#999" }}>No members match this filter.</div>}{loading && <div style={{ padding: 40, textAlign: "center", color: "#777" }}>Loading member registry...</div>}</div>
          </section>
          <section style={{ ...panelStyle, marginTop: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><Crown size={18} color={GOLD} /><h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", margin: 0, fontSize: 19 }}>Governance & Role Assignments</h2></div>
            <p style={{ color: "#777", fontSize: 12, margin: "0 0 14px", lineHeight: 1.65 }}>Cabinet, committee, zone and special-purpose assignments are managed in one Governance & Operations Center. Every role links to this same approved Member ID, so no duplicate person record is created.</p>
            <Link to="/admin/operations" style={{ ...primaryButton, textDecoration: "none", width: "fit-content" }}><UserCog size={14} /> Open Governance & Operations</Link>
          </section>
        </>}

        {view === "matches" && <section style={panelStyle}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><div><h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 20, margin: 0 }}>Matrimonial Match Requests</h2><p style={{ color: "#777", fontSize: 12, margin: "4px 0 0" }}>Admin reviews first; target consent is required before contact release.</p></div><button onClick={() => void loadMatches()} style={secondaryButton}><RefreshCw size={14} /> Refresh</button></div><div style={{ display: "grid", gap: 12 }}>{matchRequests.map((r) => <div key={r.id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center" }}><div><div style={{ color: GREEN, fontWeight: 800 }}>{r.requester?.profileCode} → {r.target?.profileCode}</div><div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>{r.requester?.gender} · {r.requester?.age} · {r.requester?.city} · {r.requester?.education} · {r.requester?.profession}</div><div style={{ marginTop: 6 }}><StatusBadge status={r.status} /></div></div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{r.status === "pending_admin" && <><button onClick={() => void reviewMatch(r.id, "forward")} style={{ ...tinyButton, color: "#166534", borderColor: "#86efac" }}>Forward for Consent</button><button onClick={() => void reviewMatch(r.id, "reject")} style={{ ...tinyButton, color: "#b91c1c", borderColor: "#fecaca" }}>Reject</button></>}{["accepted","declined","rejected"].includes(r.status) && <button onClick={() => void reviewMatch(r.id, "close")} style={tinyButton}>Close</button>}</div></div>)}</div>{!loading && matchRequests.length === 0 && <div style={{ padding: 42, textAlign: "center", color: "#999" }}>No match requests yet.</div>}</section>}
      </main>
      {showForm && <MemberFormModal form={form} setForm={setForm} selected={selected} allMembers={members} saving={saving} onClose={() => setShowForm(false)} onSave={() => void saveMember()} />}
      <style>{`@media(max-width:900px){.stats-grid{grid-template-columns:1fr 1fr!important}.filter-grid,.assign-grid,.modal-grid,.child-grid{grid-template-columns:1fr!important}} @media(max-width:560px){.stats-grid{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}

function MemberFormModal({ form, setForm, selected, allMembers, saving, onClose, onSave }: { form: Record<string, any>; setForm: (v: any) => void; selected: Member | null; allMembers: Member[]; saving: boolean; onClose: () => void; onSave: () => void }) {
  const set = (key: string, value: any) => setForm((p: any) => ({ ...p, [key]: value }));
  const setFamily = (key: string, value: any) => setForm((p: any) => ({ ...p, familyInfo: { ...(p.familyInfo || blankFamily()), [key]: value } }));
  const setChildCount = (raw: string) => { const count = Math.max(0, Math.min(20, Number(raw) || 0)); setForm((p: any) => ({ ...p, children: Array.from({ length: count }, (_, i) => p.children?.[i] || { fullName: "", dob: "", education: "Not Started" }) })); };
  const setChild = (i: number, key: string, value: string) => setForm((p: any) => ({ ...p, children: p.children.map((c: any, index: number) => index === i ? { ...c, [key]: value } : c) }));
  const provinceCities = citiesForProvince(form.province || "Punjab");
  const onProvince = (province: string) => setForm((p: any) => { const allowed = citiesForProvince(province); const city = allowed.includes(p.city) ? p.city : ""; return { ...p, province, city, district: city ? districtForCity(city) : "" }; });
  const onCity = (city: string) => setForm((p: any) => ({ ...p, city, district: districtForCity(city) }));
  return <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.55)", display: "grid", placeItems: "center", padding: 16 }}><div style={{ background: "white", borderRadius: 14, width: "min(980px,96vw)", maxHeight: "92vh", overflow: "auto", boxShadow: "0 20px 70px rgba(0,0,0,.25)" }}>
    <div style={{ padding: "20px 24px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><h2 style={{ color: GREEN, margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 21 }}>{selected ? "Edit Member Record" : "Add New Member"}</h2><p style={{ color: "#777", fontSize: 12, margin: "4px 0 0" }}>All administrative fields are editable here. Form and registration numbers may be automatic or manual.</p></div><button onClick={onClose} style={{ border: 0, background: "none", cursor: "pointer", color: "#777" }}>✕</button></div>
    <div style={{ padding: 24 }}>
      <FormSection title="Form & Membership Numbers"><Grid><Field label="Form No. (optional/manual)" value={form.formNo} onChange={(v) => set("formNo", v)} placeholder="Auto if blank" /><Field label="Registration / Member No. (optional/manual)" value={form.memberNo} onChange={(v) => set("memberNo", v)} placeholder="Auto if blank" /><SelectField label="Application Status" value={form.status} onChange={(v) => set("status", v)} options={["pending","approved","rejected","inactive","suspended","deceased"]} /><SelectField label="Payment Status" value={form.paymentStatus} onChange={(v) => set("paymentStatus", v)} options={["pending","submitted","received","verified","recorded","rejected"]} /></Grid></FormSection>
      <FormSection title="Personal Information"><Grid><Field label="Full Name *" value={form.fullName} onChange={(v) => set("fullName", v)} /><Field label="Father's Name *" value={form.fatherName} onChange={(v) => set("fatherName", v)} /><Field label="CNIC *" value={form.cnic} onChange={(v) => set("cnic", v)} /><Field label="Date of Birth" type="date" value={form.dob} onChange={(v) => set("dob", v)} /><SelectField label="Gender" value={form.gender} onChange={(v) => set("gender", v)} options={["male","female","other"]} /><SelectField label="Blood Group" value={form.bloodGroup} onChange={(v) => set("bloodGroup", v)} options={["", ...bloodGroups]} /></Grid></FormSection>
      <FormSection title="Contact & Location"><Grid><Field label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} /><Field label="Phone *" value={form.phone} onChange={(v) => set("phone", v)} /><Field label="WhatsApp" value={form.whatsapp} onChange={(v) => set("whatsapp", v)} /><SelectField label="Province / Region" value={form.province} onChange={onProvince} options={provinces} /><label style={labelWrap}>City / Town<input list="admin-province-cities" value={form.city || ""} onChange={(e) => onCity(e.target.value)} style={fieldStyle} /><datalist id="admin-province-cities">{provinceCities.map((x) => <option key={x} value={x} />)}</datalist></label><Field label="Local Area / Tehsil / Village" value={form.localArea} onChange={(v) => set("localArea", v)} /><div style={{ gridColumn: "span 2" }}><Field label="Full Address" value={form.address} onChange={(v) => set("address", v)} /></div></Grid></FormSection>
      <FormSection title="Education & Work"><Grid><SelectField label="Education Level" value={form.education} onChange={(v) => set("education", v)} options={educationLevels} /><Field label="Specialization / Degree" value={form.educationDetail} onChange={(v) => set("educationDetail", v)} /><SelectField label="Occupation" value={form.occupation} onChange={(v) => set("occupation", v)} options={occupations} /><Field label="Occupation Field / Specialty" value={form.occupationDetail} onChange={(v) => set("occupationDetail", v)} /><Field label="Designation / Role" value={form.designation} onChange={(v) => set("designation", v)} /><Field label="Institute / Organization" value={form.institutionName} onChange={(v) => set("institutionName", v)} /><div style={{ gridColumn: "span 2" }}><Field label="Business Name" value={form.businessName} onChange={(v) => set("businessName", v)} /></div></Grid></FormSection>
      <FormSection title="Referral"><Grid><label style={labelWrap}>Existing Member Referrer<select value={form.referrerMemberId || ""} onChange={(e) => set("referrerMemberId", e.target.value)} style={fieldStyle}><option value="">No referrer / optional</option>{allMembers.filter((m) => m.status === "approved" && m.id !== selected?.id).map((m) => <option key={m.id} value={m.id}>{m.fullName} · {m.memberNo}</option>)}</select></label><SelectField label="Referral Status" value={form.referralStatus || "not_provided"} onChange={(v) => set("referralStatus", v)} options={["not_provided","pending","confirmed","rejected"]} /></Grid></FormSection>
      <FormSection title="Family / Biradari (Private)"><Grid><Field label="Spouse Name" value={form.familyInfo?.spouseName || ""} onChange={(v) => setFamily("spouseName", v)} /><label style={labelWrap}>Number of Children<select value={String(form.children?.length || 0)} onChange={(e) => setChildCount(e.target.value)} style={fieldStyle}>{Array.from({ length: 21 }, (_, i) => <option key={i} value={i}>{i}</option>)}</select></label><Field label="Araian Family Branch / Biradari" value={form.familyInfo?.familyBranch || ""} onChange={(v) => setFamily("familyBranch", v)} /><label style={labelWrap}>Caste / Biradari<input list="admin-castes" value={form.familyInfo?.caste || ""} onChange={(e) => setFamily("caste", e.target.value)} style={fieldStyle} /><datalist id="admin-castes">{casteBiradariSuggestions.map((x) => <option key={x} value={x} />)}</datalist></label><label style={labelWrap}>Religious Affiliation / Maslak<input list="admin-sects" value={form.familyInfo?.religiousSect || ""} onChange={(e) => setFamily("religiousSect", e.target.value)} style={fieldStyle} /><datalist id="admin-sects">{religiousSectSuggestions.map((x) => <option key={x} value={x} />)}</datalist></label><Field label="Family City / Area" value={form.familyInfo?.familyCity || ""} onChange={(v) => setFamily("familyCity", v)} /><Field label="Family Contact Person" value={form.familyInfo?.familyContactName || ""} onChange={(v) => setFamily("familyContactName", v)} /><Field label="Family Contact Number" value={form.familyInfo?.familyContactNumber || ""} onChange={(v) => setFamily("familyContactNumber", v)} /><Field label="Emergency Contact Name" value={form.familyInfo?.emergencyContactName || ""} onChange={(v) => setFamily("emergencyContactName", v)} /><Field label="Emergency Contact Number" value={form.familyInfo?.emergencyContactNumber || ""} onChange={(v) => setFamily("emergencyContactNumber", v)} /></Grid>{form.children?.length > 0 && <div style={{ display: "grid", gap: 9, marginTop: 14 }}>{form.children.map((c: any, i: number) => <div key={i} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 9, border: "1px solid #eee", padding: 10, borderRadius: 8 }} className="child-grid"><Field label={`Child ${i + 1} Name`} value={c.fullName || ""} onChange={(v) => setChild(i,"fullName",v)} /><Field label="Date of Birth" type="date" value={c.dob || ""} onChange={(v) => setChild(i,"dob",v)} /><SelectField label="Education" value={c.education || "Not Started"} onChange={(v) => setChild(i,"education",v)} options={childEducationLevels} /></div>)}</div>}</FormSection>
      <FormSection title="Membership & Publishing"><Grid><MembershipTypeField value={form.membershipType} onChange={(v) => set("membershipType", v)} /><Field label="Photo URL (optional)" value={form.photoUrl} onChange={(v) => set("photoUrl", v)} /><label style={checkBoxCard}><input type="checkbox" checked={Boolean(form.showOnPortal)} onChange={(e) => set("showOnPortal", e.target.checked)} /> Show to approved members in portal</label><label style={checkBoxCard}><input type="checkbox" checked={Boolean(form.showOnWeb)} onChange={(e) => set("showOnWeb", e.target.checked)} /> Show in public web directory</label><div style={{ gridColumn: "span 2" }}><Field label="Admin Note" value={form.adminNote} onChange={(v) => set("adminNote", v)} /></div></Grid></FormSection>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}><button onClick={onClose} style={secondaryButton}>Cancel</button><button disabled={saving} onClick={onSave} style={primaryButton}><CheckCircle size={14} /> {saving ? "Saving..." : selected ? "Save Changes" : "Create Member"}</button></div>
    </div>
  </div></div>;
}

function MembershipTypeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <label style={labelWrap}>Membership Type<select value={value || "ordinary"} onChange={(e) => onChange(e.target.value)} style={fieldStyle}><option value="ordinary">Annual Membership</option><option value="life">Lifetime Membership</option><option value="patron">Patron Membership</option><option value="overseas">Overseas Membership</option></select></label>;
}

async function findMembershipPayment(m: Member): Promise<FinanceLedgerRow | null> {
  try {
    const rows = await fetchFinanceLedger(m.memberNo || m.fullName || "", "all");
    const normalizedName = String(m.fullName || "").trim().toLowerCase();
    const candidates = rows.filter((row) => {
      const sameMember = row.memberId === m.id || row.member?.id === m.id || String(row.member?.memberNo || "") === String(m.memberNo || "") || String(row.partyName || "").trim().toLowerCase() === normalizedName;
      const membershipLike = /membership|member|annual|life|lifetime|subscription/i.test(String(row.category || ""));
      return sameMember && row.direction === "credit" && row.status !== "void" && membershipLike;
    });
    return candidates.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())[0] || null;
  } catch {
    return null;
  }
}

async function printMemberForm(m: Member) {
  const edu = structuredOptionForEdit(m.education, educationLevels);
  const occ = structuredOptionForEdit(m.occupation, occupations);
  const logoUrl = new URL(logo, window.location.origin).href;
  const photo = m.photoUrl ? `<img src="${escapeHtml(m.photoUrl)}" class="photo" />` : `<div class="photo placeholder">PHOTO</div>`;
  const payment = await findMembershipPayment(m);
  const membershipLabel = membershipTypeLabel(m.membershipType);
  const standardFee = membershipStandardFee(m.membershipType);
  const money = (value?: number | null) => value == null ? "—" : `Rs. ${Number(value).toLocaleString("en-PK")}`;
  const row = (label: string, value?: string | null, extraClass = "") => `<div class="field ${extraClass}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "—")}</strong></div>`;
  const paymentNo = payment?.receiptNo || payment?.transactionNo || "Not linked";
  const paymentAmount = payment ? money(payment.amount) : (standardFee ? `${money(standardFee)} standard fee` : "See Finance Ledger");
  const receivedBy = payment ? [payment.handledByName || payment.issuedByName, payment.handledByRole || payment.issuedByRole].filter(Boolean).join(" · ") : "________________________";
  const paymentDate = payment?.transactionDate ? new Date(payment.transactionDate).toLocaleDateString("en-PK") : "—";
  const approvedDate = m.approvedAt ? new Date(m.approvedAt).toLocaleDateString("en-PK") : "Pending";
  const generated = new Date().toLocaleString("en-PK");
  const developerName = "Muhammad Atif Naseem";
  const developerPhone = "0300-7600037";
  const undertaking = `میں اقرار کرتا/کرتی ہوں کہ میں مسلمان ہوں، اللہ تعالیٰ کی وحدانیت اور حضرت محمد ﷺ کو اللہ تعالیٰ کا آخری نبی و رسول مانتا/مانتی ہوں۔ میں انجمنِ آرائیاں فیصل آباد کے دستور، مقاصد، قواعد و ضوابط اور مجاز فیصلوں کی پابندی، برادری کی فلاح، اتحاد، تعلیم، سماجی خدمت اور باہمی احترام کے لیے ذمہ داری سے کام کرنے کا عہد کرتا/کرتی ہوں۔ میں انجمن کے نام، عہدے، ریکارڈ، مالی وسائل، سہولیات یا کسی کمیٹی/ذمہ داری کو ذاتی، کاروباری، گروہی یا سیاسی مقصد کے لیے استعمال نہیں کروں گا/گی، اور میری ذاتی سیاسی وابستگی انجمن کے غیر سیاسی کردار، مالی معاملات، داخلی نظم یا برادری کی خدمت پر اثر انداز نہیں ہوگی۔ میں تسلیم کرتا/کرتی ہوں کہ دستور و قواعد کی خلاف ورزی یا اختیارات کے غلط استعمال کی صورت میں مجاز باڈی مقررہ طریقۂ کار کے مطابق میری ذمہ داری ختم، رکنیت معطل یا منسوخ کر سکتی ہے۔`;

  const documentPage = `<section class="sheet"><div class="copytag">OFFICIAL MEMBERSHIP FORM</div><div class="head"><img class="logo" src="${logoUrl}"><div><div class="title">ANJUMAN-E-ARAIAN FAISALABAD</div><div class="subtitle">Official Membership Form & Undertaking</div><div class="goldline"></div><div class="statusline"><span class="badge">${escapeHtml(String(m.status || "").toUpperCase())}</span></div></div>${photo}</div><div class="idstrip">${row("Registration / Member No.", m.memberNo)}${row("Membership Type", membershipLabel)}${row("Status", String(m.status || "").replace(/_/g, " "))}${row("Approved On", approvedDate)}</div><div class="section"><h3>Member Information</h3><div class="grid4">${row("Full Name", m.fullName)}${row("Father's Name", m.fatherName)}${row("CNIC", m.cnic)}${row("Date of Birth", m.dob)}${row("Mobile", m.phone)}${row("WhatsApp", m.whatsapp)}${row("Email", m.email)}${row("City / Area", [m.city, m.localArea].filter(Boolean).join(" · "))}${row("Profession / Designation", [occ.base, m.designation].filter(Boolean).join(" · "))}${row("Education / Qualification", [edu.base, edu.detail].filter(Boolean).join(" · "))}${row("Institute / Organization", m.institutionName)}${row("Blood Group", m.bloodGroup)}</div><div class="fullrow">${row("Address", m.address)}</div></div><div class="section paymentbox"><h3>Membership & Payment Record</h3><div class="grid4">${row("Payment Receipt / Slip No.", paymentNo)}${row("Amount / Fee", paymentAmount)}${row("Payment Date", paymentDate)}${row("Payment Status", m.paymentStatus)}${row("Payment Received By", receivedBy, "span2")}${row("Payment Head", membershipLabel, "span2")}</div></div><div class="undertaking"><div class="undertitle">اقرار و حلفیہ بیان / DECLARATION & UNDERTAKING</div><div class="urdu" lang="ur">${escapeHtml(undertaking)}</div></div><div class="signatures"><div><div class="sigline"></div><b>Member Signature</b><small>Thumb impression if required</small></div><div><div class="sigline"></div><b>Payment Received By</b><small>${escapeHtml(receivedBy)}</small></div><div><div class="sigline"></div><b>Prepared By / System Developer</b><small>${escapeHtml(developerName)} · ${escapeHtml(developerPhone)}</small></div><div><div class="sigline"></div><b>General Secretary</b><small>Signature & stamp</small></div><div><div class="sigline"></div><b>President / Authorized Signatory</b><small>Signature & stamp</small></div></div><div class="foot"><span>Internal Form Serial: ${escapeHtml(m.formNo || "—")}</span><span>Prepared by ${escapeHtml(developerName)} · System Developer · ${escapeHtml(developerPhone)}</span><span>Generated: ${escapeHtml(generated)}</span></div></section>`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(m.memberNo || m.formNo)} - Official Membership Form</title><style>@page{size:A4;margin:8mm}*{box-sizing:border-box}body{font-family:Arial,"Segoe UI",sans-serif;color:#1f2937;margin:0;background:#eef2ee}.sheet{position:relative;background:white;border:1.8px solid #164c32;border-top:8px solid #164c32;padding:11mm 10mm 60mm;min-height:281mm;overflow:hidden}.sheet:after{content:"";position:absolute;left:0;right:0;bottom:0;height:5px;background:#c9a34f}.copytag{position:absolute;right:10mm;top:4mm;font-size:8px;letter-spacing:.13em;color:#6b7280;font-weight:800}.head{display:grid;grid-template-columns:68px 1fr 82px;gap:12px;align-items:center;padding-bottom:8px}.logo{width:62px;height:62px;object-fit:contain}.photo{width:76px;height:92px;border:1px solid #cbd5ce;border-radius:5px;object-fit:cover;background:#fafafa}.placeholder{display:grid;place-items:center;color:#a3a3a3;font-size:9px}.title{color:#164c32;font-family:Georgia,"Times New Roman",serif;font-size:18px;font-weight:800;letter-spacing:.02em}.subtitle{font-size:10px;color:#606b65;margin-top:3px;font-weight:700;text-transform:uppercase;letter-spacing:.07em}.goldline{width:92px;height:3px;background:#c9a34f;margin:7px 0}.statusline{display:flex;gap:8px;align-items:center;font-size:9px;color:#315744;font-weight:700}.badge{padding:3px 8px;border-radius:20px;background:#e8f5ec;color:#17663b;font-size:8px}.idstrip{display:grid;grid-template-columns:1.35fr 1.15fr .8fr 1fr;background:#f8f5ec;border:1px solid #eadcae;padding:6px 9px;gap:12px;margin:4px 0 8px}.section{margin-top:7px}.section h3{font-size:9px;color:#164c32;text-transform:uppercase;letter-spacing:.12em;border-bottom:1px solid #dfe6e1;padding-bottom:4px;margin:0 0 4px}.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:0 12px}.fullrow{margin-top:1px}.field{padding:4px 0;border-bottom:1px dotted #ccd5cf;min-height:26px}.field span{display:block;font-size:6.6px;color:#7b837e;text-transform:uppercase;letter-spacing:.04em}.field strong{display:block;font-size:8.6px;font-weight:700;color:#26332c;margin-top:1px;word-break:break-word}.span2{grid-column:span 2}.paymentbox{background:#fbfcfa;border-radius:4px;padding:5px 7px 2px;border:1px solid #e7ece8}.undertaking{margin-top:9px;border:1px solid #d8e1db;border-left:4px solid #c9a34f;background:#fbfcfa;padding:9px 11px}.undertitle{font-size:8px;color:#164c32;font-weight:800;text-align:center;letter-spacing:.05em;margin-bottom:6px}.urdu{font-family:"Noto Nastaliq Urdu","Jameel Noori Nastaleeq","Noto Naskh Arabic","Segoe UI",Tahoma,Arial,sans-serif;direction:rtl;unicode-bidi:plaintext;text-align:right;font-size:10.2px;line-height:2.05;word-spacing:.08em;color:#24342b}.signatures{position:absolute;left:10mm;right:10mm;bottom:25mm;display:grid;grid-template-columns:repeat(5,1fr);gap:9px;text-align:center}.signatures>div{font-size:7px;color:#4b5563}.signatures b{display:block;color:#213c2d;font-size:7.4px}.signatures small{display:block;font-size:5.8px;color:#7b837e;margin-top:2px;line-height:1.3}.sigline{height:27px;border-bottom:1px solid #53655a;margin-bottom:4px}.foot{position:absolute;left:10mm;right:10mm;bottom:6mm;border-top:1px solid #e4e8e5;padding-top:4px;display:grid;grid-template-columns:1fr 1.7fr 1fr;gap:8px;align-items:center;font-size:6px;color:#7b837e}.foot span:nth-child(2){text-align:center}.foot span:last-child{text-align:right}@media print{body{background:white}.sheet{margin:0}button{display:none}}</style></head><body>${documentPage}<script>window.onload=()=>setTimeout(()=>window.print(),500)</script></body></html>`;
  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) { alert("Please allow pop-ups to print the membership document."); return; }
  w.document.open(); w.document.write(html); w.document.close();
}

function shareWhatsApp(m: Member) {
  const phone = String(m.whatsapp || m.phone || "").replace(/\D/g, "");
  if (!phone) { alert("No WhatsApp/phone number is saved for this member."); return; }
  const text = `Assalam-o-Alaikum ${m.fullName},\
\
Your Anjuman-e-Araian Faisalabad membership record has been processed.\
Registration No: ${m.memberNo || "—"}\
Membership: ${membershipTypeLabel(m.membershipType)}\
Status: ${m.status}\
\
The office can attach your official membership PDF to this WhatsApp conversation.`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
}

function escapeHtml(value: any) { return String(value || "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c] || c)); }
function Stat({ label, value }: { label: string; value: number }) { return <div style={{ ...panelStyle, padding: 16 }}><div style={{ color: "#777", fontSize: 11, textTransform: "uppercase", fontWeight: 700 }}>{label}</div><div style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 26, marginTop: 4 }}>{value}</div></div>; }
function StatusBadge({ status }: { status: string }) { const bad = ["rejected","declined","suspended"].includes(status); const ok = ["approved","accepted","verified","confirmed"].includes(status); return <span style={{ display: "inline-block", background: ok ? "#dcfce7" : bad ? "#fee2e2" : "#fef9c3", color: ok ? "#166534" : bad ? "#b91c1c" : "#854d0e", borderRadius: 20, padding: "4px 8px", fontSize: 10, fontWeight: 800, textTransform: "capitalize" }}>{String(status).replace(/_/g," ")}</span>; }
function Notice({ text, success = false }: { text: string; success?: boolean }) { return <div style={{ background: success ? "#dcfce7" : "#fee2e2", border: `1px solid ${success ? "#86efac" : "#fecaca"}`, color: success ? "#166534" : "#b91c1c", borderRadius: 8, padding: "11px 14px", marginBottom: 16, fontSize: 13 }}>{text}</div>; }
function FormSection({ title, children }: { title: string; children: React.ReactNode }) { return <div style={{ marginBottom: 24 }}><h3 style={{ color: GREEN, fontSize: 14, textTransform: "uppercase", letterSpacing: ".04em", borderBottom: "1px solid #eee", paddingBottom: 7, margin: "0 0 12px" }}>{title}</h3>{children}</div>; }
function Grid({ children }: { children: React.ReactNode }) { return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="modal-grid">{children}</div>; }
function Field({ label, value, onChange, type = "text", placeholder = "" }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) { return <label style={labelWrap}>{label}<input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={fieldStyle} /></label>; }
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) { return <label style={labelWrap}>{label}<select value={value || ""} onChange={(e) => onChange(e.target.value)} style={fieldStyle}>{options.map((x) => <option key={x} value={x}>{x || "Not specified"}</option>)}</select></label>; }

const panelStyle: React.CSSProperties = { background: "white", borderRadius: 12, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,.06)" };
const fieldStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "9px 11px", border: "1px solid #d9e2dc", borderRadius: 7, background: "white", fontSize: 12 };
const labelWrap: React.CSSProperties = { display: "grid", gap: 6, color: GREEN, fontSize: 11, fontWeight: 800 };
const primaryButton: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: GREEN, color: "white", border: 0, borderRadius: 7, padding: "9px 13px", fontWeight: 800, fontSize: 12, cursor: "pointer" };
const secondaryButton: React.CSSProperties = { ...primaryButton, background: "white", color: GREEN, border: "1px solid #cbd8cf" };
const tinyButton: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, background: "white", color: GREEN, border: "1px solid #cbd8cf", borderRadius: 6, padding: "5px 7px", fontWeight: 700, fontSize: 10, cursor: "pointer" };
const miniSelect: React.CSSProperties = { padding: "5px 7px", border: "1px solid #ddd", borderRadius: 6, background: "white", fontSize: 10 };
const checkLabel: React.CSSProperties = { display: "block", fontSize: 10, color: "#555", marginBottom: 4 };
const checkBoxCard: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, color: "#555", fontSize: 11, fontWeight: 700 };
const thStyle: React.CSSProperties = { padding: "11px 10px", textAlign: "left", color: "#777", fontSize: 10, textTransform: "uppercase", letterSpacing: ".04em", whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "11px 10px", fontSize: 12, verticalAlign: "middle" };
function tabButton(active: boolean): React.CSSProperties { return { display: "inline-flex", alignItems: "center", gap: 6, border: `1px solid ${active ? GREEN : "#d7ded9"}`, background: active ? GREEN : "white", color: active ? "white" : GREEN, borderRadius: 8, padding: "9px 13px", fontWeight: 800, cursor: "pointer" }; }
