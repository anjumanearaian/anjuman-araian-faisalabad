import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Briefcase, CheckCircle, ChevronDown, DollarSign, FileCheck2, Save, Upload } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { MultiImageUpload } from "../components/ui/MultiImageUpload";
import { businessCategories, createBusiness, sponsorshipPackages } from "../lib/businessStore";
import { fetchSiteSettings, getSiteSettings, SiteSettings } from "../lib/settingsStore";
import { uploadFile } from "../lib/upload";
import { apiClient } from "../lib/apiClient";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";
const DRAFT_KEY = "araian_business_draft_v2";
const RECENT_KEY = "araian_business_submissions";
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "11px 12px", border: "1px solid #d8e1da", borderRadius: 8, fontSize: 13, background: "white" };
const label: React.CSSProperties = { display: "block", color: GREEN, fontSize: 12, fontWeight: 800, marginBottom: 6 };

const blankForm = () => ({
  businessName: "",
  ownerName: "",
  category: "",
  city: "",
  address: "",
  phone: "",
  whatsapp: "",
  email: "",
  website: "",
  socialLinks: "",
  logoUrl: "",
  description: "",
  productsServices: "",
  discountOffer: "",
  sponsorshipPackage: "basic" as "basic" | "premium" | "vip",
  paymentMethod: "",
  paymentProofUrl: "",
  additionalPhotos: [] as string[],
});

type FormState = ReturnType<typeof blankForm>;
type SubmissionReceipt = { id: string; reference: string; businessName: string; packageName: string; createdAt: string };

function readLocalDraft(): FormState | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data ? { ...blankForm(), ...parsed.data } : null;
  } catch { return null; }
}

function completionFor(form: FormState) {
  const required = [form.businessName, form.ownerName, form.category, form.city, form.address, form.phone, form.description, form.paymentProofUrl];
  return Math.round((required.filter((v) => String(v || "").trim()).length / required.length) * 100);
}

function apiErrorText(error: any, fallback: string) {
  const details = error?.details && typeof error.details === "object"
    ? Object.entries(error.details).flatMap(([name, messages]: any) => (messages || []).map((message: string) => `${name}: ${message}`)).join(" · ")
    : "";
  return details || error?.message || fallback;
}

export function BusinessSubmitVerifiedPage() {
  const [settings, setSettings] = useState<SiteSettings>(() => getSiteSettings());
  const [form, setForm] = useState<FormState>(() => readLocalDraft() || blankForm());
  const [ready, setReady] = useState(false);
  const [receipt, setReceipt] = useState<SubmissionReceipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [draftStatus, setDraftStatus] = useState("Draft saved on this browser");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const memberToken = typeof window !== "undefined" ? localStorage.getItem("araian_member_token") : null;
  const completion = useMemo(() => completionFor(form), [form]);

  useEffect(() => {
    let active = true;
    fetchSiteSettings().then((value) => {
      if (!active) return;
      setSettings(value);
      setForm((old) => old.paymentMethod || !value.paymentMethods?.length ? old : { ...old, paymentMethod: value.paymentMethods[0].bankName });
    }).finally(() => { if (active) setReady(true); });

    if (memberToken) {
      apiClient<any>("/forms/business").then((draft) => {
        if (!active || !draft?.data) return;
        const local = readLocalDraft();
        if (!local) setForm({ ...blankForm(), ...draft.data });
      }).catch(() => {});
    }

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready || receipt) return;
    setDraftStatus("Saving draft...");
    const timer = window.setTimeout(async () => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ data: form, savedAt: new Date().toISOString() }));
        setDraftStatus(memberToken ? "Draft saved on this browser and member account" : "Draft saved on this browser");
        if (memberToken) {
          await apiClient("/forms/business", {
            method: "PUT",
            body: JSON.stringify({ data: form, currentStep: completion < 55 ? 1 : completion < 100 ? 2 : 3, completion, status: "incomplete", paymentStatus: form.paymentProofUrl ? "submitted" : "pending" }),
          });
        }
      } catch {
        setDraftStatus("Draft saved on this browser");
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [form, ready, receipt, completion, memberToken]);

  const set = (key: keyof FormState, value: any) => {
    setForm((old) => {
      if (key === "phone") {
        const nextPhone = String(value);
        const shouldMirror = !old.whatsapp || old.whatsapp === old.phone;
        return { ...old, phone: nextPhone, whatsapp: shouldMirror ? nextPhone : old.whatsapp };
      }
      return { ...old, [key]: value };
    });
    setErrors((old) => ({ ...old, [key]: "" }));
  };

  const upload = (key: "logoUrl" | "paymentProofUrl") => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setErrors((old) => ({ ...old, [key]: "" }));
    try {
      set(key, await uploadFile(file, key === "logoUrl" ? "business-logo" : "business-payment-proof"));
    } catch (error: any) {
      setErrors((old) => ({ ...old, [key]: apiErrorText(error, "Upload failed.") }));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.businessName.trim()) next.businessName = "Business name is required.";
    if (!form.ownerName.trim()) next.ownerName = "Contact person is required.";
    if (!form.category.trim()) next.category = "Please select a category.";
    if (!form.city.trim()) next.city = "City is required.";
    if (!form.address.trim()) next.address = "Business address is required.";
    if (!form.phone.trim()) next.phone = "Phone is required.";
    if (!form.description.trim()) next.description = "A short business description is required.";
    if (!form.paymentProofUrl) next.paymentProofUrl = "Please upload the payment slip / receipt.";
    setErrors(next);
    if (Object.keys(next).length) {
      window.setTimeout(() => document.querySelector('[data-form-error="true"]')?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
      return false;
    }
    return true;
  };

  const clearDraft = () => {
    if (!window.confirm("Clear the saved business draft on this browser?")) return;
    localStorage.removeItem(DRAFT_KEY);
    setForm({ ...blankForm(), paymentMethod: settings.paymentMethods?.[0]?.bankName || "" });
    setErrors({});
    setDraftStatus("New form");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || uploading || !validate()) return;
    setLoading(true); setErrors({});
    try {
      const created = await createBusiness({
        ...form,
        paymentSenderName: form.ownerName.trim(),
        paymentReference: "",
      } as any);
      const reference = `BUS-${String(created.id).slice(0, 8).toUpperCase()}`;
      const nextReceipt = {
        id: created.id,
        reference,
        businessName: created.businessName,
        packageName: sponsorshipPackages[created.sponsorshipPackage]?.name || "Business Listing",
        createdAt: created.createdAt || new Date().toISOString(),
      };
      setReceipt(nextReceipt);
      localStorage.removeItem(DRAFT_KEY);
      try {
        const existing = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
        localStorage.setItem(RECENT_KEY, JSON.stringify([nextReceipt, ...existing.filter((x: any) => x?.id !== created.id)].slice(0, 20)));
      } catch {}
      if (memberToken) {
        apiClient("/forms/business", {
          method: "PUT",
          body: JSON.stringify({ data: { ...form, submittedBusinessId: created.id, submissionReference: reference }, currentStep: 3, completion: 100, status: "submitted", paymentStatus: "submitted" }),
        }).catch(() => {});
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error: any) {
      setErrors({ form: apiErrorText(error, "Business submission failed. Please check the highlighted information and try again.") });
      window.scrollTo({ top: 260, behavior: "smooth" });
    } finally { setLoading(false); }
  };

  if (receipt) {
    return (
      <div>
        <PageHeader title="Submission Received" breadcrumb={["Home", "Business Directory", "Register"]}/>
        <section style={{ maxWidth: 650, margin: "58px auto", padding: "0 22px" }}>
          <div style={{ background: "white", border: "1px solid #e8e3da", borderRadius: 16, padding: 30, boxShadow: "0 8px 30px rgba(0,0,0,.06)", textAlign: "center" }}>
            <CheckCircle size={52} color={GREEN}/>
            <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", marginBottom: 7 }}>Business Profile Submitted</h2>
            <p style={{ color: "#555", lineHeight: 1.75, marginTop: 0 }}>Your profile and payment proof are safely recorded and have been sent for admin and Accounts/Finance review.</p>
            <div style={{ background: "#f8f5ef", borderRadius: 12, padding: 18, margin: "20px 0", textAlign: "left" }}>
              <ReceiptRow title="Submission Reference" value={receipt.reference}/>
              <ReceiptRow title="Business" value={receipt.businessName}/>
              <ReceiptRow title="Package" value={receipt.packageName}/>
              <ReceiptRow title="Listing Status" value="Pending Review"/>
              <ReceiptRow title="Payment Status" value="Receipt Submitted"/>
            </div>
            <p style={{ fontSize: 12, color: "#777", lineHeight: 1.6 }}>Keep the reference above for your record. A copy of this submission reference is also saved on this browser. Logged-in members also retain the submitted draft in their account.</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
              <button type="button" onClick={() => window.print()} style={secondaryButton}><Save size={14}/> Print / Save Record</button>
              <Link to="/business" style={button}>Back to Directory</Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Register Business" subtitle="A simple business profile with payment proof for verified directory listing" breadcrumb={["Home", "Business Directory", "Register"]}/>
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "34px 22px 70px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
          <Link to="/business" style={{ display: "inline-flex", gap: 6, alignItems: "center", color: GREEN, textDecoration: "none", fontWeight: 800 }}><ArrowLeft size={15}/>Back to Directory</Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "#647067" }}><Save size={13}/>{draftStatus}<button type="button" onClick={clearDraft} style={{ border: 0, background: "transparent", color: "#9b2c2c", cursor: "pointer", fontWeight: 800, fontSize: 11 }}>Clear</button></div>
        </div>

        <div style={{ background: "#f0f7f3", border: "1px solid #d9e9df", borderRadius: 12, padding: 14, marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}><strong style={{ color: GREEN, fontSize: 12 }}>Form progress</strong><span style={{ color: GREEN, fontWeight: 800, fontSize: 12 }}>{completion}%</span></div>
          <div style={{ height: 6, background: "#dce8e0", borderRadius: 10, marginTop: 8, overflow: "hidden" }}><div style={{ width: `${completion}%`, height: "100%", background: GREEN, transition: "width .2s ease" }}/></div>
        </div>

        <form onSubmit={submit} style={{ background: "white", border: "1px solid #e8e3da", borderRadius: 15, padding: 26, boxShadow: "0 5px 24px rgba(0,0,0,.05)" }}>
          {errors.form && <div style={{ background: "#fee2e2", color: "#b91c1c", padding: 12, borderRadius: 8, marginBottom: 16, lineHeight: 1.6 }}>{errors.form}</div>}
          {Object.keys(errors).filter((k) => k !== "form").length > 0 && <div style={{ background: "#fff7ed", color: "#9a3412", padding: 11, borderRadius: 8, marginBottom: 14, fontWeight: 700, fontSize: 12 }}>Please complete the highlighted fields. Optional fields can be skipped.</div>}

          <StepHeading step="1" icon={<Briefcase size={17}/>} title="Business Details" subtitle="Only the essential information needed for your public listing."/>
          <div className="form-grid" style={grid}>
            <Field title="Business Name *" error={errors.businessName}><input autoComplete="organization" style={errorInput(errors.businessName)} value={form.businessName} onChange={(e) => set("businessName", e.target.value)}/></Field>
            <Field title="Contact Person *" error={errors.ownerName}><input autoComplete="name" style={errorInput(errors.ownerName)} value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)}/></Field>
            <Field title="Category *" error={errors.category}><select style={errorInput(errors.category)} value={form.category} onChange={(e) => set("category", e.target.value)}><option value="">Select category</option>{businessCategories.map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field title="City *" error={errors.city}><input autoComplete="address-level2" style={errorInput(errors.city)} value={form.city} onChange={(e) => set("city", e.target.value)}/></Field>
            <Field title="Phone *" error={errors.phone}><input inputMode="tel" autoComplete="tel" style={errorInput(errors.phone)} value={form.phone} onChange={(e) => set("phone", e.target.value)}/></Field>
            <Field title="Email (optional)"><input type="email" autoComplete="email" style={input} value={form.email} onChange={(e) => set("email", e.target.value)}/></Field>
            <div style={{ gridColumn: "span 2" }}><Field title="Business Address *" error={errors.address}><input autoComplete="street-address" style={errorInput(errors.address)} value={form.address} onChange={(e) => set("address", e.target.value)}/></Field></div>
            <div style={{ gridColumn: "span 2" }}><Field title="Short Business Description *" error={errors.description}><textarea rows={3} maxLength={2000} style={{ ...errorInput(errors.description), resize: "vertical" }} placeholder="What does your business do?" value={form.description} onChange={(e) => set("description", e.target.value)}/></Field></div>
          </div>

          <StepHeading step="2" title="Choose Listing Package" subtitle="Select the package you want published in the directory."/>
          <div className="packages" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10, marginBottom: 10 }}>
            {(Object.keys(sponsorshipPackages) as Array<keyof typeof sponsorshipPackages>).map((key) => {
              const p = sponsorshipPackages[key];
              const active = form.sponsorshipPackage === key;
              return <button type="button" key={key} onClick={() => set("sponsorshipPackage", key)} style={{ textAlign: "left", border: `2px solid ${active ? GOLD : "#e5e7eb"}`, background: active ? "#fff9ef" : "white", borderRadius: 9, padding: 13, cursor: "pointer" }}><b style={{ color: GREEN }}>{p.name}</b><div style={{ color: "#9b741b", fontWeight: 800, margin: "3px 0" }}>{p.price}</div><small style={{ lineHeight: 1.45 }}>{p.benefits}</small></button>;
            })}
          </div>

          <StepHeading step="3" icon={<DollarSign size={17}/>} title="Payment Proof" subtitle="No transaction number or sender name is required. Select the account used and upload the slip."/>
          <div className="pay-methods" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9, marginBottom: 14 }}>
            {settings.paymentMethods?.length ? settings.paymentMethods.map((pm) => {
              const active = form.paymentMethod === pm.bankName;
              return <button type="button" key={pm.id} onClick={() => set("paymentMethod", pm.bankName)} style={{ textAlign: "left", background: active ? "#f0f7f3" : "#fafafa", border: `1px solid ${active ? GREEN : "#e5e7eb"}`, borderRadius: 9, padding: 12, cursor: "pointer" }}><strong style={{ color: GREEN, display: "block" }}>{pm.bankName}</strong><span style={{ fontSize: 11, color: "#666", display: "block", marginTop: 3 }}>{pm.accountTitle}</span><span style={{ fontSize: 12, fontWeight: 800 }}>{pm.accountNo}</span></button>;
            }) : <div style={{ fontSize: 12, color: "#777" }}>No payment method is configured. Please contact the office.</div>}
          </div>
          <div style={{ maxWidth: 430 }}><UploadBox title="Payment Slip / Receipt *" value={form.paymentProofUrl} loading={uploading} accept="image/*,.pdf,application/pdf" onChange={upload("paymentProofUrl")} error={errors.paymentProofUrl}/></div>

          <details style={{ marginTop: 22, border: "1px solid #e5e7eb", borderRadius: 10, padding: "0 14px" }}>
            <summary style={{ padding: "13px 0", cursor: "pointer", color: GREEN, fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", gap: 7 }}><ChevronDown size={15}/>Add more business details (optional)</summary>
            <p style={{ margin: "0 0 13px", color: "#777", fontSize: 11, lineHeight: 1.6 }}>These fields improve your directory profile but are not required to submit.</p>
            <div className="form-grid" style={grid}>
              <Field title="WhatsApp"><input inputMode="tel" style={input} value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)}/></Field>
              <Field title="Website"><input type="url" placeholder="https://example.com" style={input} value={form.website} onChange={(e) => set("website", e.target.value)}/></Field>
              <div style={{ gridColumn: "span 2" }}><Field title="Products / Services"><textarea rows={2} style={{ ...input, resize: "vertical" }} value={form.productsServices} onChange={(e) => set("productsServices", e.target.value)}/></Field></div>
              <div style={{ gridColumn: "span 2" }}><Field title="Discount / Offer for Anjuman Members"><input style={input} value={form.discountOffer} onChange={(e) => set("discountOffer", e.target.value)}/></Field></div>
              <div style={{ gridColumn: "span 2" }}><Field title="Social Links"><input placeholder="Facebook, Instagram, LinkedIn or other profile links" style={input} value={form.socialLinks} onChange={(e) => set("socialLinks", e.target.value)}/></Field></div>
              <UploadBox title="Business Logo" value={form.logoUrl} loading={uploading} accept="image/*" onChange={upload("logoUrl")} previewImage/>
            </div>
            <div style={{ marginBottom: 16 }}><MultiImageUpload label="Business Photos / Supporting Documents" images={form.additionalPhotos} onChange={(images) => set("additionalPhotos", images)}/></div>
          </details>

          <div style={{ background: "#f0f7f3", padding: 12, borderRadius: 8, color: "#526159", fontSize: 12, lineHeight: 1.65, marginTop: 18 }}><strong>What happens next:</strong> your listing stays Pending Review. Admin checks the profile and payment proof, and Accounts/Finance performs final payment verification before ledger posting.</div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}><button type="submit" disabled={loading || uploading} style={{ ...button, border: 0, cursor: "pointer", opacity: loading || uploading ? 0.6 : 1 }}>{loading ? "Submitting..." : "Submit Business for Review"}</button></div>
        </form>
        <style>{`@media(max-width:700px){.form-grid,.packages,.pay-methods{grid-template-columns:1fr!important}.form-grid>[style*="span 2"]{grid-column:span 1!important}input,select,textarea{font-size:16px!important}}@media print{header,nav,footer,.no-print{display:none!important}body{background:white!important}}`}</style>
      </section>
    </div>
  );
}

function Field({ title, error, children }: { title: string; error?: string; children: React.ReactNode }) {
  return <div data-form-error={error ? "true" : undefined}><label style={label}>{title}</label>{children}{error && <div style={{ color: "#b91c1c", fontSize: 11, marginTop: 4 }}>{error}</div>}</div>;
}

function StepHeading({ step, title, subtitle, icon }: { step: string; title: string; subtitle: string; icon?: React.ReactNode }) {
  return <div style={{ borderBottom: "1px solid #eee", paddingBottom: 9, margin: "24px 0 14px" }}><div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ width: 24, height: 24, display: "grid", placeItems: "center", borderRadius: "50%", background: GREEN, color: "white", fontWeight: 800, fontSize: 11 }}>{step}</span>{icon}<h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 18, margin: 0 }}>{title}</h3></div><p style={{ margin: "5px 0 0 32px", color: "#777", fontSize: 11, lineHeight: 1.5 }}>{subtitle}</p></div>;
}

function UploadBox({ title, value, loading, accept, onChange, error, previewImage = false }: { title: string; value: string; loading: boolean; accept: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; error?: string; previewImage?: boolean }) {
  return <div data-form-error={error ? "true" : undefined}><label style={label}>{title}</label><label style={{ minHeight: 108, border: `2px dashed ${error ? "#b91c1c" : value ? GOLD : "#ccd8cf"}`, borderRadius: 9, display: "grid", placeItems: "center", padding: 10, cursor: "pointer", background: value ? "#fff9ef" : "#fafbf9", textAlign: "center" }}>{loading ? <span>Uploading...</span> : value ? (previewImage ? <img src={value} alt="Business logo preview" style={{ maxWidth: "100%", maxHeight: 90, objectFit: "contain" }}/> : <div style={{ color: GREEN, fontWeight: 800 }}><FileCheck2 size={22}/><div>File uploaded</div><small style={{ color: "#777", fontWeight: 400 }}>Click to replace</small></div>) : <div><Upload size={21} color="#999"/><div style={{ fontSize: 11, color: "#888" }}>Click to upload image or PDF</div></div>}<input type="file" accept={accept} style={{ display: "none" }} onChange={onChange}/></label>{error && <div style={{ color: "#b91c1c", fontSize: 11, marginTop: 4 }}>{error}</div>}</div>;
}

function ReceiptRow({ title, value }: { title: string; value: string }) {
  return <div style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "7px 0", borderBottom: "1px solid #ebe7df" }}><span style={{ color: "#777", fontSize: 12 }}>{title}</span><strong style={{ color: "#26382d", fontSize: 12, textAlign: "right" }}>{value}</strong></div>;
}

function errorInput(error?: string): React.CSSProperties {
  return error ? { ...input, border: "1px solid #b91c1c", boxShadow: "0 0 0 2px rgba(185,28,28,.08)" } : input;
}

const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12, marginBottom: 12 };
const button: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, background: GREEN, color: "white", padding: "11px 18px", borderRadius: 8, textDecoration: "none", fontWeight: 800, fontSize: 13 };
const secondaryButton: React.CSSProperties = { ...button, background: "white", color: GREEN, border: "1px solid #cad8cf", cursor: "pointer" };
