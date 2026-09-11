import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Crown, Search, ShieldCheck, Trash2, UserCog, Users } from "lucide-react";
import { useAdmin } from "../context/AdminContext";
import {
  createLeadershipProfile,
  deleteLeadershipProfile,
  fetchLeadershipProfiles,
  searchLeadershipMembers,
  LeadershipMemberOption,
  LeadershipProfile,
} from "../lib/leadershipStore";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

const roleSuggestions = [
  "President",
  "Senior Vice President",
  "Vice President",
  "General Secretary",
  "Joint Secretary",
  "Deputy Secretary",
  "Finance Secretary",
  "Assistant Finance Secretary",
  "Treasurer",
  "Information Secretary",
  "Media Secretary",
  "Welfare Secretary",
  "Membership Secretary",
  "Legal Secretary",
  "Legal Advisor",
  "Overseas Affairs Secretary",
  "Office Secretary",
  "Coordination Secretary",
  "Executive Member",
  "Chairman",
  "Convener",
  "Committee Secretary",
  "Committee Member",
  "Advisor",
];

const categoryOptions = [
  { value: "cabinet", label: "Executive Council / Cabinet" },
  { value: "executive", label: "Executive Committee" },
  { value: "advisory", label: "Advisory Board" },
  { value: "women-wing", label: "Women Wing" },
  { value: "custom", label: "New / Other Committee" },
];

function categoryLabel(value: string) {
  return categoryOptions.find((item) => item.value === value)?.label || value;
}

export function AdminLeadershipCenterPage() {
  const { isAdmin } = useAdmin();
  const [profiles, setProfiles] = useState<LeadershipProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [memberResults, setMemberResults] = useState<LeadershipMemberOption[]>([]);
  const [selectedMember, setSelectedMember] = useState<LeadershipMemberOption | null>(null);
  const [searching, setSearching] = useState(false);
  const [role, setRole] = useState("");
  const [category, setCategory] = useState("cabinet");
  const [customCategory, setCustomCategory] = useState("");
  const [tier, setTier] = useState("2");
  const [period, setPeriod] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [assignmentSearch, setAssignmentSearch] = useState("");

  const loadProfiles = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      setProfiles(await fetchLeadershipProfiles());
    } catch (e: any) {
      setError(e?.message || "Could not load leadership assignments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadProfiles(); }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || selectedMember || memberQuery.trim().length < 2) {
      setMemberResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        setMemberResults(await searchLeadershipMembers(memberQuery));
      } catch (e: any) {
        setError(e?.message || "Member search failed.");
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => window.clearTimeout(timer);
  }, [memberQuery, selectedMember, isAdmin]);

  const filteredAssignments = useMemo(() => {
    const q = assignmentSearch.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => [p.name, p.role, p.category, p.city, p.period, p.memberId]
      .some((value) => String(value || "").toLowerCase().includes(q)));
  }, [profiles, assignmentSearch]);

  const resetForm = () => {
    setSelectedMember(null);
    setMemberQuery("");
    setMemberResults([]);
    setRole("");
    setCategory("cabinet");
    setCustomCategory("");
    setTier("2");
    setPeriod("");
    setDescription("");
  };

  const saveAssignment = async () => {
    setError("");
    setMessage("");
    if (!selectedMember) { setError("Select an approved member from the master member registry."); return; }
    if (!role.trim()) { setError("Enter the role / designation."); return; }
    const finalCategory = category === "custom" ? customCategory.trim() : category;
    if (!finalCategory) { setError("Enter the committee / group name."); return; }

    setSaving(true);
    try {
      await createLeadershipProfile({
        memberId: selectedMember.id,
        name: selectedMember.fullName,
        role: role.trim(),
        city: selectedMember.city || "Faisalabad",
        tier: Number(tier) || 2,
        category: finalCategory,
        image: selectedMember.photoUrl || undefined,
        period: period.trim() || undefined,
        description: description.trim() || undefined,
      });
      setMessage(`${selectedMember.fullName} has been assigned as ${role.trim()}. The original member record was not duplicated or altered.`);
      resetForm();
      await loadProfiles();
    } catch (e: any) {
      setError(e?.message || "Could not save leadership assignment.");
    } finally {
      setSaving(false);
    }
  };

  const removeAssignment = async (profile: LeadershipProfile) => {
    if (!confirm(`Remove only the ${profile.role} assignment for ${profile.name}? The member record will remain unchanged.`)) return;
    try {
      await deleteLeadershipProfile(profile.id);
      setMessage(`Assignment removed. ${profile.name}'s master member record is unchanged.`);
      await loadProfiles();
    } catch (e: any) {
      setError(e?.message || "Could not remove assignment.");
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8f5ef", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ maxWidth: 520, background: "white", padding: 34, borderRadius: 14, textAlign: "center", boxShadow: "0 8px 35px rgba(0,0,0,.08)" }}>
          <ShieldCheck size={40} color={GREEN} />
          <h2 style={{ color: GREEN }}>Admin authorization required</h2>
          <p style={{ color: "#666", lineHeight: 1.65 }}>Sign in through the main Admin Panel before managing committee or leadership assignments.</p>
          <Link to="/admin" style={primaryLink}>Open Admin Panel</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8f5ef", fontFamily: "'Lato', sans-serif" }}>
      <header style={{ background: GREEN, color: "white", borderBottom: `4px solid ${GOLD}` }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 24 }}>Leadership & Committee Assignment Center</h1>
            <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,.75)", fontSize: 12 }}>Roles are linked to existing approved member IDs. No duplicate person records are created.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link to="/admin/members" style={headerLink}><Users size={14} /> Member Center</Link>
            <Link to="/admin" style={headerLink}><ArrowLeft size={14} /> Main Admin</Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1240, margin: "0 auto", padding: "26px 22px 60px" }}>
        {message && <Notice success text={message} />}
        {error && <Notice text={error} />}

        <section style={panelStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 5 }}>
            <Crown size={20} color={GOLD} />
            <h2 style={{ margin: 0, color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 21 }}>Assign Existing Member</h2>
          </div>
          <p style={{ color: "#777", fontSize: 12, lineHeight: 1.65, margin: "0 0 18px" }}>
            Search the master registry by name, Member ID, CNIC, phone or WhatsApp. Select the existing person first, then assign a role. Historical founder/ex-president records can remain in the older history section.
          </p>

          <div style={{ position: "relative", marginBottom: 14 }}>
            <label style={labelStyle}>Find approved member</label>
            {selectedMember ? (
              <div style={{ border: `1px solid ${GREEN}35`, background: "#f0f7f3", borderRadius: 10, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <div style={{ width: 45, height: 45, borderRadius: "50%", overflow: "hidden", background: "white", display: "grid", placeItems: "center", border: `2px solid ${GOLD}` }}>
                    {selectedMember.photoUrl ? <img src={selectedMember.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <UserCog size={20} color={GREEN} />}
                  </div>
                  <div><strong style={{ color: GREEN }}>{selectedMember.fullName}</strong><div style={{ fontSize: 11, color: "#777", marginTop: 3 }}>{selectedMember.memberNo} · {selectedMember.city} · {selectedMember.occupation || "Member"}</div></div>
                </div>
                <button type="button" onClick={() => { setSelectedMember(null); setMemberQuery(""); }} style={secondaryButton}>Change Member</button>
              </div>
            ) : (
              <>
                <div style={{ position: "relative" }}><Search size={16} color="#888" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} /><input value={memberQuery} onChange={(e) => setMemberQuery(e.target.value)} placeholder="Start typing name, Member ID, CNIC or phone..." style={{ ...fieldStyle, paddingLeft: 36 }} /></div>
                {(memberResults.length > 0 || searching) && (
                  <div style={{ position: "absolute", left: 0, right: 0, zIndex: 20, background: "white", border: "1px solid #ddd", borderRadius: 10, boxShadow: "0 12px 30px rgba(0,0,0,.12)", marginTop: 5, overflow: "hidden" }}>
                    {searching && <div style={{ padding: 14, color: "#777", fontSize: 12 }}>Searching approved member registry…</div>}
                    {!searching && memberResults.map((m) => (
                      <button key={m.id} type="button" onClick={() => { setSelectedMember(m); setMemberQuery(`${m.fullName} · ${m.memberNo}`); setMemberResults([]); }} style={{ width: "100%", border: 0, borderTop: "1px solid #f1f1f1", background: "white", padding: "11px 13px", textAlign: "left", cursor: "pointer" }}>
                        <strong style={{ color: GREEN, fontSize: 13 }}>{m.fullName}</strong>
                        <div style={{ marginTop: 3, color: "#777", fontSize: 11 }}>{m.memberNo} · {m.city} · {m.designation || m.occupation || "Member"}</div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="assign-form-grid" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr .5fr 1fr", gap: 12 }}>
            <div><label style={labelStyle}>Role / Designation</label><input list="leadership-role-suggestions" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Executive Member" style={fieldStyle} /><datalist id="leadership-role-suggestions">{roleSuggestions.map((item) => <option key={item} value={item} />)}</datalist></div>
            <div><label style={labelStyle}>Committee / Group</label><select value={category} onChange={(e) => setCategory(e.target.value)} style={fieldStyle}>{categoryOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
            <div><label style={labelStyle}>Tier / Order</label><input type="number" min="0" max="10" value={tier} onChange={(e) => setTier(e.target.value)} style={fieldStyle} /></div>
            <div><label style={labelStyle}>Tenure / Period</label><input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026–2028" style={fieldStyle} /></div>
          </div>

          {category === "custom" && <div style={{ marginTop: 12 }}><label style={labelStyle}>New committee / group name</label><input value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="e.g. Education Committee" style={fieldStyle} /></div>}
          <div style={{ marginTop: 12 }}><label style={labelStyle}>Assignment note / description (optional)</label><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional role note, responsibility or context" style={fieldStyle} /></div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
            <p style={{ margin: 0, color: "#888", fontSize: 11 }}>Saving creates only a role assignment linked to the selected Member ID. It does not create another member.</p>
            <button type="button" onClick={() => void saveAssignment()} disabled={saving} style={{ ...primaryButton, opacity: saving ? .65 : 1 }}><UserCog size={15} /> {saving ? "Saving…" : "Save Assignment"}</button>
          </div>
        </section>

        <section style={{ ...panelStyle, marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <div><h2 style={{ margin: 0, color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 20 }}>Current Assignments</h2><p style={{ margin: "4px 0 0", color: "#888", fontSize: 11 }}>{profiles.length} role assignment{profiles.length === 1 ? "" : "s"}. A member may legitimately appear more than once when holding multiple roles.</p></div>
            <div style={{ position: "relative" }}><Search size={14} color="#888" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} /><input value={assignmentSearch} onChange={(e) => setAssignmentSearch(e.target.value)} placeholder="Search assignments..." style={{ ...fieldStyle, width: 250, paddingLeft: 32 }} /></div>
          </div>

          <div style={{ overflowX: "auto", border: "1px solid #ececec", borderRadius: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 850 }}>
              <thead><tr style={{ background: "#f8f5ef" }}>{["Member", "Role", "Committee / Group", "City", "Tenure", "Link Status", "Action"].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
              <tbody>
                {filteredAssignments.map((p) => (
                  <tr key={p.id} style={{ borderTop: "1px solid #eee" }}>
                    <td style={tdStyle}><strong style={{ color: GREEN }}>{p.name}</strong>{p.memberId && <div style={{ color: "#999", fontSize: 10, marginTop: 3 }}>Member-linked assignment</div>}</td>
                    <td style={tdStyle}>{p.role}</td>
                    <td style={tdStyle}><span style={{ background: "#f0f7f3", color: GREEN, borderRadius: 14, padding: "4px 9px", fontWeight: 700, fontSize: 11 }}>{categoryLabel(p.category)}</span></td>
                    <td style={tdStyle}>{p.city || "—"}</td>
                    <td style={tdStyle}>{p.period || "—"}</td>
                    <td style={tdStyle}>{p.memberId ? <span style={{ color: "#15803d", fontWeight: 700, fontSize: 11 }}>Master Member ID linked</span> : <span style={{ color: "#9a6700", fontWeight: 700, fontSize: 11 }}>Legacy / historical</span>}</td>
                    <td style={tdStyle}><button type="button" onClick={() => void removeAssignment(p)} style={dangerButton}><Trash2 size={12} /> Remove Role</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loading && <div style={{ padding: 36, textAlign: "center", color: "#777" }}>Loading assignments…</div>}
            {!loading && filteredAssignments.length === 0 && <div style={{ padding: 36, textAlign: "center", color: "#999" }}>No assignments found.</div>}
          </div>
        </section>
      </main>
      <style>{`@media (max-width: 850px) { .assign-form-grid { grid-template-columns: 1fr 1fr !important; } } @media (max-width: 560px) { .assign-form-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

function Notice({ text, success = false }: { text: string; success?: boolean }) {
  return <div style={{ marginBottom: 16, padding: "11px 14px", borderRadius: 8, background: success ? "#dcfce7" : "#fee2e2", color: success ? "#166534" : "#b91c1c", fontSize: 12, fontWeight: 700 }}>{text}</div>;
}

const panelStyle: React.CSSProperties = { background: "white", borderRadius: 12, padding: 22, boxShadow: "0 2px 12px rgba(0,0,0,.06)", border: "1px solid rgba(26,77,46,.08)" };
const fieldStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #d8ded9", borderRadius: 8, padding: "10px 11px", background: "white", fontSize: 13, fontFamily: "inherit", color: "#333" };
const labelStyle: React.CSSProperties = { display: "block", color: GREEN, fontSize: 12, fontWeight: 800, marginBottom: 6 };
const thStyle: React.CSSProperties = { textAlign: "left", padding: "12px 13px", color: "#777", fontSize: 10, textTransform: "uppercase", letterSpacing: ".05em", whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "12px 13px", fontSize: 12, color: "#444", verticalAlign: "middle" };
const primaryButton: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, border: 0, borderRadius: 8, background: GREEN, color: "white", padding: "10px 15px", fontWeight: 800, fontSize: 12, cursor: "pointer" };
const secondaryButton: React.CSSProperties = { border: "1px solid #cfd7d1", background: "white", color: GREEN, borderRadius: 7, padding: "7px 10px", fontWeight: 700, fontSize: 11, cursor: "pointer" };
const dangerButton: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, border: "1px solid #fecaca", background: "#fff7f7", color: "#b91c1c", borderRadius: 6, padding: "6px 9px", fontWeight: 700, fontSize: 11, cursor: "pointer" };
const headerLink: React.CSSProperties = { color: "white", textDecoration: "none", border: "1px solid rgba(255,255,255,.28)", padding: "8px 11px", borderRadius: 7, fontWeight: 700, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 };
const primaryLink: React.CSSProperties = { display: "inline-block", background: GREEN, color: "white", padding: "10px 18px", borderRadius: 8, textDecoration: "none", fontWeight: 700 };
