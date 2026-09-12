import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, X } from "lucide-react";
import { Member } from "../../lib/memberStore";
import { exportMemberRecords, MemberExportFormat } from "../../lib/memberExport";

const GREEN = "#1a4d2e";

function matchesMember(member: Member, query: string) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const haystack = [member.fullName, member.memberNo, member.formNo, member.cnic, member.phone, member.whatsapp, member.email, member.city, member.localArea]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

export function MemberDataExportPanel({ members }: { members: Member[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  const visible = useMemo(() => members.filter((m) => matchesMember(m, query)), [members, query]);
  const selectedMembers = useMemo(() => members.filter((m) => selected.has(m.id)), [members, selected]);
  const allVisibleSelected = visible.length > 0 && visible.every((m) => selected.has(m.id));

  const toggle = (id: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleVisible = () => setSelected((current) => {
    const next = new Set(current);
    if (allVisibleSelected) visible.forEach((m) => next.delete(m.id));
    else visible.forEach((m) => next.add(m.id));
    return next;
  });

  const exportNow = (format: MemberExportFormat) => {
    setError("");
    try {
      const rows = selectedMembers.length ? selectedMembers : visible;
      exportMemberRecords(rows, format);
    } catch (e: any) {
      setError(e?.message || "Could not export member data.");
    }
  };

  return <>
    <button onClick={() => setOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "white", color: GREEN, border: "1px solid #cbd8cf", borderRadius: 7, padding: "9px 13px", fontWeight: 800, fontSize: 12, cursor: "pointer" }}><Download size={14} /> Download Data</button>
    {open && <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,.58)", display: "grid", placeItems: "center", padding: 16 }}>
      <div style={{ width: "min(760px,96vw)", maxHeight: "90vh", background: "white", borderRadius: 14, boxShadow: "0 24px 80px rgba(0,0,0,.28)", overflow: "hidden" }}>
        <div style={{ padding: "18px 20px", borderBottom: "1px solid #e7ece8", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><div><h3 style={{ margin: 0, color: GREEN, fontFamily: "'Playfair Display', serif" }}>Download Member Database</h3><p style={{ margin: "4px 0 0", color: "#777", fontSize: 12 }}>Select the records you need. With no manual selection, the current search results will be exported.</p></div><button onClick={() => setOpen(false)} style={{ border: 0, background: "transparent", cursor: "pointer", color: "#777" }}><X size={20} /></button></div>
        <div style={{ padding: 20 }}>
          {error && <div style={{ padding: 10, marginBottom: 12, background: "#fee2e2", color: "#b91c1c", borderRadius: 7, fontSize: 12 }}>{error}</div>}
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, registration no., CNIC, phone, city..." style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #d9e2dc", borderRadius: 8, fontSize: 12 }} />
          <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}><div style={{ fontSize: 11, color: "#666" }}>{selected.size ? `${selected.size} selected` : `${visible.length} records in current search`}</div><div style={{ display: "flex", gap: 7 }}><button onClick={toggleVisible} style={smallButton}>{allVisibleSelected ? "Clear Search Results" : "Select Search Results"}</button>{selected.size > 0 && <button onClick={() => setSelected(new Set())} style={smallButton}>Clear Selection</button>}</div></div>
          <div style={{ marginTop: 12, border: "1px solid #e5e7eb", borderRadius: 9, maxHeight: 360, overflow: "auto" }}>{visible.map((m) => <label key={m.id} style={{ display: "grid", gridTemplateColumns: "22px 1fr auto", gap: 10, alignItems: "center", padding: "10px 12px", borderBottom: "1px solid #f0f1f0", cursor: "pointer" }}><input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} /><div><strong style={{ color: "#24392d", fontSize: 12 }}>{m.fullName}</strong><div style={{ color: "#888", fontSize: 10, marginTop: 2 }}>{m.cnic} · {m.phone}</div></div><span style={{ color: GREEN, fontSize: 10, fontWeight: 800 }}>{m.memberNo}</span></label>)}{visible.length === 0 && <div style={{ padding: 30, textAlign: "center", color: "#999", fontSize: 12 }}>No matching member records.</div>}</div>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 9, flexWrap: "wrap" }}><button onClick={() => exportNow("csv")} style={outlineButton}><Download size={14} /> CSV</button><button onClick={() => exportNow("xlsx")} style={primaryButton}><FileSpreadsheet size={14} /> Excel</button></div>
        </div>
      </div>
    </div>}
  </>;
}

const smallButton: React.CSSProperties = { border: "1px solid #d6ded8", background: "white", color: GREEN, borderRadius: 6, padding: "6px 9px", fontWeight: 700, fontSize: 10, cursor: "pointer" };
const outlineButton: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid #b9c9bf", background: "white", color: GREEN, borderRadius: 7, padding: "9px 14px", fontWeight: 800, fontSize: 12, cursor: "pointer" };
const primaryButton: React.CSSProperties = { ...outlineButton, background: GREEN, color: "white", borderColor: GREEN };
