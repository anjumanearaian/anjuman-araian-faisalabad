import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAdmin } from "../context/AdminContext";
import {
  Member,
  MemberStatus,
  createAdminMember,
  fetchAdminMembers,
  updateMember,
  updateMemberStatus,
  educationLevels,
  occupations,
  provinces,
  bloodGroups,
  structuredOptionForEdit,
  joinStructuredOption,
} from "../lib/memberStore";
import { adminReviewMatchRequest, fetchAdminMatchRequests } from "../lib/matrimonialStore";
import { apiClient } from "../lib/apiClient";
import logo from "../../imports/logo.png";
import { ArrowLeft, CheckCircle, FileText, MessageCircle, Plus, Printer, RefreshCw, Search, ShieldCheck, UserCog, Users, XCircle, Crown, Heart } from "lucide-react";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

const blankMember = () => ({
  formNo: "", memberNo: "", fullName: "", fatherName: "", cnic: "", dob: "", gender: "male", bloodGroup: "",
  email: "", phone: "", whatsapp: "", address: "", city: "Faisalabad", district: "Faisalabad", province: "Punjab",
  education: "Other", educationDetail: "", occupation: "Other", occupationDetail: "", designation: "", institutionName: "", businessName: "",
  membershipType: "ordinary", paymentStatus: "pending", status: "pending", showOnPortal: true, showOnWeb: false, photoUrl: "", adminNote: "",
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
  const [assignment, setAssignment] = useState({ memberId: "", role: "", category: "cabinet", tier: "2", period: "" });

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
      const text = [m.formNo, m.memberNo, m.fullName, m.fatherName, m.cnic, m.phone, m.whatsapp, m.email, m.city].filter(Boolean).join(" ").toLowerCase();
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
      city: m.city || "", district: m.district || "", province: m.province || "Punjab", education: edu.base || "Other", educationDetail: edu.detail || "",
      occupation: occ.base || "Other", occupationDetail: occ.detail || "", designation: m.designation || "", institutionName: m.institutionName || "", businessName: m.businessName || "",
      membershipType: m.membershipType || "ordinary", paymentStatus: m.paymentStatus || "pending", status: m.status, showOnPortal: Boolean(m.showOnPortal), showOnWeb: Boolean(m.showOnWeb),
      photoUrl: m.photoUrl || "", adminNote: m.adminNote || "",
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
      education: joinStructuredOption(form.education, form.educationDetail),
      occupation: joinStructuredOption(form.occupation, form.occupationDetail),
    };
    delete payload.educationDetail; delete payload.occupationDetail; delete payload.status;
    try {
      if (selected) {
        await updateMember(selected.id, payload as Partial<Member>);
        if (form.status && form.status !== selected.status && ["pending", "approved", "rejected"].includes(form.status)) {
          await updateMemberStatus(selected.id, form.status, undefined, form.adminNote);
        }
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
    if (!confirm(`Approve membership for ${m.fullName}?`)) return;
    setError("");
    try { await updateMemberStatus(m.id, "approved", undefined, m.adminNote); setMessage(`${m.fullName} approved.`); await loadMembers(); }
    catch (e: any) { setError(e?.message || "Approval failed."); }
  };

  const reject = async (m: Member) => {
    const reason = prompt(`Reason for rejecting ${m.fullName}:`, m.rejectionReason || "");
    if (reason === null) return;
    try { await updateMemberStatus(m.id, "rejected", reason, m.adminNote); setMessage(`${m.fullName} application rejected.`); await loadMembers(); }
    catch (e: any) { setError(e?.message || "Rejection failed."); }
  };

  const quickUpdate = async (m: Member, partial: Partial<Member>) => {
    try { await updateMember(m.id, partial); await loadMembers(); }
    catch (e: any) { setError(e?.message || "Update failed."); }
  };

  const assignLeadership = async () => {
    const m = members.find((x) => x.id === assignment.memberId);
    if (!m || m.status !== "approved") { setError("Select an approved member first."); return; }
    if (!assignment.role.trim()) { setError("Enter the Cabinet/Committee role."); return; }
    try {
      await apiClient("/leadership/profiles", {
        method: "POST",
        body: JSON.stringify({ memberId: m.id, name: m.fullName, role: assignment.role, city: m.city || "Faisalabad", tier: Number(assignment.tier) || 2, category: assignment.category, image: m.photoUrl || null, period: assignment.period || null }),
      });
      setMessage(`${m.fullName} assigned to ${assignment.role}. The public leadership profile is now linked to the member record.`);
      setAssignment({ memberId: "", role: "", category: "cabinet", tier: "2", period: "" });
    } catch (e: any) { setError(e?.message || "Could not assign leadership role."); }
  };

  const reviewMatch = async (id: string, action: "forward" | "reject" | "close") => {
    const note = action === "reject" ? (prompt("Admin note / rejection reason (optional):") || "") : "";
    try { await adminReviewMatchRequest(id, action, note); await loadMatches(); setMessage(`Match request ${action === "forward" ? "forwarded for consent" : action + "ed"}.`); }
    catch (e: any) { setError(e?.message || "Could not update match request."); }
  };

  if (!isAdmin) {
    return <div style={{ minHeight: "100vh", background: "#f8f5ef", display: "grid", placeItems: "center", padding: 24 }}><div style={{ background: "white", maxWidth: 520, padding: 34, borderRadius: 14, boxShadow: "0 8px 35px rgba(0,0,0,.08)", textAlign: "center" }}><ShieldCheck size={38} color={GREEN} /><h2 style={{ color: GREEN }}>Admin authorization required</h2><p style={{ color: "#666", lineHeight: 1.7 }}>Sign in from the main Admin Panel first, then open the Member & Approval Center.</p><Link to="/admin" style={{ display: "inline-block", background: GREEN, color: "white", padding: "10px 18px", borderRadius: 8, textDecoration: "none", fontWeight: 700 }}>Open Admin Panel</Link></div></div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8f5ef", fontFamily: "'Lato', sans-serif" }}>
      <header style={{ background: GREEN, color: "white", borderBottom: `4px solid ${GOLD}` }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}><img src={logo} alt="Anjuman e Araian" style={{ width: 52, height: 52, objectFit: "contain", background: "white", borderRadius: 50, padding: 3 }} /><div><h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 23 }}>Member & Approval Center</h1><p style={{ margin: "4px 0 0", color: "rgba(255,255,255,.72)", fontSize: 12 }}>Anjuman-e-Araian Faisalabad</p></div></div>
          <Link to="/admin" style={{ color: "white", textDecoration: "none", border: "1px solid rgba(255,255,255,.25)", padding: "8px 12px", borderRadius: 7, fontWeight: 700, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}><ArrowLeft size={14} /> Main Admin Panel</Link>
        </div>
      </header>

      <main style={{ maxWidth: 1240, margin: "0 auto", padding: "26px 22px 60px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <button onClick={() => setView("members")} style={tabButton(view === "members")}><Users size={15} /> Members & Approvals</button>
          <button onClick={() => setView("matches")} style={tabButton(view === "matches")}><Heart size={15} /> Matrimonial Match Requests</button>
        </div>
        {message && <Notice success text={message} />}
        {error && <Notice text={error} />}

        {view === "members" && (
          <>
            <section style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }} className="stats-grid">
              <Stat label="Total Members" value={members.length} /><Stat label="Pending Review" value={members.filter((m) => m.status === "pending").length} /><Stat label="Approved" value={members.filter((m) => m.status === "approved").length} /><Stat label="Payment Pending" value={members.filter((m) => !["received", "verified", "recorded"].includes(String(m.paymentStatus || ""))).length} />
            </section>

            <section style={panelStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
                <div><h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", margin: 0, fontSize: 20 }}>Member Registry</h2><p style={{ color: "#777", fontSize: 12, margin: "4px 0 0" }}>Search, approve, correct, print and assign members from one place.</p></div>
                <div style={{ display: "flex", gap: 8 }}><button onClick={() => void loadMembers()} style={secondaryButton}><RefreshCw size={14} /> Refresh</button><button onClick={startAdd} style={primaryButton}><Plus size={14} /> Add Member</button></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr .7fr", gap: 10, marginBottom: 16 }} className="filter-grid">
                <div style={{ position: "relative" }}><Search size={16} color="#999" style={{ position: "absolute", left: 12, top: 11 }} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, CNIC, phone, Form No. or Registration No." style={{ ...fieldStyle, paddingLeft: 36 }} /></div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} style={fieldStyle}><option value="all">All Statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="suspended">Suspended</option><option value="deceased">Deceased</option></select>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1080 }}>
                  <thead><tr style={{ background: "#f8f5ef" }}>{["Form / Registration", "Member", "Contact", "Status", "Payment", "Publishing", "Actions"].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                  <tbody>{filtered.map((m) => <tr key={m.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={tdStyle}><strong style={{ color: GREEN }}>{m.formNo || "Auto pending"}</strong><br /><span style={{ fontSize: 11, color: "#777" }}>{m.memberNo}</span></td>
                    <td style={tdStyle}><div style={{ display: "flex", gap: 9, alignItems: "center" }}>{m.photoUrl ? <img src={m.photoUrl} alt="" style={{ width: 38, height: 38, borderRadius: 50, objectFit: "cover" }} /> : <div style={{ width: 38, height: 38, borderRadius: 50, background: "#f0f7f3", display: "grid", placeItems: "center", color: GREEN, fontWeight: 800 }}>{m.fullName?.[0]}</div>}<div><strong>{m.fullName}</strong><div style={{ fontSize: 11, color: "#888" }}>{m.cnic}</div></div></div></td>
                    <td style={tdStyle}>{m.phone}<br /><span style={{ fontSize: 11, color: "#777" }}>{m.city}</span></td>
                    <td style={tdStyle}><StatusBadge status={m.status} /></td>
                    <td style={tdStyle}><select value={m.paymentStatus || "pending"} onChange={(e) => void quickUpdate(m, { paymentStatus: e.target.value } as any)} style={{ ...miniSelect, minWidth: 100 }}><option value="pending">Pending</option><option value="submitted">Submitted</option><option value="received">Received</option><option value="verified">Verified</option><option value="recorded">Recorded</option><option value="rejected">Rejected</option></select></td>
                    <td style={tdStyle}><label style={checkLabel}><input type="checkbox" checked={Boolean(m.showOnPortal)} onChange={(e) => void quickUpdate(m, { showOnPortal: e.target.checked })} /> Portal</label><label style={checkLabel}><input type="checkbox" checked={Boolean(m.showOnWeb)} onChange={(e) => void quickUpdate(m, { showOnWeb: e.target.checked })} /> Web</label></td>
                    <td style={tdStyle}><div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}><button onClick={() => startEdit(m)} style={tinyButton}>Edit</button>{m.status !== "approved" && <button onClick={() => void approve(m)} style={{ ...tinyButton, color: "#166534", borderColor: "#86efac" }}>Approve</button>}{m.status !== "rejected" && <button onClick={() => void reject(m)} style={{ ...tinyButton, color: "#b91c1c", borderColor: "#fecaca" }}>Reject</button>}<button onClick={() => printMemberForm(m)} style={tinyButton}><Printer size={12} /> Print/PDF</button><button onClick={() => shareWhatsApp(m)} style={tinyButton}><MessageCircle size={12} /> WhatsApp</button></div></td>
                  </tr>)}</tbody>
                </table>
                {!loading && filtered.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#999" }}>No members match this filter.</div>}
                {loading && <div style={{ padding: 40, textAlign: "center", color: "#777" }}>Loading member registry...</div>}
              </div>
            </section>

            <section style={{ ...panelStyle, marginTop: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><Crown size={18} color={GOLD} /><h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", margin: 0, fontSize: 19 }}>Cabinet / Committee Assignment</h2></div>
              <p style={{ color: "#777", fontSize: 12, margin: "0 0 16px" }}>Assign an approved member to Cabinet, Executive Committee, Advisory Board or another leadership category. The public leadership record stays linked to the member profile.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr .5fr 1fr auto", gap: 10 }} className="assign-grid">
                <select value={assignment.memberId} onChange={(e) => setAssignment((a) => ({ ...a, memberId: e.target.value }))} style={fieldStyle}><option value="">Select approved member</option>{members.filter((m) => m.status === "approved").map((m) => <option key={m.id} value={m.id}>{m.fullName} · {m.memberNo}</option>)}</select>
                <input value={assignment.role} onChange={(e) => setAssignment((a) => ({ ...a, role: e.target.value }))} placeholder="Role, e.g. Vice President" style={fieldStyle} />
                <select value={assignment.category} onChange={(e) => setAssignment((a) => ({ ...a, category: e.target.value }))} style={fieldStyle}><option value="cabinet">Cabinet</option><option value="executive">Executive Committee</option><option value="advisory">Advisory Board</option><option value="founder">Founder</option><option value="expresident">Ex-President</option></select>
                <input type="number" min="0" max="10" value={assignment.tier} onChange={(e) => setAssignment((a) => ({ ...a, tier: e.target.value }))} placeholder="Tier" style={fieldStyle} />
                <input value={assignment.period} onChange={(e) => setAssignment((a) => ({ ...a, period: e.target.value }))} placeholder="Period, e.g. 2026–2028" style={fieldStyle} />
                <button onClick={() => void assignLeadership()} style={primaryButton}><UserCog size={14} /> Assign</button>
              </div>
            </section>
          </>
        )}

        {view === "matches" && (
          <section style={panelStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><div><h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 20, margin: 0 }}>Matrimonial Match Requests</h2><p style={{ color: "#777", fontSize: 12, margin: "4px 0 0" }}>Admin reviews the request first. Only then can the target profile accept or decline.</p></div><button onClick={() => void loadMatches()} style={secondaryButton}><RefreshCw size={14} /> Refresh</button></div>
            <div style={{ display: "grid", gap: 12 }}>{matchRequests.map((r) => <div key={r.id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center" }}><div><div style={{ color: GREEN, fontWeight: 800 }}>{r.requester?.profileCode} → {r.target?.profileCode}</div><div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>{r.requester?.gender} · {r.requester?.age} · {r.requester?.city} · {r.requester?.education} · {r.requester?.profession}</div><div style={{ color: "#666", fontSize: 12, marginTop: 2 }}>{r.target?.gender} · {r.target?.age} · {r.target?.city} · {r.target?.education} · {r.target?.profession}</div><div style={{ marginTop: 6 }}><StatusBadge status={r.status as any} /></div></div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{r.status === "pending_admin" && <><button onClick={() => void reviewMatch(r.id, "forward")} style={{ ...tinyButton, color: "#166534", borderColor: "#86efac" }}>Forward for Consent</button><button onClick={() => void reviewMatch(r.id, "reject")} style={{ ...tinyButton, color: "#b91c1c", borderColor: "#fecaca" }}>Reject</button></>}{["accepted", "declined", "rejected"].includes(r.status) && <button onClick={() => void reviewMatch(r.id, "close")} style={tinyButton}>Close</button>}</div></div>)}</div>
            {!loading && matchRequests.length === 0 && <div style={{ padding: 42, textAlign: "center", color: "#999" }}>No match requests yet.</div>}
          </section>
        )}
      </main>

      {showForm && <MemberFormModal form={form} setForm={setForm} selected={selected} saving={saving} onClose={() => setShowForm(false)} onSave={() => void saveMember()} />}
      <style>{`@media(max-width:900px){.stats-grid{grid-template-columns:1fr 1fr!important}.filter-grid,.assign-grid{grid-template-columns:1fr!important}} @media(max-width:560px){.stats-grid{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}

function MemberFormModal({ form, setForm, selected, saving, onClose, onSave }: { form: Record<string, any>; setForm: (v: any) => void; selected: Member | null; saving: boolean; onClose: () => void; onSave: () => void }) {
  const set = (key: string, value: any) => setForm((p: any) => ({ ...p, [key]: value }));
  return <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.55)", display: "grid", placeItems: "center", padding: 16 }}><div style={{ background: "white", borderRadius: 14, width: "min(940px,96vw)", maxHeight: "92vh", overflow: "auto", boxShadow: "0 20px 70px rgba(0,0,0,.25)" }}>
    <div style={{ padding: "20px 24px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><h2 style={{ color: GREEN, margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 21 }}>{selected ? "Edit Member Record" : "Add New Member"}</h2><p style={{ color: "#777", fontSize: 12, margin: "4px 0 0" }}>Leave Form No. and Registration No. blank for automatic numbering, or enter a manual number if required.</p></div><button onClick={onClose} style={{ border: 0, background: "none", cursor: "pointer", color: "#777" }}>✕</button></div>
    <div style={{ padding: 24 }}>
      <FormSection title="Form & Membership Numbers"><Grid><Field label="Form No. (optional/manual)" value={form.formNo} onChange={(v) => set("formNo", v)} placeholder="Auto if blank" /><Field label="Registration / Member No. (optional/manual)" value={form.memberNo} onChange={(v) => set("memberNo", v)} placeholder="Auto if blank" /><SelectField label="Application Status" value={form.status} onChange={(v) => set("status", v)} options={["pending", "approved", "rejected"]} /><SelectField label="Payment Status" value={form.paymentStatus} onChange={(v) => set("paymentStatus", v)} options={["pending", "submitted", "received", "verified", "recorded", "rejected"]} /></Grid></FormSection>
      <FormSection title="Personal Information"><Grid><Field label="Full Name *" value={form.fullName} onChange={(v) => set("fullName", v)} /><Field label="Father's Name *" value={form.fatherName} onChange={(v) => set("fatherName", v)} /><Field label="CNIC *" value={form.cnic} onChange={(v) => set("cnic", v)} placeholder="12345-1234567-1" /><Field label="Date of Birth" type="date" value={form.dob} onChange={(v) => set("dob", v)} /><SelectField label="Gender" value={form.gender} onChange={(v) => set("gender", v)} options={["male", "female", "other"]} /><SelectField label="Blood Group" value={form.bloodGroup} onChange={(v) => set("bloodGroup", v)} options={["", ...bloodGroups]} /></Grid></FormSection>
      <FormSection title="Contact & Address"><Grid><Field label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} /><Field label="Phone *" value={form.phone} onChange={(v) => set("phone", v)} /><Field label="WhatsApp" value={form.whatsapp} onChange={(v) => set("whatsapp", v)} /><Field label="City" value={form.city} onChange={(v) => set("city", v)} /><Field label="District" value={form.district} onChange={(v) => set("district", v)} /><SelectField label="Province / Region" value={form.province} onChange={(v) => set("province", v)} options={provinces} /><div style={{ gridColumn: "span 2" }}><Field label="Full Address" value={form.address} onChange={(v) => set("address", v)} /></div></Grid></FormSection>
      <FormSection title="Education & Work"><Grid><SelectField label="Education Level" value={form.education} onChange={(v) => set("education", v)} options={educationLevels} /><Field label="Specialization / Degree" value={form.educationDetail} onChange={(v) => set("educationDetail", v)} /><SelectField label="Occupation" value={form.occupation} onChange={(v) => set("occupation", v)} options={occupations} /><Field label="Occupation Field / Specialty" value={form.occupationDetail} onChange={(v) => set("occupationDetail", v)} /><Field label="Designation / Role" value={form.designation} onChange={(v) => set("designation", v)} /><Field label="Institute / Organization" value={form.institutionName} onChange={(v) => set("institutionName", v)} /><div style={{ gridColumn: "span 2" }}><Field label="Business Name" value={form.businessName} onChange={(v) => set("businessName", v)} /></div></Grid></FormSection>
      <FormSection title="Membership & Publishing"><Grid><SelectField label="Membership Type" value={form.membershipType} onChange={(v) => set("membershipType", v)} options={["ordinary", "life", "patron", "overseas"]} /><Field label="Photo URL (optional)" value={form.photoUrl} onChange={(v) => set("photoUrl", v)} /><label style={checkBoxCard}><input type="checkbox" checked={Boolean(form.showOnPortal)} onChange={(e) => set("showOnPortal", e.target.checked)} /> Show to approved members in portal</label><label style={checkBoxCard}><input type="checkbox" checked={Boolean(form.showOnWeb)} onChange={(e) => set("showOnWeb", e.target.checked)} /> Show in public web directory</label><div style={{ gridColumn: "span 2" }}><Field label="Admin Note" value={form.adminNote} onChange={(v) => set("adminNote", v)} /></div></Grid></FormSection>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}><button onClick={onClose} style={secondaryButton}>Cancel</button><button disabled={saving} onClick={onSave} style={primaryButton}><CheckCircle size={14} /> {saving ? "Saving..." : selected ? "Save Changes" : "Create Member"}</button></div>
    </div>
  </div></div>;
}

function printMemberForm(m: Member) {
  const edu = structuredOptionForEdit(m.education, educationLevels);
  const occ = structuredOptionForEdit(m.occupation, occupations);
  const logoUrl = new URL(logo, window.location.origin).href;
  const photo = m.photoUrl ? `<img src="${escapeHtml(m.photoUrl)}" class="photo" />` : `<div class="photo placeholder">PHOTO</div>`;
  const row = (label: string, value?: string | null) => `<div class="field"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "—")}</strong></div>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(m.formNo || m.memberNo)} - Membership Form</title><style>
    @page{size:A4;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#1f2937;margin:0}.sheet{border:2px solid #1a4d2e;padding:18px;min-height:270mm}.head{display:grid;grid-template-columns:78px 1fr 105px;gap:16px;align-items:center;border-bottom:3px solid #c8a04a;padding-bottom:14px}.logo{width:72px;height:72px;object-fit:contain}.photo{width:95px;height:112px;border:1px solid #bbb;object-fit:cover}.placeholder{display:grid;place-items:center;color:#aaa;font-size:11px}.title{color:#1a4d2e;font-size:24px;font-weight:700}.sub{font-size:12px;color:#666;margin-top:4px}.numbers{display:grid;grid-template-columns:1fr 1fr;gap:10px;background:#f7f3e9;padding:10px;margin:14px 0;border:1px solid #e8d9aa}.section{margin-top:15px}.section h3{font-size:13px;color:#1a4d2e;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #ddd;padding-bottom:5px;margin:0 0 8px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:0 18px}.field{padding:7px 0;border-bottom:1px dotted #ccc}.field span{display:block;font-size:9px;color:#777;text-transform:uppercase}.field strong{font-size:12px;font-weight:600}.full{grid-column:1/-1}.approval{margin-top:24px;border-top:1px solid #aaa;padding-top:16px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;text-align:center}.sig{padding-top:30px;border-bottom:1px solid #555;font-size:10px}.foot{font-size:9px;color:#777;margin-top:16px;text-align:center}.badge{display:inline-block;padding:4px 9px;border-radius:20px;background:#dcfce7;color:#166534;font-size:10px;font-weight:700}@media print{button{display:none}}</style></head><body><div class="sheet"><div class="head"><img class="logo" src="${logoUrl}"><div><div class="title">Anjuman-e-Araian Faisalabad</div><div class="sub">Official Membership Registration Form · Established 1947</div><div style="margin-top:8px"><span class="badge">${escapeHtml(m.status.toUpperCase())}</span></div></div>${photo}</div><div class="numbers">${row("Form No.",m.formNo)}${row("Registration / Member No.",m.memberNo)}</div><div class="section"><h3>Personal Information</h3><div class="grid">${row("Full Name",m.fullName)}${row("Father's Name",m.fatherName)}${row("CNIC",m.cnic)}${row("Date of Birth",m.dob)}${row("Gender",m.gender)}${row("Blood Group",m.bloodGroup)}</div></div><div class="section"><h3>Contact & Address</h3><div class="grid">${row("Email",m.email)}${row("Phone",m.phone)}${row("WhatsApp",m.whatsapp)}${row("City / District",[m.city,m.district].filter(Boolean).join(", "))}${row("Province",m.province)}<div class="full">${row("Full Address",m.address)}</div></div></div><div class="section"><h3>Education & Professional Information</h3><div class="grid">${row("Education Level",edu.base)}${row("Specialization / Degree",edu.detail)}${row("Occupation",occ.base)}${row("Occupation Field",occ.detail)}${row("Designation",m.designation)}${row("Institute / Organization",m.institutionName)}<div class="full">${row("Business Name",m.businessName)}</div></div></div><div class="section"><h3>Membership & Approval</h3><div class="grid">${row("Membership Type",m.membershipType)}${row("Payment Status",m.paymentStatus)}${row("Application Status",m.status)}${row("Approved On",m.approvedAt ? new Date(m.approvedAt).toLocaleDateString("en-PK") : "Pending")}</div></div><div class="approval"><div><div class="sig"></div>Applicant Signature</div><div><div class="sig"></div>Verification Officer</div><div><div class="sig"></div>Authorized Signatory</div></div><div class="foot">System generated from the official Anjuman-e-Araian Faisalabad membership database. Printed ${new Date().toLocaleString("en-PK")}.</div></div><script>window.onload=()=>setTimeout(()=>window.print(),350)</script></body></html>`;
  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) { alert("Please allow pop-ups to print the membership form."); return; }
  w.document.open(); w.document.write(html); w.document.close();
}

function shareWhatsApp(m: Member) {
  const phone = String(m.whatsapp || m.phone || "").replace(/\D/g, "");
  if (!phone) { alert("No WhatsApp/phone number is saved for this member."); return; }
  const text = `Assalam-o-Alaikum ${m.fullName},\n\nYour Anjuman-e-Araian Faisalabad membership record has been processed.\nForm No: ${m.formNo || "—"}\nRegistration No: ${m.memberNo || "—"}\nStatus: ${m.status}\n\nThe office can attach your official registration-form PDF to this WhatsApp conversation.`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
}

function escapeHtml(value: string) { return String(value || "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c] || c)); }
function Stat({ label, value }: { label: string; value: number }) { return <div style={{ ...panelStyle, padding: 16 }}><div style={{ color: "#777", fontSize: 11, textTransform: "uppercase", fontWeight: 700 }}>{label}</div><div style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 26, marginTop: 4 }}>{value}</div></div>; }
function StatusBadge({ status }: { status: string }) { const bad = ["rejected", "declined", "suspended"].includes(status); const ok = ["approved", "accepted", "verified"].includes(status); return <span style={{ display: "inline-block", background: ok ? "#dcfce7" : bad ? "#fee2e2" : "#fef9c3", color: ok ? "#166534" : bad ? "#b91c1c" : "#854d0e", borderRadius: 20, padding: "4px 8px", fontSize: 10, fontWeight: 800, textTransform: "capitalize" }}>{String(status).replace(/_/g, " ")}</span>; }
function Notice({ text, success = false }: { text: string; success?: boolean }) { return <div style={{ background: success ? "#dcfce7" : "#fee2e2", border: `1px solid ${success ? "#86efac" : "#fecaca"}`, color: success ? "#166534" : "#b91c1c", borderRadius: 8, padding: "11px 14px", marginBottom: 16, fontSize: 13 }}>{text}</div>; }
function FormSection({ title, children }: { title: string; children: React.ReactNode }) { return <div style={{ marginBottom: 24 }}><h3 style={{ color: GREEN, fontSize: 14, textTransform: "uppercase", letterSpacing: ".04em", borderBottom: "1px solid #eee", paddingBottom: 7, margin: "0 0 12px" }}>{title}</h3>{children}</div>; }
function Grid({ children }: { children: React.ReactNode }) { return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="filter-grid">{children}</div>; }
function Field({ label, value, onChange, type = "text", placeholder = "" }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) { return <label style={labelWrap}>{label}<input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={fieldStyle} /></label>; }
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) { return <label style={labelWrap}>{label}<select value={value || ""} onChange={(e) => onChange(e.target.value)} style={fieldStyle}>{options.map((x) => <option key={x} value={x}>{x || "Not specified"}</option>)}</select></label>; }

const panelStyle: React.CSSProperties = { background: "white", borderRadius: 12, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,.05)", border: "1px solid rgba(26,77,46,.06)" };
const fieldStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #dfe5e1", borderRadius: 7, padding: "9px 11px", fontSize: 13, background: "white" };
const labelWrap: React.CSSProperties = { display: "grid", gap: 5, color: GREEN, fontWeight: 700, fontSize: 12 };
const primaryButton: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, background: GREEN, color: "white", border: 0, borderRadius: 7, padding: "9px 13px", fontWeight: 700, fontSize: 12, cursor: "pointer" };
const secondaryButton: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, background: "white", color: GREEN, border: "1px solid rgba(26,77,46,.2)", borderRadius: 7, padding: "9px 13px", fontWeight: 700, fontSize: 12, cursor: "pointer" };
const tinyButton: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, background: "white", color: GREEN, border: "1px solid #dfe5e1", borderRadius: 6, padding: "5px 7px", fontSize: 10, fontWeight: 700, cursor: "pointer" };
const miniSelect: React.CSSProperties = { border: "1px solid #ddd", borderRadius: 6, padding: "5px 6px", fontSize: 11, background: "white" };
const checkLabel: React.CSSProperties = { display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#555", marginBottom: 3 };
const checkBoxCard: React.CSSProperties = { display: "flex", alignItems: "center", gap: 7, color: GREEN, fontSize: 12, fontWeight: 700, border: "1px solid #e5e7eb", borderRadius: 7, padding: 10 };
const thStyle: React.CSSProperties = { padding: "11px 10px", textAlign: "left", color: "#777", fontSize: 10, textTransform: "uppercase", letterSpacing: ".04em", whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "11px 10px", fontSize: 12, verticalAlign: "middle" };
function tabButton(active: boolean): React.CSSProperties { return { display: "inline-flex", alignItems: "center", gap: 6, border: active ? 0 : "1px solid #dfe5e1", background: active ? GREEN : "white", color: active ? "white" : GREEN, padding: "9px 13px", borderRadius: 8, fontWeight: 800, fontSize: 12, cursor: "pointer" }; }
