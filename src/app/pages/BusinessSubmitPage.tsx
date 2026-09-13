import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Briefcase, CheckCircle, DollarSign, Upload } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { MultiImageUpload } from "../components/ui/MultiImageUpload";
import { createBusiness, businessCategories, sponsorshipPackages } from "../lib/businessStore";
import { getSiteSettings } from "../lib/settingsStore";
import { uploadFile } from "../lib/upload";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", border: "1px solid rgba(26,77,46,0.2)", borderRadius: 7,
  fontSize: 14, boxSizing: "border-box", fontFamily: "'Poppins', sans-serif", background: "white",
};
const labelStyle: React.CSSProperties = { display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 };

export function BusinessSubmitPage() {
  const settings = getSiteSettings();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    businessName: "", ownerName: "", category: businessCategories[0], city: "", address: "", phone: "", whatsapp: "", email: "",
    website: "", socialLinks: "", logoUrl: "", description: "", productsServices: "", discountOffer: "", sponsorshipPackage: "basic" as any,
    paymentSenderName: "", paymentMethod: "Bank Transfer", paymentReference: "", paymentProofUrl: "", additionalPhotos: [] as string[],
  });

  const set = (key: string, value: any) => {
    setForm((old) => ({ ...old, [key]: value }));
    if (errors[key]) setErrors((old) => ({ ...old, [key]: "" }));
  };

  const handleFileUpload = (key: "logoUrl" | "paymentProofUrl") => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const max = file.type.startsWith("image/") ? 12 * 1024 * 1024 : 4 * 1024 * 1024;
    if (file.size > max) { setErrors((old) => ({ ...old, [key]: file.type.startsWith("image/") ? "Image source must be 12 MB or smaller." : "PDF must be 4 MB or smaller." })); return; }
    setUploading((old) => ({ ...old, [key]: true }));
    try { set(key, await uploadFile(file, key === "logoUrl" ? "business-logo" : "business-payment-proof")); }
    catch (error: any) { setErrors((old) => ({ ...old, [key]: error?.message || "Upload failed. Please try again." })); }
    finally { setUploading((old) => ({ ...old, [key]: false })); e.target.value = ""; }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.businessName.trim()) next.businessName = "Business name is required.";
    if (!form.ownerName.trim()) next.ownerName = "Owner name is required.";
    if (!form.city.trim()) next.city = "City is required.";
    if (!form.phone.trim()) next.phone = "Phone number is required.";
    if (!form.email.trim()) next.email = "Email is required.";
    if (!form.description.trim()) next.description = "Business description is required.";
    if (form.paymentSenderName.trim().length < 2) next.paymentSenderName = "Enter the sender/account-holder name shown on the payment proof.";
    if (!form.paymentMethod.trim()) next.paymentMethod = "Select a payment method.";
    if (form.paymentMethod !== "Cash" && form.paymentReference.trim().length < 2) next.paymentReference = "Enter the bank/wallet transaction or reference ID.";
    if (!form.paymentProofUrl) next.paymentProofUrl = "Payment proof/receipt is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.values(uploading).some(Boolean)) { setErrors({ form: "Please wait for file uploads to finish." }); return; }
    if (!validate()) { window.scrollTo({ top: 260, behavior: "smooth" }); return; }
    setLoading(true); setErrors({});
    try { await createBusiness(form as any); setSubmitted(true); }
    catch (error: any) {
      if (error?.details) {
        const next: Record<string, string> = {};
        for (const [key, messages] of Object.entries(error.details)) next[key] = (messages as string[])[0];
        setErrors(next);
      } else setErrors({ form: error?.message || "Failed to submit business listing." });
      window.scrollTo({ top: 260, behavior: "smooth" });
    } finally { setLoading(false); }
  };

  if (submitted) return <div>
    <PageHeader title="Submission Received" breadcrumb={["Home", "Business Directory", "Register"]} />
    <div style={{ maxWidth: 560, margin: "72px auto", padding: "0 24px", textAlign: "center" }}>
      <div style={{ width: 78, height: 78, borderRadius: "50%", background: "#dcfce7", display: "grid", placeItems: "center", margin: "0 auto 22px" }}><CheckCircle size={38} color="#15803d" /></div>
      <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif" }}>Business Profile Submitted</h2>
      <p style={{ color: "#555", lineHeight: 1.8 }}>Your profile and payment proof have been received. The payment is now <strong>Pending Finance Verification</strong>. It is not counted as paid and is not added to the accounting ledger until Finance/Accounts matches the sender, reference and slip and approves it.</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 20 }}><Link to="/business" style={primaryLink}>Back to Directory</Link><Link to="/" style={secondaryLink}>Home</Link></div>
    </div>
  </div>;

  return <div>
    <PageHeader title="Register Business" subtitle="List your business profile and promote it in the Araian community" breadcrumb={["Home", "Business Directory", "Register"]} />
    <section style={{ maxWidth: 840, margin: "0 auto", padding: "42px 24px 70px" }}>
      <Link to="/business" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: GREEN, textDecoration: "none", fontWeight: 700, marginBottom: 20 }}><ArrowLeft size={16} /> Back to Directory</Link>

      <div style={{ background: "#fcf8f0", border: "1px solid rgba(200,160,74,.35)", borderRadius: 12, padding: 22, marginBottom: 24 }}>
        <h3 style={{ display: "flex", gap: 8, alignItems: "center", margin: "0 0 9px", color: GREEN, fontFamily: "'Playfair Display', serif" }}><DollarSign size={19} color={GOLD} /> Fee Payment & Verification</h3>
        <p style={{ margin: "0 0 14px", color: "#5f655f", fontSize: 13, lineHeight: 1.7 }}>Pay through an official method below, then enter the exact sender/account-holder name and transaction ID and upload the slip. Finance verifies it separately before any amount enters the ledger.</p>
        <div className="payment-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
          {settings.paymentMethods?.length ? settings.paymentMethods.map((pm: any) => <div key={pm.id} style={{ background: "white", border: "1px solid #eee3cc", borderRadius: 8, padding: 12, fontSize: 12 }}><b style={{ color: GREEN }}>{pm.bankName}</b><div style={{ color: "#666", marginTop: 4 }}>Title: {pm.accountTitle}</div><strong>{pm.accountNo}</strong></div>) : <div style={{ color: "#777", fontSize: 12 }}>No payment method is currently configured. Contact the office before paying.</div>}
        </div>
      </div>

      <form onSubmit={submit} style={{ background: "white", borderRadius: 14, padding: "32px", boxShadow: "0 4px 24px rgba(0,0,0,.07)", border: "1px solid rgba(26,77,46,.08)" }}>
        {errors.form && <Notice>{errors.form}</Notice>}
        <SectionTitle icon={<Briefcase size={18} />} text="Business Information" />
        <div className="form-grid" style={grid2}>
          <FormField label="Business Name *" error={errors.businessName}><input style={inputStyle} value={form.businessName} onChange={(e)=>set("businessName",e.target.value)} /></FormField>
          <FormField label="Owner / Member Name *" error={errors.ownerName}><input style={inputStyle} value={form.ownerName} onChange={(e)=>set("ownerName",e.target.value)} /></FormField>
          <FormField label="Business Category *"><select style={inputStyle} value={form.category} onChange={(e)=>set("category",e.target.value)}>{businessCategories.map((x)=><option key={x}>{x}</option>)}</select></FormField>
          <FormField label="City *" error={errors.city}><input style={inputStyle} value={form.city} onChange={(e)=>set("city",e.target.value)} /></FormField>
          <div style={{gridColumn:"span 2"}}><FormField label="Business Address"><input style={inputStyle} value={form.address} onChange={(e)=>set("address",e.target.value)} /></FormField></div>
          <div style={{gridColumn:"span 2"}}><FormField label="Business Description *" error={errors.description}><textarea rows={4} style={{...inputStyle,resize:"vertical"}} value={form.description} onChange={(e)=>set("description",e.target.value)} /></FormField></div>
          <div style={{gridColumn:"span 2"}}><FormField label="Products / Services"><input style={inputStyle} value={form.productsServices} onChange={(e)=>set("productsServices",e.target.value)} /></FormField></div>
        </div>

        <SectionTitle text="Contact & Digital Links" />
        <div className="form-grid" style={grid2}>
          <FormField label="Phone *" error={errors.phone}><input style={inputStyle} value={form.phone} onChange={(e)=>set("phone",e.target.value)} /></FormField>
          <FormField label="WhatsApp"><input style={inputStyle} value={form.whatsapp} onChange={(e)=>set("whatsapp",e.target.value)} /></FormField>
          <FormField label="Email *" error={errors.email}><input type="email" style={inputStyle} value={form.email} onChange={(e)=>set("email",e.target.value)} /></FormField>
          <FormField label="Website"><input style={inputStyle} value={form.website} onChange={(e)=>set("website",e.target.value)} placeholder="https://" /></FormField>
          <div style={{gridColumn:"span 2"}}><FormField label="Social Media Links"><input style={inputStyle} value={form.socialLinks} onChange={(e)=>set("socialLinks",e.target.value)} /></FormField></div>
        </div>

        <SectionTitle text="Listing Package" />
        <div className="package-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12, marginBottom: 20 }}>
          {(Object.keys(sponsorshipPackages) as Array<keyof typeof sponsorshipPackages>).map((key) => { const pkg=sponsorshipPackages[key]; const active=form.sponsorshipPackage===key; return <button type="button" key={key} onClick={()=>set("sponsorshipPackage",key)} style={{ textAlign:"left",background:active?"#fff9ef":"white",border:`2px solid ${active?GOLD:"#e5e7eb"}`,borderRadius:10,padding:14,cursor:"pointer" }}><strong style={{color:GREEN}}>{pkg.name}</strong><div style={{color:"#9b741b",fontWeight:800,marginTop:4}}>{pkg.price}</div><p style={{fontSize:11,color:"#666",lineHeight:1.5,marginBottom:0}}>{pkg.benefits}</p></button>; })}
        </div>
        <FormField label="Discount Offer for Anjuman Members"><input style={inputStyle} value={form.discountOffer} onChange={(e)=>set("discountOffer",e.target.value)} /></FormField>

        <SectionTitle text="Payment Proof & Finance Verification" />
        <div style={{ background: "#fff9e9", border: "1px solid #ead39a", borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div className="payment-form-grid" style={{ display:"grid",gridTemplateColumns:"1.2fr 1fr 1.2fr",gap:12 }}>
            <FormField label="Sender / Account-Holder Name *" error={errors.paymentSenderName}><input style={inputStyle} value={form.paymentSenderName} onChange={(e)=>set("paymentSenderName",e.target.value)} placeholder="Exact name shown on slip" /></FormField>
            <FormField label="Payment Method *" error={errors.paymentMethod}><select style={inputStyle} value={form.paymentMethod} onChange={(e)=>set("paymentMethod",e.target.value)}><option>Bank Transfer</option><option>JazzCash</option><option>Easypaisa</option><option>Cheque</option><option>Cash</option><option>Other</option></select></FormField>
            <FormField label="Transaction / Reference ID" error={errors.paymentReference}><input style={inputStyle} value={form.paymentReference} onChange={(e)=>set("paymentReference",e.target.value)} placeholder={form.paymentMethod==="Cash"?"Optional for cash":"Required"} /></FormField>
          </div>
        </div>

        <div className="upload-grid" style={grid2}>
          <FileBox title="Business Logo (optional)" value={form.logoUrl} loading={Boolean(uploading.logoUrl)} accept="image/*" onChange={handleFileUpload("logoUrl")} error={errors.logoUrl} />
          <FileBox title="Payment Proof / Receipt *" value={form.paymentProofUrl} loading={Boolean(uploading.paymentProofUrl)} accept="image/*,.pdf,application/pdf" onChange={handleFileUpload("paymentProofUrl")} error={errors.paymentProofUrl} />
        </div>
        <div style={{marginTop:18}}><MultiImageUpload label="Additional Business Photos / Relevant Documents (Optional)" images={form.additionalPhotos} onChange={(images)=>set("additionalPhotos",images)} /></div>
        <div style={{ background:"#f0f7f3",borderRadius:9,padding:12,marginTop:16,color:"#53615a",fontSize:12,lineHeight:1.7 }}><strong>Accounting control:</strong> submitting this form creates a pending payment proof only. Finance/Accounts must open the slip, match sender/reference and approve it before a ledger receipt is generated.</div>

        <div style={{display:"flex",justifyContent:"flex-end",marginTop:26,paddingTop:20,borderTop:"1px solid #eee"}}><button type="submit" disabled={loading||Object.values(uploading).some(Boolean)} style={{...primaryButton,opacity:loading?.65:1}}>{loading?"Submitting...":"Submit Profile for Review"}</button></div>
      </form>
    </section>
    <style>{`@media(max-width:700px){.form-grid,.package-grid,.payment-grid,.payment-form-grid,.upload-grid{grid-template-columns:1fr!important}.form-grid>[style*="span 2"]{grid-column:span 1!important}input,select,textarea{font-size:16px!important}}`}</style>
  </div>;
}

function Notice({children}:{children:React.ReactNode}) { return <div style={{background:"#fee2e2",color:"#b91c1c",padding:"11px 13px",borderRadius:8,marginBottom:18}}>{children}</div>; }
function FormField({label,error,children}:{label:string;error?:string;children:React.ReactNode}) { return <div><label style={labelStyle}>{label}</label>{children}{error&&<div style={{color:"#b91c1c",fontSize:11,marginTop:4}}>{error}</div>}</div>; }
function SectionTitle({text,icon}:{text:string;icon?:React.ReactNode}) { return <h3 style={{display:"flex",gap:7,alignItems:"center",color:GREEN,fontFamily:"'Playfair Display', serif",fontSize:18,borderBottom:"2px solid #f2f2f2",paddingBottom:9,margin:"26px 0 16px"}}>{icon}{text}</h3>; }
function FileBox({title,value,loading,accept,onChange,error}:{title:string;value:string;loading:boolean;accept:string;onChange:(e:React.ChangeEvent<HTMLInputElement>)=>void;error?:string}) { const pdf=value?.toLowerCase().includes(".pdf"); return <div><label style={labelStyle}>{title}</label><label style={{minHeight:120,border:`2px dashed ${error?"#b91c1c":value?GOLD:"#ccd8cf"}`,borderRadius:10,display:"grid",placeItems:"center",padding:12,cursor:"pointer",background:value?"#fff9ef":"#fafbf9",textAlign:"center"}}>{loading?<span>Uploading...</span>:value?(pdf?<div style={{color:GREEN,fontWeight:800}}><CheckCircle size={22}/><div style={{marginTop:6}}>PDF uploaded</div></div>:<img src={value} alt="Uploaded" style={{maxWidth:"100%",maxHeight:95,objectFit:"contain"}}>):<div><Upload size={22} color="#999"/><div style={{fontSize:11,color:"#888",marginTop:5}}>Click to upload</div></div>}<input type="file" accept={accept} style={{display:"none"}} onChange={onChange}/></label>{error&&<div style={{color:"#b91c1c",fontSize:11,marginTop:4}}>{error}</div>}</div>; }

const grid2: React.CSSProperties = { display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:15,marginBottom:15 };
const primaryButton: React.CSSProperties = { background:GREEN,color:"white",border:0,borderRadius:8,padding:"12px 28px",fontWeight:800,cursor:"pointer" };
const primaryLink: React.CSSProperties = { display:"inline-block",background:GREEN,color:"white",padding:"10px 16px",borderRadius:8,textDecoration:"none",fontWeight:800 };
const secondaryLink: React.CSSProperties = { display:"inline-block",background:"#f5f5f5",color:GREEN,padding:"10px 16px",borderRadius:8,textDecoration:"none",fontWeight:800 };
