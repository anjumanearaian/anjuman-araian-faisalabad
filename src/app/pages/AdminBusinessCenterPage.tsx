import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router";
import { Briefcase, Clock3, Edit2, Eye, FileCheck2, FileText, History, Search, Trash2, Upload, UserCheck, UserX, X } from "lucide-react";
import { useAdmin } from "../context/AdminContext";
import {
  Business,
  BusinessAuditRow,
  BusinessStatus,
  businessCategories,
  businessStatusColors,
  deleteBusiness,
  fetchAllBusinesses,
  fetchBusinessAudit,
  paymentStatusColors,
  sponsorshipPackages,
  updateBusiness,
  updateBusinessStatus,
} from "../lib/businessStore";
import { uploadFile } from "../lib/upload";
import { MultiImageUpload } from "../components/ui/MultiImageUpload";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";
const BG = "#f8f5ef";
const BORDER = "#e8e2d7";
const field: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, background: "white" };
const label: React.CSSProperties = { display: "block", color: GREEN, fontSize: 12, fontWeight: 800, marginBottom: 6 };

function apiErrorText(error: any, fallback: string) {
  const details = error?.details && typeof error.details === "object"
    ? Object.entries(error.details).flatMap(([name, messages]: any) => (messages || []).map((message: string) => `${name}: ${message}`)).join(" · ")
    : "";
  return details || error?.message || fallback;
}

function fmtDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString("en-GB");
}

function safeIp(ip?: string | null) {
  if (!ip) return "Not recorded";
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
  }
  return ip.length > 16 ? `${ip.slice(0, 12)}…` : ip;
}

function changedKeys(row: BusinessAuditRow) {
  if (!row.beforeData || !row.afterData) return [] as string[];
  return Array.from(new Set([...Object.keys(row.beforeData), ...Object.keys(row.afterData)]))
    .filter((key) => !["updatedAt"].includes(key) && JSON.stringify(row.beforeData?.[key]) !== JSON.stringify(row.afterData?.[key]));
}

type EditForm = {
  businessName: string; ownerName: string; category: string; city: string; address: string; phone: string; whatsapp: string; email: string;
  website: string; socialLinks: string; description: string; productsServices: string; discountOffer: string;
  sponsorshipPackage: Business["sponsorshipPackage"]; logoUrl: string; paymentProofUrl: string; additionalPhotos: string[];
  paymentSenderName: string; paymentMethod: string; paymentReference: string;
};

function editFormFromBusiness(b: Business): EditForm {
  return {
    businessName: b.businessName || "", ownerName: b.ownerName || "", category: b.category || "", city: b.city || "", address: b.address || "", phone: b.phone || "",
    whatsapp: b.whatsapp || "", email: b.email || "", website: b.website || "", socialLinks: b.socialLinks || "", description: b.description || "",
    productsServices: b.productsServices || "", discountOffer: b.discountOffer || "", sponsorshipPackage: b.sponsorshipPackage || "basic", logoUrl: b.logoUrl || "",
    paymentProofUrl: b.paymentProofUrl || "", additionalPhotos: b.additionalPhotos || [], paymentSenderName: "", paymentMethod: "", paymentReference: "",
  };
}

export function AdminBusinessCenterPage() {
  const { isAdmin, role } = useAdmin();
  const allowed = ["admin", "super_admin", "welfare_manager"].includes(String(role || ""));
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BusinessStatus>("pending");
  const [selected, setSelected] = useState<Business | null>(null);
  const [editing, setEditing] = useState<Business | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [rejecting, setRejecting] = useState<Business | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [auditFor, setAuditFor] = useState<Business | null>(null);
  const [auditRows, setAuditRows] = useState<BusinessAuditRow[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const flash = (text: string) => {
    setSuccess(text);
    window.setTimeout(() => setSuccess(""), 4200);
  };

  const load = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetchAllBusinesses(1, 100, true);
      const rows = res.data || [];
      setBusinesses(rows);
      if (selected) setSelected(rows.find((x) => x.id === selected.id) || null);
    } catch (e: any) {
      setError(apiErrorText(e, "Could not load business submissions."));
    } finally { setLoading(false); }
  };

  useEffect(() => { if (isAdmin && allowed) void load(); }, [isAdmin, allowed]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return businesses.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (!q) return true;
      return [b.businessName, b.ownerName, b.category, b.city, b.phone, b.email, b.website].some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [businesses, query, statusFilter]);

  if (!isAdmin) return <Navigate to="/admin" replace />;
  if (!allowed) return <Navigate to="/admin" replace />;

  const openEdit = (b: Business) => {
    setError("");
    setEditing(b);
    setEditForm(editFormFromBusiness(b));
  };

  const setEdit = (key: keyof EditForm, value: any) => {
    setEditForm((old) => old ? { ...old, [key]: value } : old);
    setError("");
  };

  const uploadEdit = (key: "logoUrl" | "paymentProofUrl") => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError("");
    try {
      setEdit(key, await uploadFile(file, key === "logoUrl" ? "business-logo" : "business-payment-proof"));
    } catch (e: any) { setError(apiErrorText(e, "Upload failed.")); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const saveEdit = async () => {
    if (!editing || !editForm) return;
    if (!editForm.businessName.trim() || !editForm.ownerName.trim() || !editForm.category.trim() || !editForm.city.trim() || !editForm.address.trim() || !editForm.phone.trim()) {
      setError("Business name, owner/contact name, category, city, address and phone are required.");
      return;
    }
    setBusyId(editing.id); setError("");
    try {
      await updateBusiness(editing.id, {
        ...editForm,
        businessName: editForm.businessName.trim(), ownerName: editForm.ownerName.trim(), city: editForm.city.trim(), address: editForm.address.trim(), phone: editForm.phone.trim(),
        whatsapp: editForm.whatsapp.trim(), email: editForm.email.trim(), website: editForm.website.trim(), socialLinks: editForm.socialLinks.trim(), description: editForm.description.trim(),
        productsServices: editForm.productsServices.trim(), discountOffer: editForm.discountOffer.trim(),
        paymentSenderName: editForm.paymentSenderName.trim() || undefined, paymentMethod: editForm.paymentMethod || undefined, paymentReference: editForm.paymentReference.trim() || undefined,
      });
      setEditing(null); setEditForm(null); setSelected(null);
      await load();
      flash("Business profile updated. The change has been written to the immutable audit history.");
    } catch (e: any) { setError(apiErrorText(e, "Could not update business profile.")); }
    finally { setBusyId(null); }
  };

  const approve = async (b: Business) => {
    if (!b.paymentProofUrl) {
      setError("Upload a payment slip/receipt first. Approved listings must remain linked to Accounts/Finance Verification.");
      openEdit(b);
      return;
    }
    if (!window.confirm(`Approve ${b.businessName} for the public directory? Accounts/Finance will still perform final payment verification.`)) return;
    setBusyId(b.id); setError("");
    try {
      await updateBusinessStatus(b.id, "approved", "received", "Business profile and payment proof reviewed by directory admin. Final Accounts/Finance verification remains pending.");
      setSelected(null); await load();
      flash("Listing approved. Payment remains in Finance Verification until Accounts approves it.");
    } catch (e: any) { setError(apiErrorText(e, "Could not approve the business listing.")); }
    finally { setBusyId(null); }
  };

  const reject = async () => {
    if (!rejecting) return;
    if (rejectReason.trim().length < 3) { setError("Please enter a short reason for rejecting the listing."); return; }
    setBusyId(rejecting.id); setError("");
    try {
      await updateBusinessStatus(rejecting.id, "rejected", undefined, rejectReason.trim());
      setRejecting(null); setRejectReason(""); setSelected(null); await load();
      flash("Business listing rejected. Payment proof remains with Accounts/Finance for the proper financial decision.");
    } catch (e: any) { setError(apiErrorText(e, "Could not reject the business listing.")); }
    finally { setBusyId(null); }
  };

  const remove = async (b: Business) => {
    if (!window.confirm(`Permanently delete ${b.businessName}? Finance-approved payment records cannot be deleted.`)) return;
    setBusyId(b.id); setError("");
    try {
      await deleteBusiness(b.id);
      setSelected(null); await load();
      flash("Business deleted. Its audit history remains preserved.");
    } catch (e: any) { setError(apiErrorText(e, "Could not delete business.")); }
    finally { setBusyId(null); }
  };

  const openAudit = async (b: Business) => {
    setAuditFor(b); setAuditRows([]); setAuditLoading(true); setError("");
    try { setAuditRows(await fetchBusinessAudit(b.id)); }
    catch (e: any) { setError(apiErrorText(e, "Could not load business audit history.")); }
    finally { setAuditLoading(false); }
  };

  const counts = {
    all: businesses.length,
    pending: businesses.filter((x) => x.status === "pending").length,
    approved: businesses.filter((x) => x.status === "approved").length,
    rejected: businesses.filter((x) => x.status === "rejected").length,
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, padding: "28px 22px 70px", fontFamily: "Lato, sans-serif" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
          <div>
            <div style={{ color: GOLD, fontWeight: 800, fontSize: 12, textTransform: "uppercase", letterSpacing: ".08em" }}>Admin Control Center</div>
            <h1 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", margin: "5px 0 5px", fontSize: 30 }}>Business Directory</h1>
            <p style={{ color: "#666", margin: 0, maxWidth: 780, lineHeight: 1.6 }}>Review profiles, edit listing data, inspect payment proof and track every business change through an immutable audit history. Accounts/Finance remains responsible for final payment verification and ledger posting.</p>
          </div>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            <Link to="/admin" style={secondaryBtn}>← Admin Dashboard</Link>
            <Link to="/admin/finance" style={secondaryBtn}>Finance Verification</Link>
            <Link to="/admin/businesses/add" style={primaryBtn}>+ Add Business Manually</Link>
          </div>
        </div>

        {error && <div style={errorBox}>{error}</div>}
        {success && <div style={successBox}>{success}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 18 }}>
          {(["all", "pending", "approved", "rejected"] as const).map((s) => <button key={s} onClick={() => setStatusFilter(s)} style={{ background: statusFilter === s ? GREEN : "white", color: statusFilter === s ? "white" : GREEN, border: `1px solid ${statusFilter === s ? GREEN : "#e5e1d8"}`, borderRadius: 12, padding: 15, cursor: "pointer", textAlign: "left", boxShadow: "0 2px 10px rgba(0,0,0,.04)" }}><div style={{ fontSize: 12, textTransform: "capitalize", opacity: .8 }}>{s === "all" ? "All Businesses" : s}</div><strong style={{ fontSize: 25 }}>{counts[s]}</strong></button>)}
        </div>

        <div style={{ background: "white", borderRadius: 14, boxShadow: "0 3px 16px rgba(0,0,0,.05)", overflow: "hidden" }}>
          <div style={{ padding: 16, borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: "1 1 300px", maxWidth: 540 }}><Search size={16} color="#888" style={{ position: "absolute", left: 12, top: 11 }}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search business, owner, category, city, phone..." style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 38px", border: "1px solid #ddd", borderRadius: 9, fontSize: 13 }}/></div>
            <button onClick={() => void load()} style={secondaryButton}>Refresh</button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1050 }}>
              <thead><tr style={{ background: "#faf8f3" }}>{["Business", "Owner / Contact", "Location", "Package", "Listing", "Payment", "Actions"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map((b) => {
                  const sc = businessStatusColors[b.status];
                  const pc = paymentStatusColors[b.paymentStatus] || paymentStatusColors.pending;
                  return <tr key={b.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td style={td}><div style={{ display: "flex", alignItems: "center", gap: 10 }}>{b.logoUrl ? <img src={b.logoUrl} alt="" style={{ width: 38, height: 38, objectFit: "contain", borderRadius: 7, border: "1px solid #eee" }}/> : <span style={logoPlaceholder}><Briefcase size={17}/></span>}<div><strong style={{ color: GREEN }}>{b.businessName}</strong><small style={small}>{b.category}</small></div></div></td>
                    <td style={td}>{b.ownerName}<small style={small}>{b.phone}</small></td>
                    <td style={td}>{b.city}</td>
                    <td style={td}>{sponsorshipPackages[b.sponsorshipPackage]?.name || b.sponsorshipPackage}</td>
                    <td style={td}><span style={pill(sc.bg, sc.text)}>{sc.label}</span></td>
                    <td style={td}><span style={pill(pc.bg, pc.text)}>{pc.label}</span></td>
                    <td style={td}><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><button style={miniButton} onClick={() => setSelected(b)}><Eye size={12}/>View</button><button style={miniButton} onClick={() => openEdit(b)}><Edit2 size={12}/>Edit</button><button style={miniButton} onClick={() => void openAudit(b)}><History size={12}/>Audit</button>{b.status === "pending" && <><button disabled={busyId === b.id} style={{ ...miniButton, color: "#15803d" }} onClick={() => void approve(b)}><UserCheck size={12}/>Approve</button><button disabled={busyId === b.id} style={{ ...miniButton, color: "#b91c1c" }} onClick={() => { setRejecting(b); setRejectReason(""); }}><UserX size={12}/>Reject</button></>}</div></td>
                  </tr>;
                })}
                {!loading && !filtered.length && <tr><td colSpan={7} style={{ padding: 34, textAlign: "center", color: "#888" }}>No businesses in this view.</td></tr>}
              </tbody>
            </table>
            {loading && <div style={{ padding: 34, textAlign: "center", color: "#777" }}>Loading business records...</div>}
          </div>
        </div>
      </div>

      {selected && <Modal title={selected.businessName} onClose={() => setSelected(null)}>
        <div style={{ display: "grid", gap: 15 }}>
          <div style={summaryGrid}><Info title="Owner / Contact" value={selected.ownerName}/><Info title="Category" value={selected.category}/><Info title="City" value={selected.city}/><Info title="Phone" value={selected.phone}/><Info title="Email" value={selected.email || "-"}/><Info title="Website" value={selected.website || "-"}/><Info title="Package" value={sponsorshipPackages[selected.sponsorshipPackage]?.name || selected.sponsorshipPackage}/><Info title="Created" value={fmtDate(selected.createdAt)}/></div>
          <Info title="Address" value={selected.address}/><Info title="Description" value={selected.description || "-"}/>{selected.productsServices && <Info title="Products / Services" value={selected.productsServices}/>} {selected.discountOffer && <Info title="Member Offer" value={selected.discountOffer}/>} 
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{selected.paymentProofUrl && <a href={selected.paymentProofUrl} target="_blank" rel="noreferrer" style={proofLink}><FileText size={13}/>Payment Proof</a>}<button style={secondaryButton} onClick={() => { setSelected(null); openEdit(selected); }}><Edit2 size={13}/>Edit</button><button style={secondaryButton} onClick={() => void openAudit(selected)}><History size={13}/>Audit History</button>{selected.status === "pending" && <button style={primaryBtn as React.CSSProperties} onClick={() => void approve(selected)}><UserCheck size={13}/>Approve Listing</button>}<button style={{ ...secondaryButton, color: "#9b2c2c", borderColor: "#e7b8b8" }} onClick={() => void remove(selected)}><Trash2 size={13}/>Delete</button></div>
        </div>
      </Modal>}

      {editing && editForm && <Modal title={`Edit: ${editing.businessName}`} onClose={() => { setEditing(null); setEditForm(null); }} wide>
        <div className="edit-grid" style={editGrid}>
          <Field title="Business Name *"><input style={field} value={editForm.businessName} onChange={(e) => setEdit("businessName", e.target.value)}/></Field>
          <Field title="Owner / Contact *"><input style={field} value={editForm.ownerName} onChange={(e) => setEdit("ownerName", e.target.value)}/></Field>
          <Field title="Category *"><select style={field} value={editForm.category} onChange={(e) => setEdit("category", e.target.value)}><option value="">Select category</option>{businessCategories.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field title="City *"><input style={field} value={editForm.city} onChange={(e) => setEdit("city", e.target.value)}/></Field>
          <Field title="Phone *"><input style={field} value={editForm.phone} onChange={(e) => setEdit("phone", e.target.value)}/></Field>
          <Field title="Email"><input type="email" style={field} value={editForm.email} onChange={(e) => setEdit("email", e.target.value)}/></Field>
          <div style={{ gridColumn: "span 2" }}><Field title="Address *"><input style={field} value={editForm.address} onChange={(e) => setEdit("address", e.target.value)}/></Field></div>
          <div style={{ gridColumn: "span 2" }}><Field title="Description"><textarea rows={3} style={{ ...field, resize: "vertical" }} value={editForm.description} onChange={(e) => setEdit("description", e.target.value)}/></Field></div>
          <Field title="Listing Package"><select style={field} value={editForm.sponsorshipPackage} onChange={(e) => setEdit("sponsorshipPackage", e.target.value)}>{Object.entries(sponsorshipPackages).map(([key, p]) => <option key={key} value={key}>{p.name} - {p.price}</option>)}</select></Field>
          <UploadEdit title="Payment Slip / Receipt" value={editForm.paymentProofUrl} loading={uploading} accept="image/*,.pdf,application/pdf" onChange={uploadEdit("paymentProofUrl")}/>
        </div>
        <details style={detailsBox}><summary style={summaryStyle}>More profile details</summary><div className="edit-grid" style={editGrid}><Field title="WhatsApp"><input style={field} value={editForm.whatsapp} onChange={(e) => setEdit("whatsapp", e.target.value)}/></Field><Field title="Website"><input style={field} value={editForm.website} onChange={(e) => setEdit("website", e.target.value)}/></Field><div style={{ gridColumn: "span 2" }}><Field title="Products / Services"><textarea rows={2} style={field} value={editForm.productsServices} onChange={(e) => setEdit("productsServices", e.target.value)}/></Field></div><div style={{ gridColumn: "span 2" }}><Field title="Member Offer"><input style={field} value={editForm.discountOffer} onChange={(e) => setEdit("discountOffer", e.target.value)}/></Field></div><div style={{ gridColumn: "span 2" }}><Field title="Social Links"><input style={field} value={editForm.socialLinks} onChange={(e) => setEdit("socialLinks", e.target.value)}/></Field></div><UploadEdit title="Business Logo" value={editForm.logoUrl} loading={uploading} accept="image/*" onChange={uploadEdit("logoUrl")} image/></div><MultiImageUpload label="Business Photos / Supporting Documents" images={editForm.additionalPhotos} onChange={(images) => setEdit("additionalPhotos", images)}/></details>
        <details style={{ ...detailsBox, marginTop: 10 }}><summary style={summaryStyle}>Accounts reconciliation details (optional)</summary><div className="edit-grid" style={editGrid}><Field title="Payment Method"><select style={field} value={editForm.paymentMethod} onChange={(e) => setEdit("paymentMethod", e.target.value)}><option value="">Not specified</option><option>Bank Transfer</option><option>JazzCash</option><option>Easypaisa</option><option>Cheque</option><option>Cash</option><option>Other</option></select></Field><Field title="Sender / Account Name"><input style={field} value={editForm.paymentSenderName} onChange={(e) => setEdit("paymentSenderName", e.target.value)}/></Field><Field title="Reference ID"><input style={field} value={editForm.paymentReference} onChange={(e) => setEdit("paymentReference", e.target.value)}/></Field></div></details>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}><button style={secondaryButton} onClick={() => { setEditing(null); setEditForm(null); }}>Cancel</button><button disabled={busyId === editing.id || uploading} style={primaryButton} onClick={() => void saveEdit()}>{busyId === editing.id ? "Saving..." : "Save Changes"}</button></div>
      </Modal>}

      {auditFor && <Modal title={`Audit History: ${auditFor.businessName}`} onClose={() => { setAuditFor(null); setAuditRows([]); }} wide>
        <div style={{ background: "#f0f7f3", color: "#526159", borderRadius: 9, padding: 11, fontSize: 11, lineHeight: 1.6, marginBottom: 14 }}>This history is append-only. It records database snapshots plus application actions, the admin role where available, time and a masked source IP. It is retained even if a non-finance-approved business record is later deleted.</div>
        {auditLoading ? <div style={{ padding: 28, textAlign: "center", color: "#777" }}>Loading audit history...</div> : auditRows.length ? <div style={{ display: "grid", gap: 9 }}>{auditRows.map((row) => { const changes = changedKeys(row); return <div key={row.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><strong style={{ color: GREEN, textTransform: "capitalize" }}>{row.action.replace(/_/g, " ")}</strong><div style={{ color: "#777", fontSize: 11, marginTop: 3 }}>{row.actorName || "System"} · {(row.actorRole || "system").replace(/_/g, " ")}</div></div><div style={{ textAlign: "right", color: "#777", fontSize: 11 }}><div><Clock3 size={11} style={{ verticalAlign: "-2px" }}/> {fmtDate(row.createdAt)}</div><div>Source IP: {safeIp(row.ipAddress)}</div></div></div>{changes.length > 0 && <div style={{ marginTop: 8, fontSize: 11, color: "#555" }}><strong>Changed:</strong> {changes.join(", ")}</div>}</div>; })}</div> : <div style={{ padding: 28, textAlign: "center", color: "#888" }}>No audit history found.</div>}
      </Modal>}

      {rejecting && <Modal title={`Reject: ${rejecting.businessName}`} onClose={() => setRejecting(null)}><Field title="Reason for rejection"><textarea rows={4} style={{ ...field, resize: "vertical" }} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Short reason for the applicant and internal record"/></Field><div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 15 }}><button style={secondaryButton} onClick={() => setRejecting(null)}>Cancel</button><button style={{ ...primaryButton, background: "#b91c1c" }} onClick={() => void reject()}>Reject Listing</button></div></Modal>}

      <style>{`@media(max-width:720px){.edit-grid{grid-template-columns:1fr!important}.edit-grid>[style*="span 2"]{grid-column:span 1!important}input,select,textarea{font-size:16px!important}}`}</style>
    </div>
  );
}

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) { return <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.55)", display: "grid", placeItems: "center", padding: 16 }}><div style={{ width: wide ? "min(900px,96vw)" : "min(680px,96vw)", maxHeight: "90vh", overflowY: "auto", background: "white", borderRadius: 14, boxShadow: "0 24px 70px rgba(0,0,0,.25)" }}><div style={{ padding: "15px 18px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", position: "sticky", top: 0, background: "white", zIndex: 2 }}><h3 style={{ margin: 0, color: GREEN, fontFamily: "'Playfair Display', serif" }}>{title}</h3><button onClick={onClose} style={{ border: 0, background: "transparent", cursor: "pointer", color: "#777" }}><X size={20}/></button></div><div style={{ padding: 18 }}>{children}</div></div></div>; }
function Field({ title, children }: { title: string; children: React.ReactNode }) { return <div><label style={label}>{title}</label>{children}</div>; }
function Info({ title, value }: { title: string; value: string }) { return <div><div style={{ color: "#888", fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>{title}</div><div style={{ color: "#333", fontSize: 13, marginTop: 3, whiteSpace: "pre-wrap" }}>{value}</div></div>; }
function UploadEdit({ title, value, loading, accept, onChange, image = false }: { title: string; value: string; loading: boolean; accept: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; image?: boolean }) { return <div><label style={label}>{title}</label><label style={{ minHeight: 92, border: `2px dashed ${value ? GOLD : "#ccd8cf"}`, borderRadius: 9, display: "grid", placeItems: "center", cursor: "pointer", padding: 8, textAlign: "center", background: value ? "#fff9ef" : "#fafbf9" }}>{loading ? "Uploading..." : value ? (image ? <img src={value} alt="" style={{ maxHeight: 75, maxWidth: "100%", objectFit: "contain" }}/> : <div style={{ color: GREEN, fontWeight: 800 }}><FileCheck2 size={18}/><div>Proof uploaded</div><small style={{ color: "#777", fontWeight: 400 }}>Click to replace</small></div>) : <div><Upload size={18} color="#999"/><div style={{ color: "#888", fontSize: 11 }}>Click to upload</div></div>}<input type="file" accept={accept} style={{ display: "none" }} onChange={onChange}/></label></div>; }
const th: React.CSSProperties = { padding: "11px 10px", textAlign: "left", color: "#777", fontSize: 10, textTransform: "uppercase" };
const td: React.CSSProperties = { padding: "12px 10px", color: "#444", fontSize: 12, verticalAlign: "middle" };
const small: React.CSSProperties = { display: "block", color: "#888", fontSize: 10, marginTop: 3 };
const pill = (bg: string, color: string): React.CSSProperties => ({ display: "inline-block", background: bg, color, borderRadius: 20, padding: "5px 8px", fontSize: 10, fontWeight: 800, whiteSpace: "nowrap" });
const logoPlaceholder: React.CSSProperties = { width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: 7, background: "#f3f5f4", color: GREEN };
const miniButton: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, border: "1px solid #d9dfdb", background: "white", color: GREEN, borderRadius: 7, padding: "6px 8px", fontSize: 10, fontWeight: 800, cursor: "pointer" };
const primaryButton: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, background: GREEN, color: "white", border: 0, borderRadius: 8, padding: "9px 13px", fontSize: 11, fontWeight: 800, cursor: "pointer" };
const secondaryButton: React.CSSProperties = { ...primaryButton, background: "white", color: GREEN, border: "1px solid #d5ded8" };
const primaryBtn: React.CSSProperties = { ...primaryButton, textDecoration: "none" };
const secondaryBtn: React.CSSProperties = { ...secondaryButton, textDecoration: "none" };
const proofLink: React.CSSProperties = { ...secondaryButton, textDecoration: "none" };
const editGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12, marginBottom: 14 };
const summaryGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, background: "#faf8f3", borderRadius: 10, padding: 13 };
const detailsBox: React.CSSProperties = { border: `1px solid ${BORDER}`, borderRadius: 10, padding: "0 12px", marginTop: 10 };
const summaryStyle: React.CSSProperties = { padding: "11px 0", cursor: "pointer", color: GREEN, fontSize: 12, fontWeight: 800 };
const errorBox: React.CSSProperties = { background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca", padding: "12px 14px", borderRadius: 10, marginBottom: 16, fontWeight: 700, lineHeight: 1.6 };
const successBox: React.CSSProperties = { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0", padding: "12px 14px", borderRadius: 10, marginBottom: 16, fontWeight: 700, lineHeight: 1.6 };
