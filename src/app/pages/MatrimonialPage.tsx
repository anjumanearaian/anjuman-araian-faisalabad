import { useState, useEffect, useRef } from "react";
import { PageHeader } from "../components/PageHeader";
import { Heart, CheckCircle, Upload, DollarSign, Star, Loader2, Send } from "lucide-react";
import { createMatrimonial, MatrimonialProfile } from "../lib/matrimonialStore";
import { getSiteSettings } from "../lib/settingsStore";
import { MultiImageUpload } from "../components/ui/MultiImageUpload";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

const blank = {
  name: "", age: "", gender: "male", city: "", education: "", profession: "",
  familyBackground: "", requirements: "", contact: "", photoUrl: "", paymentProofUrl: "",
  additionalPhotos: [] as string[], packageId: ""
};

const API_BASE = "/api";

export function MatrimonialPage() {
  const settings = getSiteSettings();
  const [form, setForm] = useState(blank);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitStep, setSubmitStep] = useState(""); // progress message
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isSubmitting = useRef(false); // guard against double submit

  useEffect(() => {
    if (!form.packageId && settings.matrimonialPackages && settings.matrimonialPackages.length > 0) {
      setForm(f => ({ ...f, packageId: settings.matrimonialPackages![0].id }));
    }
  }, [settings.matrimonialPackages]);

  const f = (key: string, val: string) => {
    setForm((p) => ({ ...p, [key]: val }));
    if (errors[key]) {
      setErrors((err) => ({ ...err, [key]: "" }));
    }
  };

  const handleFileUpload = (key: string) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrors((err) => ({ ...err, [key]: "File size must be less than 5MB" }));
      return;
    }

    setUploading(u => ({ ...u, [key]: true }));
    setErrors(err => ({ ...err, [key]: "" }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }
      const { url } = await res.json();
      // Use relative URL — vite proxy handles /uploads -> backend
      f(key, url);
    } catch (err: any) {
      setErrors(er => ({ ...er, [key]: err.message || "Upload failed. Try again." }));
    } finally {
      setUploading(u => ({ ...u, [key]: false }));
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Name is required.";
    if (!form.age.trim()) errs.age = "Age is required.";
    if (!form.city.trim()) errs.city = "City is required.";
    if (!form.education.trim()) errs.education = "Education is required.";
    if (!form.profession.trim()) errs.profession = "Profession is required.";
    if (!form.contact.trim()) errs.contact = "Contact number is required.";
    if (!form.paymentProofUrl) errs.paymentProofUrl = "Payment proof/receipt is required.";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ── Double-submit guard ──────────────────────────────────────
    if (isSubmitting.current || loading) return;

    if (!validate()) {
      window.scrollTo({ top: 200, behavior: "smooth" });
      return;
    }

    isSubmitting.current = true;
    setLoading(true);
    setSubmitStep("Saving your profile...");

    try {
      // Small artificial delay so user sees the step message
      await new Promise(r => setTimeout(r, 400));
      setSubmitStep("Submitting to Anjuman committee...");
      await createMatrimonial(form as any);
      setSubmitStep("Done!");
      await new Promise(r => setTimeout(r, 300));
      setSubmitted(true);
    } catch (err: any) {
      if (err.details) {
        const backendErrors: Record<string, string> = {};
        for (const key in err.details) {
          backendErrors[key] = err.details[key][0];
        }
        setErrors(backendErrors);
        window.scrollTo({ top: 300, behavior: "smooth" });
      } else {
        setErrors({ form: err.message || "Submission failed. Please try again." });
        window.scrollTo({ top: 200, behavior: "smooth" });
      }
    } finally {
      setLoading(false);
      setSubmitStep("");
      isSubmitting.current = false;
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", border: `1px solid rgba(26,77,46,0.2)`,
    borderRadius: 7, fontSize: 14, boxSizing: "border-box", fontFamily: "'Poppins', sans-serif"
  };
  const labelStyle: React.CSSProperties = { display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 };

  return (
    <div>
      <PageHeader title="Matrimonial Service" subtitle="A trusted platform for Araian community members seeking a life partner" breadcrumb={["Home", "Matrimonial"]} />

      {/* Notice */}
      <div style={{ backgroundColor: "#f0f7f3", borderTop: `3px solid ${GOLD}`, padding: "24px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", gap: 14, alignItems: "flex-start" }}>
          <Heart size={22} color={GOLD} style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ color: "#444", fontSize: 14, lineHeight: 1.8, margin: 0 }}>
            This matrimonial service is provided exclusively for members of the Araian community. <strong>All submissions are strictly confidential and will only be visible to authorized administrators.</strong> We do not publish matrimonial profiles publicly without explicit written consent.
          </p>
        </div>
      </div>

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "40px 16px" }} className="matrimonial-section">
        {submitted ? (
          <div style={{ textAlign: "center", padding: "64px 0" }}>
            <CheckCircle size={56} color={GREEN} style={{ margin: "0 auto 16px" }} />
            <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, marginBottom: 10 }}>Profile Submitted!</h3>
            <p style={{ color: "#666", fontSize: 15, lineHeight: 1.8, maxWidth: 520, margin: "0 auto" }}>
              Thank you! Your matrimonial profile and payment receipt have been securely submitted to the Anjuman Matrimonial Committee. We will verify your details and contact you shortly. May Allah bless you in your search.
            </p>
          </div>
        ) : (
          <>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Register Matrimonial Profile</h2>
              <div style={{ width: 56, height: 3, backgroundColor: GOLD, borderRadius: 2, margin: "0 auto 16px" }} />
              <p style={{ color: "#666", fontSize: 14, lineHeight: 1.8 }}>
                Please fill in the details below. Select a package and follow the payment instructions to verify your profile.
              </p>
            </div>

            {/* Package Selection */}
            {settings.matrimonialPackages && settings.matrimonialPackages.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Select Package</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
                  {settings.matrimonialPackages.map(pkg => (
                    <div 
                      key={pkg.id} 
                      onClick={() => f("packageId", pkg.id)}
                      style={{ 
                        border: `2px solid ${form.packageId === pkg.id ? GOLD : "#eee"}`, 
                        borderRadius: 12, padding: 20, cursor: "pointer", 
                        backgroundColor: form.packageId === pkg.id ? "#fff9ef" : "white",
                        position: "relative", transition: "all 0.2s"
                      }}
                    >
                      {pkg.isFeatured && (
                        <span style={{ position: "absolute", top: -10, right: 16, backgroundColor: GOLD, color: "white", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, display: "flex", alignItems: "center", gap: 4 }}>
                          <Star size={12} fill="white" /> Featured
                        </span>
                      )}
                      <h4 style={{ margin: "0 0 8px 0", color: GREEN, fontSize: 16, fontWeight: 700 }}>{pkg.name}</h4>
                      <div style={{ color: GOLD, fontSize: 20, fontWeight: 700, fontFamily: "'Playfair Display', serif", marginBottom: 12 }}>{pkg.fee}</div>
                      {pkg.description && <p style={{ color: "#666", fontSize: 13, margin: 0, lineHeight: 1.5 }}>{pkg.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment info block */}
            <div style={{ backgroundColor: "#fff9ef", border: `1px solid rgba(200,160,74,0.3)`, borderRadius: 12, padding: "24px 28px", marginBottom: 32 }}>
              <h4 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, margin: "0 0 10px 0", display: "flex", alignItems: "center", gap: 8 }}>
                <DollarSign size={20} color={GOLD} /> Fee Payment Instructions
              </h4>
              <p style={{ color: "#555", fontSize: 13, lineHeight: 1.7, margin: "0 0 16px 0" }}>
                Please transfer the fee for your selected package to any of the accounts below. Take a screenshot or photo of the receipt to upload in this form.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, fontSize: 13 }} className="payment-cols">
                {settings.paymentMethods && settings.paymentMethods.length > 0 ? (
                  settings.paymentMethods.map(pm => (
                    <div key={pm.id} style={{ backgroundColor: "white", padding: 16, borderRadius: 8, border: "1px solid #eee", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                      <strong style={{ color: GREEN, display: "block", marginBottom: 4 }}>{pm.bankName}</strong>
                      <span style={{ color: "#666", display: "block", marginBottom: 2 }}>Title: {pm.accountTitle}</span>
                      <strong style={{ color: "#333", fontSize: 14 }}>{pm.accountNo}</strong>
                    </div>
                  ))
                ) : (
                  <div style={{ backgroundColor: "white", padding: 12, borderRadius: 6, border: "1px solid #eee" }}>
                    No payment methods configured yet.
                  </div>
                )}
              </div>
            </div>

            {/* ── Submitting overlay banner ────────────────── */}
            {loading && (
              <div style={{
                backgroundColor: GREEN, color: "white", borderRadius: 10,
                padding: "14px 20px", marginBottom: 16,
                display: "flex", alignItems: "center", gap: 12,
                boxShadow: "0 4px 16px rgba(26,77,46,0.25)",
                animation: "fadeSlideIn 0.25s ease"
              }}>
                <Loader2 size={20} className="spin" />
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>جمع ہو رہا ہے...</p>
                  <p style={{ margin: 0, fontSize: 12, opacity: 0.85 }}>{submitStep}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ backgroundColor: "white", borderRadius: 14, padding: "32px 28px", boxShadow: "0 4px 24px rgba(0,0,0,0.07)", border: `1px solid rgba(26,77,46,0.08)`, opacity: loading ? 0.55 : 1, pointerEvents: loading ? "none" : "auto", transition: "opacity 0.2s", position: "relative" }} className="matrimonial-form">
              {errors.form && (
                <div style={{ backgroundColor: "#fee2e2", color: "#dc2626", padding: "12px 16px", borderRadius: 8, marginBottom: 24, fontSize: 14, fontWeight: 600 }}>
                  {errors.form}
                </div>
              )}
              <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, marginBottom: 20, paddingBottom: 10, borderBottom: `2px solid #f0f0f0` }}>Candidate Information</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }} className="form-2col">
                <div>
                  <label style={labelStyle}>Full Name *</label>
                  <input style={inputStyle} value={form.name} onChange={(e) => f("name", e.target.value)} placeholder="Candidate's Name" />
                  {errors.name && <span style={{ color: "#dc2626", fontSize: 12 }}>{errors.name}</span>}
                </div>
                <div>
                  <label style={labelStyle}>Age *</label>
                  <input type="number" min={18} max={70} style={inputStyle} value={form.age} onChange={(e) => f("age", e.target.value)} placeholder="e.g. 26" />
                  {errors.age && <span style={{ color: "#dc2626", fontSize: 12 }}>{errors.age}</span>}
                </div>
                <div>
                  <label style={labelStyle}>Gender *</label>
                  <select style={inputStyle} value={form.gender} onChange={(e) => f("gender", e.target.value)}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>City / Location *</label>
                  <input style={inputStyle} value={form.city} onChange={(e) => f("city", e.target.value)} placeholder="e.g. Faisalabad" />
                  {errors.city && <span style={{ color: "#dc2626", fontSize: 12 }}>{errors.city}</span>}
                </div>
                <div>
                  <label style={labelStyle}>Education *</label>
                  <input style={inputStyle} value={form.education} onChange={(e) => f("education", e.target.value)} placeholder="e.g. BS Software Engineering" />
                  {errors.education && <span style={{ color: "#dc2626", fontSize: 12 }}>{errors.education}</span>}
                </div>
                <div>
                  <label style={labelStyle}>Profession *</label>
                  <input style={inputStyle} value={form.profession} onChange={(e) => f("profession", e.target.value)} placeholder="e.g. Software Engineer, Doctor" />
                  {errors.profession && <span style={{ color: "#dc2626", fontSize: 12 }}>{errors.profession}</span>}
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={labelStyle}>Contact / WhatsApp Number *</label>
                  <input style={inputStyle} value={form.contact} onChange={(e) => f("contact", e.target.value)} placeholder="e.g. +92 300 123 4567" />
                  {errors.contact && <span style={{ color: "#dc2626", fontSize: 12 }}>{errors.contact}</span>}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Family Background and Details</label>
                <textarea rows={3} style={{ ...inputStyle, resize: "vertical" }} value={form.familyBackground} onChange={(e) => f("familyBackground", e.target.value)} placeholder="Describe family roots, siblings, father's occupation, etc." />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Partner Requirements / Proposal Details</label>
                <textarea rows={3} style={{ ...inputStyle, resize: "vertical" }} value={form.requirements} onChange={(e) => f("requirements", e.target.value)} placeholder="Age, education, city preferences, etc." />
              </div>

              {/* Upload Files */}
              <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, marginBottom: 20, paddingBottom: 10, borderBottom: `2px solid #f0f0f0` }}>Document and Payment Upload</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }} className="form-2col">
                <div>
                  <label style={labelStyle}>Candidate Photo (Optional)</label>
                  <label style={{ display: "block", border: `2px dashed ${form.photoUrl ? GOLD : "rgba(26,77,46,0.2)"}`, borderRadius: 10, padding: "16px 12px", textAlign: "center", cursor: uploading.photoUrl ? "wait" : "pointer", backgroundColor: form.photoUrl ? "#fff9ef" : "#fafaf8", opacity: uploading.photoUrl ? 0.7 : 1 }}>
                    {uploading.photoUrl ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        <Loader2 size={22} color={GREEN} className="spin" />
                        <p style={{ color: GREEN, fontSize: 12, margin: 0 }}>Uploading...</p>
                      </div>
                    ) : form.photoUrl ? (
                      <img src={form.photoUrl} alt="candidate preview" style={{ width: "100%", height: 90, objectFit: "contain", borderRadius: 6 }} />
                    ) : (
                      <div>
                        <Upload size={22} color="#9ca3af" style={{ margin: "0 auto 6px" }} />
                        <p style={{ color: "#9ca3af", fontSize: 12, margin: 0 }}>Click to upload Photo</p>
                      </div>
                    )}
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileUpload("photoUrl")} disabled={uploading.photoUrl} />
                  </label>
                </div>

                <div>
                  <label style={labelStyle}>Payment Proof Receipt *</label>
                  <label style={{ display: "block", border: `2px dashed ${form.paymentProofUrl ? GOLD : errors.paymentProofUrl ? "#dc2626" : "rgba(26,77,46,0.2)"}`, borderRadius: 10, padding: "16px 12px", textAlign: "center", cursor: uploading.paymentProofUrl ? "wait" : "pointer", backgroundColor: form.paymentProofUrl ? "#fff9ef" : "#fafaf8", opacity: uploading.paymentProofUrl ? 0.7 : 1 }}>
                    {uploading.paymentProofUrl ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        <Loader2 size={22} color={GREEN} className="spin" />
                        <p style={{ color: GREEN, fontSize: 12, margin: 0 }}>Uploading...</p>
                      </div>
                    ) : form.paymentProofUrl ? (
                      <img src={form.paymentProofUrl} alt="payment proof preview" style={{ width: "100%", height: 90, objectFit: "contain", borderRadius: 6 }} />
                    ) : (
                      <div>
                        <Upload size={22} color="#9ca3af" style={{ margin: "0 auto 6px" }} />
                        <p style={{ color: "#9ca3af", fontSize: 12, margin: 0 }}>Upload Payment Receipt</p>
                      </div>
                    )}
                    <input type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={handleFileUpload("paymentProofUrl")} disabled={uploading.paymentProofUrl} />
                  </label>
                  {errors.paymentProofUrl && <span style={{ color: "#dc2626", fontSize: 12 }}>{errors.paymentProofUrl}</span>}
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <MultiImageUpload
                  label="Additional Candidate Photos (Optional)"
                  images={form.additionalPhotos}
                  onChange={(imgs) => f("additionalPhotos", imgs as any)}
                />
              </div>

              {/* Live Preview Card */}
              <div style={{ backgroundColor: "#f8f5ef", border: "1px solid rgba(26,77,46,0.1)", borderRadius: 12, padding: 24, marginBottom: 32 }}>
                <h4 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, margin: "0 0 12px 0" }}>Live Card Preview</h4>
                <div style={{ backgroundColor: "white", borderRadius: 8, padding: 18, border: `1px solid ${GOLD}`, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ width: 80, height: 80, borderRadius: "50%", backgroundColor: "#f0f7f3", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                    {form.photoUrl ? (
                      <img src={form.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <Heart size={24} color={GREEN} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <h5 style={{ color: GREEN, fontSize: 16, fontWeight: 700, margin: "0 0 4px 0" }}>{form.name || "Candidate Name"}</h5>
                    <p style={{ color: "#777", fontSize: 12, margin: "0 0 8px 0" }}>{form.gender} | {form.age || "—"} Years | {form.city || "—"}</p>
                    <p style={{ fontSize: 13, color: "#444", margin: "0 0 4px 0" }}><strong>Education:</strong> {form.education || "—"}</p>
                    <p style={{ fontSize: 13, color: "#444", margin: "0 0 8px 0" }}><strong>Profession:</strong> {form.profession || "—"}</p>
                    {form.requirements && <p style={{ fontSize: 12, color: "#666", margin: 0, fontStyle: "italic" }}>Requirements: {form.requirements}</p>}
                  </div>
                </div>
              </div>

              <div className="submit-row" style={{ display: "flex", justifyContent: "flex-end", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                {loading && (
                  <span style={{ color: GREEN, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    <Loader2 size={15} className="spin" />
                    {submitStep || "Please wait..."}
                  </span>
                )}
                <button
                  type="submit"
                  disabled={loading || Object.values(uploading).some(Boolean)}
                  style={{
                    backgroundColor: loading ? "#6b9a7a" : GREEN,
                    color: "white", border: "none", borderRadius: 8,
                    padding: "13px 32px", fontWeight: 700, fontSize: 14,
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", gap: 8,
                    transition: "all 0.2s", minWidth: 200, justifyContent: "center",
                    boxShadow: loading ? "none" : "0 4px 12px rgba(26,77,46,0.25)"
                  }}
                >
                  {loading ? (
                    <><Loader2 size={16} className="spin" /> Submitting...</>
                  ) : Object.values(uploading).some(Boolean) ? (
                    <><Loader2 size={16} className="spin" /> Uploading files...</>
                  ) : (
                    <><Send size={16} /> Submit Matrimonial Profile</>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </section>

      <style>{`
        /* ── Mobile Responsiveness ── */
        @media (max-width: 640px) {
          .matrimonial-section {
            padding: 24px 12px !important;
          }
          .matrimonial-form {
            padding: 20px 16px !important;
            border-radius: 10px !important;
          }
          .form-2col, .payment-cols {
            grid-template-columns: 1fr !important;
          }
          .submit-row {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .submit-row button {
            width: 100% !important;
            min-width: unset !important;
            justify-content: center !important;
          }
          .submit-row span {
            justify-content: center !important;
            text-align: center;
          }
        }
        /* ── Animations ── */
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 0.9s linear infinite;
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        /* ── Inputs focus ── */
        input:focus, select:focus, textarea:focus {
          outline: none;
          border-color: #1a4d2e !important;
          box-shadow: 0 0 0 3px rgba(26,77,46,0.1);
        }
      `}</style>
    </div>
  );
}
