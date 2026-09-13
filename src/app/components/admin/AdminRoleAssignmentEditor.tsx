import { useEffect, useMemo, useState } from "react";
import { Edit2, Save, X } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import {
  fetchOrganizationAssignments,
  fetchOrganizationUnits,
  OrganizationAssignment,
  OrganizationUnit,
  updateOrganizationAssignment,
} from "../../lib/governanceStore";

const GREEN = "#155a35";
const BORDER = "#e8e2d7";
const BUTTON_MARKER = "data-governance-assignment-edit";

const roleSuggestions = [
  "President", "Senior Vice President", "Vice President", "General Secretary", "Secretary",
  "Joint Secretary", "Finance Secretary", "Assistant Finance Secretary", "Information Secretary",
  "Media Coordinator", "Media Secretary", "Welfare Secretary", "Executive Member",
  "Committee Convener", "Committee Secretary", "Coordinator", "Member",
];

function normalize(value: unknown) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function roleRank(role: string) {
  const key = normalize(role);
  if (key === "president") return 10;
  if (key.includes("senior vice president")) return 20;
  if (key === "vice president" || key.startsWith("vice president ")) return 30;
  if (key.includes("general secretary")) return 40;
  if (key === "secretary") return 45;
  if (key.includes("joint secretary")) return 50;
  if (key.includes("finance secretary")) return 60;
  if (key.includes("information secretary")) return 70;
  if (key.includes("media")) return 80;
  if (key.includes("welfare")) return 90;
  if (key.includes("convener")) return 110;
  if (key.includes("committee secretary")) return 120;
  if (key.includes("coordinator")) return 130;
  if (key.includes("executive member")) return 200;
  if (key === "member") return 300;
  return 150;
}

function rowMatchesAssignment(row: HTMLTableRowElement, assignment: OrganizationAssignment) {
  const cells = Array.from(row.querySelectorAll("td"));
  if (cells.length < 6) return false;
  const member = normalize(cells[0]?.textContent);
  const role = normalize(cells[1]?.textContent);
  const unit = normalize(cells[2]?.textContent);
  const tenure = normalize(cells[3]?.textContent);
  const memberName = normalize(assignment.member?.fullName);
  const memberNo = normalize(assignment.member?.memberNo);
  const assignmentRole = normalize(assignment.role);
  const unitName = normalize(assignment.organization?.name);
  const period = normalize(assignment.period || "-");

  return Boolean(
    (member.includes(memberName) || (memberNo && member.includes(memberNo))) &&
    role.includes(assignmentRole) &&
    unit.includes(unitName) &&
    (tenure.includes(period) || period === "" || period === "-")
  );
}

export function AdminRoleAssignmentEditor() {
  const { isAdmin, role } = useAdmin();
  const canManage = isAdmin && (role === "admin" || role === "super_admin");
  const [assignments, setAssignments] = useState<OrganizationAssignment[]>([]);
  const [units, setUnits] = useState<OrganizationUnit[]>([]);
  const [editing, setEditing] = useState<OrganizationAssignment | null>(null);
  const [form, setForm] = useState({ organizationId: "", role: "", rank: 10, period: "", notes: "", isActive: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const activeUnits = useMemo(() => units.filter((unit) => unit.isActive), [units]);

  useEffect(() => {
    if (!canManage || typeof window === "undefined" || window.location.pathname !== "/admin/operations") return;
    let cancelled = false;
    Promise.all([fetchOrganizationAssignments(), fetchOrganizationUnits()])
      .then(([assignmentRows, unitRows]) => {
        if (cancelled) return;
        setAssignments(assignmentRows);
        setUnits(unitRows);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [canManage]);

  useEffect(() => {
    if (!canManage || typeof document === "undefined" || window.location.pathname !== "/admin/operations" || !assignments.length) return;

    const removeButtons = () => document.querySelectorAll<HTMLButtonElement>(`button[${BUTTON_MARKER}]`).forEach((button) => button.remove());
    const injectButtons = () => {
      removeButtons();
      const tables = Array.from(document.querySelectorAll<HTMLTableElement>("table"));
      const target = tables.find((table) => {
        const heading = normalize(table.querySelector("thead")?.textContent);
        return heading.includes("member") && heading.includes("role") && heading.includes("unit") && heading.includes("tenure") && heading.includes("action");
      });
      if (!target) return;

      const rows = Array.from(target.querySelectorAll<HTMLTableRowElement>("tbody tr"));
      rows.forEach((row) => {
        const assignment = assignments.find((item) => rowMatchesAssignment(row, item));
        const actionCell = row.querySelectorAll<HTMLTableCellElement>("td")[5];
        if (!assignment || !actionCell) return;

        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute(BUTTON_MARKER, assignment.id);
        button.textContent = "Edit";
        button.style.marginRight = "6px";
        button.style.padding = "8px 12px";
        button.style.border = "1px solid rgba(21,90,53,.28)";
        button.style.borderRadius = "8px";
        button.style.background = "white";
        button.style.color = GREEN;
        button.style.fontSize = "12px";
        button.style.fontWeight = "800";
        button.style.cursor = "pointer";
        button.addEventListener("click", () => {
          setEditing(assignment);
          setForm({
            organizationId: assignment.organizationId,
            role: assignment.role,
            rank: assignment.rank,
            period: assignment.period || "",
            notes: assignment.notes || "",
            isActive: assignment.isActive,
          });
          setError("");
        });
        actionCell.insertBefore(button, actionCell.firstChild);
      });
    };

    injectButtons();
    const observer = new MutationObserver(() => injectButtons());
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = window.setInterval(injectButtons, 1500);

    return () => {
      observer.disconnect();
      window.clearInterval(timer);
      removeButtons();
    };
  }, [assignments, canManage]);

  async function save() {
    if (!editing) return;
    if (!form.organizationId || form.role.trim().length < 2) {
      setError("Select a unit and enter a valid role.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateOrganizationAssignment(editing.id, {
        memberId: editing.memberId,
        organizationId: form.organizationId,
        role: form.role.trim(),
        rank: Number(form.rank) || 0,
        period: form.period.trim() || null,
        notes: form.notes.trim() || null,
        isActive: form.isActive,
      });
      setEditing(null);
      window.location.reload();
    } catch (e: any) {
      setError(e?.message || "Could not update this role assignment.");
      setSaving(false);
    }
  }

  if (!editing) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 12000, background: "rgba(0,0,0,.55)", display: "grid", placeItems: "center", padding: 16 }}>
      <div style={{ width: "min(720px,96vw)", background: "white", borderRadius: 14, boxShadow: "0 24px 80px rgba(0,0,0,.28)", overflow: "hidden" }}>
        <div style={{ padding: "17px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, color: GREEN, fontFamily: "Playfair Display,serif", fontSize: 22 }}>Edit Role Assignment</h3>
            <div style={{ color: "#777", fontSize: 12, marginTop: 3 }}>{editing.member?.fullName} · {editing.member?.memberNo}</div>
          </div>
          <button type="button" onClick={() => setEditing(null)} style={{ border: 0, background: "transparent", cursor: "pointer", color: "#777" }}><X size={20}/></button>
        </div>

        <div style={{ padding: 20 }}>
          {error && <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 8, padding: "10px 12px", fontSize: 12, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ color: GREEN, fontSize: 12, fontWeight: 800 }}>Organization Unit
              <select value={form.organizationId} onChange={(e) => setForm({ ...form, organizationId: e.target.value })} style={fieldStyle}>
                {activeUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.name} ({unit.type.replace(/_/g, " ")})</option>)}
              </select>
            </label>
            <label style={{ color: GREEN, fontSize: 12, fontWeight: 800 }}>Role / Designation
              <input list="governance-edit-role-options" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, rank: roleRank(e.target.value) })} style={fieldStyle}/>
              <datalist id="governance-edit-role-options">{roleSuggestions.map((item) => <option key={item} value={item}/>)}</datalist>
            </label>
            <label style={{ color: GREEN, fontSize: 12, fontWeight: 800 }}>Display / Hierarchy Order
              <input type="number" min={0} max={999} value={form.rank} onChange={(e) => setForm({ ...form, rank: Number(e.target.value) })} style={fieldStyle}/>
            </label>
            <label style={{ color: GREEN, fontSize: 12, fontWeight: 800 }}>Tenure / Period
              <input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="e.g. 2026–2028" style={fieldStyle}/>
            </label>
          </div>
          <label style={{ display: "block", color: GREEN, fontSize: 12, fontWeight: 800, marginTop: 12 }}>Assignment Note
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} style={{ ...fieldStyle, resize: "vertical" }}/>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, color: "#555", fontSize: 12, fontWeight: 700 }}>
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })}/> Active assignment
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
            <button type="button" onClick={() => setEditing(null)} style={secondaryButton}>Cancel</button>
            <button type="button" disabled={saving} onClick={() => void save()} style={{ ...primaryButton, opacity: saving ? .65 : 1 }}><Save size={14}/> {saving ? "Saving..." : "Save Changes"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const fieldStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", minHeight: 42, marginTop: 6, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "9px 11px", fontSize: 13, background: "white", color: "#333" };
const primaryButton: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, background: GREEN, color: "white", border: 0, borderRadius: 8, padding: "10px 14px", fontWeight: 800, fontSize: 12, cursor: "pointer" };
const secondaryButton: React.CSSProperties = { ...primaryButton, background: "white", color: GREEN, border: "1px solid rgba(21,90,53,.28)" };
