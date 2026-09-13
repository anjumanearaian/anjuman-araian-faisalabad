import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { Briefcase, CheckCircle, Upload } from "lucide-react";
import { useAdmin } from "../context/AdminContext";
import { businessCategories, createBusinessAdmin, sponsorshipPackages, BusinessStatus, PaymentStatus } from "../lib/businessStore";
import { uploadFile } from "../lib/upload";
import { MultiImageUpload } from "../components/ui/MultiImageUpload";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #d8e1da", borderRadius: 8, fontSize: 13, background: "white" };
const label: React.CSSProperties = { display: "block", color: GREEN, fontSize: 12, fontWeight: 800, marginBottom: 6 };

export function AdminBusinessCreatePage() {
  const { isAdmin, role } = useAdmin();
  const navigate = useNavigate();
  const allowed = ["admin", "super_admin", "welfare_manager"].includes(String(role || ""));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    businessName: "", ownerName: "", category: businessCategories[0], city: "", address: "", phone: "", whatsapp: "", email: "", website: "", socialLinks: "",
    description: "", productsServices: "", discountOffer: "", sponsorshipPackage: "basic" as "basic" | "premium" | "vip",
    logoUrl: "", paymentProofUrl: "", additionalPhotos: [] as string[], status: "pending" as BusinessStatus, paymentStatus: "pending" as PaymentStatus,
    adminNote: "Created manually by admin.", paymentSenderName: "", paymentMethod: "", paymentReference: "",
  });

  if (!isAdmin) return <Navigate to="/admin" replace />;
  if (!allowed) return <Navigate to="/admin" replace />;

  const set = (key: string, value: any) => setForm((old) => ({ ...old, [key]: value }));

  const upload = (key: "logoUrl" | "paymentProofUrl") => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError("");
    try { set(key, await uploadFile(file, key === "logoUrl" ? "business-logo" : "business-payment-proof")); }
    catch (e: any) { setError(e?.message || "Upload failed."); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName.trim() || !form.ownerName.trim() || !form.city.trim() || !form.address.trim() || !form.phone.trim()) {
      setError("Business name, owner name, city, address and phone are required.");
      return;
    }
    if (form.status === "approved" && form.paymentStatus !== "received") {
      setError("For an approved listing, mark payment as Received / Admin Checked. Final verification is completed separately in the Finance Center.");
      return;
    }
    setSaving(true); setError("");
    try {
      await createBusinessAdmin(form as any);
      setDone(true);
    } catch (e: any) {
      setError(e?.message || "Business could not be created.");
    } finally { setSaving(false); }
  };

  if (done) return (
    <div style={{ minHeight: "100vh", background: "#f8f5ef", padding: 30 }}>
      <div style={{ maxWidth: 680, margin: "70px auto", background: "white", borderRadius: 16, padding: 36, textAlign: "center", boxShadow: "0 6px 28px rgba(0,0,0,.08)" }}>
        <CheckCircle size={48} color={GREEN}/><h2 style={{ color: GREEN }}>Business profile created</h2>
        <p style={{ color: "#666" }}>The business has been saved with the selected listing and admin payment-review status. Finance verification remains separate.</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => { setDone(false); setForm((f) => ({ ...f, businessName: "", ownerName: "", phone: "", whatsapp: "", email: "", website: "", address: "", description: "", productsServices: "", discountOffer: "", logoUrl: "", paymentProofUrl: "", additionalPhotos: [], paymentSenderName: "", paymentMethod: "", paymentReference: "", status: "pending", paymentStatus: "pending" })); }} style={primary}>Add Another Business</button>
          <button onClick={() => navigate("/admin/businesses")} style={secondary}>Business Control Center</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8f5ef", padding: "28px 22px 70px" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
          <div><h1 style={{ margin: 0, color: GREEN, fontFamily: "'Playfair Display', serif" }}>Add Business Manually</h1><p style={{ color: "#666", margin: "5px 0 0" }}>Create a complete business profile from the admin panel.</p></div>
          <Link to="/admin/businesses" style={{ color: GREEN, fontWeight: 800, textDecoration: "none" }}>← Business Control Center</Link>
        </div>

        <form onSubmit={submit} style={{ background: "white", borderRadius: 16, padding: 28, boxShadow: "0 5px 24px rgba(0,0,0,.06)" }}>
          {error && <div style={{ background: "#fee2e2", color: "#b91c1c", padding: 12, borderRadius: 8, marginBottom: 16, fontWeight: 700, fontSize: 13 }}>{error}</div>}
          <Section title="Business Profile" icon={<Briefcase size={17}/>}/>
          <div className="admin-business-grid" style={grid}>
            <Field title="Business Name *"><input style={input} value={form.businessName} onChange={e=>set("businessName",e.target.value)}/></Field>
            <Field title="Owner / Contact Name *"><input style={input} value={form.ownerName} onChange={e=>set("ownerName",e.target.value)}/></Field>
            <Field title="Category"><select style={input} value={form.category} onChange={e=>set("category",e.target.value)}>{businessCategories.map(x=><option key={x}>{x}</option>)}</select></Field>
            <Field title="City *"><input style={input} value={form.city} onChange={e=>set("city",e.target.value)}/></Field>
            <Field title="Phone *"><input style={input} value={form.phone} onChange={e=>set("phone",e.target.value)}/></Field>
            <Field title="WhatsApp"><input style={input} value={form.whatsapp} onChange={e=>set("whatsapp",e.target.value)}/></Field>
            <Field title="Email"><input type="email" style={input} value={form.email} onChange={e=>set("email",e.target.value)}/></Field>
            <Field title="Website"><input style={input} value={form.website} onChange={e=>set("website",e.target.value)}/></Field>
            <div style={{ gridColumn: "span 2" }}><Field title="Address *"><input style={input} value={form.address} onChange={e=>set("address",e.target.value)}/></Field></div>
            <div style={{ gridColumn: "span 2" }}><Field title="Description"><textarea rows={4} style={{ ...input, resize: "vertical" }} value={form.description} onChange={e=>set("description",e.target.value)}/></Field></div>
            <div style={{ gridColumn: "span 2" }}><Field title="Products / Services"><textarea rows={3} style={{ ...input, resize: "vertical" }} value={form.productsServices} onChange={e=>set("productsServices",e.target.value)}/></Field></div>
            <div style={{ gridColumn: "span 2" }}><Field title="Member Discount / Offer"><input style={input} value={form.discountOffer} onChange={e=>set("discountOffer",e.target.value)}/></Field></div>
          </div>

          <Section title="Listing & Approval"/>
          <p style={{ margin: "-4px 0 14px", color: "#777", fontSize: 12, lineHeight: 1.6 }}>“Received / Admin Checked” means the office has reviewed the payment information for directory approval. “Finance Verified” is not set here; it is created by the Finance Verification workflow after ledger review.</p>
          <div className="admin-business-grid" style={grid}>
            <Field title="Listing Package"><select style={input} value={form.sponsorshipPackage} onChange={e=>set("sponsorshipPackage",e.target.value)}>{Object.entries(sponsorshipPackages).map(([key,p])=><option key={key} value={key}>{p.name} - {p.price}</option>)}</select></Field>
            <Field title="Business Status"><select style={input} value={form.status} onChange={e=>set("status",e.target.value)}><option value="pending">Pending Review</option><option value="approved">Approved / Publish</option><option value="rejected">Rejected</option></select></Field>
            <Field title="Payment Review Status"><select style={input} value={form.paymentStatus} onChange={e=>set("paymentStatus",e.target.value)}><option value="pending">Pending</option><option value="submitted">Slip Submitted</option><option value="received">Received / Admin Checked</option><option value="rejected">Rejected</option></select></Field>
            <Field title="Payment Method (optional)"><select style={input} value={form.paymentMethod} onChange={e=>set("paymentMethod",e.target.value)}><option value="">Not specified</option><option>Bank Transfer</option><option>JazzCash</option><option>Easypaisa</option><option>Cheque</option><option>Cash</option><option>Other</option></select></Field>
            <Field title="Sender / Account Name (optional)"><input style={input} value={form.paymentSenderName} onChange={e=>set("paymentSenderName",e.target.value)}/></Field>
            <Field title="Transaction / Reference ID (optional)"><input style={input} value={form.paymentReference} onChange={e=>set("paymentReference",e.target.value)} placeholder="Not required"/></Field>
            <div style={{ gridColumn: "span 2" }}><Field title="Admin Note"><textarea rows={3} style={{ ...input, resize: "vertical" }} value={form.adminNote} onChange={e=>set("adminNote",e.target.value)}/></Field></div>
          </div>

          <Section title="Logo, Payment Slip & Documents"/>
          <div className="admin-business-grid" style={grid}>
            <UploadBox title="Business Logo" value={form.logoUrl} loading={uploading} accept="image/*" onChange={upload("logoUrl")}/>
            <UploadBox title="Payment Slip / Receipt (optional for manual admin entry)" value={form.paymentProofUrl} loading={uploading} accept="image/*,.pdf,application/pdf" onChange={upload("paymentProofUrl")}/>
          </div>
          <MultiImageUpload label="Business Photos / Supporting Documents" images={form.additionalPhotos} onChange={images=>set("additionalPhotos",images)}/>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
            <Link to="/admin/businesses" style={{ ...secondary, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Cancel</Link>
            <button type="submit" disabled={saving||uploading} style={{ ...primary, opacity: saving||uploading ? .6 : 1 }}>{saving ? "Saving..." : "Save Business Profile"}</button>
          </div>
        </form>
      </div>
      <style>{`@media(max-width:720px){.admin-business-grid{grid-template-columns:1fr!important}.admin-business-grid>[style*="span 2"]{grid-column:span 1!important}input,select,textarea{font-size:16px!important}}`}</style>
    </div>
  );
}

function Field({title,children}:{title:string;children:React.ReactNode}){return <div><label style={label}>{title}</label>{children}</div>}
function Section({title,icon}:{title:string;icon?:React.ReactNode}){return <h3 style={{ display:"flex",gap:7,alignItems:"center",color:GREEN,fontFamily:"'Playfair Display', serif",fontSize:18,borderBottom:"1px solid #eee",paddingBottom:8,margin:"24px 0 14px" }}>{icon}{title}</h3>}
function UploadBox({title,value,loading,accept,onChange}:{title:string;value:string;loading:boolean;accept:string;onChange:(e:React.ChangeEvent<HTMLInputElement>)=>void}){const pdf=value.toLowerCase().includes(".pdf");return <div><label style={label}>{title}</label><label style={{minHeight:120,border:`2px dashed ${value?GOLD:"#ccd8cf"}`,borderRadius:9,display:"grid",placeItems:"center",padding:10,cursor:"pointer",background:value?"#fff9ef":"#fafbf9",textAlign:"center"}}>{loading?<span>Uploading...</span>:value?(pdf?<div style={{color:GREEN,fontWeight:800}}><CheckCircle size={20}/><div>PDF uploaded</div></div>:<img src={value} alt="Uploaded" style={{maxWidth:"100%",maxHeight:100,objectFit:"contain"}}/>):<div><Upload size={21} color="#999"/><div style={{fontSize:11,color:"#888"}}>Click to upload</div></div>}<input type="file" accept={accept} style={{display:"none"}} onChange={onChange}/></label></div>}
const grid:React.CSSProperties={display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:14,marginBottom:14};
const primary:React.CSSProperties={background:GREEN,color:"white",border:"none",borderRadius:8,padding:"11px 18px",fontWeight:800,fontSize:13,cursor:"pointer"};
const secondary:React.CSSProperties={background:"#f3f4f6",color:"#444",border:"1px solid #ddd",borderRadius:8,padding:"11px 18px",fontWeight:800,fontSize:13,cursor:"pointer"};
