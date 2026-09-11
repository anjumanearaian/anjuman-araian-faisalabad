import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { CalendarDays, CheckCircle, ClipboardList, FileText, Plus, Printer, RefreshCw, Save, ShieldCheck, Trash2, Users } from "lucide-react";
import { useAdmin } from "../context/AdminContext";
import {
  buildMeetingRoster,
  createMeeting,
  deleteMeeting,
  fetchGovernanceGroups,
  fetchMeetings,
  publishMeetingMinutes,
  saveMeetingAttendance,
  updateMeeting,
  type AttendanceStatus,
  type GovernanceGroupSummary,
  type GovernanceMeeting,
  type MeetingAttendance,
  type MeetingStatus,
} from "../lib/governanceStore";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

const standardGroups: GovernanceGroupSummary[] = [
  { key: "cabinet", label: "Executive Council / Cabinet", members: 0 },
  { key: "executive", label: "Executive Body / Executive Committee", members: 0 },
  { key: "management-committee", label: "Management Committee", members: 0 },
  { key: "standing-committee", label: "Standing Committee", members: 0 },
  { key: "finance-committee", label: "Finance Committee", members: 0 },
  { key: "advisory", label: "Advisory Board", members: 0 },
  { key: "women-wing", label: "Women Wing", members: 0 },
];

function mergeGroups(groups: GovernanceGroupSummary[]) {
  const byKey = new Map<string, GovernanceGroupSummary>();
  standardGroups.forEach((g) => byKey.set(g.key, g));
  groups.forEach((g) => byKey.set(g.key, g));
  return [...byKey.values()].sort((a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base" }));
}

const blankMeeting = () => ({
  title: "",
  groupKey: "executive",
  meetingType: "Monthly Meeting",
  meetingNo: "",
  scheduledAt: "",
  venue: "",
  agenda: "",
  noticeBody: "",
  status: "draft" as MeetingStatus,
});

export function AdminGovernancePage() {
  const { isAdmin } = useAdmin();
  const [groups, setGroups] = useState<GovernanceGroupSummary[]>(standardGroups);
  const [meetings, setMeetings] = useState<GovernanceMeeting[]>([]);
  const [selected, setSelected] = useState<GovernanceMeeting | null>(null);
  const [form, setForm] = useState(blankMeeting());
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [attendance, setAttendance] = useState<MeetingAttendance[]>([]);
  const [minutesBody, setMinutesBody] = useState("");

  const load = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError("");
    try {
      const [g, m] = await Promise.all([fetchGovernanceGroups(), fetchMeetings()]);
      setGroups(mergeGroups(g));
      setMeetings(m);
      if (selected) {
        const refreshed = m.find((x) => x.id === selected.id) || null;
        setSelected(refreshed);
        setAttendance(refreshed?.attendances || []);
        setMinutesBody(refreshed?.minutesBody || "");
      }
    } catch (e: any) {
      setError(e?.message || "Governance records could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [isAdmin]);

  const stats = useMemo(() => ({
    total: meetings.length,
    upcoming: meetings.filter((m) => new Date(m.scheduledAt).getTime() >= Date.now() && !["cancelled", "published"].includes(m.status)).length,
    held: meetings.filter((m) => ["held", "minutes_draft", "published"].includes(m.status)).length,
    published: meetings.filter((m) => m.status === "published").length,
  }), [meetings]);

  const saveNewMeeting = async () => {
    if (!form.title.trim() || !form.groupKey || !form.scheduledAt) {
      setError("Meeting title, committee/group and date/time are required.");
      return;
    }
    setSaving(true); setError(""); setMessage("");
    try {
      await createMeeting(form);
      setShowCreate(false);
      setForm(blankMeeting());
      setMessage("Meeting record created. Build the roster to prepare attendance from active committee assignments.");
      await load();
    } catch (e: any) { setError(e?.message || "Meeting could not be created."); }
    finally { setSaving(false); }
  };

  const openMeeting = (meeting: GovernanceMeeting) => {
    setSelected(meeting);
    setAttendance((meeting.attendances || []).slice().sort((a, b) => String(a.member?.fullName || "").localeCompare(String(b.member?.fullName || ""), "en", { sensitivity: "base" })));
    setMinutesBody(meeting.minutesBody || "");
    setError(""); setMessage("");
  };

  const roster = async () => {
    if (!selected) return;
    setSaving(true); setError("");
    try {
      const result = await buildMeetingRoster(selected.id);
      const meeting = result.meeting;
      setSelected(meeting);
      setAttendance((meeting.attendances || []).slice().sort((a, b) => String(a.member?.fullName || "").localeCompare(String(b.member?.fullName || ""), "en", { sensitivity: "base" })));
      setMessage("Attendance roster refreshed from the current committee/group assignments. Existing attendance marks were preserved.");
    } catch (e: any) { setError(e?.message || "Roster could not be prepared."); }
    finally { setSaving(false); }
  };

  const changeAttendance = (memberId: string, status: AttendanceStatus) => {
    setAttendance((items) => items.map((a) => a.memberId === memberId ? { ...a, status } : a));
  };

  const saveAttendance = async () => {
    if (!selected) return;
    setSaving(true); setError("");
    try {
      const result = await saveMeetingAttendance(selected.id, attendance.map(({ member, ...row }) => row));
      setSelected(result.meeting);
      setAttendance((result.meeting.attendances || []).slice().sort((a, b) => String(a.member?.fullName || "").localeCompare(String(b.member?.fullName || ""), "en", { sensitivity: "base" })));
      setMessage("Attendance saved to the permanent meeting record.");
      await load();
    } catch (e: any) { setError(e?.message || "Attendance could not be saved."); }
    finally { setSaving(false); }
  };

  const saveMinutesDraft = async () => {
    if (!selected) return;
    setSaving(true); setError("");
    try {
      const updated = await updateMeeting(selected.id, { minutesBody, status: selected.status === "published" ? "published" : "minutes_draft" });
      setSelected(updated);
      setMessage("Minutes draft saved.");
      await load();
    } catch (e: any) { setError(e?.message || "Minutes draft could not be saved."); }
    finally { setSaving(false); }
  };

  const publishMinutes = async () => {
    if (!selected) return;
    if (!minutesBody.trim()) { setError("Write the meeting minutes before publishing."); return; }
    if (!confirm("Publish these minutes to approved members? You can still edit and republish later.")) return;
    setSaving(true); setError("");
    try {
      const updated = await publishMeetingMinutes(selected.id, minutesBody);
      setSelected(updated);
      setMessage("Minutes published to the member record area.");
      await load();
    } catch (e: any) { setError(e?.message || "Minutes could not be published."); }
    finally { setSaving(false); }
  };

  const removeMeeting = async (meeting: GovernanceMeeting) => {
    if (!confirm(`Delete the meeting record “${meeting.title}”? Attendance and minutes linked to it will also be removed.`)) return;
    try { await deleteMeeting(meeting.id); if (selected?.id === meeting.id) setSelected(null); await load(); }
    catch (e: any) { setError(e?.message || "Meeting could not be deleted."); }
  };

  if (!isAdmin) return <Unauthorized />;

  return (
    <div style={{ minHeight: "100vh", background: "#f8f5ef", fontFamily: "'Lato', sans-serif" }}>
      <header style={{ background: GREEN, borderBottom: `4px solid ${GOLD}`, color: "white" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto", padding: "18px 22px", display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <div><h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 24 }}>Governance, Meetings & Records</h1><p style={{ margin: "4px 0 0", fontSize: 12, opacity: .76 }}>Committee rosters, attendance, meeting notices, minutes and permanent organizational history</p></div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Link to="/admin/members" style={headerLink}>Member Center</Link><Link to="/admin/leadership" style={headerLink}>Leadership</Link><Link to="/admin" style={headerLink}>Main Admin</Link></div>
        </div>
      </header>

      <main style={{ maxWidth: 1320, margin: "0 auto", padding: "26px 22px 60px" }}>
        {message && <Notice good>{message}</Notice>}{error && <Notice>{error}</Notice>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }} className="gov-stats">
          <Stat label="Total Meetings" value={stats.total} icon={<CalendarDays size={17} />} />
          <Stat label="Upcoming" value={stats.upcoming} icon={<ClipboardList size={17} />} />
          <Stat label="Held" value={stats.held} icon={<Users size={17} />} />
          <Stat label="Minutes Published" value={stats.published} icon={<FileText size={17} />} />
        </div>

        <section style={panel}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <div><h2 style={titleStyle}>Meeting Register</h2><p style={subStyle}>A meeting keeps its own attendance and minutes history. Names are loaded from active committee assignments, not copied into a second member database.</p></div>
            <div style={{ display: "flex", gap: 8 }}><button onClick={() => void load()} style={secondary}><RefreshCw size={14} /> Refresh</button><button onClick={() => setShowCreate(true)} style={primary}><Plus size={14} /> New Meeting</button></div>
          </div>
          <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 940 }}><thead><tr style={{ background: "#f8f5ef" }}>{["Meeting", "Committee / Group", "Date & Time", "Venue", "Status", "Attendance", "Actions"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead><tbody>{meetings.map((m) => <tr key={m.id} style={{ borderTop: "1px solid #eee" }}><td style={td}><strong style={{ color: GREEN }}>{m.title}</strong><div style={small}>{m.meetingNo || m.meetingType}</div></td><td style={td}>{groupName(groups, m.groupKey)}</td><td style={td}>{new Date(m.scheduledAt).toLocaleString("en-PK")}</td><td style={td}>{m.venue || "—"}</td><td style={td}><Badge status={m.status} /></td><td style={td}>{attendanceSummary(m.attendances || [])}</td><td style={td}><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><button onClick={() => openMeeting(m)} style={tiny}>Open</button><button onClick={() => printMeeting(m, "notice", groups)} style={tiny}><Printer size={12} /> Notice</button><button onClick={() => printMeeting(m, "minutes", groups)} disabled={!m.minutesBody} style={{ ...tiny, opacity: m.minutesBody ? 1 : .45 }}><Printer size={12} /> Minutes</button><button onClick={() => void removeMeeting(m)} style={{ ...tiny, color: "#b91c1c", borderColor: "#fecaca" }}><Trash2 size={12} /></button></div></td></tr>)}</tbody></table>{!loading && !meetings.length && <div style={{ padding: 42, textAlign: "center", color: "#999" }}>No meetings recorded yet.</div>}{loading && <div style={{ padding: 42, textAlign: "center", color: "#777" }}>Loading meeting register...</div>}</div>
        </section>

        {selected && <section style={{ ...panel, marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 18 }}><div><h2 style={titleStyle}>{selected.title}</h2><p style={subStyle}>{groupName(groups, selected.groupKey)} · {new Date(selected.scheduledAt).toLocaleString("en-PK")} · {selected.venue || "Venue not set"}</p></div><button onClick={() => setSelected(null)} style={secondary}>Close Meeting</button></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="gov-columns">
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}><h3 style={miniTitle}>Attendance</h3><button onClick={() => void roster()} disabled={saving} style={secondary}><Users size={13} /> Build / Refresh Roster</button></div>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                {attendance.length ? attendance.map((a) => <div key={a.memberId} style={{ display: "grid", gridTemplateColumns: "1fr 130px", gap: 8, alignItems: "center", padding: "9px 11px", borderTop: "1px solid #f1f1f1" }}><div><strong style={{ fontSize: 12, color: GREEN }}>{a.member?.fullName || "Member"}</strong><div style={small}>{a.roleSnapshot || a.member?.designation || "Committee Member"}</div></div><select value={a.status} onChange={(e) => changeAttendance(a.memberId, e.target.value as AttendanceStatus)} style={input}>{["invited","present","absent","leave","late"].map((s) => <option key={s} value={s}>{s.replace(/^./, (c) => c.toUpperCase())}</option>)}</select></div>) : <div style={{ padding: 24, color: "#888", fontSize: 12 }}>Build the roster to load committee members alphabetically.</div>}
              </div>
              {attendance.length > 0 && <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}><button onClick={() => void saveAttendance()} disabled={saving} style={primary}><Save size={13} /> Save Attendance</button></div>}
            </div>
            <div>
              <h3 style={miniTitle}>Agenda / Notice</h3>
              <div style={readBox}><strong>Agenda</strong><p>{selected.agenda || "No agenda entered."}</p><strong>Notice / Announcement</strong><p>{selected.noticeBody || "No separate notice text entered."}</p></div>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}><button onClick={() => printMeeting(selected, "notice", groups)} style={secondary}><Printer size={13} /> Print / Save Notice PDF</button></div>
            </div>
          </div>

          <div style={{ marginTop: 20, borderTop: "1px solid #eee", paddingTop: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}><div><h3 style={miniTitle}>Meeting Minutes</h3><p style={subStyle}>Write the minutes after the meeting. Draft first, then publish to the approved-member area.</p></div><Badge status={selected.status} /></div>
            <textarea rows={11} value={minutesBody} onChange={(e) => setMinutesBody(e.target.value)} placeholder="Meeting proceedings, decisions, resolutions, responsibilities and next actions..." style={{ ...input, width: "100%", resize: "vertical", lineHeight: 1.6 }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10, flexWrap: "wrap" }}><button onClick={() => void saveMinutesDraft()} disabled={saving} style={secondary}><Save size={13} /> Save Draft</button><button onClick={() => printMeeting({ ...selected, minutesBody }, "minutes", groups)} disabled={!minutesBody.trim()} style={{ ...secondary, opacity: minutesBody.trim() ? 1 : .5 }}><Printer size={13} /> Print / Save PDF</button><button onClick={() => void publishMinutes()} disabled={saving || !minutesBody.trim()} style={{ ...primary, opacity: minutesBody.trim() ? 1 : .6 }}><CheckCircle size={13} /> Publish Minutes</button></div>
          </div>
        </section>}
      </main>

      {showCreate && <Modal title="Create Meeting" onClose={() => setShowCreate(false)}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="gov-columns"><Field label="Meeting Title *" value={form.title} onChange={(v) => setForm((p) => ({ ...p, title: v }))} /><label style={label}>Committee / Group *<select value={form.groupKey} onChange={(e) => setForm((p) => ({ ...p, groupKey: e.target.value }))} style={input}>{groups.map((g) => <option key={g.key} value={g.key}>{g.label} ({g.members})</option>)}</select></label><Field label="Meeting Type" value={form.meetingType} onChange={(v) => setForm((p) => ({ ...p, meetingType: v }))} /><Field label="Meeting No. / Reference" value={form.meetingNo} onChange={(v) => setForm((p) => ({ ...p, meetingNo: v }))} /><Field label="Date & Time *" type="datetime-local" value={form.scheduledAt} onChange={(v) => setForm((p) => ({ ...p, scheduledAt: v }))} /><Field label="Venue" value={form.venue} onChange={(v) => setForm((p) => ({ ...p, venue: v }))} /></div><TextArea label="Agenda" value={form.agenda} onChange={(v) => setForm((p) => ({ ...p, agenda: v }))} /><TextArea label="Notice / Announcement Text" value={form.noticeBody} onChange={(v) => setForm((p) => ({ ...p, noticeBody: v }))} /><div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><button onClick={() => setShowCreate(false)} style={secondary}>Cancel</button><button onClick={() => void saveNewMeeting()} disabled={saving} style={primary}><Plus size={13} /> {saving ? "Saving..." : "Create Meeting"}</button></div>
      </Modal>}
      <style>{`@media(max-width:900px){.gov-stats{grid-template-columns:1fr 1fr!important}.gov-columns{grid-template-columns:1fr!important}}@media(max-width:520px){.gov-stats{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}

function Unauthorized() { return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f8f5ef", padding: 24 }}><div style={{ background: "white", padding: 34, borderRadius: 14, maxWidth: 500, textAlign: "center" }}><ShieldCheck size={40} color={GREEN} /><h2 style={{ color: GREEN }}>Admin authorization required</h2><Link to="/admin" style={{ color: GREEN, fontWeight: 800 }}>Open Admin Panel</Link></div></div>; }
function groupName(groups: GovernanceGroupSummary[], key: string) { return groups.find((g) => g.key === key)?.label || key; }
function attendanceSummary(items: MeetingAttendance[]) { const marked = items.filter((a) => a.status !== "invited"); const present = items.filter((a) => ["present","late"].includes(a.status)).length; return items.length ? `${present}/${items.length}${marked.length < items.length ? " pending" : ""}` : "Not prepared"; }
function Badge({ status }: { status: string }) { const good = status === "published" || status === "held"; const bad = status === "cancelled"; return <span style={{ display: "inline-block", borderRadius: 20, padding: "4px 9px", fontSize: 10, fontWeight: 800, textTransform: "capitalize", background: good ? "#dcfce7" : bad ? "#fee2e2" : "#fef9c3", color: good ? "#166534" : bad ? "#b91c1c" : "#854d0e" }}>{status.replace(/_/g," ")}</span>; }
function Stat({ label: text, value, icon }: { label: string; value: number; icon: React.ReactNode }) { return <div style={{ ...panel, padding: 16 }}><div style={{ display: "flex", justifyContent: "space-between", color: "#777", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}><span>{text}</span><span style={{ color: GOLD }}>{icon}</span></div><div style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800, marginTop: 5 }}>{value}</div></div>; }
function Notice({ children, good = false }: { children: React.ReactNode; good?: boolean }) { return <div style={{ marginBottom: 14, padding: "10px 13px", borderRadius: 8, background: good ? "#dcfce7" : "#fee2e2", color: good ? "#166534" : "#b91c1c", fontSize: 12 }}>{children}</div>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.55)", display: "grid", placeItems: "center", padding: 16 }}><div style={{ width: "min(840px,96vw)", maxHeight: "92vh", overflow: "auto", background: "white", borderRadius: 14, boxShadow: "0 24px 70px rgba(0,0,0,.25)" }}><div style={{ display: "flex", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid #eee" }}><h2 style={{ ...titleStyle, margin: 0 }}>{title}</h2><button onClick={onClose} style={{ border: 0, background: "none", cursor: "pointer", fontSize: 18 }}>×</button></div><div style={{ padding: 22, display: "grid", gap: 14 }}>{children}</div></div></div>; }
function Field({ label: text, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) { return <label style={label}>{text}<input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={input} /></label>; }
function TextArea({ label: text, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) { return <label style={label}>{text}<textarea rows={5} value={value} onChange={(e) => onChange(e.target.value)} style={{ ...input, resize: "vertical", lineHeight: 1.55 }} /></label>; }

function esc(value: unknown) { return String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c] || c)); }
function printMeeting(meeting: GovernanceMeeting, kind: "notice" | "minutes", groups: GovernanceGroupSummary[]) {
  const attendance = (meeting.attendances || []).slice().sort((a, b) => String(a.member?.fullName || "").localeCompare(String(b.member?.fullName || ""), "en", { sensitivity: "base" }));
  const rows = attendance.map((a, i) => `<tr><td>${i + 1}</td><td>${esc(a.member?.fullName || "Member")}</td><td>${esc(a.roleSnapshot || "Member")}</td><td>${esc(a.status)}</td></tr>`).join("");
  const isMinutes = kind === "minutes";
  const title = isMinutes ? `Minutes: ${meeting.title}` : `Meeting Notice: ${meeting.title}`;
  const body = isMinutes ? `<h3>Minutes / Proceedings</h3><div class="body">${esc(meeting.minutesBody || "").replace(/\n/g,"<br>")}</div>${attendance.length ? `<h3>Attendance</h3><table><thead><tr><th>#</th><th>Name</th><th>Role</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>` : ""}` : `<p class="notice">${esc(meeting.noticeBody || "You are requested to attend the meeting as scheduled below.").replace(/\n/g,"<br>")}</p><h3>Agenda</h3><div class="body">${esc(meeting.agenda || "To be circulated.").replace(/\n/g,"<br>")}</div>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>@page{size:A4;margin:16mm}body{font-family:Arial,sans-serif;color:#222;margin:0}.head{border-bottom:4px solid #c8a04a;padding-bottom:12px;margin-bottom:18px}.org{font-size:22px;font-weight:700;color:#1a4d2e}.sub{font-size:11px;color:#666;margin-top:4px}.title{font-size:19px;color:#1a4d2e;margin:18px 0 8px}.meta{background:#f6f3ec;border:1px solid #e2ddd2;padding:12px;line-height:1.7;font-size:12px}.body,.notice{font-size:13px;line-height:1.75;white-space:normal}h3{color:#1a4d2e;font-size:13px;text-transform:uppercase;border-bottom:1px solid #ddd;padding-bottom:5px;margin-top:20px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #ddd;padding:7px;text-align:left}.foot{margin-top:34px;border-top:1px solid #ddd;padding-top:8px;color:#777;font-size:9px}@media print{button{display:none}}</style></head><body><div class="head"><div class="org">Anjuman-e-Araian Faisalabad</div><div class="sub">Official Governance Record</div></div><div class="title">${esc(title)}</div><div class="meta"><strong>Committee / Group:</strong> ${esc(groupName(groups, meeting.groupKey))}<br><strong>Date & Time:</strong> ${esc(new Date(meeting.scheduledAt).toLocaleString("en-PK"))}<br><strong>Venue:</strong> ${esc(meeting.venue || "To be confirmed")}<br><strong>Reference:</strong> ${esc(meeting.meetingNo || meeting.meetingType)}</div>${body}<div class="foot">System-generated from the official Anjuman-e-Araian Faisalabad governance database.</div><script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body></html>`;
  const w = window.open("", "_blank", "width=920,height=1100");
  if (!w) { alert("Please allow pop-ups to print or save as PDF."); return; }
  w.document.open(); w.document.write(html); w.document.close();
}

const panel: React.CSSProperties = { background: "white", borderRadius: 12, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,.06)" };
const titleStyle: React.CSSProperties = { margin: 0, color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 20 };
const miniTitle: React.CSSProperties = { margin: 0, color: GREEN, fontSize: 14, textTransform: "uppercase", letterSpacing: ".04em" };
const subStyle: React.CSSProperties = { margin: "4px 0 0", color: "#777", fontSize: 11, lineHeight: 1.55 };
const small: React.CSSProperties = { color: "#888", fontSize: 10, marginTop: 3 };
const input: React.CSSProperties = { boxSizing: "border-box", width: "100%", border: "1px solid #d9e2dc", borderRadius: 7, padding: "9px 10px", fontSize: 12, background: "white" };
const label: React.CSSProperties = { display: "grid", gap: 6, color: GREEN, fontSize: 11, fontWeight: 800 };
const primary: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, border: 0, borderRadius: 7, padding: "9px 12px", background: GREEN, color: "white", fontSize: 11, fontWeight: 800, cursor: "pointer" };
const secondary: React.CSSProperties = { ...primary, background: "white", color: GREEN, border: "1px solid #cbd8cf" };
const tiny: React.CSSProperties = { ...secondary, padding: "5px 7px", fontSize: 10 };
const headerLink: React.CSSProperties = { color: "white", border: "1px solid rgba(255,255,255,.3)", borderRadius: 7, padding: "7px 10px", textDecoration: "none", fontSize: 11, fontWeight: 800 };
const th: React.CSSProperties = { padding: "11px 10px", textAlign: "left", color: "#777", fontSize: 10, textTransform: "uppercase", letterSpacing: ".04em", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "11px 10px", fontSize: 12, verticalAlign: "middle" };
const readBox: React.CSSProperties = { border: "1px solid #e5e7eb", borderRadius: 10, padding: 14, background: "#fcfdfc", color: "#444", fontSize: 12, lineHeight: 1.65 };
