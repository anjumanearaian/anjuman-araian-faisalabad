import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useMember } from "../context/MemberContext";
import {
  statusColors,
  educationLevels,
  occupations,
  provinces,
  structuredOptionForEdit,
  joinStructuredOption,
  splitStructuredOption,
} from "../lib/memberStore";
import { getSiteSettings } from "../lib/settingsStore";
import { apiClient } from "../lib/apiClient";
import { Edit2, LogOut, Upload, CheckCircle, Clock, Shield, Users, MessageCircle } from "lucide-react";
import { MemberDirectory } from "../components/MemberDirectory";
import { MatrimonialPortalDirectory } from "../components/MatrimonialPortalDirectory";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "1px solid rgba(26,77,46,0.2)",
  borderRadius: 7,
  fontSize: 14,
  boxSizing: "border-box",
  fontFamily: "'Lato', sans-serif",
  backgroundColor: "white",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  color: GREEN,
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 6,
};

export function MemberPortalPage() {
  const { member, logout, refresh } = useMember();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"directory" | "matrimonial" | "profile" | "edit" | "password" | "documents" | "family">("matrimonial");
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  if (!member) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
        <div>
          <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Access Restricted</h2>
          <p style={{ color: "#666", marginBottom: 24 }}>Please log in to view your member portal.</p>
          <Link to="/member/login" style={{ backgroundColor: GREEN, color: "white", padding: "12px 28px", borderRadius: 8, fontWeight: 700, textDecoration: "none", fontSize: 14 }}>Login</Link>
        </div>
      </div>
    );
  }

  const sc = statusColors[member.status] || statusColors.pending;
  const isApproved = member.status === "approved";
  const educationDisplay = splitStructuredOption(member.education);
  const occupationDisplay = splitStructuredOption(member.occupation);

  const handleLogout = () => {
    logout();
    navigate("/member/login");
  };

  const startEdit = () => {
    const education = structuredOptionForEdit(member.education, educationLevels);
    const occupation = structuredOptionForEdit(member.occupation, occupations);
    setEditForm({
      phone: member.phone || "",
      whatsapp: member.whatsapp || "",
      address: member.address || "",
      city: member.city || "",
      district: member.district || "",
      province: member.province || "Punjab",
      education: education.base || "Other",
      educationDetail: education.detail || "",
      occupation: occupation.base || "Other",
      occupationDetail: occupation.detail || "",
      designation: member.designation || "",
      institutionName: member.institutionName || "",
      businessName: member.businessName || "",
    });
    setSaved(false);
    setSaveError("");
    setTab("edit");
  };

  // Self-service profile updates must use the passwordless member/applicant token.
  // This avoids a stale admin session token in the same browser taking precedence.
  const patchOwnProfile = async (payload: Record<string, unknown>) => {
    const token = localStorage.getItem("araian_member_token");
    if (!token) throw new Error("Your login session is missing. Please sign in again.");

    const response = await fetch(`/api/members/${member.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let message = `Save failed (HTTP ${response.status}).`;
      try {
        const body = await response.json();
        message = body.error || message;
      } catch {
        // Keep the HTTP error when the response is not JSON.
      }
      throw new Error(message);
    }
  };

  const saveEdit = async () => {
    if (saving) return;
    setSaving(true);
    setSaved(false);
    setSaveError("");

    try {
      const payload = {
        phone: editForm.phone || "",
        whatsapp: editForm.whatsapp || "",
        address: editForm.address || "",
        city: editForm.city || "",
        district: editForm.district || "",
        province: editForm.province || member.province || "Punjab",
        education: joinStructuredOption(editForm.education, editForm.educationDetail),
        occupation: joinStructuredOption(editForm.occupation, editForm.occupationDetail),
        designation: editForm.designation || "",
        institutionName: editForm.institutionName || "",
        businessName: editForm.businessName || "",
      };

      await patchOwnProfile(payload);
      await refresh();
      setSaved(true);
      window.setTimeout(() => {
        setSaved(false);
        setTab("profile");
      }, 1200);
    } catch (e: any) {
      setSaveError(e?.message || "Changes could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDocUpload = (key: string) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    try {
      const { url } = await apiClient<{ url: string }>("/upload", {
        method: "POST",
        body: formData,
      });
      await patchOwnProfile({ [key]: url });
      await refresh();
    } catch (err: any) {
      alert("Failed to upload document: " + err.message);
    } finally {
      e.target.value = "";
    }
  };

  const tabs: { key: typeof tab; label: string }[] = [
    { key: "directory", label: "Member Directory" },
    { key: "matrimonial", label: "Matrimonial Directory" },
    { key: "profile", label: "My Profile" },
    { key: "edit", label: "Edit Details" },
    { key: "password", label: "Login Security" },
    { key: "documents", label: "Documents" },
    { key: "family", label: "Family Info 🔒" },
  ];

  return (
    <div style={{ backgroundColor: "#f8f5ef", minHeight: "100vh" }}>
      <div style={{ backgroundColor: GREEN, padding: "24px", borderBottom: `3px solid ${GOLD}` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {member.photoUrl ? (
              <img src={member.photoUrl} alt={member.fullName} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: `3px solid ${GOLD}` }} />
            ) : (
              <div style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: GOLD, display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid rgba(255,255,255,0.3)" }}>
                <span style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700 }}>{member.fullName?.[0] || "M"}</span>
              </div>
            )}
            <div>
              <h2 style={{ color: "white", fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, margin: 0 }}>{member.fullName}</h2>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
                {isApproved && member.memberNo && <span style={{ backgroundColor: GOLD, color: "#1a1a1a", fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>{member.memberNo}</span>}
                <span style={{ backgroundColor: sc.bg, color: sc.text, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>{sc.label}</span>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>{member.membershipType?.charAt(0).toUpperCase() + member.membershipType?.slice(1)} Member</span>
              </div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "9px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      {member.status === "pending" && (
        <div style={{ backgroundColor: "#fefce8", borderBottom: "1px solid #fde047", padding: "14px 24px" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
            <Clock size={16} color="#854d0e" />
            <p style={{ color: "#854d0e", fontSize: 14, margin: 0 }}>
              <strong>Your application is under review.</strong> You can still correct your contact, education and work details while the application is pending.
            </p>
          </div>
        </div>
      )}

      {member.status === "rejected" && (
        <div style={{ backgroundColor: "#fee2e2", borderBottom: "1px solid #fca5a5", padding: "14px 24px" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <p style={{ color: "#b91c1c", fontSize: 14, margin: 0 }}>
              <strong>Application not approved.</strong> {member.rejectionReason || "Please contact the office for details."} <a href="/contact" style={{ color: "#b91c1c" }}>Contact Us</a>
            </p>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px", display: "grid", gridTemplateColumns: "220px 1fr", gap: 28, alignItems: "start" }} className="portal-grid">
        <div>
          <div style={{ backgroundColor: "white", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => t.key === "edit" ? startEdit() : setTab(t.key)}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "14px 20px", border: "none", borderBottom: "1px solid #f5f5f5", cursor: "pointer", backgroundColor: tab === t.key ? "#f0f7f3" : "white", color: tab === t.key ? GREEN : "#555", fontWeight: tab === t.key ? 700 : 400, fontSize: 14, fontFamily: "'Lato', sans-serif", borderLeft: tab === t.key ? `3px solid ${GREEN}` : "3px solid transparent" }}
              >
                {t.label}
              </button>
            ))}
          </div>
          {isApproved && (
            <div style={{ backgroundColor: "#f0f7f3", borderRadius: 12, padding: "16px 20px", marginTop: 16, border: "1px solid rgba(26,77,46,0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Shield size={16} color={GREEN} />
                <span style={{ color: GREEN, fontWeight: 700, fontSize: 13 }}>Active Member</span>
              </div>
              <p style={{ color: "#666", fontSize: 12, lineHeight: 1.7, margin: 0 }}>Member since {new Date(member.approvedAt || member.createdAt).toLocaleDateString("en-PK", { month: "long", year: "numeric" })}</p>
            </div>
          )}
        </div>

        <div style={{ backgroundColor: "white", borderRadius: 12, padding: "28px 32px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          {tab === "directory" && <MemberDirectory currentMemberId={member.id} />}
          {tab === "matrimonial" && <MatrimonialPortalDirectory currentMember={member} />}

          {tab === "profile" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 14, borderBottom: "2px solid #f5f5f5" }}>
                <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, margin: 0 }}>My Profile</h3>
                <button onClick={startEdit} style={{ display: "flex", alignItems: "center", gap: 6, backgroundColor: GREEN, color: "white", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}><Edit2 size={14} /> Edit</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="info-grid">
                {[
                  ["Full Name", member.fullName],
                  ["Father's Name", member.fatherName],
                  ["CNIC", member.cnic],
                  ["Date of Birth", member.dob ? new Date(member.dob).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" }) : "—"],
                  ["Gender", member.gender],
                  ["Blood Group", member.bloodGroup],
                  ["Email", member.email],
                  ["Phone", member.phone],
                  ["WhatsApp", member.whatsapp],
                  ["City", member.city],
                  ["District", member.district || "—"],
                  ["Province", member.province],
                  ["Education Level", educationDisplay.base || member.education],
                  ["Specialization / Degree", educationDisplay.detail],
                  ["Occupation", occupationDisplay.base || member.occupation],
                  ["Occupation Detail", occupationDisplay.detail],
                  ["Designation / Role", member.designation],
                  ["Institute / Organization", member.institutionName],
                  ["Business Name", member.businessName],
                ].filter(([, value]) => value).map(([label, val]) => (
                  <div key={String(label)} style={{ padding: "12px 0", borderBottom: "1px solid #f9f9f9" }}>
                    <p style={{ color: "#aaa", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>{label}</p>
                    <p style={{ color: "#1a1a1a", fontSize: 14, fontWeight: 500, margin: "3px 0 0" }}>{val || "—"}</p>
                  </div>
                ))}
              </div>
              {member.address && (
                <div style={{ padding: "12px 0", borderTop: "1px solid #f5f5f5", marginTop: 4 }}>
                  <p style={{ color: "#aaa", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>Full Address</p>
                  <p style={{ color: "#1a1a1a", fontSize: 14, margin: "3px 0 0" }}>{member.address}</p>
                </div>
              )}
            </div>
          )}

          {tab === "edit" && (
            <div>
              <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, marginBottom: 10, paddingBottom: 14, borderBottom: "2px solid #f5f5f5" }}>Edit Contact and Work Details</h3>
              <p style={{ color: "#666", fontSize: 13, lineHeight: 1.7, margin: "0 0 20px" }}>
                Select a standard education level and occupation. Use the detail fields for MBA, subject, specialty or another specific title. Choosing Other records your text for admin review without adding a duplicate master-list item.
              </p>
              {saved && <div style={{ backgroundColor: "#dcfce7", border: "1px solid #86efac", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}><p style={{ color: "#15803d", fontSize: 14, margin: 0 }}>✓ Changes saved successfully.</p></div>}
              {saveError && <div style={{ backgroundColor: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}><p style={{ color: "#b91c1c", fontSize: 13, margin: 0 }}>{saveError}</p></div>}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="info-grid">
                {[
                  { k: "phone", label: "Phone Number", type: "tel" },
                  { k: "whatsapp", label: "WhatsApp Number", type: "tel" },
                  { k: "city", label: "City", type: "text" },
                  { k: "district", label: "District", type: "text" },
                ].map(({ k, label, type }) => (
                  <div key={k}>
                    <label style={labelStyle}>{label}</label>
                    <input type={type} style={inputStyle} value={editForm[k] ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, [k]: e.target.value }))} />
                  </div>
                ))}

                <div>
                  <label style={labelStyle}>Province / Region</label>
                  <select style={inputStyle} value={editForm.province ?? "Punjab"} onChange={(e) => setEditForm((f) => ({ ...f, province: e.target.value }))}>
                    {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div />

                <div style={{ gridColumn: "span 2" }}>
                  <label style={labelStyle}>Full Address</label>
                  <textarea rows={2} style={{ ...inputStyle, resize: "vertical" }} value={editForm.address ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} />
                </div>

                <div>
                  <label style={labelStyle}>Highest Education Level</label>
                  <select style={inputStyle} value={editForm.education ?? "Other"} onChange={(e) => setEditForm((f) => ({ ...f, education: e.target.value }))}>
                    {educationLevels.map((level) => <option key={level} value={level}>{level}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{editForm.education === "Other" ? "Other Qualification / Degree" : "Specialization / Degree Title"}</label>
                  <input style={inputStyle} value={editForm.educationDetail ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, educationDetail: e.target.value }))} placeholder={editForm.education === "Master's" ? "e.g. MBA, Economics, Computer Science" : "e.g. subject, specialty or degree title"} />
                </div>

                <div>
                  <label style={labelStyle}>Occupation</label>
                  <select style={inputStyle} value={editForm.occupation ?? "Other"} onChange={(e) => setEditForm((f) => ({ ...f, occupation: e.target.value }))}>
                    {occupations.map((occupation) => <option key={occupation} value={occupation}>{occupation}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{editForm.occupation === "Other" ? "Other Occupation / Profession" : "Occupation Field / Specialty"}</label>
                  <input style={inputStyle} value={editForm.occupationDetail ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, occupationDetail: e.target.value }))} placeholder="e.g. Poultry, Cardiology, Software, Trading" />
                </div>

                <div>
                  <label style={labelStyle}>Designation / Role</label>
                  <input style={inputStyle} value={editForm.designation ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, designation: e.target.value }))} placeholder="e.g. Director, Manager, Teacher" />
                </div>
                <div>
                  <label style={labelStyle}>Institute / Organization Name</label>
                  <input style={inputStyle} value={editForm.institutionName ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, institutionName: e.target.value }))} placeholder="University, department, employer" />
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <label style={labelStyle}>Business Name (if applicable)</label>
                  <input style={inputStyle} value={editForm.businessName ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, businessName: e.target.value }))} placeholder="Business or establishment name" />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                <button disabled={saving} onClick={saveEdit} style={{ backgroundColor: saving ? "#6b8f78" : GREEN, color: "white", border: "none", borderRadius: 8, padding: "11px 24px", fontWeight: 700, fontSize: 14, cursor: saving ? "wait" : "pointer" }}>{saving ? "Saving..." : "Save Changes"}</button>
                <button disabled={saving} onClick={() => setTab("profile")} style={{ backgroundColor: "#f5f5f5", color: "#444", border: "none", borderRadius: 8, padding: "11px 20px", fontWeight: 700, fontSize: 14, cursor: saving ? "not-allowed" : "pointer" }}>Cancel</button>
              </div>
            </div>
          )}

          {tab === "password" && (
            <div>
              <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, marginBottom: 24, paddingBottom: 14, borderBottom: "2px solid #f5f5f5" }}>Passwordless Login Security</h3>
              <div style={{ background: "#f0f7f3", border: "1px solid rgba(26,77,46,.15)", borderRadius: 12, padding: 22 }}>
                <Shield size={24} color={GREEN} />
                <h4 style={{ color: GREEN, margin: "12px 0 6px" }}>No password is stored for this account</h4>
                <p style={{ color: "#555", fontSize: 14, lineHeight: 1.8, margin: 0 }}>Sign in with Google or request a one-time code at <strong>{member.email}</strong>. Each code expires after 10 minutes.</p>
              </div>
            </div>
          )}

          {tab === "documents" && (
            <div>
              <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, marginBottom: 24, paddingBottom: 14, borderBottom: "2px solid #f5f5f5" }}>My Documents</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }} className="doc-grid">
                {[
                  { key: "photoUrl", label: "Passport Photo" },
                  { key: "cnicFrontUrl", label: "CNIC Front" },
                  { key: "cnicBackUrl", label: "CNIC Back" },
                ].map(({ key, label }) => {
                  const val = member[key as keyof typeof member] as string;
                  return (
                    <div key={key}>
                      <p style={{ color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{label}</p>
                      <div style={{ border: `2px dashed ${val ? GOLD : "#e5e7eb"}`, borderRadius: 10, overflow: "hidden", backgroundColor: "#fafaf8" }}>
                        {val ? <img src={val} alt={label} style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} /> : <div style={{ height: 120, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}><Upload size={22} color="#d1d5db" /><p style={{ color: "#d1d5db", fontSize: 12, marginTop: 8 }}>Not uploaded</p></div>}
                      </div>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, cursor: "pointer", color: GREEN, fontSize: 12, fontWeight: 700 }}>
                        <Upload size={13} /> {val ? "Replace" : "Upload"}
                        <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleDocUpload(key)} />
                      </label>
                    </div>
                  );
                })}
              </div>
              {isApproved && (
                <div style={{ marginTop: 32, padding: "20px 24px", backgroundColor: "#f0f7f3", borderRadius: 12, border: "1px solid rgba(26,77,46,0.1)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}><CheckCircle size={18} color={GREEN} /><span style={{ color: GREEN, fontWeight: 700, fontSize: 15 }}>Member ID Card</span></div>
                  <div style={{ backgroundColor: GREEN, borderRadius: 10, padding: "20px 24px", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                    <div>
                      <p style={{ color: GOLD, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>Anjuman-e-Araian Pakistan</p>
                      <p style={{ color: "white", fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, margin: "6px 0 4px" }}>{member.fullName}</p>
                      <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, margin: 0 }}>{member.membershipType?.charAt(0).toUpperCase() + member.membershipType?.slice(1)} Member · {member.province}</p>
                    </div>
                    <div style={{ textAlign: "right" }}><p style={{ color: GOLD, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, margin: 0 }}>{member.memberNo}</p><p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, margin: "4px 0 0" }}>Member No.</p></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "family" && (
            <div>
              <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, marginBottom: 16, paddingBottom: 14, borderBottom: "2px solid #f5f5f5" }}>Family Information</h3>
              <div style={{ backgroundColor: "#fef9c3", border: "1px solid #fde047", borderRadius: 8, padding: "12px 16px", marginBottom: 24 }}>
                <p style={{ color: "#854d0e", fontSize: 13, margin: 0, lineHeight: 1.7 }}>🔒 <strong>Private:</strong> This information is only visible to you and authorized Anjuman administrators. It will never be shared publicly without your consent.</p>
              </div>
              {member.family && Object.values(member.family).some(Boolean) ? (
                <div>
                  <Subsection title="Spouse and Children" items={[["Spouse Name", member.family.spouseName], ["Number of Children", member.family.childrenCount], ["Children Details", member.family.childrenDetails]]} />
                  <Subsection title="Family / Branch" items={[["Family Branch", member.family.familyBranch], ["Family City / Area", member.family.familyCity], ["Family Contact Person", member.family.familyContactName], ["Family Contact Number", member.family.familyContactNumber]]} />
                  <Subsection title="Emergency Contact" items={[["Emergency Contact Name", member.family.emergencyContactName], ["Emergency Contact Number", member.family.emergencyContactNumber], ["Relationship", member.family.emergencyRelationship]]} />
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa" }}><Users size={40} style={{ margin: "0 auto 12px", display: "block" }} /><p>No family information recorded yet.</p><p style={{ fontSize: 13 }}>Family info is collected during registration or can be provided to the district office.</p></div>
              )}
              <div style={{ marginTop: 24, padding: "16px 20px", backgroundColor: "#f0f7f3", borderRadius: 10, border: "1px solid rgba(26,77,46,0.1)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                <MessageCircle size={16} color={GREEN} style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ color: "#555", fontSize: 13, lineHeight: 1.8, margin: 0 }}>To update your family information, please contact your district office or reach out via WhatsApp at <strong>+{getSiteSettings().whatsappNumber}</strong>.</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .portal-grid { grid-template-columns: 1fr !important; }
          .info-grid, .doc-grid { grid-template-columns: 1fr !important; }
          .info-grid > [style*="span 2"] { grid-column: span 1 !important; }
        }
      `}</style>
    </div>
  );
}

function Subsection({ title, items }: { title: string; items: [string, string][] }) {
  const hasData = items.some(([, value]) => value);
  if (!hasData) return null;
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ color: "#a72109", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>{title}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }} className="info-grid">
        {items.filter(([, value]) => value).map(([label, val]) => (
          <div key={label} style={{ padding: "10px 0", borderBottom: "1px solid #f9f9f9" }}>
            <p style={{ color: "#aaa", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>{label}</p>
            <p style={{ color: "#1a1a1a", fontSize: 14, margin: "3px 0 0" }}>{val}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
