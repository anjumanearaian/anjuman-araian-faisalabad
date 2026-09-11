import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, BadgeDollarSign, Building2, CalendarDays, CheckCircle2, CircleDollarSign,
  Crown, Download, Edit2, FileText, Globe2, Landmark, LayoutDashboard, Loader2, Plus,
  ReceiptText, RefreshCw, Save, ShieldCheck, Trash2, UserCog, Users, WalletCards, XCircle, LogOut,
} from "lucide-react";
import { useAdmin } from "../context/AdminContext";
import { fetchAllMembers, Member } from "../lib/memberStore";
import {
  archiveOrganizationAssignment, archiveOrganizationUnit, bootstrapLegacyLeadership, createGovernanceMeeting,
  createOrganizationAssignment, createOrganizationUnit, fetchGovernanceMeetings,
  fetchGovernanceSummary, fetchOrganizationAssignments, fetchOrganizationUnits,
  GovernanceMeeting, GovernanceSummary, MeetingAttendance, OrganizationAssignment, OrganizationUnit,
  OrganizationUnitType, fetchMeetingAttendance, saveMeetingAttendance, updateGovernanceMeeting, updateOrganizationUnit,
} from "../lib/governanceStore";
import { createOverseasChapter, deleteOverseasChapter, fetchOverseasChapters, OverseasChapter, updateOverseasChapter } from "../lib/overseasStore";
import { createFinanceTransaction, fetchFinanceLedger, fetchFinanceMembers, fetchFinanceSummary, financeReceiptUrl, FinanceLedgerRow, FinanceSummary, voidFinanceTransaction } from "../lib/financeStore";
import { ApiError } from "../lib/apiClient";
import { MultiImageUpload } from "../components/ui/MultiImageUpload";

const GREEN = "#155a35";
const DARK = "#0d4328";
const GOLD = "#cda84d";
const BG = "#f8f5ef";
const BORDER = "#e8e2d7";

type CenterTab = "overview" | "members" | "structure" | "meetings" | "overseas" | "finance";

const roleSuggestions = [
  "President", "Senior Vice President", "Vice President", "General Secretary", "Joint Secretary",
  "Finance Secretary", "Assistant Finance Secretary", "Information Secretary", "Welfare Secretary",
  "Executive Member", "Committee Convener", "Committee Secretary", "Coordinator", "Member",
];
const unitTypes: { value: OrganizationUnitType; label: string }[] = [
  { value: "cabinet", label: "Cabinet / Executive Council" }, { value: "committee", label: "Committee" },
  { value: "working_group", label: "Working Group / Task Committee" }, { value: "zone", label: "Zone" },
  { value: "area", label: "Area / Local Unit" }, { value: "chapter", label: "Chapter" }, { value: "other", label: "Other" },
];
const ISO_COUNTRY_CODES = "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" ");
const regionNames = typeof Intl !== "undefined" && (Intl as any).DisplayNames ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
const countryOptions = ISO_COUNTRY_CODES.map((code) => ({ code, name: regionNames?.of(code) || code })).sort((a, b) => a.name.localeCompare(b.name));
const flagFor = (code: string) => code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));

const panel: React.CSSProperties = { background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, boxShadow: "0 8px 30px rgba(25,61,41,.06)", padding: 20 };
const field: React.CSSProperties = { width: "100%", minHeight: 42, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "9px 11px", fontSize: 13, color: "#333", background: "#fff", boxSizing: "border-box" };
const label: React.CSSProperties = { display: "block", color: GREEN, fontSize: 12, fontWeight: 800, marginBottom: 6 };
const primary: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, background: GREEN, color: "white", border: 0, borderRadius: 8, padding: "10px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer" };
const secondary: React.CSSProperties = { ...primary, background: "white", color: GREEN, border: `1px solid rgba(21,90,53,.28)` };

function money(value: number) { return `Rs. ${Number(value || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`; }
function asDate(value: string) { try { return new Date(value).toLocaleDateString("en-GB"); } catch { return value; } }
function isSchemaError(error: unknown) { return error instanceof ApiError && /Prisma schema|Database tables|Database columns|schema/i.test(error.message || ""); }

export function AdminOperationsCenterPage() {
  const { isAdmin, role, logout } = useAdmin();
  const financeOnly = role === "finance_secretary" || role === "assistant_finance_secretary";
  const [tab, setTab] = useState<CenterTab>(() => financeOnly ? "finance" : "overview");
  const [loading, setLoading] = useState(true);
  const [databaseReady, setDatabaseReady] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [summary, setSummary] = useState<GovernanceSummary>({ units: 0, activeAssignments: 0, meetings: 0, heldMeetings: 0 });
  const [members, setMembers] = useState<Array<Pick<Member, "id" | "memberNo" | "fullName" | "status" | "email">>>([]);
  const [units, setUnits] = useState<OrganizationUnit[]>([]);
  const [assignments, setAssignments] = useState<OrganizationAssignment[]>([]);
  const [meetings, setMeetings] = useState<GovernanceMeeting[]>([]);
  const [chapters, setChapters] = useState<OverseasChapter[]>([]);
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary>({ credits: 0, debits: 0, balance: 0, count: 0, legacyCount: 0 });
  const [ledger, setLedger] = useState<FinanceLedgerRow[]>([]);

  const [unitForm, setUnitForm] = useState({ id: "", name: "", type: "committee" as OrganizationUnitType, parentId: "", areaName: "", displayOrder: 0, tenureStart: "", tenureEnd: "", description: "", isActive: true });
  const [assignmentForm, setAssignmentForm] = useState({ memberId: "", organizationId: "", role: "", rank: 10, period: "", notes: "" });
  const [meetingForm, setMeetingForm] = useState({ id: "", organizationId: "", title: "", meetingType: "meeting" as GovernanceMeeting["meetingType"], date: "", time: "", venue: "", status: "announced" as GovernanceMeeting["status"], notice: "", agenda: "", minutes: "", images: [] as string[], published: false });
  const [attendanceMeetingId, setAttendanceMeetingId] = useState("");
  const [attendanceMeetingTitle, setAttendanceMeetingTitle] = useState("");
  const [attendanceRows, setAttendanceRows] = useState<MeetingAttendance[]>([]);
  const [attendanceEntry, setAttendanceEntry] = useState<{ memberId: string; status: MeetingAttendance["status"]; remarks: string }>({ memberId: "", status: "present", remarks: "" });
  const [chapterForm, setChapterForm] = useState({ id: "", countryCode: "PK", country: "Pakistan", flag: "🇵🇰", city: "", established: "", coordinator: "", phone: "", email: "", members: 0 });
  const [financeForm, setFinanceForm] = useState({ type: "revenue" as "revenue" | "expense" | "adjustment", direction: "credit" as "credit" | "debit", memberId: "", partyName: "", category: "Membership Fee", amount: "", paymentMethod: "Cash", cashBookNo: "", externalReference: "", description: "", transactionDate: new Date().toISOString().slice(0, 10) });
  const [financeQuery, setFinanceQuery] = useState("");
  const [financeType, setFinanceType] = useState("all");

  const approvedMembers = useMemo(() => members.filter((m) => m.status === "approved").sort((a, b) => a.fullName.localeCompare(b.fullName)), [members]);
  const activeUnits = useMemo(() => units.filter((u) => u.isActive), [units]);

  const loadAll = async () => {
    setLoading(true); setError("");
    if (financeOnly) setTab("finance");
    try {
      if (financeOnly) {
        const [financeMembers, fSummary, fRows] = await Promise.all([
          fetchFinanceMembers(), fetchFinanceSummary(), fetchFinanceLedger(financeQuery, financeType),
        ]);
        setMembers(financeMembers);
        setFinanceSummary(fSummary);
        setLedger(fRows);
        setDatabaseReady(true);
        setTab("finance");
        return;
      }

      const memberResult = await fetchAllMembers(1, 1000);
      setMembers(memberResult.data.map((m) => ({ id: m.id, memberNo: m.memberNo, fullName: m.fullName, status: m.status, email: m.email })));
      const [govSummary, unitRows, assignmentRows, meetingRows, chapterRows] = await Promise.all([
        fetchGovernanceSummary(), fetchOrganizationUnits(), fetchOrganizationAssignments(), fetchGovernanceMeetings(), fetchOverseasChapters(),
      ]);
      setSummary(govSummary); setUnits(unitRows); setAssignments(assignmentRows); setMeetings(meetingRows); setChapters(chapterRows);
      try {
        const [fSummary, fRows] = await Promise.all([fetchFinanceSummary(), fetchFinanceLedger(financeQuery, financeType)]);
        setFinanceSummary(fSummary); setLedger(fRows);
      } catch (financeError) {
        if (role === "admin" || role === "super_admin") throw financeError;
      }
      setDatabaseReady(true);
    } catch (e: any) {
      if (isSchemaError(e)) setDatabaseReady(false);
      setError(e?.message || "The operations center could not load its data.");
    } finally { setLoading(false); }
  };

  useEffect(() => { if (isAdmin) void loadAll(); }, [isAdmin, role]);
  useEffect(() => { if (isAdmin && databaseReady && tab === "finance") void fetchFinanceLedger(financeQuery, financeType).then(setLedger).catch(() => {}); }, [financeQuery, financeType, tab]);

  const flash = (message: string) => { setSuccess(message); window.setTimeout(() => setSuccess(""), 2500); };

  if (!isAdmin) {
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: BG, fontFamily: "Lato, sans-serif" }}><div style={{ ...panel, maxWidth: 430, textAlign: "center" }}><ShieldCheck size={38} color={GOLD} /><h2 style={{ color: GREEN }}>Administrator sign-in required</h2><p style={{ color: "#666" }}>Open the main Admin Panel and sign in first.</p><button style={primary} onClick={() => location.assign("/admin")}>Open Admin Panel</button></div></div>;
  }

  async function saveUnit() {
    setError("");
    try {
      const payload = { ...unitForm, parentId: unitForm.parentId || null, tenureStart: unitForm.tenureStart || null, tenureEnd: unitForm.tenureEnd || null, areaName: unitForm.areaName || null };
      if (unitForm.id) await updateOrganizationUnit(unitForm.id, payload); else await createOrganizationUnit(payload);
      setUnitForm({ id: "", name: "", type: "committee", parentId: "", areaName: "", displayOrder: 0, tenureStart: "", tenureEnd: "", description: "", isActive: true });
      await loadAll(); flash("Organization structure saved.");
    } catch (e: any) { setError(e.message || "Could not save the structure."); }
  }
  async function saveAssignment() {
    setError("");
    try {
      await createOrganizationAssignment({ ...assignmentForm, period: assignmentForm.period || null, notes: assignmentForm.notes || null });
      setAssignmentForm({ memberId: "", organizationId: "", role: "", rank: 10, period: "", notes: "" });
      await loadAll(); flash("Member assignment saved.");
    } catch (e: any) { setError(e.message || "Could not save assignment."); }
  }
  async function openAttendance(meeting: GovernanceMeeting) {
    setError("");
    try {
      const rows = await fetchMeetingAttendance(meeting.id);
      setAttendanceMeetingId(meeting.id);
      setAttendanceMeetingTitle(meeting.title);
      setAttendanceRows(rows);
      setAttendanceEntry({ memberId: "", status: "present", remarks: "" });
    } catch (e: any) { setError(e.message || "Could not load meeting attendance."); }
  }
  function addAttendanceDraft() {
    const member = approvedMembers.find((m) => m.id === attendanceEntry.memberId);
    if (!member) { setError("Select an approved member for attendance."); return; }
    const row: MeetingAttendance = { memberId: member.id, status: attendanceEntry.status, remarks: attendanceEntry.remarks || null, member: { id: member.id, memberNo: member.memberNo, fullName: member.fullName } };
    setAttendanceRows((current) => current.some((x) => x.memberId === member.id) ? current.map((x) => x.memberId === member.id ? { ...x, ...row } : x) : [...current, row]);
    setAttendanceEntry({ memberId: "", status: "present", remarks: "" });
  }
  async function persistAttendance() {
    if (!attendanceMeetingId) return;
    setError("");
    try {
      await saveMeetingAttendance(attendanceMeetingId, attendanceRows);
      const refreshed = await fetchMeetingAttendance(attendanceMeetingId);
      setAttendanceRows(refreshed);
      const meetingRows = await fetchGovernanceMeetings();
      setMeetings(meetingRows);
      flash("Meeting attendance saved.");
    } catch (e: any) { setError(e.message || "Could not save meeting attendance."); }
  }

  async function saveMeeting() {
    setError("");
    try {
      const payload = { ...meetingForm, organizationId: meetingForm.organizationId || null, time: meetingForm.time || null, venue: meetingForm.venue || null, notice: meetingForm.notice || null, agenda: meetingForm.agenda || null, minutes: meetingForm.minutes || null };
      if (meetingForm.id) await updateGovernanceMeeting(meetingForm.id, payload); else await createGovernanceMeeting(payload);
      setMeetingForm({ id: "", organizationId: "", title: "", meetingType: "meeting", date: "", time: "", venue: "", status: "announced", notice: "", agenda: "", minutes: "", images: [], published: false });
      await loadAll(); flash("Meeting record saved.");
    } catch (e: any) { setError(e.message || "Could not save meeting."); }
  }
  async function saveChapter() {
    setError("");
    try {
      const payload = { country: chapterForm.country, flag: chapterForm.flag, city: chapterForm.city, established: chapterForm.established, coordinator: chapterForm.coordinator, phone: chapterForm.phone, email: chapterForm.email, members: chapterForm.members };
      if (chapterForm.id) await updateOverseasChapter(chapterForm.id, payload); else await createOverseasChapter(payload);
      setChapterForm({ id: "", countryCode: "PK", country: "Pakistan", flag: "🇵🇰", city: "", established: "", coordinator: "", phone: "", email: "", members: 0 });
      await loadAll(); flash("Overseas chapter saved.");
    } catch (e: any) { setError(e.message || "Could not save chapter."); }
  }
  async function saveFinance() {
    setError("");
    try {
      const amount = Number(financeForm.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid amount greater than zero.");
      await createFinanceTransaction({ ...financeForm, amount, memberId: financeForm.memberId || null, transactionDate: financeForm.transactionDate, direction: financeForm.type === "expense" ? "debit" : financeForm.type === "revenue" ? "credit" : financeForm.direction });
      setFinanceForm({ type: "revenue", direction: "credit", memberId: "", partyName: "", category: "Membership Fee", amount: "", paymentMethod: "Cash", cashBookNo: "", externalReference: "", description: "", transactionDate: new Date().toISOString().slice(0, 10) });
      await loadAll(); flash("Ledger transaction posted.");
    } catch (e: any) { setError(e.message || "Could not post transaction."); }
  }
  async function downloadReceipt(row: FinanceLedgerRow) {
    if (row.source !== "ledger") return;
    try {
      const response = await fetch(financeReceiptUrl(row.id), { headers: { Authorization: `Bearer ${sessionStorage.getItem("araian_admin_token") || ""}` } });
      if (!response.ok) throw new Error("Receipt PDF could not be generated.");
      const blob = await response.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = `${row.receiptNo || row.voucherNo || row.transactionNo}.pdf`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e: any) { setError(e.message); }
  }

  const tabs: { id: CenterTab; label: string; icon: any }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard }, { id: "members", label: "Members & Roles", icon: UserCog },
    { id: "structure", label: "Cabinets / Committees / Zones", icon: Building2 }, { id: "meetings", label: "Meetings & Minutes", icon: CalendarDays },
    { id: "overseas", label: "Overseas", icon: Globe2 }, { id: "finance", label: "Finance Ledger", icon: WalletCards },
  ];
  const visibleTabs = financeOnly ? tabs.filter((item) => item.id === "finance") : tabs;

  return <div className="ops-root" style={{ minHeight: "100vh", background: BG, color: "#333", fontFamily: "Lato, Arial, sans-serif" }}>
    <style>{`@media(max-width:800px){.ops-header{padding:18px 16px!important}.ops-main{padding:16px!important}.ops-tabs{overflow-x:auto;flex-wrap:nowrap!important}.ops-grid2,.ops-grid3,.ops-grid4{grid-template-columns:1fr!important}.ops-table{min-width:780px}.ops-title{font-size:23px!important}.ops-actions{width:100%;justify-content:flex-start!important}} .ops-table-wrap{overflow-x:auto} .ops-btn:hover{filter:brightness(.97)} .ops-tab-active{background:${GREEN}!important;color:#fff!important;border-color:${GREEN}!important}`}</style>
    <header className="ops-header" style={{ background: DARK, color: "white", borderBottom: `3px solid ${GOLD}`, padding: "22px 6vw", display: "flex", gap: 18, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
      <div><h1 className="ops-title" style={{ fontFamily: "Playfair Display, Georgia, serif", fontSize: 29, margin: 0 }}>Governance & Operations Center</h1><p style={{ margin: "6px 0 0", opacity: .78, fontSize: 12 }}>One control center for members, cabinets, committees, meetings, overseas chapters and finance records.</p></div>
      <div className="ops-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {!financeOnly && <button className="ops-btn" style={{ ...secondary, background: "transparent", color: "white", borderColor: "rgba(255,255,255,.25)" }} onClick={() => location.assign("/admin/members")}><Users size={14}/> Member Center</button>}
        {!financeOnly && <button className="ops-btn" style={{ ...secondary, background: "transparent", color: "white", borderColor: "rgba(255,255,255,.25)" }} onClick={() => location.assign("/admin")}><ArrowLeft size={14}/> Main Admin</button>}
        {financeOnly && <button className="ops-btn" style={{ ...secondary, background: "transparent", color: "white", borderColor: "rgba(255,255,255,.25)" }} onClick={() => { logout(); location.assign("/admin"); }}><LogOut size={14}/> Sign Out</button>}
      </div>
    </header>
    <main className="ops-main" style={{ padding: "24px 6vw 50px" }}>
      <div className="ops-tabs" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>{visibleTabs.map(({ id, label: text, icon: Icon }) => <button key={id} onClick={() => setTab(id)} className={`ops-btn ${tab === id ? "ops-tab-active" : ""}`} style={{ ...secondary, whiteSpace: "nowrap" }}><Icon size={14}/>{text}</button>)}</div>
      {!databaseReady && <div style={{ ...panel, marginBottom: 18, borderColor: "#f5b5b5", background: "#fff3f3" }}><div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><XCircle color="#b42318"/><div><strong style={{ color: "#b42318" }}>Database upgrade required before this panel can save records.</strong><p style={{ color: "#7a3030", margin: "6px 0 0", fontSize: 12 }}>The package includes an additive Prisma schema and a safe SQL migration. It does not delete or rename existing tables. Apply the included migration to the preview database first, then test before production.</p></div></div></div>}
      {error && <div style={{ padding: "11px 14px", borderRadius: 9, background: "#fee2e2", color: "#991b1b", marginBottom: 14, fontSize: 12, fontWeight: 700 }}>{error}</div>}
      {success && <div style={{ padding: "11px 14px", borderRadius: 9, background: "#dcfce7", color: "#166534", marginBottom: 14, fontSize: 12, fontWeight: 700 }}>{success}</div>}
      {loading && <div style={{ ...panel, display: "flex", gap: 9, alignItems: "center", color: "#666" }}><Loader2 size={18}/><span>Loading authoritative records...</span></div>}

      {!loading && tab === "overview" && <div style={{ display: "grid", gap: 18 }}>
        <div className="ops-grid4" style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12 }}>
          {[ ["Approved Members", approvedMembers.length, Users], ["Active Units", summary.units, Building2], ["Role Assignments", summary.activeAssignments, Crown], ["Meetings Recorded", summary.meetings, CalendarDays] ].map(([text, value, Icon]: any) => <div key={text} style={panel}><Icon size={20} color={GOLD}/><p style={{ margin: "10px 0 3px", color: "#777", fontSize: 11, textTransform: "uppercase", fontWeight: 800 }}>{text}</p><strong style={{ color: GREEN, fontFamily: "Playfair Display,serif", fontSize: 27 }}>{value}</strong></div>)}
        </div>
        <div className="ops-grid3" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12 }}>
          <div style={panel}><h3 style={{ color: GREEN, marginTop: 0 }}>Member administration</h3><p style={{ color: "#666", fontSize: 12 }}>Approve, add and edit member records in the existing master registry. Role assignments always link back to one approved member ID.</p><div style={{display:"flex",gap:7,flexWrap:"wrap"}}><button style={primary} onClick={() => location.assign("/admin/members")}><Users size={14}/> Open Member Center</button><button style={secondary} disabled={!databaseReady} onClick={async()=>{try{const result=await bootstrapLegacyLeadership(); await loadAll(); flash(`${result.imported} linked legacy leadership role(s) imported; ${result.skipped} skipped.`);}catch(e:any){setError(e.message||"Legacy leadership import failed.");}}}><RefreshCw size={13}/> Import Linked Legacy Roles</button></div></div>
          <div style={panel}><h3 style={{ color: GREEN, marginTop: 0 }}>Create any committee or zone</h3><p style={{ color: "#666", fontSize: 12 }}>Admin can create a cabinet, committee, working group, zone, area or chapter and place it under a parent unit without creating duplicate people.</p><button style={primary} onClick={() => setTab("structure")}><Building2 size={14}/> Manage Structure</button></div>
          <div style={panel}><h3 style={{ color: GREEN, marginTop: 0 }}>Ledger with audit trail</h3><p style={{ color: "#666", fontSize: 12 }}>Existing revenue remains visible. New receipts, expenses and adjustments receive ledger serials and preserve the issuing administrator.</p><button style={primary} onClick={() => setTab("finance")}><BadgeDollarSign size={14}/> Open Finance</button></div>
        </div>
      </div>}

      {!loading && tab === "members" && <div style={{ display: "grid", gap: 18 }}>
        <div style={{ ...panel, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}><div><h2 style={{ color: GREEN, margin: 0, fontFamily: "Playfair Display,serif" }}>Assign an Existing Approved Member</h2><p style={{ fontSize: 12, color: "#777", marginBottom: 0 }}>No duplicate person is created. One member can legitimately hold multiple roles in different committees.</p></div><button style={secondary} onClick={() => location.assign("/admin/members")}><Plus size={14}/> Add / Edit Member</button></div>
        <div style={panel}><div className="ops-grid3" style={{ display: "grid", gridTemplateColumns: "1.4fr 1.2fr 1fr", gap: 12 }}>
          <div><label style={label}>Approved member</label><select style={field} value={assignmentForm.memberId} onChange={(e) => setAssignmentForm({ ...assignmentForm, memberId: e.target.value })}><option value="">Select member</option>{approvedMembers.map((m) => <option key={m.id} value={m.id}>{m.fullName} · {m.memberNo}</option>)}</select></div>
          <div><label style={label}>Cabinet / committee / zone</label><select style={field} value={assignmentForm.organizationId} onChange={(e) => setAssignmentForm({ ...assignmentForm, organizationId: e.target.value })}><option value="">Select unit</option>{activeUnits.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.type.replace(/_/g," ")})</option>)}</select></div>
          <div><label style={label}>Role / designation</label><input list="ops-role-options" style={field} value={assignmentForm.role} onChange={(e) => setAssignmentForm({ ...assignmentForm, role: e.target.value })}/><datalist id="ops-role-options">{roleSuggestions.map((x) => <option value={x} key={x}/>)}</datalist></div>
          <div><label style={label}>Display / hierarchy order</label><input type="number" min="0" max="999" style={field} value={assignmentForm.rank} onChange={(e) => setAssignmentForm({ ...assignmentForm, rank: Number(e.target.value) })}/></div>
          <div><label style={label}>Tenure / period</label><input style={field} placeholder="2026–2028" value={assignmentForm.period} onChange={(e) => setAssignmentForm({ ...assignmentForm, period: e.target.value })}/></div>
          <div><label style={label}>Assignment note</label><input style={field} placeholder="Purpose or responsibility" value={assignmentForm.notes} onChange={(e) => setAssignmentForm({ ...assignmentForm, notes: e.target.value })}/></div>
        </div><div style={{ marginTop: 14 }}><button disabled={!databaseReady || !assignmentForm.memberId || !assignmentForm.organizationId || !assignmentForm.role.trim()} style={{ ...primary, opacity: !databaseReady ? .5 : 1 }} onClick={() => void saveAssignment()}><UserCog size={14}/> Save Assignment</button></div></div>
        <DataTable headers={["Member","Role","Unit","Tenure","Status","Action"]}>{assignments.map((a) => <tr key={a.id}><Td><strong>{a.member?.fullName || "Member"}</strong><small>{a.member?.memberNo}</small></Td><Td>{a.role}</Td><Td>{a.organization?.name || "-"}<small>{a.organization?.type?.replace(/_/g," ")}</small></Td><Td>{a.period || "-"}</Td><Td>{a.isActive ? <Status text="Active" good/> : <Status text="Archived"/>}</Td><Td>{a.isActive && <button style={secondary} onClick={async () => { if (confirm("Archive this assignment? The historical record will remain.")) { await archiveOrganizationAssignment(a.id); await loadAll(); } }}>Archive</button>}</Td></tr>)}</DataTable>
      </div>}

      {!loading && tab === "structure" && <div style={{ display: "grid", gap: 18 }}>
        <div style={panel}><h2 style={{ color: GREEN, fontFamily: "Playfair Display,serif", marginTop: 0 }}>{unitForm.id ? "Edit Organization Unit" : "Create Cabinet, Committee, Zone or Area"}</h2><div className="ops-grid3" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 12 }}>
          <Field labelText="Name"><input style={field} value={unitForm.name} onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })} placeholder="e.g. Annual AGM & Family Gala Management Committee"/></Field>
          <Field labelText="Type"><select style={field} value={unitForm.type} onChange={(e) => setUnitForm({ ...unitForm, type: e.target.value as OrganizationUnitType })}>{unitTypes.map((x) => <option value={x.value} key={x.value}>{x.label}</option>)}</select></Field>
          <Field labelText="Parent unit (optional)"><select style={field} value={unitForm.parentId} onChange={(e) => setUnitForm({ ...unitForm, parentId: e.target.value })}><option value="">No parent / top level</option>{units.filter((u) => u.id !== unitForm.id && u.isActive).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
          <Field labelText="Zone / locality name"><input style={field} value={unitForm.areaName} onChange={(e) => setUnitForm({ ...unitForm, areaName: e.target.value })} placeholder="e.g. Samanabad"/></Field>
          <Field labelText="Display order"><input style={field} type="number" value={unitForm.displayOrder} onChange={(e) => setUnitForm({ ...unitForm, displayOrder: Number(e.target.value) })}/></Field>
          <Field labelText="Tenure"><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}><input style={field} placeholder="Start" value={unitForm.tenureStart} onChange={(e) => setUnitForm({ ...unitForm, tenureStart: e.target.value })}/><input style={field} placeholder="End" value={unitForm.tenureEnd} onChange={(e) => setUnitForm({ ...unitForm, tenureEnd: e.target.value })}/></div></Field>
        </div><Field labelText="Purpose / description"><textarea style={{ ...field, minHeight: 74 }} value={unitForm.description} onChange={(e) => setUnitForm({ ...unitForm, description: e.target.value })}/></Field><div style={{ display: "flex", gap: 8 }}><button disabled={!databaseReady || unitForm.name.trim().length < 2} style={primary} onClick={() => void saveUnit()}><Save size={14}/> {unitForm.id ? "Update Unit" : "Create Unit"}</button>{unitForm.id && <button style={secondary} onClick={() => setUnitForm({ id: "", name: "", type: "committee", parentId: "", areaName: "", displayOrder: 0, tenureStart: "", tenureEnd: "", description: "", isActive: true })}>Cancel</button>}</div></div>
        <DataTable headers={["Unit","Type","Parent / Area","Roles","Meetings","Action"]}>{units.map((u) => <tr key={u.id}><Td><strong>{u.name}</strong><small>{u.isActive ? "Active" : "Archived"}</small></Td><Td>{u.type.replace(/_/g," ")}</Td><Td>{u.parent?.name || u.areaName || "Top level"}</Td><Td>{u._count?.assignments ?? 0}</Td><Td>{u._count?.meetings ?? 0}</Td><Td><div style={{ display:"flex",gap:6 }}><button style={secondary} onClick={() => setUnitForm({ id:u.id,name:u.name,type:u.type,parentId:u.parentId||"",areaName:u.areaName||"",displayOrder:u.displayOrder,tenureStart:u.tenureStart||"",tenureEnd:u.tenureEnd||"",description:u.description||"",isActive:u.isActive })}><Edit2 size={12}/> Edit</button>{u.isActive && <button style={secondary} onClick={async () => { if(confirm("Archive or delete this unit? Linked historical records will never be deleted.")){ await archiveOrganizationUnit(u.id); await loadAll(); } }}><Trash2 size={12}/> Archive</button>}</div></Td></tr>)}</DataTable>
      </div>}

      {!loading && tab === "meetings" && <div style={{ display: "grid", gap: 18 }}>
        <div style={panel}><h2 style={{ color: GREEN, fontFamily: "Playfair Display,serif", marginTop: 0 }}>{meetingForm.id ? "Update Meeting, Minutes & Photos" : "Create Meeting Notice"}</h2><p style={{ color:"#777",fontSize:12 }}>A meeting starts as an announcement. After it is held, update the same record with minutes, attendance and photos instead of creating a duplicate meeting.</p><div className="ops-grid3" style={{ display:"grid",gridTemplateColumns:"1.5fr 1fr 1fr",gap:12 }}>
          <Field labelText="Meeting title"><input style={field} value={meetingForm.title} onChange={(e)=>setMeetingForm({...meetingForm,title:e.target.value})}/></Field>
          <Field labelText="Meeting type"><select style={field} value={meetingForm.meetingType} onChange={(e)=>setMeetingForm({...meetingForm,meetingType:e.target.value as any})}><option value="meeting">Meeting</option><option value="agm">Annual General Meeting</option><option value="committee">Committee Meeting</option><option value="emergency">Emergency Meeting</option><option value="other">Other</option></select></Field>
          <Field labelText="Committee / unit"><select style={field} value={meetingForm.organizationId} onChange={(e)=>setMeetingForm({...meetingForm,organizationId:e.target.value})}><option value="">General / no unit</option>{activeUnits.map((u)=><option value={u.id} key={u.id}>{u.name}</option>)}</select></Field>
          <Field labelText="Date"><input type="date" style={field} value={meetingForm.date} onChange={(e)=>setMeetingForm({...meetingForm,date:e.target.value})}/></Field><Field labelText="Time"><input type="time" style={field} value={meetingForm.time} onChange={(e)=>setMeetingForm({...meetingForm,time:e.target.value})}/></Field><Field labelText="Venue"><input style={field} value={meetingForm.venue} onChange={(e)=>setMeetingForm({...meetingForm,venue:e.target.value})}/></Field>
          <Field labelText="Status"><select style={field} value={meetingForm.status} onChange={(e)=>setMeetingForm({...meetingForm,status:e.target.value as any})}><option value="announced">Announced / Upcoming</option><option value="held">Held / Completed</option><option value="postponed">Postponed</option><option value="cancelled">Cancelled</option></select></Field>
          <Field labelText="Publish"><select style={field} value={meetingForm.published ? "yes":"no"} onChange={(e)=>setMeetingForm({...meetingForm,published:e.target.value==="yes"})}><option value="no">Internal / Draft</option><option value="yes">Public</option></select></Field>
        </div><div className="ops-grid3" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}><Field labelText="Meeting notice"><textarea style={{...field,minHeight:105}} value={meetingForm.notice} onChange={(e)=>setMeetingForm({...meetingForm,notice:e.target.value})}/></Field><Field labelText="Agenda"><textarea style={{...field,minHeight:105}} value={meetingForm.agenda} onChange={(e)=>setMeetingForm({...meetingForm,agenda:e.target.value})}/></Field><Field labelText="Minutes / decisions"><textarea style={{...field,minHeight:105}} value={meetingForm.minutes} onChange={(e)=>setMeetingForm({...meetingForm,minutes:e.target.value})} placeholder="Complete after the meeting"/></Field></div><div style={{marginTop:12}}><MultiImageUpload label="Meeting Photos" images={meetingForm.images} onChange={(images)=>setMeetingForm({...meetingForm,images})} maxFiles={20}/></div><div style={{display:"flex",gap:8,marginTop:14}}><button disabled={!databaseReady || meetingForm.title.trim().length<3 || !meetingForm.date} style={primary} onClick={()=>void saveMeeting()}><Save size={14}/> {meetingForm.id?"Update Meeting":"Save Meeting"}</button>{meetingForm.id&&<button style={secondary} onClick={()=>setMeetingForm({ id:"",organizationId:"",title:"",meetingType:"meeting",date:"",time:"",venue:"",status:"announced",notice:"",agenda:"",minutes:"",images:[],published:false })}>Cancel</button>}</div></div>
        {attendanceMeetingId && <div style={panel}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:12}}><div><h2 style={{color:GREEN,fontFamily:"Playfair Display,serif",margin:0}}>Meeting Attendance</h2><p style={{fontSize:12,color:"#777",margin:"4px 0 0"}}>{attendanceMeetingTitle} · {attendanceRows.length} recorded</p></div><button style={secondary} onClick={()=>{setAttendanceMeetingId("");setAttendanceMeetingTitle("");setAttendanceRows([]);}}>Close</button></div><div className="ops-grid3" style={{display:"grid",gridTemplateColumns:"1.5fr .7fr 1.5fr",gap:10,alignItems:"end"}}><Field labelText="Approved member"><select style={field} value={attendanceEntry.memberId} onChange={(e)=>setAttendanceEntry({...attendanceEntry,memberId:e.target.value})}><option value="">Select member</option>{approvedMembers.map((m)=><option key={m.id} value={m.id}>{m.fullName} · {m.memberNo}</option>)}</select></Field><Field labelText="Status"><select style={field} value={attendanceEntry.status} onChange={(e)=>setAttendanceEntry({...attendanceEntry,status:e.target.value as MeetingAttendance["status"]})}><option value="present">Present</option><option value="absent">Absent</option><option value="excused">Excused</option></select></Field><Field labelText="Remarks"><input style={field} value={attendanceEntry.remarks} onChange={(e)=>setAttendanceEntry({...attendanceEntry,remarks:e.target.value})}/></Field></div><div style={{display:"flex",gap:8,marginBottom:12}}><button style={secondary} onClick={addAttendanceDraft}><Plus size={13}/> Add / Update Attendee</button><button style={primary} onClick={()=>void persistAttendance()}><Save size={13}/> Save Attendance</button></div><div className="ops-table-wrap"><table className="ops-table" style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{background:"#f8f5ef"}}>{["Member","Status","Remarks","Action"].map((h)=><th key={h} style={{padding:"9px",textAlign:"left",fontSize:10,color:"#777",textTransform:"uppercase"}}>{h}</th>)}</tr></thead><tbody>{attendanceRows.map((a)=><tr key={a.memberId} style={{borderTop:`1px solid ${BORDER}`}}><td style={{padding:9}}><strong>{a.member?.fullName||approvedMembers.find(m=>m.id===a.memberId)?.fullName||"Member"}</strong><small style={{display:"block",color:"#999"}}>{a.member?.memberNo||approvedMembers.find(m=>m.id===a.memberId)?.memberNo||""}</small></td><td style={{padding:9}}><Status text={a.status} good={a.status==="present"}/></td><td style={{padding:9}}>{a.remarks||"-"}</td><td style={{padding:9}}><button style={secondary} onClick={()=>setAttendanceRows((rows)=>rows.filter((x)=>x.memberId!==a.memberId))}>Remove</button></td></tr>)}{!attendanceRows.length&&<tr><td colSpan={4} style={{padding:20,textAlign:"center",color:"#888"}}>No attendance recorded yet.</td></tr>}</tbody></table></div></div>}
        <DataTable headers={["Meeting","Unit","Date / Venue","Status","Minutes","Photos","Action"]}>{meetings.map((m)=><tr key={m.id}><Td><strong>{m.title}</strong><small>{m.meetingType.toUpperCase()}</small></Td><Td>{m.organization?.name||"General"}</Td><Td>{m.date}{m.time?` · ${m.time}`:""}<small>{m.venue||"-"}</small></Td><Td><Status text={m.status} good={m.status==="held"||m.status==="announced"}/></Td><Td>{m.minutes?.trim()?"Added":"Pending"}</Td><Td>{m.images?.length||0}</Td><Td><div style={{display:"flex",gap:5,flexWrap:"wrap"}}><button style={secondary} onClick={()=>{setMeetingForm({id:m.id,organizationId:m.organizationId||"",title:m.title,meetingType:m.meetingType,date:m.date,time:m.time||"",venue:m.venue||"",status:m.status,notice:m.notice||"",agenda:m.agenda||"",minutes:m.minutes||"",images:m.images||[],published:m.published}); window.scrollTo({top:0,behavior:"smooth"});}}><Edit2 size={12}/> Open</button><button style={secondary} onClick={()=>void openAttendance(m)}><Users size={12}/> Attendance {m._count?.attendance?`(${m._count.attendance})`:""}</button></div></Td></tr>)}</DataTable>
      </div>}

      {!loading && tab === "overseas" && <div style={{display:"grid",gap:18}}>
        <div style={panel}><h2 style={{color:GREEN,fontFamily:"Playfair Display,serif",marginTop:0}}>{chapterForm.id?"Edit Overseas Chapter":"Add Overseas Chapter"}</h2><div className="ops-grid3" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          <Field labelText="Country"><select style={field} value={chapterForm.countryCode} onChange={(e)=>{const code=e.target.value; const opt=countryOptions.find(x=>x.code===code); setChapterForm({...chapterForm,countryCode:code,country:opt?.name||code,flag:flagFor(code)});}}>{countryOptions.map((x)=><option key={x.code} value={x.code}>{flagFor(x.code)} {x.name}</option>)}</select></Field>
          <Field labelText="City / region"><input style={field} value={chapterForm.city} onChange={(e)=>setChapterForm({...chapterForm,city:e.target.value})}/></Field><Field labelText="Year established"><input style={field} value={chapterForm.established} onChange={(e)=>setChapterForm({...chapterForm,established:e.target.value})}/></Field>
          <Field labelText="Coordinator"><input style={field} value={chapterForm.coordinator} onChange={(e)=>setChapterForm({...chapterForm,coordinator:e.target.value})}/></Field><Field labelText="Phone"><input style={field} value={chapterForm.phone} onChange={(e)=>setChapterForm({...chapterForm,phone:e.target.value})}/></Field><Field labelText="Email"><input type="email" style={field} value={chapterForm.email} onChange={(e)=>setChapterForm({...chapterForm,email:e.target.value})}/></Field><Field labelText="Number of members"><input type="number" min="0" style={field} value={chapterForm.members} onChange={(e)=>setChapterForm({...chapterForm,members:Number(e.target.value)})}/></Field>
        </div><div style={{display:"flex",gap:8,marginTop:13}}><button style={primary} onClick={()=>void saveChapter()}><Save size={14}/> Save Chapter</button>{chapterForm.id&&<button style={secondary} onClick={()=>setChapterForm({id:"",countryCode:"PK",country:"Pakistan",flag:"🇵🇰",city:"",established:"",coordinator:"",phone:"",email:"",members:0})}>Cancel</button>}</div></div>
        <DataTable headers={["Country","Location","Coordinator","Contact","Members","Action"]}>{chapters.map((c)=><tr key={c.id}><Td><strong>{c.flag} {c.country}</strong><small>Est. {c.established||"-"}</small></Td><Td>{c.city||"-"}</Td><Td>{c.coordinator||"-"}</Td><Td>{c.phone||"-"}<small>{c.email||""}</small></Td><Td>{c.members}</Td><Td><div style={{display:"flex",gap:6}}><button style={secondary} onClick={()=>{const match=countryOptions.find(x=>x.name===c.country); setChapterForm({id:c.id,countryCode:match?.code||"PK",country:c.country,flag:c.flag,city:c.city,established:c.established,coordinator:c.coordinator,phone:c.phone,email:c.email,members:c.members});}}><Edit2 size={12}/> Edit</button><button style={secondary} onClick={async()=>{if(confirm("Delete this overseas chapter?")){await deleteOverseasChapter(c.id);await loadAll();}}}><Trash2 size={12}/></button></div></Td></tr>)}</DataTable>
      </div>}

      {!loading && tab === "finance" && <div style={{display:"grid",gap:18}}>
        <div className="ops-grid3" style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:12}}><MoneyCard title="Total Credits / Revenue" value={financeSummary.credits} icon={CircleDollarSign}/><MoneyCard title="Total Debits / Expenses" value={financeSummary.debits} icon={ReceiptText}/><MoneyCard title="Current Ledger Balance" value={financeSummary.balance} icon={Landmark}/></div>
        <div style={panel}><h2 style={{color:GREEN,fontFamily:"Playfair Display,serif",marginTop:0}}>Post Revenue, Expense or Adjustment</h2><p style={{fontSize:12,color:"#777"}}>Existing member revenue is shown automatically as legacy revenue. New entries receive a permanent ledger serial and receipt/voucher number. Corrections are voided or adjusted, not silently deleted.</p><div className="ops-grid4" style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:12}}>
          <Field labelText="Transaction"><select style={field} value={financeForm.type} onChange={(e)=>{const type=e.target.value as any; setFinanceForm({...financeForm,type,direction:type==="expense"?"debit":type==="revenue"?"credit":financeForm.direction});}}><option value="revenue">Revenue / Receipt</option><option value="expense">Expense / Payment</option><option value="adjustment">Adjustment (+ / -)</option></select></Field>
          {financeForm.type==="adjustment"&&<Field labelText="Adjustment direction"><select style={field} value={financeForm.direction} onChange={(e)=>setFinanceForm({...financeForm,direction:e.target.value as any})}><option value="credit">Plus / Credit</option><option value="debit">Minus / Debit</option></select></Field>}
          <Field labelText="Link approved member (optional)"><select style={field} value={financeForm.memberId} onChange={(e)=>{const member=approvedMembers.find(m=>m.id===e.target.value);setFinanceForm({...financeForm,memberId:e.target.value,partyName:member?.fullName||financeForm.partyName});}}><option value="">No member link</option>{approvedMembers.map((m)=><option key={m.id} value={m.id}>{m.fullName} · {m.memberNo}</option>)}</select></Field>
          <Field labelText="Name / payer / payee"><input style={field} value={financeForm.partyName} onChange={(e)=>setFinanceForm({...financeForm,partyName:e.target.value})}/></Field><Field labelText="Category"><input list="finance-category-options" style={field} value={financeForm.category} onChange={(e)=>setFinanceForm({...financeForm,category:e.target.value})}/><datalist id="finance-category-options"><option value="Membership Fee"/><option value="Family Gala Registration"/><option value="Donation"/><option value="Sponsorship"/><option value="Office Expense"/><option value="Event Expense"/><option value="Printing"/><option value="Welfare Payment"/></datalist></Field>
          <Field labelText="Amount"><input type="number" min="0" step="0.01" style={field} value={financeForm.amount} onChange={(e)=>setFinanceForm({...financeForm,amount:e.target.value})}/></Field><Field labelText="Cash / C-in-book No."><input style={field} value={financeForm.cashBookNo} onChange={(e)=>setFinanceForm({...financeForm,cashBookNo:e.target.value})}/></Field><Field labelText="Payment method"><select style={field} value={financeForm.paymentMethod} onChange={(e)=>setFinanceForm({...financeForm,paymentMethod:e.target.value})}><option>Cash</option><option>Bank Transfer</option><option>Cheque</option><option>Online</option><option>Other</option></select></Field><Field labelText="Date"><input type="date" style={field} value={financeForm.transactionDate} onChange={(e)=>setFinanceForm({...financeForm,transactionDate:e.target.value})}/></Field><Field labelText="External reference"><input style={field} value={financeForm.externalReference} onChange={(e)=>setFinanceForm({...financeForm,externalReference:e.target.value})}/></Field>
        </div><Field labelText="Description / note"><textarea style={{...field,minHeight:72}} value={financeForm.description} onChange={(e)=>setFinanceForm({...financeForm,description:e.target.value})}/></Field><button disabled={!databaseReady||!financeForm.partyName.trim()||!financeForm.amount} style={primary} onClick={()=>void saveFinance()}><Save size={14}/> Post to Ledger</button></div>
        <div style={panel}><div style={{display:"flex",gap:10,justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",marginBottom:12}}><h2 style={{color:GREEN,fontFamily:"Playfair Display,serif",margin:0}}>One-Page Ledger</h2><div style={{display:"flex",gap:7,flexWrap:"wrap"}}><input style={{...field,width:230}} placeholder="Search name, receipt, cash book..." value={financeQuery} onChange={(e)=>setFinanceQuery(e.target.value)}/><select style={{...field,width:150}} value={financeType} onChange={(e)=>setFinanceType(e.target.value)}><option value="all">All</option><option value="revenue">Revenue</option><option value="expense">Expense</option><option value="adjustment">Adjustments</option></select><button style={secondary} onClick={()=>void loadAll()}><RefreshCw size={13}/> Refresh</button></div></div><div className="ops-table-wrap"><table className="ops-table" style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{background:"#f8f5ef"}}>{["S.No.","Date","Party","Category","Receipt / Voucher","Cash Book","Credit","Debit","Issued By","Action"].map(h=><th key={h} style={{padding:"10px",textAlign:"left",color:"#777",fontSize:10,textTransform:"uppercase"}}>{h}</th>)}</tr></thead><tbody>{ledger.map((r)=><tr key={r.id} style={{borderTop:`1px solid ${BORDER}`,opacity:r.status==="void"?.45:1}}><td style={{padding:10}}>{r.serialNo??"Legacy"}</td><td style={{padding:10}}>{asDate(r.transactionDate)}</td><td style={{padding:10}}><strong>{r.partyName}</strong>{r.member?.memberNo&&<small style={{display:"block",color:"#999"}}>{r.member.memberNo}</small>}</td><td style={{padding:10}}>{r.category}</td><td style={{padding:10}}>{r.receiptNo||r.voucherNo||r.transactionNo}</td><td style={{padding:10}}>{r.cashBookNo||"-"}</td><td style={{padding:10,color:GREEN,fontWeight:800}}>{r.direction==="credit"?money(r.amount):"-"}</td><td style={{padding:10,color:"#b42318",fontWeight:800}}>{r.direction==="debit"?money(r.amount):"-"}</td><td style={{padding:10}}>{r.issuedByName||"Legacy"}<small style={{display:"block",color:"#999"}}>{r.issuedByRole?.replace(/_/g," ")||""}</small></td><td style={{padding:10}}><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{r.source==="ledger"&&<button style={secondary} onClick={()=>void downloadReceipt(r)}><Download size={12}/> PDF</button>}{r.source==="ledger"&&r.status!=="void"&&<button style={secondary} onClick={async()=>{const reason=prompt("Reason for voiding this transaction?");if(reason&&reason.trim().length>=3){await voidFinanceTransaction(r.id,reason.trim());await loadAll();}}}>Void</button>}</div></td></tr>)}{!ledger.length&&<tr><td colSpan={10} style={{padding:30,textAlign:"center",color:"#888"}}>No ledger entries found.</td></tr>}</tbody></table></div></div>
      </div>}
    </main>
  </div>;
}

function Field({ labelText, children }: { labelText: string; children: any }) { return <div style={{marginBottom:10}}><label style={label}>{labelText}</label>{children}</div>; }
function Status({ text, good=false }: { text:string; good?:boolean }) { return <span style={{display:"inline-flex",padding:"3px 8px",borderRadius:999,background:good?"#dcfce7":"#f3f4f6",color:good?"#166534":"#555",fontSize:10,fontWeight:800,textTransform:"capitalize"}}>{text.replace(/_/g," ")}</span>; }
function Td({ children }: { children:any }) { return <td style={{padding:"11px 12px",verticalAlign:"top",borderTop:`1px solid ${BORDER}`,fontSize:12}}>{children}</td>; }
function DataTable({ headers, children }: { headers:string[]; children:any }) { return <div style={panel}><div className="ops-table-wrap"><table className="ops-table" style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#f8f5ef"}}>{headers.map(h=><th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,color:"#777",textTransform:"uppercase",letterSpacing:".03em"}}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div></div>; }
function MoneyCard({ title, value, icon: Icon }: { title:string; value:number; icon:any }) { return <div style={panel}><Icon size={20} color={GOLD}/><p style={{fontSize:11,color:"#777",textTransform:"uppercase",fontWeight:800,margin:"10px 0 4px"}}>{title}</p><strong style={{fontFamily:"Playfair Display,serif",color:GREEN,fontSize:24}}>{money(value)}</strong></div>; }
