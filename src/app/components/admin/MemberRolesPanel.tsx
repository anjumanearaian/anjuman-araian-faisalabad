import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, XCircle } from "lucide-react";
import type { Member } from "../../lib/memberStore";
import {
  createLeadershipProfile,
  fetchLeadershipProfiles,
  updateLeadershipProfile,
  type LeadershipProfile,
} from "../../lib/leadershipStore";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

const roleOptions = [
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
  "Chairman",
  "Convener",
  "Committee Secretary",
  "Executive Member",
  "Committee Member",
  "Member",
  "Advisor",
];

const groupOptions = [
  { value: "cabinet", label: "Executive Council / Cabinet" },
  { value: "executive", label: "Executive Body / Executive Committee" },
  { value: "management-committee", label: "Management Committee" },
  { value: "standing-committee", label: "Standing Committee" },
  { value: "finance-committee", label: "Finance Committee" },
  { value: "advisory", label: "Advisory Board" },
  { value: "women-wing", label: "Women Wing" },
  { value: "custom", label: "Other / New Committee" },
];

function groupLabel(value: string) {
  return groupOptions.find((item) => item.value === value)?.label || value;
}

export function MemberRolesPanel({ member }: { member: Member | null }) {
  const [profiles, setProfiles] = useState<LeadershipProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [role, setRole] = useState("");
  const [group, setGroup] = useState("executive");
  const [customGroup, setCustomGroup] = useState("");
  const [period, setPeriod] = useState("");
  const [tier, setTier] = useState("2");

  const load = async () => {
    if (!member?.id) return;
    setLoading(true);
    setError("");
    try {
      setProfiles(await fetchLeadershipProfiles());
    } catch (e: any) {
      setError(e?.message || "Could not load organizational roles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [member?.id]);

  const assignments = useMemo(
    () => profiles
      .filter((p) => p.memberId === member?.id && !["founder", "expresident"].includes(String(p.category || "").toLowerCase()))
      .sort((a, b) => {
        const activeOrder = Number(b.isActive !== false) - Number(a.isActive !== false);
        return activeOrder || `${a.category} ${a.role}`.localeCompare(`${b.category} ${b.role}`, "en", { sensitivity: "base" });
      }),
    [profiles, member?.id],
  );

  const save = async () => {
    if (!member) return;
    if (member.status !== "approved") {
      setError("Approve this member before assigning an organizational role.");
      return;
    }
    const finalGroup = group === "custom" ? customGroup.trim() : group;
    if (!role.trim() || !finalGroup) {
      setError("Select a role and committee/group.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createLeadershipProfile({
        memberId: member.id,
        name: member.fullName,
        city: member.city || "Faisalabad",
        image: member.photoUrl || undefined,
        role: role.trim(),
        category: finalGroup,
        period: period.trim() || undefined,
        tier: Number(tier) || 2,
        isActive: true,
        startedAt: new Date().toISOString(),
      });
      setRole("");
      setCustomGroup("");
      setPeriod("");
      setTier("2");
      await load();
    } catch (e: any) {
      setError(e?.message || "Could not assign role.");
    } finally {
      setSaving(false);
    }
  };

  const endRole = async (profile: LeadershipProfile) => {
    if (profile.isActive === false) return;
    if (!confirm(`End ${profile.role} for ${member?.fullName}? The assignment will remain permanently in role history.`)) return;
    try {
      await updateLeadershipProfile(profile.id, { isActive: false, endedAt: new Date().toISOString() });
      await load();
    } catch (e: any) {
      setError(e?.message || "Could not end role.");
    }
  };

  if (!member) {
    return (
      <section style={{ marginBottom: 24 }}>
        <h3 style={sectionTitle}>Organizational Roles & Committees</h3>
        <div style={infoBox}>Save the member record first. After that, multiple organizational roles can be linked to this same master member without creating a duplicate person record.</div>
      </section>
    );
  }

  return (
    <section style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, borderBottom: "1px solid #eee", paddingBottom: 7, marginBottom: 12 }}>
        <div>
          <h3 style={{ ...sectionTitle, borderBottom: 0, paddingBottom: 0, marginBottom: 2 }}>Organizational Roles & Committees</h3>
          <p style={{ margin: 0, fontSize: 11, color: "#777", fontWeight: 400 }}>One member can hold several roles at the same time. Ended roles remain in lifetime history and are never deleted from the member record.</p>
        </div>
        <button type="button" onClick={() => void load()} style={secondaryButton}><RefreshCw size={13} /> Refresh</button>
      </div>

      {error && <div style={{ background: "#fee2e2", color: "#b91c1c", borderRadius: 7, padding: "8px 10px", fontSize: 11, marginBottom: 10 }}>{error}</div>}

      <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
        {loading ? <div style={infoBox}>Loading assignments...</div> : assignments.length === 0 ? <div style={infoBox}>No organizational role is linked to this member yet.</div> : assignments.map((item) => {
          const active = item.isActive !== false;
          return (
            <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1.2fr 1.55fr .8fr .65fr auto", gap: 8, alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 8, padding: "9px 10px", background: active ? "#fcfdfc" : "#f7f7f7", opacity: active ? 1 : .78 }}>
              <strong style={{ color: GREEN, fontSize: 12 }}>{item.role}</strong>
              <span style={{ color: "#555", fontSize: 11 }}>{groupLabel(item.category)}</span>
              <span style={{ color: "#777", fontSize: 11 }}>{item.period || "Current"}</span>
              <span style={{ background: active ? "#dcfce7" : "#e5e7eb", color: active ? "#166534" : "#4b5563", borderRadius: 20, padding: "3px 7px", fontSize: 10, fontWeight: 800, textAlign: "center" }}>{active ? "Active" : "History"}</span>
              {active ? <button type="button" onClick={() => void endRole(item)} title="End role and preserve in history" style={{ border: "1px solid #f5d0a7", background: "#fff", color: "#9a3412", borderRadius: 6, padding: "5px 7px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}><XCircle size={12} /> End</button> : <span style={{ color: "#888", fontSize: 10 }}>{item.endedAt ? new Date(item.endedAt).toLocaleDateString("en-PK") : "Ended"}</span>}
            </div>
          );
        })}
      </div>

      <div style={{ border: `1px solid ${GOLD}55`, background: "#fffdf7", borderRadius: 10, padding: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1.35fr .75fr .45fr", gap: 9 }} className="modal-grid">
          <label style={labelStyle}>Role / Designation
            <input list="member-org-role-options" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. President or Member" style={fieldStyle} />
            <datalist id="member-org-role-options">{roleOptions.map((item) => <option key={item} value={item} />)}</datalist>
          </label>
          <label style={labelStyle}>Committee / Group
            <select value={group} onChange={(e) => setGroup(e.target.value)} style={fieldStyle}>{groupOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          </label>
          <label style={labelStyle}>Tenure / Period
            <input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026–2028" style={fieldStyle} />
          </label>
          <label style={labelStyle}>Order
            <input type="number" min="0" max="10" value={tier} onChange={(e) => setTier(e.target.value)} style={fieldStyle} />
          </label>
        </div>
        {group === "custom" && <label style={{ ...labelStyle, marginTop: 9 }}>Committee / Group Name<input value={customGroup} onChange={(e) => setCustomGroup(e.target.value)} placeholder="e.g. Education Committee" style={fieldStyle} /></label>}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <button type="button" disabled={saving || member.status !== "approved"} onClick={() => void save()} style={{ ...primaryButton, opacity: saving || member.status !== "approved" ? .6 : 1 }}><Plus size={13} /> {saving ? "Saving..." : "Add Role"}</button>
        </div>
      </div>
    </section>
  );
}

const sectionTitle: React.CSSProperties = { color: GREEN, fontSize: 14, textTransform: "uppercase", letterSpacing: ".04em", borderBottom: "1px solid #eee", paddingBottom: 7, margin: "0 0 12px" };
const fieldStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "9px 11px", border: "1px solid #d9e2dc", borderRadius: 7, background: "white", fontSize: 12 };
const labelStyle: React.CSSProperties = { display: "grid", gap: 6, color: GREEN, fontSize: 11, fontWeight: 800 };
const primaryButton: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, background: GREEN, color: "white", border: 0, borderRadius: 7, padding: "8px 12px", fontWeight: 800, fontSize: 11, cursor: "pointer" };
const secondaryButton: React.CSSProperties = { ...primaryButton, background: "white", color: GREEN, border: "1px solid #cbd8cf" };
const infoBox: React.CSSProperties = { padding: 10, borderRadius: 8, background: "#f8f5ef", color: "#666", fontSize: 11, lineHeight: 1.55 };
