import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { Briefcase, CheckCircle, ChevronDown, FileCheck2, Save, Upload } from "lucide-react";
import { useAdmin } from "../context/AdminContext";
import { businessCategories, createBusinessAdmin, sponsorshipPackages, BusinessStatus } from "../lib/businessStore";
import { uploadFile } from "../lib/upload";
import { MultiImageUpload } from "../components/ui/MultiImageUpload";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";
const DRAFT_KEY = "araian_admin_business_draft";
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "11px 12px", border: "1px solid #d8e1da", borderRadius: 8, fontSize: 13, background: "white" };
const label: React.CSSProperties = { display: "block", color: GREEN, fontSize: 12, fontWeight: 800, marginBottom: 6 };

const blankForm = () => ({
  businessName: "", ownerName: "", category: "", city: "", address: "", phone: "", whatsapp: "", email: "", website: "", socialLinks: "",
  description: "", productsServices: "", discountOffer: "", sponsorshipPackage: "basic" as "basic" | "premium" | "vip",
  logoUrl: "", paymentProofUrl: "", additionalPhotos: [] as string[], status: "pending" as BusinessStatus,
  adminNote: "Created manually by admin.", paymentSenderName: "", paymentMethod: "", paymentReference: "",
});

type FormState = ReturnType<typeof blankForm>;

function readDraft(): FormState {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? { ...blankForm(), ...JSON.parse(raw) } : blankForm();
  } catch { return blankForm(); }
}

function apiErrorText(error: any, fallback: string) {
  const details = error?.details && typeof error.details === "object"
    ? Object.entries(error.details).flatMap(([field, messages]: any) => (messages || []).map((m: string) => `${field}: ${m}`)).join(" · ")
    : "";
  return details || error?.message || fallback;
}

export function AdminBusinessCreatePage() {
  const { isAdmin, role } = useAdmin();
  const navigate = useNavigate();
  const allowed = ["admin", "super_admin", "welfare_manager"].includes(String(role || ""));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [draftStatus, setDraftStatus] = useState("Draft saved in this admin session");
  const [form, setForm] = useState<FormState>(() => readDraft());

  useEffect(() => {
    if (!isAdmin || done) return;
    setDraftStatus("Saving draft...");
    const timer = window.setTimeout(() => {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      setDraftStatus("Draft saved in this admin session");
    }, 500);
    return () => window.clearTimeout(timer);
  }, [form, isAdmin, done]);

  if (!isAdmin) return <Navigate to="/admin" replace />;
  if (!allowed) return <Navigate to="/admin" replace />;

  const set = (key: keyof FormState, value: any) => {
    setForm((old) => {
      if (key === "phone") {
        const shouldMirror = !old.whatsapp || old.whatsapp === old.phone;
        return { ...old, phone: value, whatsapp: shouldMirror ? value : old.whatsapp };
      }
      return { ...old, [key]: value };
    });
    setError("");
  };

  const upload = (key: "logoUrl" | "paymentProofUrl") => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError("");
    try { set(key, await uploadFile(file, key === "logoUrl" ? "business-logo" : "business-payment-proof")); }
    catch (e: any) { setError(apiErrorText(e, "Upload failed.")); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const clearDraft = () => {
    if (!window.confirm("Clear the saved admin business draft?")) return;
    sessionStorage.removeItem(DRAFT_KEY);
    setForm(blankForm());
    setError("");
    setDraftStatus("New form");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName.trim() || !form.ownerName.trim() || !form.category.trim() || !form.city.trim() || !form.address.trim() || !form.phone.trim()) {
      setError("Business name, owner/contact name, category, city, address and phone are required.");
      return;
    }
    if (form.status === "approved" && !form.paymentProofUrl) {
      setError("Upload the payment slip, receipt or cash receipt before publishing. Accounts needs the same proof for Finance Verification.");
      return;
    }

    const paymentStatus = form.status === "approved" ? "received" : form.paymentProofUrl ? "submitted" : "pending";
    setSaving(true); setError("");
    try {
      await createBusinessAdmin({
        ...form,
        paymentStatus,
        paymentSenderName: form.paymentSenderName.trim() || form.ownerName.trim(),
      } as any);
      sessionStorage.removeItem(DRAFT_KEY);
      setDone(true);
    } catch (e: any) {
      setError(apiErrorText(e, "Business could not be created."));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally { setSaving(false); }
  };

  if (done) return (
    <div style={{ minHeight: "100vh", background: "#f8f5ef", padding: 30 }}>
      <div style={{ maxWidth: 680, margin: "70px auto", background: "white", borderRadius: 16, padding: 36, textAlign: "center", boxShadow: "0 6px 28px rgba(0,0,0,.08)" }}>
        <CheckCircle size={48} color={GREEN}/><h2 style={{ color: GREEN }}>Business profile created</h2>
        <p style={{ color: "#666", lineHeight: 1.7 }}>The business profile has been saved. If payment proof was attached, it is automatically linked with Accounts/Finance Verification. The audit trail records creation and later changes.</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => { setDone(false); setForm(blankForm()); }} style={primary}>Add Another Business</button>
          <button onClick={() => navigate("/admin/businesses")} style={secondary}>Business Control Center</button>
          <button onClick={() => navigate("/admin/finance")} style={secondary}>Finance Verification</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8f5ef", padding: "28px 22px 70px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
          <div><h1 style={{ margin: 0, color: GREEN, fontFamily: "'Playfair Display', serif" }}>Add Business Manually</h1><p style={{ color: "#666", margin: "5px 0 0" }}>Essential fields first. Accounts and optional profile details are kept available without making the form unnecessarily long.</p></div>
          <div style={{ textAlign: "right" }}><Link to="/admin/businesses" style={{ color: GREEN, fontWeight: 800, textDecoration: "none" }}>← Business Control Center</Link><div style={{ marginTop: 7, fontSize: 11, color: "#777", display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end" }}><Save size={12}/>{draftStatus}<button type="button" onClick={clearDraft} style={{ border: 0, background: "transparent", color: "#9b2c2c", cursor: "pointer", fontSize: 11, fontWeight: 800 }}>Clear</button></div></div>
        </div>

        <form onSubmit={submit} style={{ background: "white", borderRadius: 16, padding: 28, boxShadow: "0 5px 24px rgba(0,0,0,.06)" }}>
          {error && <div style={{ background: "#fee2e2", color: "#b91c1c", padding: 12, borderRadius: 8, marginBottom: 16, fontWeight: 700, fontSize: 13, lineHeight: 1.6 }}>{error}</div>}

          <Section title="Business Profile" icon={<Briefcase size={17}/>} subtitle="Required information for the directory and local business record."/>
          <div className="admin-business-grid" style={grid}>
            <Field title="Business Name *"><input autoComplete="organization" style={input} value={form.businessName} onChange={(e) => set("businessName", e.target.value)}/></Field>
            <Field title="Owner / Contact Name *"><input autoComplete="name" style={input} value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)}/></Field>
            <Field title="Category *"><select style={input} value={form.category} onChange={(e) => set("category", e.target.value)}><option value="">Select category</option>{businessCategories.map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field title="City *"><input style={input} value={form.city} onChange={(e) => set("city", e.target.value)}/></Field>
            <Field title="Phone *"><input inputMode="tel" style={input} value={form.phone} onChange={(e) => set("phone", e.target.value)}/></Field>
            <Field title="Email"><input type="email" style={input} value={form.email} onChange={(e) => set("email", e.target.value)}/></Field>
            <div style={{ gridColumn: "span 2" }}><Field title="Address *"><input style={input} value={form.address} onChange={(e) => set("address", e.target.value)}/></Field></div>
            <div style={{ gridColumn: "span 2" }}><Field title="Business Description"><textarea rows={3} style={{ ...input, resize: "vertical" }} value={form.description} onChange={(e) => set("description", e.target.value)}/></Field></div>
          </div>

          <Section title="Listing & Payment Proof" subtitle="Payment review status is automatic. You do not need to choose Submitted/Received manually."/>
          <div className="admin-business-grid" style={grid}>
            <Field title="Listing Package"><select style={input} value={form.sponsorshipPackage} onChange={(e) => set("sponsorshipPackage", e.target.value)}>{Object.entries(sponsorshipPackages).map(([key, p]) => <option key={key} value={key}>{p.name} - {p.price}</option>)}</select></Field>
            <Field title="Business Status"><select style={input} value={form.status} onChange={(e) => set("status", e.target.value)}><option value="pending">Pending Review</option><option value="approved">Approved / Publish</option><option value="rejected">Rejected</option></select></Field>
            <UploadBox title={form.status === "approved" ? "Payment Slip / Receipt *" : "Payment Slip / Receipt (optional while pending)"} value={form.paymentProofUrl} loading={uploading} accept="image/*,.pdf,application/pdf" onChange={upload("paymentProofUrl")}/>
          </div>
          <div style={{ background: "#f0f7f3", color: "#526159", padding: 11, borderRadius: 8, fontSize: 11, lineHeight: 1.6, marginBottom: 16 }}><strong>Automatic accounts status:</strong> no proof = Pending; proof uploaded = Receipt Submitted; Approved / Publish with proof = Received / Admin Checked. Final Finance Verified is only created by Accounts/Finance.</div>

          <details style={detailsBox}>
            <summary style={summaryStyle}><ChevronDown size={15}/>More business profile details (optional)</summary>
            <div className="admin-business-grid" style={grid}>
              <Field title="WhatsApp"><input style={input} value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)}/></Field>
              <Field title="Website"><input type="url" placeholder="https://example.com" style={input} value={form.website} onChange={(e) => set("website", e.target.value)}/></Field>
              <div style={{ gridColumn: "span 2" }}><Field title="Products / Services"><textarea rows={2} style={{ ...input, resize: "vertical" }} value={form.productsServices} onChange={(e) => set("productsServices", e.target.value)}/></Field></div>
              <div style={{ gridColumn: "span 2" }}><Field title="Member Discount / Offer"><input style={input} value={form.discountOffer} onChange={(e) => set("discountOffer", e.target.value)}/></Field></div>
              <div style={{ gridColumn: "span 2" }}><Field title="Social Links"><input style={input} value={form.socialLinks} onChange={(e) => set("socialLinks", e.target.value)}/></Field></div>
              <UploadBox title="Business Logo" value={form.logoUrl} loading={uploading} accept="image/*" onChange={upload("logoUrl")} previewImage/>
            </div>
            <MultiImageUpload label="Business Photos / Supporting Documents" images={form.additionalPhotos} onChange={(images) => set("additionalPhotos", images)}/>
          </details>

          <details style={{ ...detailsBox, marginTop: 12 }}>
            <summary style={summaryStyle}><ChevronDown size={15}/>Accounts details (optional)</summary>
            <p style={{ margin: "0 0 12px", color: "#777", fontSize: 11, lineHeight: 1.6 }}>Normally the uploaded slip is enough. Fill these fields only when the office needs extra reconciliation information.</p>
            <div className="admin-business-grid" style={grid}>
              <Field title="Payment Method"><select style={input} value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)}><option value="">Not specified</option><option>Bank Transfer</option><option>JazzCash</option><option>Easypaisa</option><option>Cheque</option><option>Cash</option><option>Other</option></select></Field>
              <Field title="Sender / Account Name"><input style={input} value={form.paymentSenderName} onChange={(e) => set("paymentSenderName", e.target.value)} placeholder="Defaults to owner/contact name"/></Field>
              <Field title="Transaction / Reference ID"><input style={input} value={form.paymentReference} onChange={(e) => set("paymentReference", e.target.value)} placeholder="Optional"/></Field>
              <div style={{ gridColumn: "span 2" }}><Field title="Admin Note"><textarea rows={2} style={{ ...input, resize: "vertical" }} value={form.adminNote} onChange={(e) => set("adminNote", e.target.value)}/></Field></div>
            </div>
          </details>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
            <Link to="/admin/businesses" style={{ ...secondary, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Cancel</Link>
            <button type="submit" disabled={saving || uploading} style={{ ...primary, opacity: saving || uploading ? .6 : 1 }}>{saving ? "Saving..." : "Save Business Profile"}</button>
          </div>
        </form>
      </div>
      <style>{`@media(max-width:720px){.admin-business-grid{grid-template-columns:1fr!important}.admin-business-grid>[style*="span 2"]{grid-column:span 1!important}input,select,textarea{font-size:16px!important}}`}</style>
    </div>
  );
}

function Field({ title, children }: { title: string; children: React.ReactNode }) { return <div><label style={label}>{title}</label>{children}</div>; }
function Section({ title, icon, subtitle }: { title: string; icon?: React.ReactNode; subtitle?: string }) { return <div style={{ borderBottom: "1px solid #eee", paddingBottom: 8, margin: "24px 0 14px" }}><h3 style={{ display: "flex", gap: 7, alignItems: "center", color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 18, margin: 0 }}>{icon}{title}</h3>{subtitle && <p style={{ color: "#777", fontSize: 11, margin: "5px 0 0", lineHeight: 1.5 }}>{subtitle}</p>}</div>; }
function UploadBox({ title, value, loading, accept, onChange, previewImage = false }: { title: string; value: string; loading: boolean; accept: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; previewImage?: boolean }) { return <div><label style={label}>{title}</label><label style={{ minHeight: 112, border: `2px dashed ${value ? GOLD : "#ccd8cf"}`, borderRadius: 9, display: "grid", placeItems: "center", padding: 10, cursor: "pointer", background: value ? "#fff9ef" : "#fafbf9", textAlign: "center" }}>{loading ? <span>Uploading...</span> : value ? (previewImage ? <img src={value} alt="Business logo preview" style={{ maxWidth: "100%", maxHeight: 90, objectFit: "contain" }}/> : <div style={{ color: GREEN, fontWeight: 800 }}><FileCheck2 size={21}/><div>File uploaded</div><small style={{ color: "#777", fontWeight: 400 }}>Click to replace</small></div>) : <div><Upload size={21} color="#999"/><div style={{ fontSize: 11, color: "#888" }}>Click to upload</div></div>}<input type="file" accept={accept} style={{ display: "none" }} onChange={onChange}/></label></div>; }
const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14, marginBottom: 14 };
const primary: React.CSSProperties = { background: GREEN, color: "white", border: "none", borderRadius: 8, padding: "11px 18px", fontWeight: 800, fontSize: 13, cursor: "pointer" };
const secondary: React.CSSProperties = { background: "#f3f4f6", color: "#444", border: "1px solid #ddd", borderRadius: 8, padding: "11px 18px", fontWeight: 800, fontSize: 13, cursor: "pointer" };
const detailsBox: React.CSSProperties = { border: "1px solid #e5e7eb", borderRadius: 10, padding: "0 14px", marginTop: 6 };
const summaryStyle: React.CSSProperties = { padding: "13px 0", cursor: "pointer", color: GREEN, fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", gap: 7 };
