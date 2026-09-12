import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, CheckCircle2, CircleDollarSign, Download, Edit2, Eye, FileCheck2, History,
  Landmark, Lock, Plus, ReceiptText, RefreshCw, RotateCcw, Save, ShieldCheck, Trash2,
  Upload, WalletCards, X, XCircle,
} from "lucide-react";
import { useAdmin } from "../context/AdminContext";
import { smartSearchSort } from "../lib/searchUtils";
import { uploadFile } from "../lib/upload";
import { MultiImageUpload } from "../components/ui/MultiImageUpload";
import {
  createFinanceHead, createFinanceTransaction, createPaymentSubmission, fetchFinanceAudit, fetchFinanceHeads,
  fetchFinanceLedger, fetchFinanceMembers, fetchFinanceOfficers, fetchFinanceSummary, fetchPaymentSubmissions,
  financeReceiptUrl, FinanceAuditRow, FinanceHead, FinanceLedgerRow, FinanceLedgerView, FinanceMember,
  FinanceOfficer, FinanceSummary, PaymentSubmission, PaymentSubmissionStatus, restoreFinanceTransaction,
  reviewPaymentSubmission, updateFinanceTransaction, voidFinanceTransaction,
} from "../lib/financeStore";

const GREEN = "#155a35";
const DARK = "#0d4328";
const GOLD = "#cda84d";
const BG = "#f8f5ef";
const BORDER = "#e8e2d7";
const panel: React.CSSProperties = { background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, boxShadow: "0 8px 30px rgba(25,61,41,.06)", padding: 20 };
const field: React.CSSProperties = { width: "100%", minHeight: 42, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "9px 11px", fontSize: 13, color: "#333", background: "#fff", boxSizing: "border-box" };
const label: React.CSSProperties = { display: "block", color: GREEN, fontSize: 12, fontWeight: 800, marginBottom: 6 };
const primary: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, background: GREEN, color: "white", border: 0, borderRadius: 8, padding: "10px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer" };
const secondary: React.CSSProperties = { ...primary, background: "white", color: GREEN, border: `1px solid rgba(21,90,53,.28)` };

function money(value: number, currency = "PKR") {
  if (currency && currency.toUpperCase() !== "PKR") return `${currency.toUpperCase()} ${Number(value || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;
  return `Rs. ${Number(value || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;
}
function dateOnly(value: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? value : d.toISOString().slice(0, 10); }
function shownDate(value: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-GB"); }
function Field({ title, children }: { title: string; children: React.ReactNode }) { return <div><label style={label}>{title}</label>{children}</div>; }

const blankForm = () => ({
  type: "revenue" as "revenue" | "expense" | "adjustment",
  direction: "credit" as "credit" | "debit",
  memberId: "", partyName: "", paymentSenderName: "", category: "Annual Membership Fee", amount: "1000", currency: "PKR", paymentMethod: "Bank Transfer",
  cashBookNo: "", externalReference: "", description: "", transactionDate: new Date().toISOString().slice(0, 10), handledByAssignmentId: "",
  proofUrl: "", supportingDocuments: [] as string[],
});

export function AdminFinancePage() {
  const { isAdmin, role } = useAdmin();
  const isSuperAdmin = role === "super_admin";
  const [summary, setSummary] = useState<FinanceSummary>({ credits: 0, debits: 0, balance: 0, count: 0, legacyCount: 0, pendingPayments: 0 });
  const [ledger, setLedger] = useState<FinanceLedgerRow[]>([]);
  const [members, setMembers] = useState<FinanceMember[]>([]);
  const [heads, setHeads] = useState<FinanceHead[]>([]);
  const [officers, setOfficers] = useState<FinanceOfficer[]>([]);
  const [payments, setPayments] = useState<PaymentSubmission[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<PaymentSubmissionStatus>("pending");
  const [paymentQuery, setPaymentQuery] = useState("");
  const [form, setForm] = useState(blankForm());
  const [editingId, setEditingId] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [memberSearchOpen, setMemberSearchOpen] = useState(false);
  const [ledgerQuery, setLedgerQuery] = useState("");
  const [ledgerType, setLedgerType] = useState("all");
  const [ledgerView, setLedgerView] = useState<FinanceLedgerView>("active");
  const [showHeadForm, setShowHeadForm] = useState(false);
  const [newHead, setNewHead] = useState({ name: "", defaultAmount: "", notes: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reviewingId, setReviewingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [auditFor, setAuditFor] = useState<FinanceLedgerRow | null>(null);
  const [auditRows, setAuditRows] = useState<FinanceAuditRow[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const visibleMembers = useMemo(() => smartSearchSort(
    members,
    memberQuery,
    (m) => [m.fullName, m.memberNo, m.email],
    (m) => m.fullName,
  ), [members, memberQuery]);
  const visibleHeads = useMemo(() => heads.filter((h) => h.kind === form.type && h.isActive), [heads, form.type]);
  const selectedMember = useMemo(() => members.find((m) => m.id === form.memberId) || null, [members, form.memberId]);

  async function load(includeLedger = true) {
    if (!isAdmin) return;
    setLoading(true); setError("");
    try {
      const [m, h, o, s, queue] = await Promise.all([
        fetchFinanceMembers(), fetchFinanceHeads(), fetchFinanceOfficers(), fetchFinanceSummary(), fetchPaymentSubmissions(paymentStatus, paymentQuery),
      ]);
      setMembers(m); setHeads(h); setOfficers(o); setSummary(s); setPayments(queue);
      if (includeLedger) setLedger(await fetchFinanceLedger(ledgerQuery, ledgerType, ledgerView));
    } catch (e: any) { setError(e?.message || "Finance records could not be loaded."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [isAdmin]);
  useEffect(() => {
    if (!isAdmin) return;
    const timer = window.setTimeout(() => fetchFinanceLedger(ledgerQuery, ledgerType, ledgerView).then(setLedger).catch((e) => setError(e?.message || "Ledger search failed.")), 180);
    return () => window.clearTimeout(timer);
  }, [ledgerQuery, ledgerType, ledgerView, isAdmin]);
  useEffect(() => {
    if (!isAdmin) return;
    const timer = window.setTimeout(() => fetchPaymentSubmissions(paymentStatus, paymentQuery).then(setPayments).catch((e) => setError(e?.message || "Payment verification queue could not be loaded.")), 180);
    return () => window.clearTimeout(timer);
  }, [paymentStatus, paymentQuery, isAdmin]);

  if (!isAdmin) return <div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:BG}}><div style={{...panel,textAlign:"center",maxWidth:430}}><ShieldCheck color={GOLD} size={40}/><h2 style={{color:GREEN}}>Admin sign-in required</h2><button style={primary} onClick={()=>location.assign("/admin")}>Open Admin Login</button></div></div>;

  function flash(text: string) { setSuccess(text); window.setTimeout(() => setSuccess(""), 3500); }
  function resetForm() { setEditingId(""); setMemberQuery(""); setMemberSearchOpen(false); setForm(blankForm()); }

  function selectType(type: "revenue" | "expense" | "adjustment") {
    const first = heads.find((h) => h.kind === type && h.isActive);
    setForm({
      ...form,
      type,
      direction: type === "expense" ? "debit" : type === "revenue" ? "credit" : form.direction,
      category: first?.name || (type === "expense" ? "Office Expense" : type === "adjustment" ? "Adjustment" : "Annual Membership Fee"),
      amount: first?.defaultAmount != null ? String(first.defaultAmount) : "",
      paymentMethod: type === "expense" ? "Cash" : form.paymentMethod,
    });
  }
  function selectHead(name: string) {
    const head = heads.find((h) => h.kind === form.type && h.name === name);
    setForm({ ...form, category: name, amount: head?.defaultAmount != null ? String(head.defaultAmount) : form.amount });
  }
  function selectMember(id: string) {
    const m = members.find((x) => x.id === id);
    let category = form.category, amount = form.amount;
    if (form.type === "revenue" && m?.membershipType === "ordinary") { category = "Annual Membership Fee"; amount = "1000"; }
    if (form.type === "revenue" && m?.membershipType === "life") { category = "Life Membership Fee"; amount = "3000"; }
    setForm({ ...form, memberId: id, partyName: m?.fullName || form.partyName, category, amount });
    setMemberQuery(m ? `${m.fullName} · ${m.memberNo}` : "");
    setMemberSearchOpen(false);
  }

  async function handleProofUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError("");
    try {
      const url = await uploadFile(file, form.type === "expense" ? "finance-expense-proof" : "finance-payment-proof");
      setForm((old) => ({ ...old, proofUrl: url }));
    } catch (e: any) { setError(e?.message || "Proof upload failed."); }
    finally { setUploading(false); e.target.value = ""; }
  }

  async function saveHead() {
    setError("");
    try {
      if (newHead.name.trim().length < 2) throw new Error("Enter a finance head name.");
      const defaultAmount = newHead.defaultAmount.trim() ? Number(newHead.defaultAmount) : null;
      if (defaultAmount != null && (!Number.isFinite(defaultAmount) || defaultAmount <= 0)) throw new Error("Default amount must be greater than zero.");
      const created = await createFinanceHead({ name: newHead.name.trim(), kind: form.type, defaultAmount, notes: newHead.notes.trim() || null });
      const fresh = await fetchFinanceHeads(); setHeads(fresh);
      setForm({ ...form, category: created.name, amount: created.defaultAmount != null ? String(created.defaultAmount) : form.amount });
      setNewHead({ name: "", defaultAmount: "", notes: "" }); setShowHeadForm(false); flash("New finance head saved for future use.");
    } catch (e: any) { setError(e?.message || "Could not create finance head."); }
  }

  async function saveTransaction() {
    setError(""); setSaving(true);
    try {
      if (editingId && !isSuperAdmin) throw new Error("Posted ledger entries are locked. Only Super Admin can edit them.");
      const amount = Number(form.amount);
      if (!form.partyName.trim()) throw new Error("Enter payer / payee name.");
      if (!form.category.trim()) throw new Error("Select a finance head.");
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid amount greater than zero.");
      if (form.category.trim().toLowerCase() === "contribution" && form.description.trim().length < 3) throw new Error("For Contribution, write its purpose in Remarks / Purpose.");
      if (!form.proofUrl) throw new Error(form.type === "expense" ? "Upload expense proof / voucher before posting." : "Upload the payment slip/proof before submitting it for verification.");

      if (!editingId && form.type === "revenue") {
        if (form.paymentSenderName.trim().length < 2) throw new Error("Enter the sender/account-holder name exactly as shown on the payment proof.");
        await createPaymentSubmission({
          sourceType: "manual_revenue",
          memberId: form.memberId || null,
          payerName: form.partyName.trim(),
          senderName: form.paymentSenderName.trim(),
          category: form.category,
          amount,
          currency: form.currency || "PKR",
          paymentMethod: form.paymentMethod || null,
          transactionReference: form.externalReference || null,
          proofUrl: form.proofUrl,
          supportingDocuments: form.supportingDocuments,
          description: form.description || null,
        });
        resetForm(); setPaymentStatus("pending"); await load();
        flash("Payment submitted to Verification Queue. It has NOT been added to ledger totals. Finance approval is required first.");
        return;
      }

      const payload = {
        ...form,
        amount,
        memberId: form.memberId || null,
        handledByAssignmentId: form.handledByAssignmentId || null,
        direction: form.type === "expense" ? "debit" as const : form.type === "revenue" ? "credit" as const : form.direction,
        paymentSenderName: form.paymentSenderName || null,
      };
      if (editingId) await updateFinanceTransaction(editingId, payload); else await createFinanceTransaction(payload);
      const wasEdit = Boolean(editingId); resetForm(); await load();
      flash(wasEdit ? "Ledger entry corrected by Super Admin. The audit history was preserved." : "Expense / adjustment posted and locked with permanent evidence and document number.");
    } catch (e: any) { setError(e?.message || "Could not save finance record."); }
    finally { setSaving(false); }
  }

  function editRow(row: FinanceLedgerRow) {
    if (!isSuperAdmin || row.source !== "ledger" || row.status === "void") return;
    const officer = officers.find((o) => o.memberId === row.handledByMemberId && (!row.handledByRole || o.role === row.handledByRole));
    setEditingId(row.id); setMemberQuery(row.member?.fullName || row.partyName);
    setForm({
      type: row.type, direction: row.direction, memberId: row.memberId || "", partyName: row.partyName,
      paymentSenderName: row.paymentSenderName || "", category: row.category, amount: String(row.amount), currency: "PKR",
      paymentMethod: row.paymentMethod || "Cash", cashBookNo: row.cashBookNo || "", externalReference: row.externalReference || "",
      description: row.description || "", transactionDate: dateOnly(row.transactionDate), handledByAssignmentId: officer?.id || "",
      proofUrl: row.proofUrl || "", supportingDocuments: row.supportingDocuments || [],
    });
    window.scrollTo({top:0,behavior:"smooth"});
  }

  async function reviewPayment(row: PaymentSubmission, action: "approve" | "reject") {
    if (row.status !== "pending") return;
    setReviewingId(row.id); setError("");
    try {
      if (action === "reject") {
        const note = prompt("Reason for rejecting this payment proof?", "Payment proof/reference did not match accounts.");
        if (!note || note.trim().length < 3) return;
        await reviewPaymentSubmission(row.id, { action: "reject", reviewNote: note.trim() });
        await load(); flash("Payment rejected. It remains in audit history and was not added to the ledger.");
        return;
      }
      const cashBookNo = prompt("Cash / C-in-book number (optional, recommended):", row.cashBookNo || "") ?? "";
      const note = prompt("Verification note:", "Slip/reference matched with accounts.") ?? "";
      let ledgerAmount: number | null = null;
      if (String(row.currency || "PKR").toUpperCase() !== "PKR") {
        const raw = prompt(`Payment is ${row.currency} ${row.amount}. Enter verified PKR-equivalent amount for the rupee ledger:`);
        if (!raw) return;
        ledgerAmount = Number(raw.replace(/,/g, ""));
        if (!Number.isFinite(ledgerAmount) || ledgerAmount <= 0) throw new Error("A valid PKR-equivalent amount is required.");
      }
      await reviewPaymentSubmission(row.id, { action: "approve", cashBookNo: cashBookNo.trim() || null, reviewNote: note.trim() || null, ledgerAmount });
      await load(); flash("Payment verified. A locked receipt/ledger entry has now been created and source payment status updated.");
    } catch (e: any) { setError(e?.message || "Payment review failed."); }
    finally { setReviewingId(""); }
  }

  async function downloadPdf(row: FinanceLedgerRow) {
    try {
      const response = await fetch(financeReceiptUrl(row.id), { headers: { Authorization: `Bearer ${sessionStorage.getItem("araian_admin_token") || ""}` } });
      if (!response.ok) throw new Error("Receipt / voucher PDF could not be generated.");
      const blob = await response.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = `${row.receiptNo || row.voucherNo || row.transactionNo}.pdf`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e: any) { setError(e?.message || "PDF download failed."); }
  }

  async function openAudit(row: FinanceLedgerRow) {
    if (row.source !== "ledger") return;
    setAuditFor(row); setAuditLoading(true); setAuditRows([]); setError("");
    try { setAuditRows(await fetchFinanceAudit(row.id)); }
    catch (e: any) { setError(e?.message || "Audit history could not be loaded."); }
    finally { setAuditLoading(false); }
  }

  async function archiveRow(row: FinanceLedgerRow) {
    if (!isSuperAdmin) return;
    const reason = prompt("Reason for archiving this transaction? The record will remain in Audit / Archived Records.");
    if (!reason || reason.trim().length < 3) return;
    try { await voidFinanceTransaction(row.id, reason.trim()); await load(); flash("Transaction archived. It remains permanently available in Archived Records and Audit History."); }
    catch (e: any) { setError(e?.message || "Could not archive transaction."); }
  }

  async function restoreRow(row: FinanceLedgerRow) {
    if (!isSuperAdmin) return;
    const reason = prompt("Reason for restoring this archived transaction?", "Restored after review");
    if (!reason || reason.trim().length < 3) return;
    try { await restoreFinanceTransaction(row.id, reason.trim()); await load(); flash("Transaction restored to the active ledger. Audit history remains intact."); }
    catch (e: any) { setError(e?.message || "Could not restore transaction."); }
  }

  return <div style={{minHeight:"100vh",background:BG,fontFamily:"Lato,Arial,sans-serif",color:"#333"}}>
    <style>{`@media(max-width:850px){.finance-main{padding:16px!important}.finance-grid{grid-template-columns:1fr!important}.finance-cards{grid-template-columns:1fr 1fr!important}.finance-table{min-width:1200px}.finance-header{padding:18px 16px!important}.finance-actions{width:100%}.member-results{position:static!important;max-height:260px!important}.payment-table{min-width:1050px}} @media(max-width:520px){.finance-cards{grid-template-columns:1fr!important}}`}</style>
    <header className="finance-header" style={{background:DARK,color:"white",borderBottom:`3px solid ${GOLD}`,padding:"22px 6vw",display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}><div><h1 style={{fontFamily:"Playfair Display,Georgia,serif",fontSize:28,margin:0}}>Governance & Operations Center</h1><p style={{margin:"5px 0 0",opacity:.78,fontSize:12}}>Finance Ledger · proof verification first, then locked accounting records and audit trail</p></div><div className="finance-actions" style={{display:"flex",gap:8}}><button style={{...secondary,background:"transparent",color:"white",borderColor:"rgba(255,255,255,.3)"}} onClick={()=>location.assign("/admin/operations")}><ArrowLeft size={14}/> Governance</button><button style={{...secondary,background:"transparent",color:"white",borderColor:"rgba(255,255,255,.3)"}} onClick={()=>location.assign("/admin")}><ArrowLeft size={14}/> Main Admin</button></div></header>
    <main className="finance-main" style={{padding:"24px 6vw 60px"}}>
      {error&&<div style={{padding:"11px 14px",borderRadius:9,background:"#fee2e2",color:"#991b1b",marginBottom:14,fontSize:12,fontWeight:700}}>{error}</div>}
      {success&&<div style={{padding:"11px 14px",borderRadius:9,background:"#dcfce7",color:"#166534",marginBottom:14,fontSize:12,fontWeight:700}}>{success}</div>}
      <div style={{padding:"11px 13px",border:"1px solid #d8c483",background:"#fff9e9",borderRadius:9,marginBottom:14,fontSize:12,color:"#4f5f55",display:"flex",gap:8,alignItems:"flex-start"}}><FileCheck2 size={17} color={GREEN}/><span><b>Payment control:</b> uploaded or manually entered revenue remains <b>Pending Verification</b> and is excluded from ledger totals. Finance/Accounts must open the slip, match sender/reference and approve it. Only then is a receipt and locked ledger entry created. Expenses require proof before posting.</span></div>
      <div className="finance-cards" style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:12,marginBottom:18}}><MoneyCard title="Total Credits / Revenue" value={summary.credits} icon={CircleDollarSign}/><MoneyCard title="Total Debits / Expenses" value={summary.debits} icon={ReceiptText}/><MoneyCard title="Current Ledger Balance" value={summary.balance} icon={Landmark}/><CountCard title="Pending Verification" value={summary.pendingPayments || 0} icon={WalletCards}/></div>

      <section style={{...panel,marginBottom:18,borderColor:"#dfcf98"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,flexWrap:"wrap",marginBottom:12}}><div><h2 style={{color:GREEN,fontFamily:"Playfair Display,serif",margin:"0 0 4px"}}>Payment Verification Queue</h2><p style={{margin:0,color:"#777",fontSize:12}}>Membership, business, matrimonial and manual payment proofs arrive here first. Pending items do not affect revenue or balance.</p></div><div style={{display:"flex",gap:7,flexWrap:"wrap"}}><input style={{...field,width:250}} placeholder="Search payer, sender, member no, reference..." value={paymentQuery} onChange={(e)=>setPaymentQuery(e.target.value)}/><select style={{...field,width:160}} value={paymentStatus} onChange={(e)=>setPaymentStatus(e.target.value as PaymentSubmissionStatus)}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All</option></select><button style={secondary} onClick={()=>void load()}><RefreshCw size={13}/> Refresh</button></div></div>
        <div style={{overflowX:"auto"}}><table className="payment-table" style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{background:BG}}>{["Source / Submitted","Payer / Member","Sender on Slip","Amount","Reference","Proof / Documents","Status","Review"].map((h)=><th key={h} style={{padding:10,textAlign:"left",fontSize:10,color:"#777",textTransform:"uppercase"}}>{h}</th>)}</tr></thead><tbody>{payments.map((p)=><tr key={p.id} style={{borderTop:`1px solid ${BORDER}`}}><td style={{padding:10}}><strong style={{textTransform:"capitalize"}}>{p.sourceType.replace(/_/g," ")}</strong><small style={{display:"block",color:"#888"}}>{shownDate(p.submittedAt)}</small></td><td style={{padding:10}}><strong>{p.payerName}</strong>{p.memberNo&&<small style={{display:"block",color:"#888"}}>{p.memberNo}</small>}</td><td style={{padding:10}}><strong>{p.senderName}</strong>{p.paymentMethod&&<small style={{display:"block",color:"#888"}}>{p.paymentMethod}</small>}</td><td style={{padding:10,fontWeight:800,color:GREEN}}>{money(p.amount,p.currency)}</td><td style={{padding:10}}>{p.transactionReference||"-"}</td><td style={{padding:10}}><div style={{display:"flex",gap:5,flexWrap:"wrap"}}><button style={secondary} onClick={()=>window.open(p.proofUrl,"_blank","noopener,noreferrer")}><Eye size={12}/> Slip</button>{(p.supportingDocuments||[]).map((url,i)=><button key={`${p.id}-${i}`} style={{...secondary,padding:"7px 9px"}} onClick={()=>window.open(url,"_blank","noopener,noreferrer")}><FileCheck2 size={11}/> Doc {i+1}</button>)}</div></td><td style={{padding:10}}><StatusPill status={p.status}/>{p.reviewedByName&&<small style={{display:"block",color:"#888",marginTop:4}}>{p.reviewedByName}</small>}</td><td style={{padding:10}}>{p.status==="pending"?<div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button disabled={reviewingId===p.id} style={{...primary,padding:"8px 10px"}} onClick={()=>void reviewPayment(p,"approve")}><CheckCircle2 size={12}/> Approve</button><button disabled={reviewingId===p.id} style={{...secondary,color:"#9b2c2c",borderColor:"#e7b8b8",padding:"8px 10px"}} onClick={()=>void reviewPayment(p,"reject")}><XCircle size={12}/> Reject</button></div>:<small style={{color:"#777"}}>{p.reviewNote||"Reviewed"}</small>}</td></tr>)}{!payments.length&&<tr><td colSpan={8} style={{padding:30,textAlign:"center",color:"#888"}}>No payment submissions in this view.</td></tr>}</tbody></table></div>
      </section>

      <section style={{...panel,marginBottom:18}}><div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start",flexWrap:"wrap"}}><div><h2 style={{color:GREEN,fontFamily:"Playfair Display,serif",margin:"0 0 5px"}}>{editingId?"Super Admin Correction":form.type==="revenue"?"Submit Manual Revenue for Verification":"Post Expense or Adjustment"}</h2><p style={{fontSize:12,color:"#777",margin:"0 0 14px"}}>{form.type==="revenue"?"Manual revenue follows the same two-step control as online forms: proof first, Finance approval second, ledger entry last.":"Expenses are finance-authorized entries and require a supporting voucher/slip before they can be posted."}</p></div>{editingId&&<span style={{padding:"4px 9px",background:"#fff4cf",color:"#765b09",borderRadius:999,fontSize:11,fontWeight:800}}>Super Admin correction · audited</span>}</div>
        <div className="finance-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:12}}>
          <Field title="Transaction"><select disabled={!!editingId} style={{...field,background:editingId?"#f5f5f5":"#fff"}} value={form.type} onChange={(e)=>selectType(e.target.value as any)}><option value="revenue">Revenue / Receipt</option><option value="expense">Expense / Payment</option><option value="adjustment">Adjustment (+ / -)</option></select></Field>
          {form.type==="adjustment"&&<Field title="Adjustment direction"><select disabled={!!editingId} style={field} value={form.direction} onChange={(e)=>setForm({...form,direction:e.target.value as any})}><option value="credit">Plus / Credit</option><option value="debit">Minus / Debit</option></select></Field>}
          <Field title="Search & link approved member (optional)"><div style={{position:"relative"}}><input style={field} placeholder="Type Atif, Khalid, member no..." value={memberQuery} onFocus={()=>setMemberSearchOpen(true)} onChange={(e)=>{setMemberQuery(e.target.value);setMemberSearchOpen(true);if(!e.target.value.trim())setForm({...form,memberId:""});}}/>{selectedMember&&<div style={{marginTop:5,fontSize:10,color:GREEN,fontWeight:800}}>Linked: {selectedMember.fullName} · {selectedMember.memberNo} <button type="button" onClick={()=>{setForm({...form,memberId:""});setMemberQuery("");setMemberSearchOpen(true);}} style={{border:0,background:"transparent",color:"#9b2c2c",cursor:"pointer",fontSize:10}}>Clear</button></div>}{memberSearchOpen&&memberQuery.trim().length>=2&&<div className="member-results" style={{position:"absolute",zIndex:30,left:0,right:0,top:46,background:"white",border:`1px solid ${BORDER}`,borderRadius:9,boxShadow:"0 12px 28px rgba(0,0,0,.14)",maxHeight:260,overflowY:"auto"}}><div style={{padding:"7px 10px",fontSize:10,color:"#777",background:BG,borderBottom:`1px solid ${BORDER}`}}>{visibleMembers.length} matching member{visibleMembers.length===1?"":"s"}. Tap a name to link.</div>{visibleMembers.map((m)=><button type="button" key={m.id} onClick={()=>selectMember(m.id)} style={{width:"100%",display:"block",textAlign:"left",padding:"9px 11px",border:0,borderBottom:`1px solid ${BORDER}`,background:m.id===form.memberId?"#eef7f1":"white",cursor:"pointer"}}><strong style={{display:"block",fontSize:12,color:"#26382d"}}>{m.fullName}</strong><span style={{fontSize:10,color:"#777"}}>{m.memberNo}{m.email?` · ${m.email}`:""}</span></button>)}{!visibleMembers.length&&<div style={{padding:14,fontSize:11,color:"#888"}}>No matching approved member.</div>}</div>}</div></Field>
          <Field title="Name / payer / payee"><input style={field} value={form.partyName} onChange={(e)=>setForm({...form,partyName:e.target.value})}/></Field>
          {form.type==="revenue"&&<Field title="Sender / account-holder name *"><input style={field} placeholder="Name shown on bank/e-wallet slip" value={form.paymentSenderName} onChange={(e)=>setForm({...form,paymentSenderName:e.target.value})}/></Field>}
          <Field title="Finance head / category"><div style={{display:"flex",gap:6}}><select style={field} value={form.category} onChange={(e)=>selectHead(e.target.value)}>{!visibleHeads.some(h=>h.name===form.category)&&form.category&&<option value={form.category}>{form.category}</option>}{visibleHeads.map((h)=><option key={h.id} value={h.name}>{h.name}{h.defaultAmount!=null?` · ${money(h.defaultAmount)}`:""}</option>)}</select><button type="button" style={{...secondary,padding:"8px 10px",whiteSpace:"nowrap"}} onClick={()=>setShowHeadForm(v=>!v)}><Plus size={13}/> Head</button></div></Field>
          <Field title="Amount"><input type="number" min="0" step="0.01" style={field} value={form.amount} onChange={(e)=>setForm({...form,amount:e.target.value})}/></Field>
          {form.type==="revenue"&&<Field title="Currency"><select style={field} value={form.currency} onChange={(e)=>setForm({...form,currency:e.target.value})}><option value="PKR">PKR</option><option value="USD">USD</option><option value="GBP">GBP</option><option value="EUR">EUR</option><option value="AED">AED</option><option value="SAR">SAR</option></select></Field>}
          {form.type!=="revenue"&&<Field title="Cash / C-in-book No."><input style={field} value={form.cashBookNo} onChange={(e)=>setForm({...form,cashBookNo:e.target.value})}/></Field>}
          <Field title="Payment method"><select style={field} value={form.paymentMethod} onChange={(e)=>setForm({...form,paymentMethod:e.target.value})}><option>Cash</option><option>Bank Transfer</option><option>Cheque</option><option>JazzCash</option><option>Easypaisa</option><option>Online</option><option>Other</option></select></Field>
          <Field title="Date"><input type="date" style={field} value={form.transactionDate} onChange={(e)=>setForm({...form,transactionDate:e.target.value})}/></Field>
          {form.type!=="revenue"&&<Field title={form.type==="expense"||form.direction==="debit"?"Paid / authorized by":"Handled by"}><select style={field} value={form.handledByAssignmentId} onChange={(e)=>setForm({...form,handledByAssignmentId:e.target.value})}><option value="">Current logged-in finance/admin user</option>{officers.map((o)=><option key={o.id} value={o.id}>{o.name} · {o.role}{o.unit?` · ${o.unit}`:""}</option>)}</select></Field>}
          <Field title={form.type==="revenue"?"Bank / wallet transaction reference":"External reference"}><input style={field} value={form.externalReference} onChange={(e)=>setForm({...form,externalReference:e.target.value})}/></Field>
          <Field title={form.type==="expense"?"Expense proof / voucher *":"Payment proof / slip *"}><label style={{...field,display:"flex",alignItems:"center",justifyContent:"center",gap:7,cursor:"pointer",borderStyle:"dashed",color:form.proofUrl?GREEN:"#777",fontWeight:700}}>{form.proofUrl?<><FileCheck2 size={15}/> Proof uploaded</>:<><Upload size={15}/> {uploading?"Uploading...":"Upload image / PDF"}</>}<input type="file" accept="image/*,.pdf" style={{display:"none"}} onChange={handleProofUpload}/></label>{form.proofUrl&&<button type="button" onClick={()=>window.open(form.proofUrl,"_blank","noopener,noreferrer")} style={{border:0,background:"transparent",color:GREEN,fontSize:10,cursor:"pointer",marginTop:4}}>View uploaded proof</button>}</Field>
        </div>
        {showHeadForm&&<div style={{background:BG,border:`1px solid ${BORDER}`,borderRadius:10,padding:12,marginTop:12}}><strong style={{color:GREEN,fontSize:12}}>Create reusable {form.type} head</strong><div className="finance-grid" style={{display:"grid",gridTemplateColumns:"1.2fr .7fr 1.5fr",gap:8,marginTop:8}}><input style={field} placeholder="New head name" value={newHead.name} onChange={(e)=>setNewHead({...newHead,name:e.target.value})}/><input style={field} type="number" min="0" placeholder="Default amount (optional)" value={newHead.defaultAmount} onChange={(e)=>setNewHead({...newHead,defaultAmount:e.target.value})}/><input style={field} placeholder="Head note / purpose" value={newHead.notes} onChange={(e)=>setNewHead({...newHead,notes:e.target.value})}/></div><div style={{display:"flex",gap:7,marginTop:8}}><button style={primary} onClick={()=>void saveHead()}><Save size={13}/> Save Head</button><button style={secondary} onClick={()=>setShowHeadForm(false)}>Cancel</button></div></div>}
        <div style={{marginTop:12}}><MultiImageUpload label="Supporting documents / additional proof (optional)" images={form.supportingDocuments} onChange={(images)=>setForm({...form,supportingDocuments:images})}/></div>
        <div style={{marginTop:12}}><Field title="Remarks / purpose"><textarea style={{...field,minHeight:72}} placeholder={form.category==="Contribution"?"Required: what is this contribution for?":"Details / verification context"} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})}/></Field></div>
        <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}><button disabled={saving||uploading||Boolean(editingId&&!isSuperAdmin)} style={{...primary,opacity:saving||uploading?.6:1}} onClick={()=>void saveTransaction()}><Save size={14}/> {editingId?"Save Audited Correction":form.type==="revenue"?"Submit for Verification":"Post & Lock Entry"}</button>{editingId&&<button style={secondary} onClick={resetForm}>Cancel Edit</button>}</div>
      </section>

      <section style={panel}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:12}}><div><h2 style={{color:GREEN,fontFamily:"Playfair Display,serif",margin:0}}>One-Page Ledger</h2><small style={{color:"#888"}}>Only verified revenue appears here. Smart search covers names, sender, member numbers, heads, receipts and references. Posted records remain locked.</small></div><div style={{display:"flex",gap:7,flexWrap:"wrap"}}><input style={{...field,width:280}} placeholder="Search name, head, receipt, member no..." value={ledgerQuery} onChange={(e)=>setLedgerQuery(e.target.value)}/><select style={{...field,width:145}} value={ledgerType} onChange={(e)=>setLedgerType(e.target.value)}><option value="all">All Types</option><option value="revenue">Revenue</option><option value="expense">Expense</option><option value="adjustment">Adjustments</option></select><select style={{...field,width:165}} value={ledgerView} onChange={(e)=>setLedgerView(e.target.value as FinanceLedgerView)}><option value="active">Active Ledger</option><option value="archived">Archived Records</option>{isSuperAdmin&&<option value="all">All Records</option>}</select><button style={secondary} onClick={()=>void load()}><RefreshCw size={13}/> Refresh</button></div></div>
        {loading?<div style={{padding:30,textAlign:"center",color:"#777"}}>Loading finance records...</div>:<div style={{overflowX:"auto"}}><table className="finance-table" style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{background:BG}}>{["S.No.","Date","Party / Sender","Head / Remarks","Receipt / Voucher","Cash Book","Credit","Debit","Received / Paid By","Proof / Action"].map(h=><th key={h} style={{padding:10,textAlign:"left",color:"#777",fontSize:10,textTransform:"uppercase"}}>{h}</th>)}</tr></thead><tbody>{ledger.map((r)=><tr key={r.id} style={{borderTop:`1px solid ${BORDER}`,opacity:r.status==="void"?.6:1,background:r.status==="void"?"#fafafa":"transparent"}}><td style={{padding:10}}>{r.serialNo??"Legacy"}{r.status==="void"&&<small style={{display:"block",color:"#9b2c2c",fontWeight:800}}>ARCHIVED</small>}</td><td style={{padding:10}}>{shownDate(r.transactionDate)}</td><td style={{padding:10}}><strong>{r.partyName}</strong>{r.paymentSenderName&&r.paymentSenderName!==r.partyName&&<small style={{display:"block",color:"#777"}}>Sender: {r.paymentSenderName}</small>}{r.member?.memberNo&&<small style={{display:"block",color:"#999"}}>{r.member.memberNo}</small>}</td><td style={{padding:10}}><strong>{r.category}</strong>{r.description&&<small style={{display:"block",color:"#888",maxWidth:240}}>{r.description}</small>}</td><td style={{padding:10}}>{r.receiptNo||r.voucherNo||r.transactionNo}</td><td style={{padding:10}}>{r.cashBookNo||"-"}</td><td style={{padding:10,color:GREEN,fontWeight:800}}>{r.direction==="credit"?money(r.amount):"-"}</td><td style={{padding:10,color:"#b42318",fontWeight:800}}>{r.direction==="debit"?money(r.amount):"-"}</td><td style={{padding:10}}>{r.handledByName||r.issuedByName||"Legacy"}<small style={{display:"block",color:"#999"}}>{r.handledByRole||r.issuedByRole?.replace(/_/g," ")||""}</small></td><td style={{padding:10}}><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{r.proofUrl&&<button style={secondary} onClick={()=>window.open(r.proofUrl!,"_blank","noopener,noreferrer")}><Eye size={12}/> Proof</button>}{r.source==="ledger"&&<button style={secondary} onClick={()=>void downloadPdf(r)}><Download size={12}/> PDF</button>}{r.source==="ledger"&&<button style={secondary} onClick={()=>void openAudit(r)}><History size={12}/> Audit</button>}{r.source==="ledger"&&r.status!=="void"&&isSuperAdmin&&<button style={secondary} onClick={()=>editRow(r)}><Edit2 size={12}/> Edit</button>}{r.source==="ledger"&&r.status!=="void"&&isSuperAdmin&&<button style={{...secondary,color:"#9b2c2c",borderColor:"#e7b8b8"}} onClick={()=>void archiveRow(r)}><Trash2 size={12}/> Archive</button>}{r.source==="ledger"&&r.status==="void"&&isSuperAdmin&&<button style={secondary} onClick={()=>void restoreRow(r)}><RotateCcw size={12}/> Restore</button>}{r.source==="ledger"&&!isSuperAdmin&&<span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"6px 8px",fontSize:10,color:"#6b756e",background:"#f2f5f3",borderRadius:6}}><Lock size={11}/> Locked</span>}</div></td></tr>)}{!ledger.length&&<tr><td colSpan={10} style={{padding:30,textAlign:"center",color:"#888"}}>No ledger entries found in this view.</td></tr>}</tbody></table></div>}
      </section>
    </main>
    {auditFor&&<div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,.55)",display:"grid",placeItems:"center",padding:16}}><div style={{width:"min(760px,96vw)",maxHeight:"88vh",overflow:"auto",background:"white",borderRadius:14,boxShadow:"0 24px 70px rgba(0,0,0,.25)"}}><div style={{padding:"16px 18px",borderBottom:`1px solid ${BORDER}`,display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}><div><h3 style={{margin:0,color:GREEN,fontFamily:"Playfair Display,serif"}}>Audit History</h3><small style={{color:"#777"}}>{auditFor.receiptNo||auditFor.voucherNo||auditFor.transactionNo} · {auditFor.partyName}</small></div><button style={{border:0,background:"transparent",cursor:"pointer",color:"#777"}} onClick={()=>{setAuditFor(null);setAuditRows([]);}}><X size={20}/></button></div><div style={{padding:18}}>{auditLoading?<div style={{padding:20,textAlign:"center",color:"#777"}}>Loading audit history...</div>:auditRows.length?<div style={{display:"grid",gap:9}}>{auditRows.map((a)=><div key={a.id} style={{border:`1px solid ${BORDER}`,borderRadius:9,padding:"10px 12px"}}><div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><strong style={{color:GREEN,textTransform:"capitalize"}}>{a.action.replace(/_/g," ")}</strong><span style={{fontSize:10,color:"#888"}}>{new Date(a.createdAt).toLocaleString("en-GB")}</span></div><div style={{fontSize:11,color:"#666",marginTop:4}}>By: {a.actorName||"System / Admin"}</div></div>)}</div>:<div style={{padding:20,textAlign:"center",color:"#888"}}>No audit events found.</div>}</div></div></div>}
  </div>;
}

function StatusPill({status}:{status:string}) {
  const good=status==="approved", bad=status==="rejected";
  return <span style={{display:"inline-block",padding:"4px 8px",borderRadius:999,fontSize:10,fontWeight:800,textTransform:"capitalize",background:good?"#dcfce7":bad?"#fee2e2":"#fef3c7",color:good?"#166534":bad?"#991b1b":"#854d0e"}}>{status}</span>;
}
function MoneyCard({title,value,icon:Icon}:{title:string;value:number;icon:any}) { return <div style={panel}><Icon size={20} color={GOLD}/><p style={{fontSize:11,color:"#777",textTransform:"uppercase",fontWeight:800,margin:"10px 0 4px"}}>{title}</p><strong style={{fontFamily:"Playfair Display,serif",color:GREEN,fontSize:24}}>{money(value)}</strong></div>; }
function CountCard({title,value,icon:Icon}:{title:string;value:number;icon:any}) { return <div style={panel}><Icon size={20} color={GOLD}/><p style={{fontSize:11,color:"#777",textTransform:"uppercase",fontWeight:800,margin:"10px 0 4px"}}>{title}</p><strong style={{fontFamily:"Playfair Display,serif",color:value?"#9a6700":GREEN,fontSize:24}}>{value}</strong></div>; }
