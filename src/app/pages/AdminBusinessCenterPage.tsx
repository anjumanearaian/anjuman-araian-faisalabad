import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router";
import { Briefcase, Edit2, Eye, FileText, Search, Upload, UserCheck, UserX, X } from "lucide-react";
import { useAdmin } from "../context/AdminContext";
import {
  Business,
  BusinessStatus,
  businessCategories,
  businessStatusColors,
  deleteBusiness,
  fetchAllBusinesses,
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

function isPdf(url?: string | null) {
  return /\.pdf(?:$|\?)/i.test(String(url || ""));
}

function apiErrorText(error: any, fallback: string) {
  const details = error?.details && typeof error.details === "object"
    ? Object.entries(error.details).flatMap(([name, messages]: any) => (messages || []).map((message: string) => `${name}: ${message}`)).join(" · ")
    : "";
  return details || error?.message || fallback;
}

type EditForm = {
  businessName: string;
  ownerName: string;
  category: string;
  city: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  socialLinks: string;
  description: string;
  productsServices: string;
  discountOffer: string;
  sponsorshipPackage: Business["sponsorshipPackage"];
  logoUrl: string;
  paymentProofUrl: string;
  additionalPhotos: string[];
  paymentSenderName: string;
  paymentMethod: string;
  paymentReference: string;
};

function editFormFromBusiness(b: Business): EditForm {
  return {
    businessName: b.businessName || "",
    ownerName: b.ownerName || "",
    category: b.category || businessCategories[0],
    city: b.city || "",
    address: b.address || "",
    phone: b.phone || "",
    whatsapp: b.whatsapp || "",
    email: b.email || "",
    website: b.website || "",
    socialLinks: b.socialLinks || "",
    description: b.description || "",
    productsServices: b.productsServices || "",
    discountOffer: b.discountOffer || "",
    sponsorshipPackage: b.sponsorshipPackage || "basic",
    logoUrl: b.logoUrl || "",
    paymentProofUrl: b.paymentProofUrl || "",
    additionalPhotos: b.additionalPhotos || [],
    paymentSenderName: "",
    paymentMethod: "",
    paymentReference: "",
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

  const flash = (text: string) => {
    setSuccess(text);
    window.setTimeout(() => setSuccess(""), 4000);
  };

  const load = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetchAllBusinesses(1, 100, true);
      const rows = res.data || [];
      setBusinesses(rows);
      if (selected) setSelected(rows.find((x) => x.id === selected.id) || null);
      if (editing) {
        const fresh = rows.find((x) => x.id === editing.id) || null;
        setEditing(fresh);
      }
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
      return [b.businessName, b.ownerName, b.category, b.city, b.phone, b.email, b.website]
        .some((v) => String(v || "").toLowerCase().includes(q));
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
      const url = await uploadFile(file, key === "logoUrl" ? "business-logo" : "business-payment-proof");
      setEdit(key, url);
    } catch (e: any) {
      setError(apiErrorText(e, "Upload failed."));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const saveEdit = async () => {
    if (!editing || !editForm) return;
    if (!editForm.businessName.trim() || !editForm.ownerName.trim() || !editForm.city.trim() || !editForm.address.trim() || !editForm.phone.trim()) {
      setError("Business name, owner/contact name, city, address and phone are required.");
      return;
    }
    setBusyId(editing.id); setError("");
    try {
      await updateBusiness(editing.id, {
        businessName: editForm.businessName.trim(),
        ownerName: editForm.ownerName.trim(),
        category: editForm.category,
        city: editForm.city.trim(),
        address: editForm.address.trim(),
        phone: editForm.phone.trim(),
        whatsapp: editForm.whatsapp.trim(),
        email: editForm.email.trim(),
        website: editForm.website.trim(),
        socialLinks: editForm.socialLinks.trim(),
        description: editForm.description.trim(),
        productsServices: editForm.productsServices.trim(),
        discountOffer: editForm.discountOffer.trim(),
        sponsorshipPackage: editForm.sponsorshipPackage,
        logoUrl: editForm.logoUrl,
        paymentProofUrl: editForm.paymentProofUrl,
        additionalPhotos: editForm.additionalPhotos,
        paymentSenderName: editForm.paymentSenderName.trim() || undefined,
        paymentMethod: editForm.paymentMethod || undefined,
        paymentReference: editForm.paymentReference.trim() || undefined,
      });
      setEditing(null); setEditForm(null); setSelected(null);
      await load();
      flash("Business profile updated. Any pending payment proof remains linked to Accounts/Finance Verification.");
    } catch (e: any) {
      setError(apiErrorText(e, "Could not update business profile."));
    } finally { setBusyId(null); }
  };

  const confirmSlipAndApprove = async (b: Business) => {
    if (!b.paymentProofUrl) {
      setError("Upload a payment slip/receipt first. Approved listings must remain linked to the Accounts/Finance Verification queue.");
      openEdit(b);
      return;
    }
    if (!window.confirm(`Approve ${b.businessName} for the public directory after reviewing its payment proof? The payment will remain awaiting final Finance verification.`)) return;
    setBusyId(b.id); setError("");
    try {
      await updateBusinessStatus(b.id, "approved", "received", "Business profile and payment proof reviewed by directory admin. Final Accounts/Finance verification remains pending.");
      setSelected(null);
      await load();
      flash("Listing approved. Payment is marked Received / Admin Checked and remains in Finance Verification until Accounts approves it.");
    } catch (e: any) {
      setError(apiErrorText(e, "Could not approve the business listing."));
    } finally { setBusyId(null); }
  };

  const reject = async () => {
    if (!rejecting) return;
    if (rejectReason.trim().length < 3) {
      setError("Please enter a short reason for rejecting the listing.");
      return;
    }
    setBusyId(rejecting.id); setError("");
    try {
      // Listing rejection is separate from payment rejection. Accounts/Finance
      // keeps the payment proof in its queue and decides payment outcome.
      await updateBusinessStatus(rejecting.id, "rejected", undefined, rejectReason.trim());
      setRejecting(null); setRejectReason(""); setSelected(null);
      await load();
      flash("Business listing rejected. Its payment proof, if any, remains available to Accounts/Finance for the proper financial decision.");
    } catch (e: any) {
      setError(apiErrorText(e, "Could not reject the business listing."));
    } finally { setBusyId(null); }
  };

  const remove = async (b: Business) => {
    if (!window.confirm(`Permanently delete ${b.businessName}? Finance-approved payment records cannot be deleted.`)) return;
    setBusyId(b.id); setError("");
    try {
      await deleteBusiness(b.id);
      setSelected(null);
      await load();
      flash("Business deleted. Any unapproved payment-queue item was removed with it.");
    } catch (e: any) {
      setError(apiErrorText(e, "Could not delete business."));
    } finally { setBusyId(null); }
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
            <p style={{ color: "#666", margin: 0, maxWidth: 760, lineHeight: 1.6 }}>Review customer submissions, edit business profiles, inspect payment proofs and approve public listings. Payment proofs are handed to Accounts/Finance Verification automatically; only Finance can finally verify and post them to the ledger.</p>
          </div>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            <Link to="/admin" style={secondaryBtn}>← Admin Dashboard</Link>
            <Link to="/admin/finance" style={secondaryBtn}>Finance Verification</Link>
            <Link to="/admin/businesses/add" style={primaryBtn}>+ Add Business Manually</Link>
          </div>
        </div>

        {error && <div style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca", padding: "12px 14px", borderRadius: 10, marginBottom: 16, fontWeight: 700, lineHeight: 1.6 }}>{error}</div>}
        {success && <div style={{ background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0", padding: "12px 14px", borderRadius: 10, marginBottom: 16, fontWeight: 700, lineHeight: 1.6 }}>{success}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 18 }}>
          {(["all", "pending", "approved", "rejected"] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{ background: statusFilter === s ? GREEN : "white", color: statusFilter === s ? "white" : GREEN, border: `1px solid ${statusFilter === s ? GREEN : "#e5e1d8"}`, borderRadius: 12, padding: 15, cursor: "pointer", textAlign: "left", boxShadow: "0 2px 10px rgba(0,0,0,.04)" }}>
              <div style={{ fontSize: 12, textTransform: "capitalize", opacity: .8 }}>{s === "all" ? "All Businesses" : s}</div>
              <strong style={{ fontSize: 25 }}>{counts[s]}</strong>
            </button>
          ))}
        </div>

        <div style={{ background: "white", borderRadius: 14, boxShadow: "0 3px 16px rgba(0,0,0,.05)", overflow: "hidden" }}>
          <div style={{ padding: 16, borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: "1 1 300px", maxWidth: 520 }}>
              <Search size={16} color="#888" style={{ position: "absolute", left: 12, top: 11 }} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search business, owner, category, city, phone..." style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 38px", border: "1px solid #ddd", borderRadius: 9, fontSize: 13 }} />
            </div>
            <button onClick={() => void load()} style={secondaryButton}>Refresh</button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1080 }}>
              <thead><tr style={{ background: "#faf8f3" }}>{["Business", "Owner / Contact", "Location", "Package", "Listing", "Payment", "Actions"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map((b, i) => {
                  const sc = businessStatusColors[b.status];
                  const pc = paymentStatusColors[b.paymentStatus] || paymentStatusColors.pending;
                  return <tr key={b.id} style={{ borderTop: "1px solid #eee", background: i % 2 ? "#fdfdfc" : "white" }}>
                    <td style={td}><div style={{ display: "flex", gap: 10, alignItems: "center" }}>{b.logoUrl ? <img src={b.logoUrl} alt="" style={{ width: 42, height: 42, borderRadius: 8, objectFit: "contain", border: "1px solid #eee" }} /> : <div style={{ width: 42, height: 42, borderRadius: 8, background: "#f0f7f3", display: "grid", placeItems: "center" }}><Briefcase size={18} color={GREEN}/></div>}<div><strong style={{ color: GREEN }}>{b.businessName}</strong><div style={{ color: "#888", fontSize: 11 }}>{b.category}</div></div></div></td>
                    <td style={td}><div>{b.ownerName}</div><div style={{ color: "#888", fontSize: 11 }}>{b.phone}</div></td>
                    <td style={td}>{b.city}</td>
                    <td style={td}><span style={{ border: `1px solid ${GOLD}`, color: "#8a6818", borderRadius: 20, padding: "3px 8px", fontSize: 11, fontWeight: 800 }}>{sponsorshipPackages[b.sponsorshipPackage]?.name || b.sponsorshipPackage}</span></td>
                    <td style={td}><span style={{ background: sc.bg, color: sc.text, borderRadius: 20, padding: "4px 9px", fontSize: 11, fontWeight: 800 }}>{sc.label}</span></td>
                    <td style={td}><span style={{ background: pc.bg, color: pc.text, borderRadius: 20, padding: "4px 9px", fontSize: 11, fontWeight: 800 }}>{pc.label}</span>{b.paymentStatus === "received" && <div style={{ color: "#64748b", fontSize: 10, marginTop: 4 }}>Awaiting Finance</div>}</td>
                    <td style={td}><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button onClick={() => setSelected(b)} style={smallBtn}><Eye size={13}/> View</button>
                      <button onClick={() => openEdit(b)} style={{ ...smallBtn, color: "#1d4ed8", borderColor: "#bfdbfe" }}><Edit2 size={13}/> Edit</button>
                      {b.status === "pending" && <>
                        <button disabled={busyId === b.id} onClick={() => void confirmSlipAndApprove(b)} style={{ ...smallBtn, color: "#166534", borderColor: "#bbf7d0" }}><UserCheck size={13}/> Approve</button>
                        <button disabled={busyId === b.id} onClick={() => { setRejecting(b); setRejectReason(""); }} style={{ ...smallBtn, color: "#991b1b", borderColor: "#fecaca" }}><UserX size={13}/> Reject</button>
                      </>}
                    </div></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
          {!loading && filtered.length === 0 && <div style={{ padding: 48, textAlign: "center", color: "#999" }}>No businesses found in this view.</div>}
          {loading && <div style={{ padding: 48, textAlign: "center", color: "#777" }}>Loading business submissions...</div>}
        </div>
      </div>

      {selected && <div style={overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}><div style={modal}>
        <div style={modalHead}><div><h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 22 }}>{selected.businessName}</h2><div style={{ opacity: .75, fontSize: 12 }}>{selected.category} · {selected.city}</div></div><button onClick={() => setSelected(null)} style={closeBtn}><X size={20}/></button></div>
        <div style={{ padding: 22 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginBottom: 20 }}>
            <Info label="Owner / Member" value={selected.ownerName}/><Info label="Phone" value={selected.phone}/><Info label="WhatsApp" value={selected.whatsapp || "—"}/><Info label="Email" value={selected.email || "—"}/><Info label="Website" value={selected.website || "—"}/><Info label="Address" value={selected.address || "—"}/><Info label="Package" value={sponsorshipPackages[selected.sponsorshipPackage]?.name || selected.sponsorshipPackage}/><Info label="Listing Status" value={businessStatusColors[selected.status].label}/>
          </div>
          <InfoBlock label="Business Description" value={selected.description || "—"}/><InfoBlock label="Products / Services" value={selected.productsServices || "—"}/><InfoBlock label="Member Discount / Offer" value={selected.discountOffer || "—"}/>

          <div style={{ marginTop: 20, padding: 16, background: "#fffaf0", border: "1px solid #ead7a6", borderRadius: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><div><strong style={{ color: GREEN }}>Payment & Accounts Linkage</strong><div style={{ color: "#777", fontSize: 12, marginTop: 3 }}>Directory admin can review the proof. Final payment verification and ledger posting are performed by Accounts/Finance.</div></div><span style={{ background: (paymentStatusColors[selected.paymentStatus] || paymentStatusColors.pending).bg, color: (paymentStatusColors[selected.paymentStatus] || paymentStatusColors.pending).text, borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 800 }}>{(paymentStatusColors[selected.paymentStatus] || paymentStatusColors.pending).label}</span></div>
            {selected.paymentProofUrl ? <div style={{ marginTop: 14 }}>{isPdf(selected.paymentProofUrl) ? <a href={selected.paymentProofUrl} target="_blank" rel="noreferrer" style={proofLink}><FileText size={18}/> Open Payment Slip PDF</a> : <a href={selected.paymentProofUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block" }}><img src={selected.paymentProofUrl} alt="Payment slip" style={{ maxWidth: "100%", maxHeight: 320, objectFit: "contain", borderRadius: 8, border: "1px solid #ddd", background: "white" }}/></a>}</div> : <div style={{ marginTop: 12, color: "#991b1b", fontSize: 12, fontWeight: 700 }}>No payment proof attached. Use Edit to upload one before approval.</div>}
            <div style={{ marginTop: 14, color: "#555", fontSize: 12, lineHeight: 1.6 }}>{selected.paymentStatus === "verified" ? "Accounts/Finance has verified this payment." : selected.paymentStatus === "received" ? "Directory/admin review is complete. This payment is still waiting for Accounts/Finance verification." : "This payment has not yet been finally verified by Accounts/Finance."}</div>
          </div>

          {selected.adminNote && <InfoBlock label="Admin Note" value={selected.adminNote}/>} 
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 20 }}>
            <button onClick={() => { const b = selected; setSelected(null); openEdit(b); }} style={secondaryButton}><Edit2 size={14}/> Edit Profile</button>
            {selected.status === "pending" && <button disabled={busyId === selected.id} onClick={() => void confirmSlipAndApprove(selected)} style={primaryButton}><UserCheck size={14}/> Review Proof & Approve Listing</button>}
            {selected.status === "pending" && <button onClick={() => { setRejecting(selected); setRejectReason(""); }} style={dangerButton}><UserX size={14}/> Reject Listing</button>}
            <Link to="/admin/finance" style={{ ...secondaryBtn, display: "inline-flex", alignItems: "center" }}>Open Finance Verification</Link>
            <button onClick={() => void remove(selected)} style={{ ...dangerButton, marginLeft: "auto" }}>Delete</button>
          </div>
        </div>
      </div></div>}

      {editing && editForm && <div style={overlay} onMouseDown={(e) => { if (e.target === e.currentTarget && !uploading) { setEditing(null); setEditForm(null); } }}><div style={{ ...modal, maxWidth: 900 }}>
        <div style={modalHead}><div><h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 22 }}>Edit Business Profile</h2><div style={{ opacity: .75, fontSize: 12 }}>{editing.businessName}</div></div><button disabled={uploading} onClick={() => { setEditing(null); setEditForm(null); }} style={closeBtn}><X size={20}/></button></div>
        <div style={{ padding: 22 }}>
          <div className="business-edit-grid" style={editGrid}>
            <Field title="Business Name *"><input style={field} value={editForm.businessName} onChange={e=>setEdit("businessName",e.target.value)}/></Field>
            <Field title="Owner / Contact Name *"><input style={field} value={editForm.ownerName} onChange={e=>setEdit("ownerName",e.target.value)}/></Field>
            <Field title="Category"><select style={field} value={editForm.category} onChange={e=>setEdit("category",e.target.value)}>{businessCategories.map(x=><option key={x}>{x}</option>)}</select></Field>
            <Field title="City *"><input style={field} value={editForm.city} onChange={e=>setEdit("city",e.target.value)}/></Field>
            <Field title="Phone *"><input style={field} value={editForm.phone} onChange={e=>setEdit("phone",e.target.value)}/></Field>
            <Field title="WhatsApp"><input style={field} value={editForm.whatsapp} onChange={e=>setEdit("whatsapp",e.target.value)}/></Field>
            <Field title="Email"><input type="email" style={field} value={editForm.email} onChange={e=>setEdit("email",e.target.value)}/></Field>
            <Field title="Website"><input style={field} value={editForm.website} onChange={e=>setEdit("website",e.target.value)}/></Field>
            <div style={{ gridColumn: "span 2" }}><Field title="Address *"><input style={field} value={editForm.address} onChange={e=>setEdit("address",e.target.value)}/></Field></div>
            <div style={{ gridColumn: "span 2" }}><Field title="Description"><textarea rows={4} style={{ ...field, resize: "vertical" }} value={editForm.description} onChange={e=>setEdit("description",e.target.value)}/></Field></div>
            <div style={{ gridColumn: "span 2" }}><Field title="Products / Services"><textarea rows={3} style={{ ...field, resize: "vertical" }} value={editForm.productsServices} onChange={e=>setEdit("productsServices",e.target.value)}/></Field></div>
            <div style={{ gridColumn: "span 2" }}><Field title="Member Discount / Offer"><input style={field} value={editForm.discountOffer} onChange={e=>setEdit("discountOffer",e.target.value)}/></Field></div>
            <Field title="Listing Package"><select style={field} value={editForm.sponsorshipPackage} onChange={e=>setEdit("sponsorshipPackage",e.target.value)}>{Object.entries(sponsorshipPackages).map(([key,p])=><option key={key} value={key}>{p.name} - {p.price}</option>)}</select></Field>
            <Field title="Social Links"><input style={field} value={editForm.socialLinks} onChange={e=>setEdit("socialLinks",e.target.value)}/></Field>
          </div>

          <h3 style={sectionTitle}>Logo, Payment Proof & Accounts Handoff</h3>
          <div className="business-edit-grid" style={editGrid}>
            <UploadBox title="Business Logo" value={editForm.logoUrl} loading={uploading} accept="image/*" onChange={uploadEdit("logoUrl")}/>
            <UploadBox title="Payment Slip / Receipt" value={editForm.paymentProofUrl} loading={uploading} accept="image/*,.pdf,application/pdf" onChange={uploadEdit("paymentProofUrl")}/>
            <Field title="Sender / Account Name (optional)"><input style={field} value={editForm.paymentSenderName} onChange={e=>setEdit("paymentSenderName",e.target.value)}/></Field>
            <Field title="Payment Method (optional)"><select style={field} value={editForm.paymentMethod} onChange={e=>setEdit("paymentMethod",e.target.value)}><option value="">Keep existing / not specified</option><option>Bank Transfer</option><option>JazzCash</option><option>Easypaisa</option><option>Cheque</option><option>Cash</option><option>Other</option></select></Field>
            <div style={{ gridColumn: "span 2" }}><Field title="Transaction / Reference ID (optional)"><input style={field} value={editForm.paymentReference} onChange={e=>setEdit("paymentReference",e.target.value)} placeholder="Not required"/></Field></div>
          </div>
          <p style={{ color: "#666", fontSize: 12, lineHeight: 1.7, background: "#f0f7f3", padding: 11, borderRadius: 8 }}>If a new payment proof is added to a business that does not yet have one, the backend automatically creates or refreshes its pending Accounts/Finance Verification item. A Finance-approved proof is locked and cannot be replaced from this screen.</p>
          <MultiImageUpload label="Business Photos / Supporting Documents" images={editForm.additionalPhotos} onChange={images=>setEdit("additionalPhotos",images)}/>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap", marginTop: 22 }}>
            <button disabled={busyId === editing.id || uploading} onClick={() => { setEditing(null); setEditForm(null); }} style={secondaryButton}>Cancel</button>
            <button disabled={busyId === editing.id || uploading} onClick={() => void saveEdit()} style={{ ...primaryButton, opacity: busyId === editing.id || uploading ? .6 : 1 }}>{busyId === editing.id ? "Saving..." : "Save Changes"}</button>
          </div>
        </div>
      </div></div>}

      {rejecting && <div style={overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) setRejecting(null); }}><div style={{ ...modal, maxWidth: 520 }}>
        <div style={{ ...modalHead, background: "#991b1b" }}><div><h2 style={{ margin: 0, fontSize: 20 }}>Reject Business Listing</h2><div style={{ opacity: .8, fontSize: 12 }}>{rejecting.businessName}</div></div><button onClick={() => setRejecting(null)} style={closeBtn}><X size={20}/></button></div>
        <div style={{ padding: 22 }}><p style={{ color: "#555", lineHeight: 1.6, marginTop: 0 }}>This rejects the directory listing only. Accounts/Finance will still handle any submitted payment proof separately.</p><Field title="Reason *"><textarea rows={4} value={rejectReason} onChange={(e)=>setRejectReason(e.target.value)} style={{ ...field, resize: "vertical" }} placeholder="Explain why the listing is being rejected..."/></Field><div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}><button onClick={() => setRejecting(null)} style={secondaryButton}>Cancel</button><button disabled={busyId === rejecting.id} onClick={() => void reject()} style={dangerButton}>{busyId === rejecting.id ? "Rejecting..." : "Reject Listing"}</button></div></div>
      </div></div>}

      <style>{`@media(max-width:720px){.business-edit-grid{grid-template-columns:1fr!important}.business-edit-grid>[style*="span 2"]{grid-column:span 1!important}input,select,textarea{font-size:16px!important}}`}</style>
    </div>
  );
}

function Field({title,children}:{title:string;children:React.ReactNode}) { return <div><label style={label}>{title}</label>{children}</div>; }
function Info({label: name,value}:{label:string;value:string}) { return <div style={{ background: "#faf8f3", borderRadius: 9, padding: 11 }}><div style={{ color: "#999", fontSize: 10, textTransform: "uppercase", fontWeight: 800, marginBottom: 4 }}>{name}</div><div style={{ color: "#333", fontSize: 13, wordBreak: "break-word" }}>{value}</div></div>; }
function InfoBlock({label: name,value}:{label:string;value:string}) { return <div style={{ marginTop: 12 }}><div style={{ color: GREEN, fontSize: 11, textTransform: "uppercase", fontWeight: 800, marginBottom: 5 }}>{name}</div><div style={{ background: "#faf8f3", borderRadius: 9, padding: 12, color: "#444", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{value}</div></div>; }
function UploadBox({title,value,loading,accept,onChange}:{title:string;value:string;loading:boolean;accept:string;onChange:(e:React.ChangeEvent<HTMLInputElement>)=>void}) { const pdf=isPdf(value); return <div><label style={label}>{title}</label><label style={{ minHeight:120,border:`2px dashed ${value?GOLD:"#ccd8cf"}`,borderRadius:9,display:"grid",placeItems:"center",padding:10,cursor:"pointer",background:value?"#fff9ef":"#fafbf9",textAlign:"center" }}>{loading?<span>Uploading...</span>:value?(pdf?<div style={{color:GREEN,fontWeight:800}}><FileText size={20}/><div>PDF uploaded</div></div>:<img src={value} alt="Uploaded" style={{maxWidth:"100%",maxHeight:100,objectFit:"contain"}}/>):<div><Upload size={21} color="#999"/><div style={{fontSize:11,color:"#888"}}>Click to upload</div></div>}<input type="file" accept={accept} style={{display:"none"}} onChange={onChange}/></label></div>; }

const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,.52)", zIndex: 10000, display: "grid", placeItems: "center", padding: 18 };
const modal: React.CSSProperties = { width: "100%", maxWidth: 760, maxHeight: "92vh", overflowY: "auto", background: "white", borderRadius: 14, boxShadow: "0 25px 70px rgba(0,0,0,.28)" };
const modalHead: React.CSSProperties = { background: GREEN, color: "white", padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 };
const closeBtn: React.CSSProperties = { background: "rgba(255,255,255,.12)", color: "white", border: "1px solid rgba(255,255,255,.25)", borderRadius: 8, width: 36, height: 36, display: "grid", placeItems: "center", cursor: "pointer" };
const th: React.CSSProperties = { textAlign: "left", padding: "12px 14px", color: "#777", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "12px 14px", color: "#444", fontSize: 12, verticalAlign: "middle" };
const smallBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 8px", borderRadius: 7, border: "1px solid #ddd", background: "white", color: GREEN, fontWeight: 800, fontSize: 11, cursor: "pointer" };
const primaryBtn: React.CSSProperties = { background: GREEN, color: "white", border: `1px solid ${GREEN}`, borderRadius: 9, padding: "10px 13px", textDecoration: "none", fontSize: 12, fontWeight: 800 };
const secondaryBtn: React.CSSProperties = { background: "white", color: GREEN, border: "1px solid #d8dfda", borderRadius: 9, padding: "10px 13px", textDecoration: "none", fontSize: 12, fontWeight: 800 };
const primaryButton: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: GREEN, color: "white", border: 0, borderRadius: 8, padding: "9px 13px", fontSize: 12, fontWeight: 800, cursor: "pointer" };
const secondaryButton: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: "white", color: GREEN, border: "1px solid #d8dfda", borderRadius: 8, padding: "9px 13px", fontSize: 12, fontWeight: 800, cursor: "pointer" };
const dangerButton: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#fff", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 8, padding: "9px 13px", fontSize: 12, fontWeight: 800, cursor: "pointer" };
const proofLink: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, color: GREEN, background: "white", border: "1px solid #ddd", padding: "9px 12px", borderRadius: 8, textDecoration: "none", fontWeight: 800, fontSize: 12 };
const editGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12, marginBottom: 14 };
const sectionTitle: React.CSSProperties = { color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 17, borderBottom: "1px solid #eee", paddingBottom: 8, margin: "24px 0 14px" };
