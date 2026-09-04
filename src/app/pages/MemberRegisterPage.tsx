import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { PageHeader } from "../components/PageHeader";
import { CheckCircle, Upload, User, Phone, MapPin, BookOpen, FileText, Users } from "lucide-react";
import { provinces, bloodGroups, educationLevels, occupations, relationships, blankFamily } from "../lib/memberStore";
import type { Member, MembershipType, FamilyInfo } from "../lib/memberStore";
import { getSiteSettings } from "../lib/settingsStore";
import { MultiImageUpload } from "../components/ui/MultiImageUpload";
import { apiClient } from "../lib/apiClient";
import { uploadFile } from "../lib/upload";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", border: "1px solid rgba(26,77,46,0.2)",
  borderRadius: 7, fontSize: 14, boxSizing: "border-box", fontFamily: "'Lato', sans-serif", backgroundColor: "white",
};
const labelStyle: React.CSSProperties = { display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 };

const steps = ["Personal Info", "Contact and Location", "Education and Work", "Membership", "Family Info", "Documents"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 40, flexWrap: "wrap", gap: 4 }}>
      {steps.map((label, i) => (
        <div key={label} style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: i < current ? GREEN : i === current ? GOLD : "#e5e7eb", color: i <= current ? "white" : "#9ca3af", fontWeight: 700, fontSize: 13 }}>
              {i < current ? <CheckCircle size={15} /> : i + 1}
            </div>
            <span style={{ fontSize: 10, color: i === current ? GREEN : "#9ca3af", marginTop: 4, fontWeight: i === current ? 700 : 400, whiteSpace: "nowrap" }}>{label}</span>
          </div>
          {i < steps.length - 1 && <div style={{ width: 32, height: 2, backgroundColor: i < current ? GREEN : "#e5e7eb", margin: "0 4px", marginBottom: 20 }} />}
        </div>
      ))}
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
      {error && <p style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{error}</p>}
    </div>
  );
}

function SectionHead({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, paddingBottom: 14, borderBottom: "2px solid #f5f5f5" }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "#f0f7f3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={18} color={GREEN} />
      </div>
      <div>
        <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, margin: 0 }}>{title}</h3>
        {subtitle && <p style={{ color: "#888", fontSize: 13, margin: "3px 0 0" }}>{subtitle}</p>}
      </div>
    </div>
  );
}

export function MemberRegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const settings = getSiteSettings();

  const [form, setForm] = useState({
    fullName: "", fatherName: "", cnic: "", dob: "", gender: "Male", bloodGroup: "O+",
    email: "", phone: "", whatsapp: "", address: "", city: "", district: "", province: "Punjab",
    occupation: "Agriculture", education: "Bachelor's",
    membershipType: "ordinary" as MembershipType,
    password: "", confirmPassword: "",
    photoUrl: "", cnicFrontUrl: "", cnicBackUrl: "", paymentProofUrl: "",
    additionalPhotos: [] as string[]
  });

  const [family, setFamily] = useState<FamilyInfo>(blankFamily());

  const set = (k: keyof typeof form, v: any) => { setForm((f) => ({ ...f, [k]: v } as any)); setErrors((e) => ({ ...e, [k]: "" })); };
  const setFam = (k: keyof FamilyInfo, v: string) => setFamily((f) => ({ ...f, [k]: v }));

  const handleBlur = (field: keyof typeof form) => {
    const errs = { ...errors };
    if (field === "cnic" && form.cnic && !/^\d{13}$/.test(form.cnic.replace(/-/g, ""))) {
      errs.cnic = "Enter a valid 13-digit CNIC (e.g. 35201-1234567-1).";
    }
    if (field === "email" && form.email && !/\S+@\S+\.\S+/.test(form.email)) {
      errs.email = "Valid email is required (e.g. name@gmail.com).";
    }
    if (field === "phone" && form.phone && !/^\+?[0-9]{10,15}$/.test(form.phone.replace(/[\s-]/g, ""))) {
      errs.phone = "Enter a valid phone number (e.g. +92 300 1234567).";
    }
    if (field === "password" && form.password && form.password.length < 8) {
      errs.password = "Password must be at least 8 characters.";
    }
    if (field === "confirmPassword" && form.confirmPassword && form.password !== form.confirmPassword) {
      errs.confirmPassword = "Passwords do not match.";
    }
    setErrors(errs);
  };

  const handleFile = (key: keyof typeof form) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setErrors((err) => ({ ...err, [key]: "File must be under 4MB." }));
      return;
    }
    setUploading((u) => ({ ...u, [String(key)]: true }));
    setErrors((err) => ({ ...err, [String(key)]: "" }));
    try {
      const url = await uploadFile(file);
      set(key, url);
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, [String(key)]: err?.message || "Upload failed. Please try again." }));
    } finally {
      setUploading((u) => ({ ...u, [String(key)]: false }));
      e.target.value = "";
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (step === 0) {
      if (!form.fullName.trim()) errs.fullName = "Full name is required.";
      if (!form.fatherName.trim()) errs.fatherName = "Father's name is required.";
      if (!/^\d{13}$/.test(form.cnic.replace(/-/g, ""))) errs.cnic = "Enter a valid 13-digit CNIC (e.g. 35201-1234567-1).";
      if (!form.dob) errs.dob = "Date of birth is required.";
    }
    if (step === 1) {
      if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Valid email is required (e.g. name@gmail.com).";
      if (!/^\+?[0-9]{10,15}$/.test(form.phone.replace(/[\s-]/g, ""))) errs.phone = "Enter a valid phone number (e.g. +92 300 1234567).";
      if (!form.city.trim()) errs.city = "City is required.";
      if (!form.address.trim()) errs.address = "Address is required.";
    }
    if (step === 3) {
      if (form.password.length < 8) errs.password = "Password must be at least 8 characters.";
      if (form.password !== form.confirmPassword) errs.confirmPassword = "Passwords do not match.";
    }
    if (step === 5) {
      if (!form.photoUrl) errs.photoUrl = "Passport photo is required.";
      if (!form.cnicFrontUrl) errs.cnicFrontUrl = "CNIC Front image is required.";
      if (!form.cnicBackUrl) errs.cnicBackUrl = "CNIC Back image is required.";
      if (!form.paymentProofUrl) errs.paymentProofUrl = "Payment Proof is required.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => { if (Object.values(uploading).some(Boolean)) return; if (validate()) setStep((s) => s + 1); };
  const back = () => setStep((s) => s - 1);

  const submit = async () => {
    if (loading || Object.values(uploading).some(Boolean)) return;
    if (!validate()) return;
    setLoading(true);
    try {
      const formattedCnic = form.cnic.replace(/-/g, "").replace(/^(\d{5})(\d{7})(\d{1})$/, "$1-$2-$3");
      const payload = {
        fullName: form.fullName,
        fatherName: form.fatherName,
        cnic: formattedCnic,
        dob: form.dob,
        gender: form.gender.toLowerCase() as "male" | "female",
        bloodGroup: form.bloodGroup,
        email: form.email,
        phone: form.phone,
        whatsapp: form.whatsapp || form.phone,
        whatsappPublic: false,
        address: form.address,
        city: form.city,
        district: form.district,
        province: form.province,
        occupation: form.occupation,
        education: form.education,
        membershipType: form.membershipType,
        password: form.password,
        familyInfoPublic: false,
        photoUrl: form.photoUrl || undefined,
        cnicFrontUrl: form.cnicFrontUrl || undefined,
        cnicBackUrl: form.cnicBackUrl || undefined,
        paymentProofUrl: form.paymentProofUrl || undefined,
        additionalPhotos: form.additionalPhotos,
        familyInfo: family,
      };

      await apiClient("/members/register", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      
      setDone(true);
    } catch (e: any) {
      if (e.details) {
        // Map backend errors to frontend state
        const apiErrors: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(e.details)) {
          apiErrors[key] = (msgs as string[])[0];
        }
        setErrors(apiErrors);

        // Determine which step to go back to based on the first error key
        const errKeys = Object.keys(apiErrors);
        if (errKeys.some(k => ["fullName", "fatherName", "cnic", "dob"].includes(k))) setStep(0);
        else if (errKeys.some(k => ["email", "phone", "city", "address", "district", "province"].includes(k))) setStep(1);
        else if (errKeys.some(k => ["education", "occupation"].includes(k))) setStep(2);
        else if (errKeys.some(k => ["password", "membershipType"].includes(k))) setStep(3);
        else if (errKeys.some(k => ["familyInfo"].includes(k))) setStep(4);
        else setStep(5);

        alert("Please fix the highlighted errors before submitting.");
      } else {
        alert("Registration failed: " + e.message);
        if (e.message.toLowerCase().includes("email")) {
          setStep(1);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div>
        <PageHeader title="Registration Submitted" breadcrumb={["Home", "Member Portal", "Register"]} />
        <div style={{ maxWidth: 540, margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", backgroundColor: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <CheckCircle size={40} color="#15803d" />
          </div>
          <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, marginBottom: 12 }}>Application Received!</h2>
          <p style={{ color: "#555", fontSize: 15, lineHeight: 1.8, marginBottom: 8 }}>
            Your membership application has been submitted. The admin team will review it and notify you by email within 3–5 working days.
          </p>
          <p style={{ color: "#888", fontSize: 14, lineHeight: 1.7, marginBottom: 32 }}>
            Your family information has been securely recorded and is only accessible to authorized administrators.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/member/login" style={{ backgroundColor: GREEN, color: "white", padding: "12px 28px", borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>Member Login</Link>
            <Link to="/" style={{ backgroundColor: "#f5f5f5", color: "#444", padding: "12px 28px", borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>Go to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Member Registration" subtitle="Join the Anjuman-e-Araian family" breadcrumb={["Home", "Member Portal", "Register"]} />
      <section style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px" }}>
        <StepIndicator current={step} />
        <div style={{ backgroundColor: "white", borderRadius: 14, padding: "36px 40px", boxShadow: "0 4px 24px rgba(0,0,0,0.07)", border: "1px solid rgba(26,77,46,0.08)" }}>

          {/* Step 0 — Personal */}
          {step === 0 && (
            <div>
              <SectionHead icon={User} title="Personal Information" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="form-grid">
                <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ width: 100, height: 100, borderRadius: "50%", backgroundColor: "#f5f5f5", border: `2px dashed ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 12 }}>
                    {form.photoUrl ? (
                      <img src={form.photoUrl} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <User size={32} color="#aaa" />
                    )}
                  </div>
                  <label style={{ backgroundColor: "#f0f7f3", color: GREEN, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1px solid rgba(26,77,46,0.15)` }}>
                    Upload Profile Photo
                    <input type="file" accept="image/*" onChange={handleFile("photoUrl")} style={{ display: "none" }} />
                  </label>
                  {errors.photoUrl && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{errors.photoUrl}</p>}
                </div>
                <Field label="Full Name *" error={errors.fullName}><input style={inputStyle} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="e.g. Ch. Muhammad Ali" /></Field>
                <Field label="Father's Name *" error={errors.fatherName}><input style={inputStyle} value={form.fatherName} onChange={(e) => set("fatherName", e.target.value)} placeholder="e.g. Ch. Abdul Rahman" /></Field>
                <Field label="CNIC Number *" error={errors.cnic}><input style={inputStyle} value={form.cnic} onChange={(e) => set("cnic", e.target.value)} onBlur={() => handleBlur("cnic")} placeholder="35201-1234567-1" maxLength={15} /></Field>
                <Field label="Date of Birth *" error={errors.dob}><input type="date" style={inputStyle} value={form.dob} onChange={(e) => set("dob", e.target.value)} /></Field>
                <Field label="Gender *"><select style={inputStyle} value={form.gender} onChange={(e) => set("gender", e.target.value)}><option>Male</option><option>Female</option><option>Other</option></select></Field>
                <Field label="Blood Group"><select style={inputStyle} value={form.bloodGroup} onChange={(e) => set("bloodGroup", e.target.value)}>{bloodGroups.map((b) => <option key={b}>{b}</option>)}</select></Field>
              </div>
            </div>
          )}

          {/* Step 1 — Contact */}
          {step === 1 && (
            <div>
              <SectionHead icon={Phone} title="Contact and Location" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="form-grid">
                <Field label="Email Address *" error={errors.email}><input type="email" style={inputStyle} value={form.email} onChange={(e) => set("email", e.target.value)} onBlur={() => handleBlur("email")} placeholder="you@example.com" /></Field>
                <Field label="Phone Number *" error={errors.phone}><input type="tel" style={inputStyle} value={form.phone} onChange={(e) => set("phone", e.target.value)} onBlur={() => handleBlur("phone")} placeholder="+92 300 000 0000" /></Field>
                <Field label="WhatsApp Number"><input type="tel" style={inputStyle} value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="Leave blank if same as phone" /></Field>
                <Field label="City *" error={errors.city}><input style={inputStyle} value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Faisalabad" /></Field>
                <Field label="District"><input style={inputStyle} value={form.district} onChange={(e) => set("district", e.target.value)} placeholder="e.g. Faisalabad" /></Field>
                <Field label="Province"><select style={inputStyle} value={form.province} onChange={(e) => set("province", e.target.value)}>{provinces.map((p) => <option key={p}>{p}</option>)}</select></Field>
                <div style={{ gridColumn: "span 2" }}>
                  <Field label="Full Address *" error={errors.address}><textarea rows={2} style={{ ...inputStyle, resize: "vertical" }} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="House number, street, area..." /></Field>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Education */}
          {step === 2 && (
            <div>
              <SectionHead icon={BookOpen} title="Education and Occupation" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="form-grid">
                <Field label="Highest Education"><select style={inputStyle} value={form.education} onChange={(e) => set("education", e.target.value)}>{educationLevels.map((e) => <option key={e}>{e}</option>)}</select></Field>
                <Field label="Occupation"><select style={inputStyle} value={form.occupation} onChange={(e) => set("occupation", e.target.value)}>{occupations.map((o) => <option key={o}>{o}</option>)}</select></Field>
              </div>
            </div>
          )}

          {/* Step 3 — Membership */}
          {step === 3 && (
            <div>
              <SectionHead icon={FileText} title="Membership Type and Account" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16, marginBottom: 28 }} className="mem-grid">
                {(settings.membershipTiers || []).map((tier) => (
                  <div key={tier.id} onClick={() => set("membershipType", tier.type)} style={{ border: `2px solid ${form.membershipType === tier.type ? GOLD : "#e5e7eb"}`, borderRadius: 10, padding: "16px 14px", cursor: "pointer", backgroundColor: form.membershipType === tier.type ? "#fff9ef" : "white" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ color: GREEN, fontWeight: 700, fontSize: 13 }}>{tier.name}</span>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${form.membershipType === tier.type ? GOLD : "#d1d5db"}`, backgroundColor: form.membershipType === tier.type ? GOLD : "transparent" }} />
                    </div>
                    <p style={{ color: GOLD, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{tier.fee}</p>
                    <p style={{ color: "#666", fontSize: 11, lineHeight: 1.5 }}>{tier.description}</p>
                  </div>
                ))}
              </div>

              {settings.paymentMethods && settings.paymentMethods.length > 0 && (
                <div style={{ marginBottom: 28, backgroundColor: "#f0f7f3", borderRadius: 10, padding: 16 }}>
                  <p style={{ color: GREEN, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Available Payment Methods</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {settings.paymentMethods.map(pm => (
                      <div key={pm.id} style={{ backgroundColor: "white", padding: 12, borderRadius: 8, border: "1px solid rgba(26,77,46,0.1)" }}>
                        <p style={{ color: "#333", fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>{pm.bankName}</p>
                        <p style={{ color: "#666", fontSize: 12, margin: "0 0 2px" }}>Title: <span style={{ color: "#333", fontWeight: 600 }}>{pm.accountTitle}</span></p>
                        <p style={{ color: "#666", fontSize: 12, margin: 0 }}>A/C: <span style={{ color: "#333", fontWeight: 600 }}>{pm.accountNo}</span></p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="form-grid">
                <Field label="Password *" error={errors.password}><input type="password" style={inputStyle} value={form.password} onChange={(e) => set("password", e.target.value)} onBlur={() => handleBlur("password")} placeholder="Create a strong password" /></Field>
                <Field label="Confirm Password *" error={errors.confirmPassword}><input type="password" style={inputStyle} value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} onBlur={() => handleBlur("confirmPassword")} placeholder="Repeat your password" /></Field>
              </div>
            </div>
          )}

          {/* Step 4 — Family Information */}
          {step === 4 && (
            <div>
              <SectionHead icon={Users} title="Family Information" subtitle="This information is private and only accessible to authorized administrators." />

              <div style={{ backgroundColor: "#fef9c3", border: "1px solid #fde047", borderRadius: 8, padding: "12px 16px", marginBottom: 24 }}>
                <p style={{ color: "#854d0e", fontSize: 13, margin: 0, lineHeight: 1.7 }}>
                  🔒 <strong>Privacy Notice:</strong> All family information entered here is strictly confidential. It will only be visible to authorized Anjuman administrators and will never be displayed publicly without your explicit written consent.
                </p>
              </div>

              {/* Spouse and Children */}
              <p style={{ color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>Spouse and Children</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }} className="form-grid">
                <Field label="Spouse Name (if married)"><input style={inputStyle} value={family.spouseName} onChange={(e) => setFam("spouseName", e.target.value)} placeholder="Spouse's full name" /></Field>
                <Field label="Number of Children"><input type="number" min={0} max={20} style={inputStyle} value={family.childrenCount} onChange={(e) => setFam("childrenCount", e.target.value)} placeholder="e.g. 2" /></Field>
                <div style={{ gridColumn: "span 2" }}>
                  <Field label="Children Details (optional)">
                    <textarea rows={2} style={{ ...inputStyle, resize: "vertical" }} value={family.childrenDetails} onChange={(e) => setFam("childrenDetails", e.target.value)} placeholder="Names and ages, e.g. Ali (12), Fatima (8)" />
                  </Field>
                </div>
              </div>

              {/* Family / Branch */}
              <p style={{ color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>Family / Branch Details</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }} className="form-grid">
                <Field label="Family Branch / Biradari"><input style={inputStyle} value={family.familyBranch} onChange={(e) => setFam("familyBranch", e.target.value)} placeholder="e.g. Chaudhry, Rana, etc." /></Field>
                <Field label="Family City / Area"><input style={inputStyle} value={family.familyCity} onChange={(e) => setFam("familyCity", e.target.value)} placeholder="Ancestral city or area" /></Field>
                <Field label="Family Contact Person"><input style={inputStyle} value={family.familyContactName} onChange={(e) => setFam("familyContactName", e.target.value)} placeholder="Name of family contact" /></Field>
                <Field label="Family Contact Number"><input type="tel" style={inputStyle} value={family.familyContactNumber} onChange={(e) => setFam("familyContactNumber", e.target.value)} placeholder="+92 300 000 0000" /></Field>
              </div>

              {/* Emergency Contact */}
              <p style={{ color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>Emergency Contact</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="form-grid">
                <Field label="Emergency Contact Name"><input style={inputStyle} value={family.emergencyContactName} onChange={(e) => setFam("emergencyContactName", e.target.value)} placeholder="Full name" /></Field>
                <Field label="Emergency Contact Number"><input type="tel" style={inputStyle} value={family.emergencyContactNumber} onChange={(e) => setFam("emergencyContactNumber", e.target.value)} placeholder="+92 300 000 0000" /></Field>
                <Field label="Relationship with Emergency Contact"><select style={inputStyle} value={family.emergencyRelationship} onChange={(e) => setFam("emergencyRelationship", e.target.value)}><option value="">Select relationship…</option>{relationships.map((r) => <option key={r}>{r}</option>)}</select></Field>
              </div>
            </div>
          )}

          {/* Step 5 — Documents */}
          {step === 5 && (
            <div>
              <SectionHead icon={Upload} title="Upload Documents and Payment Proof" subtitle="Max 2MB each. Accepted: JPG, PNG, PDF." />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 20, marginBottom: 24 }} className="doc-grid">
                {[
                  { key: "photoUrl", label: "Passport Photo *", hint: "Recent photo, white background" },
                  { key: "cnicFrontUrl", label: "CNIC Front *", hint: "Clear scan of front side" },
                  { key: "cnicBackUrl", label: "CNIC Back *", hint: "Clear scan of back side" },
                  { key: "paymentProofUrl", label: "Payment Proof *", hint: "Screenshot or receipt of fee payment" },
                ].map(({ key, label, hint }) => (
                  <div key={key}>
                    <label style={labelStyle}>{label}</label>
                    <label style={{ display: "block", border: `2px dashed ${form[key as keyof typeof form] ? GOLD : "rgba(26,77,46,0.2)"}`, borderRadius: 10, padding: "16px 12px", textAlign: "center", cursor: "pointer", backgroundColor: form[key as keyof typeof form] ? "#fff9ef" : "#fafaf8" }}>
                      {form[key as keyof typeof form]
                        ? <img src={form[key as keyof typeof form] as string} alt="preview" style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 6 }} />
                        : <div><Upload size={22} color="#9ca3af" style={{ margin: "0 auto 6px" }} /><p style={{ color: "#9ca3af", fontSize: 12 }}>Click to upload</p></div>
                      }
                      <input type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={handleFile(key as keyof typeof form)} />
                    </label>
                    <p style={{ color: "#aaa", fontSize: 11, marginTop: 4 }}>{hint}</p>
                    {errors[key] && <p style={{ color: "red", fontSize: 12, marginTop: 4 }}>{errors[key]}</p>}
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 24 }}>
                <MultiImageUpload
                  label="Additional Photos / Certificates / Documents (Optional)"
                  images={form.additionalPhotos}
                  onChange={(imgs) => set("additionalPhotos" as keyof typeof form, imgs)}
                />
              </div>

              <div style={{ backgroundColor: "#f0f7f3", borderRadius: 10, padding: "14px 18px", border: "1px solid rgba(26,77,46,0.1)" }}>
                <p style={{ color: "#555", fontSize: 13, lineHeight: 1.8 }}>
                  By submitting, I confirm all information is true and accurate. I consent to Anjuman-e-Araian storing my family and personal information securely for administrative purposes only.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32, paddingTop: 24, borderTop: "1px solid #f5f5f5", alignItems: "center" }}>
            <div>{step > 0 && <button onClick={back} style={{ backgroundColor: "#f5f5f5", color: "#444", border: "none", borderRadius: 8, padding: "11px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>← Back</button>}</div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ color: "#aaa", fontSize: 13 }}>Step {step + 1} of {steps.length}</span>
              {step < steps.length - 1
                ? <button onClick={next} style={{ backgroundColor: GREEN, color: "white", border: "none", borderRadius: 8, padding: "11px 28px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Next →</button>
                : <button onClick={submit} disabled={loading} style={{ backgroundColor: loading ? "#e5e7eb" : GOLD, color: loading ? "#9ca3af" : "#1a1a1a", border: "none", borderRadius: 8, padding: "11px 28px", fontWeight: 700, fontSize: 14, cursor: loading ? "wait" : "pointer" }}>{loading ? "Submitting..." : "Submit Application"}</button>
              }
            </div>
          </div>
        </div>

        <p style={{ textAlign: "center", color: "#888", fontSize: 14, marginTop: 20 }}>
          Already registered? <Link to="/member/login" style={{ color: GREEN, fontWeight: 700 }}>Login here</Link>
        </p>
      </section>
      <style>{`@media (max-width: 640px) { .form-grid, .mem-grid, .doc-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
