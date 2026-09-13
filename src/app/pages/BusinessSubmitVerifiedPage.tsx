import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Briefcase, CheckCircle, DollarSign, Upload } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { MultiImageUpload } from "../components/ui/MultiImageUpload";
import { businessCategories, createBusiness, sponsorshipPackages } from "../lib/businessStore";
import { getSiteSettings } from "../lib/settingsStore";
import { uploadFile } from "../lib/upload";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #d8e1da", borderRadius: 8, fontSize: 13, background: "white" };
const label: React.CSSProperties = { display: "block", color: GREEN, fontSize: 12, fontWeight: 800, marginBottom: 6 };

export function BusinessSubmitVerifiedPage() {
  const settings = getSiteSettings();
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    businessName: "", ownerName: "", category: businessCategories[0], city: "", address: "", phone: "", whatsapp: "", email: "",
    website: "", socialLinks: "", logoUrl: "", description: "", productsServices: "", discountOffer: "", sponsorshipPackage: "basic" as any,
    paymentSenderName: "", paymentMethod: "Bank Transfer", paymentReference: "", paymentProofUrl: "", additionalPhotos: [] as string[],
  });
  const set = (key: string, value: any) => { setForm((old) => ({ ...old, [key]: value })); setErrors((old) => ({ ...old, [key]: "" })); };

  const upload = (key: "logoUrl" | "paymentProofUrl") => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); setErrors((old) => ({ ...old, [key]: "" }));
    try { set(key, await uploadFile(file, key === "logoUrl" ? "business-logo" : "business-payment-proof")); }
    catch (error: any) { setErrors((old) => ({ ...old, [key]: error?.message || "Upload failed." })); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.businessName.trim()) next.businessName = "Business name is required.";
    if (!form.ownerName.trim()) next.ownerName = "Owner name is required.";
    if (!form.city.trim()) next.city = "City is required.";
    if (!form.phone.trim()) next.phone = "Phone is required.";
    if (!form.email.trim()) next.email = "Email is required.";
    if (!form.description.trim()) next.description = "Business description is required.";
    if (form.paymentSenderName.trim().length < 2) next.paymentSenderName = "Enter the sender/account-holder name exactly as shown on the slip.";
    if (!form.paymentProofUrl) next.paymentProofUrl = "Payment proof is required.";
    if (form.paymentMethod !== "Cash" && form.paymentReference.trim().length < 2) next.paymentReference = "Transaction/reference ID is required for non-cash payments.";
    setErrors(next); return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (loading || uploading || !validate()) return;
    setLoading(true); setErrors({});
    try { await createBusiness(form as any); setDone(true); }
    catch (error: any) { setErrors({ form: error?.message || "Business submission failed." }); window.scrollTo({ top: 250, behavior: "smooth" }); }
    finally { setLoading(false); }
  };

  if (done) return <div><PageHeader title="Submission Received" breadcrumb={["Home","Business Directory","Register"]}/><section style={{maxWidth:600,margin:"65px auto",padding:"0 22px",textAlign:"center"}}><CheckCircle size={48} color={GREEN}/><h2 style={{color:GREEN,fontFamily:"'Playfair Display', serif"}}>Business Profile Submitted</h2><p style={{color:"#555",lineHeight:1.8}}>Your business profile and payment proof have been received. The payment is <strong>Pending Finance Verification</strong>. Uploading a receipt does not add the amount to the ledger. Finance/Accounts must match the sender, transaction reference and slip and approve it first.</p><Link to="/business" style={button}>Back to Directory</Link></section></div>;

  return <div><PageHeader title="Register Business" subtitle="Business profile with finance-verified payment" breadcrumb={["Home","Business Directory","Register"]}/><section style={{maxWidth:850,margin:"0 auto",padding:"40px 22px 70px"}}>
    <Link to="/business" style={{display:"inline-flex",gap:6,alignItems:"center",color:GREEN,textDecoration:"none",fontWeight:800,marginBottom:18}}><ArrowLeft size={15}/>Back to Directory</Link>
    <div style={{background:"#fff9e9",border:"1px solid #ead39a",borderRadius:12,padding:18,marginBottom:20}}><h3 style={{margin:"0 0 7px",color:GREEN,fontFamily:"'Playfair Display', serif",display:"flex",gap:7,alignItems:"center"}}><DollarSign size={18} color={GOLD}/>Payment Verification</h3><p style={{margin:"0 0 12px",fontSize:12,color:"#665c45",lineHeight:1.7}}>Use an official payment method. Enter the sender/account-holder name and transaction ID exactly as shown on the slip. Finance approves the payment separately before it can affect accounting.</p><div className="pay-methods" style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:9}}>{settings.paymentMethods?.length?settings.paymentMethods.map((pm:any)=><div key={pm.id} style={{background:"white",padding:10,borderRadius:8,fontSize:11}}><b style={{color:GREEN}}>{pm.bankName}</b><div>Title: {pm.accountTitle}</div><strong>{pm.accountNo}</strong></div>):<div style={{fontSize:12,color:"#777"}}>No payment method configured. Contact the office before paying.</div>}</div></div>
    <form onSubmit={submit} style={{background:"white",border:"1px solid #e8e3da",borderRadius:14,padding:26,boxShadow:"0 5px 24px rgba(0,0,0,.05)"}}>
      {errors.form&&<div style={{background:"#fee2e2",color:"#b91c1c",padding:11,borderRadius:8,marginBottom:14}}>{errors.form}</div>}
      <Heading icon={<Briefcase size={17}/>} text="Business Information"/><div className="form-grid" style={grid}>
        <Field title="Business Name *" error={errors.businessName}><input style={input} value={form.businessName} onChange={(e)=>set("businessName",e.target.value)}/></Field>
        <Field title="Owner / Member Name *" error={errors.ownerName}><input style={input} value={form.ownerName} onChange={(e)=>set("ownerName",e.target.value)}/></Field>
        <Field title="Category"><select style={input} value={form.category} onChange={(e)=>set("category",e.target.value)}>{businessCategories.map((x)=><option key={x}>{x}</option>)}</select></Field>
        <Field title="City *" error={errors.city}><input style={input} value={form.city} onChange={(e)=>set("city",e.target.value)}/></Field>
        <Field title="Phone *" error={errors.phone}><input style={input} value={form.phone} onChange={(e)=>set("phone",e.target.value)}/></Field>
        <Field title="WhatsApp"><input style={input} value={form.whatsapp} onChange={(e)=>set("whatsapp",e.target.value)}/></Field>
        <Field title="Email *" error={errors.email}><input type="email" style={input} value={form.email} onChange={(e)=>set("email",e.target.value)}/></Field>
        <Field title="Website"><input style={input} value={form.website} onChange={(e)=>set("website",e.target.value)}/></Field>
        <div style={{gridColumn:"span 2"}}><Field title="Address"><input style={input} value={form.address} onChange={(e)=>set("address",e.target.value)}/></Field></div>
        <div style={{gridColumn:"span 2"}}><Field title="Business Description *" error={errors.description}><textarea rows={4} style={{...input,resize:"vertical"}} value={form.description} onChange={(e)=>set("description",e.target.value)}/></Field></div>
        <div style={{gridColumn:"span 2"}}><Field title="Products / Services"><input style={input} value={form.productsServices} onChange={(e)=>set("productsServices",e.target.value)}/></Field></div>
      </div>
      <Heading text="Listing Package"/><div className="packages" style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:10,marginBottom:16}}>{(Object.keys(sponsorshipPackages) as Array<keyof typeof sponsorshipPackages>).map((key)=>{const p=sponsorshipPackages[key];const active=form.sponsorshipPackage===key;return <button type="button" key={key} onClick={()=>set("sponsorshipPackage",key)} style={{textAlign:"left",border:`2px solid ${active?GOLD:"#e5e7eb"}`,background:active?"#fff9ef":"white",borderRadius:9,padding:12,cursor:"pointer"}}><b style={{color:GREEN}}>{p.name}</b><div style={{color:"#9b741b",fontWeight:800}}>{p.price}</div><small>{p.benefits}</small></button>})}</div>
      <Field title="Discount Offer for Members"><input style={input} value={form.discountOffer} onChange={(e)=>set("discountOffer",e.target.value)}/></Field>
      <Heading text="Payment Proof & Sender Details"/><div className="payment-grid" style={{display:"grid",gridTemplateColumns:"1.2fr 1fr 1.2fr",gap:10,marginBottom:14}}>
        <Field title="Sender / Account-Holder Name *" error={errors.paymentSenderName}><input style={input} value={form.paymentSenderName} onChange={(e)=>set("paymentSenderName",e.target.value)} placeholder="Exact name on slip"/></Field>
        <Field title="Payment Method *"><select style={input} value={form.paymentMethod} onChange={(e)=>set("paymentMethod",e.target.value)}><option>Bank Transfer</option><option>JazzCash</option><option>Easypaisa</option><option>Cheque</option><option>Cash</option><option>Other</option></select></Field>
        <Field title="Transaction / Reference ID" error={errors.paymentReference}><input style={input} value={form.paymentReference} onChange={(e)=>set("paymentReference",e.target.value)} placeholder={form.paymentMethod==="Cash"?"Optional for cash":"Required"}/></Field>
      </div>
      <div className="upload-grid" style={grid}><UploadBox title="Business Logo (optional)" value={form.logoUrl} loading={uploading} accept="image/*" onChange={upload("logoUrl")}/><UploadBox title="Payment Proof / Receipt *" value={form.paymentProofUrl} loading={uploading} accept="image/*,.pdf,application/pdf" onChange={upload("paymentProofUrl")} error={errors.paymentProofUrl}/></div>
      <div style={{marginTop:16}}><MultiImageUpload label="Additional Business Photos / Relevant Documents (Optional)" images={form.additionalPhotos} onChange={(images)=>set("additionalPhotos",images)}/></div>
      <p style={{background:"#f0f7f3",padding:11,borderRadius:8,color:"#526159",fontSize:12,lineHeight:1.7}}><strong>Finance control:</strong> this submission creates a pending payment proof only. No receipt or ledger credit is created until Finance approves it.</p>
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:20}}><button type="submit" disabled={loading||uploading} style={{...button,border:0,cursor:"pointer",opacity:loading||uploading?0.6:1}}>{loading?"Submitting...":"Submit Profile for Review"}</button></div>
    </form><style>{`@media(max-width:700px){.form-grid,.payment-grid,.upload-grid,.packages,.pay-methods{grid-template-columns:1fr!important}.form-grid>[style*="span 2"]{grid-column:span 1!important}input,select,textarea{font-size:16px!important}}`}</style>
  </section></div>;
}

function Field({title,error,children}:{title:string;error?:string;children:React.ReactNode}){return <div><label style={label}>{title}</label>{children}{error&&<div style={{color:"#b91c1c",fontSize:11,marginTop:4}}>{error}</div>}</div>}
function Heading({text,icon}:{text:string;icon?:React.ReactNode}){return <h3 style={{display:"flex",gap:7,alignItems:"center",color:GREEN,fontFamily:"'Playfair Display', serif",fontSize:17,borderBottom:"1px solid #eee",paddingBottom:8,margin:"24px 0 14px"}}>{icon}{text}</h3>}
function UploadBox({title,value,loading,accept,onChange,error}:{title:string;value:string;loading:boolean;accept:string;onChange:(e:React.ChangeEvent<HTMLInputElement>)=>void;error?:string}){const pdf=value.toLowerCase().includes(".pdf");return <div><label style={label}>{title}</label><label style={{minHeight:110,border:`2px dashed ${error?"#b91c1c":value?GOLD:"#ccd8cf"}`,borderRadius:9,display:"grid",placeItems:"center",padding:10,cursor:"pointer",background:value?"#fff9ef":"#fafbf9",textAlign:"center"}}>{loading?<span>Uploading...</span>:value?(pdf?<div style={{color:GREEN,fontWeight:800}}><CheckCircle size={20}/><div>PDF uploaded</div></div>:<img src={value} alt="Uploaded" style={{maxWidth:"100%",maxHeight:90,objectFit:"contain"}}/>):<div><Upload size={21} color="#999"/><div style={{fontSize:11,color:"#888"}}>Click to upload</div></div>}<input type="file" accept={accept} style={{display:"none"}} onChange={onChange}/></label>{error&&<div style={{color:"#b91c1c",fontSize:11,marginTop:4}}>{error}</div>}</div>}
const grid:React.CSSProperties={display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12,marginBottom:12};
const button:React.CSSProperties={display:"inline-block",background:GREEN,color:"white",padding:"11px 18px",borderRadius:8,textDecoration:"none",fontWeight:800,fontSize:13};
