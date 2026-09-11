import { useEffect, useState } from "react";
import { Link } from "react-router";
import { CalendarDays, FileText, Printer } from "lucide-react";
import { fetchPublishedMeetingMinutes, type GovernanceMeeting } from "../lib/governanceStore";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

export function MemberMeetingMinutesPage() {
  const [meetings, setMeetings] = useState<GovernanceMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPublishedMeetingMinutes()
      .then(setMeetings)
      .catch((e: any) => setError(e?.message || "Meeting minutes are available to approved signed-in members only."))
      .finally(() => setLoading(false));
  }, []);

  return <div style={{ minHeight: "70vh", background: "#f8f5ef", padding: "34px 18px 60px", fontFamily: "'Lato', sans-serif" }}>
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12, flexWrap: "wrap", marginBottom: 20 }}><div><p style={{ color: GOLD, fontWeight: 800, fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", margin: 0 }}>Member Records</p><h1 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", margin: "5px 0 0", fontSize: 28 }}>Meeting Minutes Archive</h1><p style={{ color: "#666", fontSize: 13, lineHeight: 1.6, maxWidth: 690 }}>Official minutes published by the administration for approved members.</p></div><Link to="/member/portal" style={{ border: `1px solid ${GREEN}`, color: GREEN, padding: "9px 12px", borderRadius: 8, textDecoration: "none", fontWeight: 800, fontSize: 12 }}>Back to Member Portal</Link></div>
      {loading && <div style={card}>Loading published minutes...</div>}
      {error && <div style={{ ...card, background: "#fff3f3", color: "#b91c1c" }}>{error}<div style={{ marginTop: 10 }}><Link to="/member/login" style={{ color: GREEN, fontWeight: 800 }}>Member Login</Link></div></div>}
      {!loading && !error && meetings.length === 0 && <div style={card}>No meeting minutes have been published yet.</div>}
      <div style={{ display: "grid", gap: 14 }}>{meetings.map((meeting) => <article key={meeting.id} style={card}><div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}><div><div style={{ display: "flex", gap: 8, alignItems: "center", color: GOLD, fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}><CalendarDays size={13} /> {new Date(meeting.scheduledAt).toLocaleDateString("en-PK")}</div><h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 20, margin: "7px 0 4px" }}>{meeting.title}</h2><p style={{ color: "#777", fontSize: 11, margin: 0 }}>{meeting.groupKey} · {meeting.venue || "Venue not recorded"}</p></div><button onClick={() => printMinutes(meeting)} style={printBtn}><Printer size={13} /> Print / Save PDF</button></div><div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #eee" }}><div style={{ display: "flex", gap: 7, alignItems: "center", color: GREEN, fontSize: 12, fontWeight: 800, marginBottom: 8 }}><FileText size={14} /> Official Minutes</div><div style={{ color: "#333", fontSize: 13, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{meeting.minutesBody}</div></div></article>)}</div>
    </div>
  </div>;
}

function esc(value: unknown) { return String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c] || c)); }
function printMinutes(m: GovernanceMeeting) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(m.title)} - Minutes</title><style>@page{size:A4;margin:16mm}body{font-family:Arial,sans-serif;color:#222}.head{border-bottom:4px solid #c8a04a;padding-bottom:12px}.org{font-size:22px;font-weight:700;color:#1a4d2e}.sub{color:#666;font-size:11px}.meta{background:#f6f3ec;padding:12px;margin:18px 0;line-height:1.7;font-size:12px}.minutes{font-size:13px;line-height:1.8;white-space:pre-wrap}.foot{margin-top:35px;border-top:1px solid #ddd;padding-top:8px;color:#777;font-size:9px}</style></head><body><div class="head"><div class="org">Anjuman-e-Araian Faisalabad</div><div class="sub">Official Published Meeting Minutes</div></div><h2>${esc(m.title)}</h2><div class="meta"><b>Date:</b> ${esc(new Date(m.scheduledAt).toLocaleString("en-PK"))}<br><b>Committee / Group:</b> ${esc(m.groupKey)}<br><b>Venue:</b> ${esc(m.venue || "—")}<br><b>Reference:</b> ${esc(m.meetingNo || m.meetingType)}</div><div class="minutes">${esc(m.minutesBody || "")}</div><div class="foot">Published through the official Anjuman-e-Araian Faisalabad member portal.</div><script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body></html>`;
  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) return;
  w.document.open(); w.document.write(html); w.document.close();
}

const card: React.CSSProperties = { background: "white", borderRadius: 12, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,.06)", border: "1px solid rgba(26,77,46,.06)" };
const printBtn: React.CSSProperties = { alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, border: `1px solid ${GREEN}`, background: "white", color: GREEN, borderRadius: 7, padding: "8px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer" };
