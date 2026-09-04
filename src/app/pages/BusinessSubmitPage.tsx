import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { PageHeader } from "../components/PageHeader";
import { Upload, CheckCircle, Briefcase, DollarSign, ArrowLeft } from "lucide-react";
import { createBusiness, businessCategories, sponsorshipPackages, Business } from "../lib/businessStore";
import { MultiImageUpload } from "../components/ui/MultiImageUpload";
import { uploadFile } from "../lib/upload";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

export function BusinessSubmitPage() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    businessName: "",
    ownerName: "",
    category: businessCategories[0],
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
    sponsorshipPackage: "basic" as any,
    paymentProofUrl: "",
    additionalPhotos: [] as string[]
  });

  const set = (key: string, val: any) => {
    setForm((p) => ({ ...p, [key]: val }));
    if (errors[key]) {
      setErrors((err) => ({ ...err, [key]: "" }));
    }
  };

  const handleFileUpload = (key: string) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setErrors((err) => ({ ...err, [key]: "File size must be less than 4MB" }));
      return;
    }
    setUploading((u) => ({ ...u, [key]: true }));
    setErrors((err) => ({ ...err, [key]: "" }));
    try {
      const url = await uploadFile(file);
      set(key, url);
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, [key]: err?.message || "Upload failed. Please try again." }));
    } finally {
      setUploading((u) => ({ ...u, [key]: false }));
      e.target.value = "";
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.businessName.trim()) errs.businessName = "Business name is required.";
    if (!form.ownerName.trim()) errs.ownerName = "Owner name is required.";
    if (!form.city.trim()) errs.city = "City is required.";
    if (!form.phone.trim()) errs.phone = "Phone number is required.";
    if (!form.email.trim()) errs.email = "Email is required.";
    if (!form.description.trim()) errs.description = "Business description is required.";
    if (!form.paymentProofUrl) errs.paymentProofUrl = "Payment receipt upload is required.";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.values(uploading).some(Boolean)) {
      setErrors({ form: "Please wait for file uploads to finish." });
      return;
    }
    if (!validate()) {
      window.scrollTo({ top: 300, behavior: "smooth" });
      return;
    }

    setLoading(true);
    try {
      await createBusiness(form as any);
      setSubmitted(true);
    } catch (err: any) {
      if (err.details) {
        const backendErrors: Record<string, string> = {};
        for (const key in err.details) {
           backendErrors[key] = err.details[key][0];
        }
        setErrors(backendErrors);
        window.scrollTo({ top: 400, behavior: "smooth" });
      } else {
        setErrors({ form: err.message || "Failed to submit business listing." });
        window.scrollTo({ top: 300, behavior: "smooth" });
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    border: `1px solid rgba(26,77,46,0.2)`,
    borderRadius: 7,
    fontSize: 14,
    boxSizing: "border-box",
    fontFamily: "'Poppins', sans-serif"
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    color: GREEN,
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 6
  };

  if (submitted) {
    return (
      <div>
        <PageHeader title="Submission Received" breadcrumb={["Home", "Business Directory", "Register"]} />
        <div style={{ maxWidth: 540, margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", backgroundColor: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <CheckCircle size={40} color="#15803d" />
          </div>
          <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, marginBottom: 12 }}>
            Listing Submitted Successfully!
          </h2>
          <p style={{ color: "#555", fontSize: 15, lineHeight: 1.8, marginBottom: 24 }}>
            Your business registration profile and payment receipt have been uploaded. The admin panel will review your listing and payment details shortly. Once approved, your business will appear in our official directory.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link to="/business" style={{ backgroundColor: GREEN, color: "white", padding: "12px 28px", borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
              Back to Directory
            </Link>
            <Link to="/" style={{ backgroundColor: "#f5f5f5", color: "#444", padding: "12px 28px", borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader 
        title="Register Business" 
        subtitle="List your business profile and promote it in the Araian community" 
        breadcrumb={["Home", "Business Directory", "Register"]} 
      />

      <section style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px" }}>
        <Link 
          to="/business" 
          style={{ display: "inline-flex", alignItems: "center", gap: 6, color: GREEN, textDecoration: "none", fontWeight: 700, fontSize: 14, marginBottom: 24 }}
        >
          <ArrowLeft size={16} /> Back to Directory
        </Link>

        {/* Payment info block */}
        <div 
          style={{ 
            backgroundColor: "#fcf8f0", 
            border: `1px solid rgba(200,160,74,0.3)`, 
            borderRadius: 12, 
            padding: "24px 28px", 
            marginBottom: 32 
          }}
        >
          <h4 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, margin: "0 0 10px 0", display: "flex", alignItems: "center", gap: 8 }}>
            <DollarSign size={20} color={GOLD} /> Manual Fee Payment Instructions
          </h4>
          <p style={{ color: "#555", fontSize: 13, lineHeight: 1.7, margin: "0 0 12px 0" }}>
            Please transfer the listing fee corresponding to your selected package to our official account. Keep a screenshot/receipt of the transfer to upload at the end of this form.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 13 }} className="payment-cols">
            <div style={{ backgroundColor: "white", padding: 12, borderRadius: 6, border: "1px solid #eee" }}>
              <strong>Bank Account:</strong> Habib Bank Limited (HBL)<br/>
              <strong>Title:</strong> Anjuman e Araian Faisalabad<br/>
              <strong>Account No:</strong> 1234-5678-9012-34
            </div>
            <div style={{ backgroundColor: "white", padding: 12, borderRadius: 6, border: "1px solid #eee" }}>
              <strong>Easypaisa / JazzCash:</strong><br/>
              <strong>Mobile No:</strong> 0300-8655522<br/>
              <strong>Title:</strong> Muhammad Rafiq
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ backgroundColor: "white", borderRadius: 14, padding: "36px 32px", boxShadow: "0 4px 24px rgba(0,0,0,0.07)", border: `1px solid rgba(26,77,46,0.08)`, opacity: loading ? 0.6 : 1, pointerEvents: loading ? "none" : "auto" }}>
          {errors.form && (
            <div style={{ backgroundColor: "#fee2e2", color: "#dc2626", padding: "12px 16px", borderRadius: 8, marginBottom: 24, fontSize: 14, fontWeight: 600 }}>
              {errors.form}
            </div>
          )}
          {/* Section 1 */}
          <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, marginBottom: 20, paddingBottom: 10, borderBottom: `2px solid #f0f0f0`, display: "flex", alignItems: "center", gap: 8 }}>
            <Briefcase size={18} color={GREEN} /> Business Information
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }} className="form-2col">
            <div>
              <label style={labelStyle}>Business Name *</label>
              <input 
                style={inputStyle} 
                value={form.businessName} 
                onChange={(e) => set("businessName", e.target.value)} 
                placeholder="e.g. Al-Araian Agro Trade" 
              />
              {errors.businessName && <span style={{ color: "#dc2626", fontSize: 12 }}>{errors.businessName}</span>}
            </div>
            <div>
              <label style={labelStyle}>Owner / Member Name *</label>
              <input 
                style={inputStyle} 
                value={form.ownerName} 
                onChange={(e) => set("ownerName", e.target.value)} 
                placeholder="e.g. Ch. Muhammad Ali" 
              />
              {errors.ownerName && <span style={{ color: "#dc2626", fontSize: 12 }}>{errors.ownerName}</span>}
            </div>
            <div>
              <label style={labelStyle}>Business Category *</label>
              <select 
                style={inputStyle} 
                value={form.category} 
                onChange={(e) => set("category", e.target.value)}
              >
                {businessCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>City *</label>
              <input 
                style={inputStyle} 
                value={form.city} 
                onChange={(e) => set("city", e.target.value)} 
                placeholder="e.g. Faisalabad" 
              />
              {errors.city && <span style={{ color: "#dc2626", fontSize: 12 }}>{errors.city}</span>}
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={labelStyle}>Business Address</label>
              <input 
                style={inputStyle} 
                value={form.address} 
                onChange={(e) => set("address", e.target.value)} 
                placeholder="Detailed commercial address..." 
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Business Description *</label>
            <textarea 
              rows={4} 
              style={{ ...inputStyle, resize: "vertical" }} 
              value={form.description} 
              onChange={(e) => set("description", e.target.value)} 
              placeholder="What does your business do? Describe your services/products." 
            />
            {errors.description && <span style={{ color: "#dc2626", fontSize: 12 }}>{errors.description}</span>}
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>Products / Services</label>
            <input 
              style={inputStyle} 
              value={form.productsServices} 
              onChange={(e) => set("productsServices", e.target.value)} 
              placeholder="e.g. Fertilizers, Drip Irrigation, Crop Protection (separated by commas)" 
            />
          </div>

          {/* Contact Details */}
          <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, marginBottom: 20, paddingBottom: 10, borderBottom: `2px solid #f0f0f0` }}>
            Contact and Digital Links
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }} className="form-2col">
            <div>
              <label style={labelStyle}>Phone Number *</label>
              <input 
                style={inputStyle} 
                value={form.phone} 
                onChange={(e) => set("phone", e.target.value)} 
                placeholder="+92 300 000 0000" 
              />
              {errors.phone && (
                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>
                  <span>{errors.phone}</span>
                  <div style={{ color: "#888", fontSize: 11, marginTop: 2 }}>Hint: Ensure format like +92 300 0000000</div>
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>WhatsApp Number</label>
              <input 
                style={inputStyle} 
                value={form.whatsapp} 
                onChange={(e) => set("whatsapp", e.target.value)} 
                placeholder="+92 300 000 0000" 
              />
            </div>
            <div>
              <label style={labelStyle}>Email Address *</label>
              <input 
                type="email" 
                style={inputStyle} 
                value={form.email} 
                onChange={(e) => set("email", e.target.value)} 
                placeholder="info@yourbusiness.com" 
              />
              {errors.email && <span style={{ color: "#dc2626", fontSize: 12 }}>{errors.email}</span>}
            </div>
            <div>
              <label style={labelStyle}>Website (optional)</label>
              <input 
                style={inputStyle} 
                value={form.website} 
                onChange={(e) => set("website", e.target.value)} 
                placeholder="https://www.yourbusiness.com" 
              />
              {errors.website && (
                <div style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>
                  <span>{errors.website}</span>
                  <div style={{ color: "#888", fontSize: 11, marginTop: 2 }}>Hint: Ensure it starts with https://</div>
                </div>
              )}
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={labelStyle}>Social Media Links (optional)</label>
              <input 
                style={inputStyle} 
                value={form.socialLinks} 
                onChange={(e) => set("socialLinks", e.target.value)} 
                placeholder="Facebook page link, LinkedIn page, etc." 
              />
            </div>
          </div>

          {/* Member Promo and Packages */}
          <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, marginBottom: 20, paddingBottom: 10, borderBottom: `2px solid #f0f0f0` }}>
            Promo and Sponsorship Package
          </h3>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Discount Offer for Anjuman Members (optional)</label>
            <input 
              style={inputStyle} 
              value={form.discountOffer} 
              onChange={(e) => set("discountOffer", e.target.value)} 
              placeholder="e.g. 10% Flat Discount for members who present card" 
            />
          </div>

          {/* Packages */}
          <label style={labelStyle}>Select Listing Package *</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }} className="package-grid">
            {(Object.keys(sponsorshipPackages) as any[]).map((key) => {
              const pkg = sponsorshipPackages[key as keyof typeof sponsorshipPackages];
              const isSelected = form.sponsorshipPackage === key;

              return (
                <div 
                  key={key} 
                  onClick={() => set("sponsorshipPackage", key)}
                  style={{
                    border: `2px solid ${isSelected ? GOLD : "#e5e7eb"}`,
                    borderRadius: 10,
                    padding: "16px 14px",
                    cursor: "pointer",
                    backgroundColor: isSelected ? "#fff9ef" : "white",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ color: GREEN, fontWeight: 700, fontSize: 13 }}>{pkg.name}</span>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${isSelected ? GOLD : "#d1d5db"}`, backgroundColor: isSelected ? GOLD : "transparent" }} />
                    </div>
                    <p style={{ color: GOLD, fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{pkg.price}</p>
                  </div>
                  <p style={{ color: "#666", fontSize: 11, lineHeight: 1.5, margin: 0 }}>{pkg.benefits}</p>
                </div>
              );
            })}
          </div>

          {/* Files Upload */}
          <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, marginBottom: 20, paddingBottom: 10, borderBottom: `2px solid #f0f0f0` }}>
            File Uploads
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="form-2col">
            <div>
              <label style={labelStyle}>Business Logo (optional)</label>
              <label 
                style={{ 
                  display: "block", 
                  border: `2px dashed ${form.logoUrl ? GOLD : "rgba(26,77,46,0.2)"}`, 
                  borderRadius: 10, 
                  padding: "16px 12px", 
                  textAlign: "center", 
                  cursor: "pointer",
                  backgroundColor: form.logoUrl ? "#fff9ef" : "#fafaf8" 
                }}
              >
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="logo preview" style={{ width: "100%", height: 90, objectFit: "contain", borderRadius: 6 }} />
                ) : (
                  <div>
                    <Upload size={22} color="#9ca3af" style={{ margin: "0 auto 6px" }} />
                    <p style={{ color: "#9ca3af", fontSize: 12, margin: 0 }}>Click to upload Logo</p>
                  </div>
                )}
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileUpload("logoUrl")} />
              </label>
              {errors.logoUrl && <span style={{ color: "#dc2626", fontSize: 12 }}>{errors.logoUrl}</span>}
            </div>

            <div>
              <label style={labelStyle}>Payment Proof Receipt *</label>
              <label 
                style={{ 
                  display: "block", 
                  border: `2px dashed ${form.paymentProofUrl ? GOLD : "rgba(26,77,46,0.2)"}`, 
                  borderRadius: 10, 
                  padding: "16px 12px", 
                  textAlign: "center", 
                  cursor: "pointer",
                  backgroundColor: form.paymentProofUrl ? "#fff9ef" : "#fafaf8" 
                }}
              >
                {form.paymentProofUrl ? (
                  <img src={form.paymentProofUrl} alt="payment preview" style={{ width: "100%", height: 90, objectFit: "contain", borderRadius: 6 }} />
                ) : (
                  <div>
                    <Upload size={22} color="#9ca3af" style={{ margin: "0 auto 6px" }} />
                    <p style={{ color: "#9ca3af", fontSize: 12, margin: 0 }}>Upload Payment Screenshot</p>
                  </div>
                )}
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileUpload("paymentProofUrl")} />
              </label>
              {errors.paymentProofUrl && <span style={{ color: "#dc2626", fontSize: 12 }}>{errors.paymentProofUrl}</span>}
            </div>
          </div>

          <div style={{ marginTop: 24, marginBottom: 24 }}>
            <MultiImageUpload
              label="Additional Business Photos (Optional)"
              images={form.additionalPhotos}
              onChange={(imgs) => set("additionalPhotos", imgs)}
            />
          </div>

          {/* Live Preview Card */}
          <div style={{ backgroundColor: "#f8f5ef", border: "1px solid rgba(26,77,46,0.1)", borderRadius: 12, padding: 24, marginBottom: 32 }}>
            <h4 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, margin: "0 0 12px 0" }}>Live Directory Preview</h4>
            <div style={{ backgroundColor: "white", borderRadius: 8, padding: 18, border: `1px solid ${GOLD}`, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div style={{ width: 80, height: 80, borderRadius: 8, backgroundColor: "#f0f7f3", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, border: "1px solid #e5e7eb" }}>
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  <Briefcase size={32} color={GREEN} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <h5 style={{ color: GREEN, fontSize: 16, fontWeight: 700, margin: 0 }}>{form.businessName || "Business Name"}</h5>
                  <span style={{ fontSize: 11, backgroundColor: "#fef3c7", color: "#d97706", padding: "2px 8px", borderRadius: 12, fontWeight: 700, textTransform: "uppercase" }}>
                    {form.sponsorshipPackage} Package
                  </span>
                </div>
                <p style={{ color: "#777", fontSize: 12, margin: "4px 0 8px 0" }}>Owned by {form.ownerName || "Owner Name"} | {form.category} | {form.city || "City"}</p>
                <p style={{ fontSize: 13, color: "#444", margin: "0 0 8px 0", lineHeight: 1.5 }}>
                  {form.description || "Business description goes here..."}
                </p>
                {form.discountOffer && (
                  <div style={{ fontSize: 12, backgroundColor: "#f0f7f3", color: GREEN, padding: "6px 10px", borderRadius: 6, display: "inline-block", fontWeight: 600 }}>
                    Discount: {form.discountOffer}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 32, paddingTop: 24, borderTop: "1px solid #f5f5f5" }}>
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                backgroundColor: loading ? "#a3b8aa" : GREEN, 
                color: "white", 
                border: "none", 
                borderRadius: 8, 
                padding: "12px 36px", 
                fontWeight: 700, 
                fontSize: 14, 
                cursor: loading ? "not-allowed" : "pointer" 
              }}
            >
              {loading ? "Submitting..." : "Submit Profile for Review"}
            </button>
          </div>
        </form>
      </section>

      <style>{`
        @media (max-width: 640px) {
          .form-2col, .package-grid, .payment-cols {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
