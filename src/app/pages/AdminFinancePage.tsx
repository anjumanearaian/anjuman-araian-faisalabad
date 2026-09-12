import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CircleDollarSign, Download, Edit2, Landmark, Plus, ReceiptText, RefreshCw, Save, ShieldCheck, Trash2, WalletCards } from "lucide-react";
import { useAdmin } from "../context/AdminContext";
import { fuzzySearch } from "../lib/searchUtils";
import {
  createFinanceHead, createFinanceTransaction, fetchFinanceHeads, fetchFinanceLedger, fetchFinanceMembers,
  fetchFinanceOfficers, fetchFinanceSummary, financeReceiptUrl, FinanceHead, FinanceLedgerRow, FinanceMember,
  FinanceOfficer, FinanceSummary, updateFinanceTransaction, voidFinanceTransaction,
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

function money(value: number) { return `Rs. ${Number(value || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`; }
function dateOnly(value: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? value : d.toISOString().slice(0, 10); }
function shownDate(value: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-GB"); }
function Field({ title, children }: { title: string; children: React.ReactNode }) { return <div><label style={label}>{title}</label>{children}</div>; }

const blankForm = () => ({
  type: "revenue" as "revenue" | "expense" | "adjustment",
  direction: "credit" as "credit" | "debit",
  memberId: "", partyName: "", category: "Annual Membership Fee", amount: "1000", paymentMethod: "Cash",
  cashBookNo: "", externalReference: "", description: "", transactionDate: new Date().toISOString().slice(0, 10), handledByAssignmentId: "",
});

export function AdminFinancePage() {
  const { isAdmin, role } = useAdmin();
  const [summary, setSummary] = useState<FinanceSummary>({ credits: 0, debits: 0, balance: 0, count: 0, legacyCount: 0 });
  const [ledger, setLedger] = useState<FinanceLedgerRow[]>([]);
  const [members, setMembers] = useState<FinanceMember[]>([]);
  const [heads, setHeads] = useState<FinanceHead[]>([]);
  const [officers, setOfficers] = useState<FinanceOfficer[]>([]);
  const [form, setForm] = useState(blankForm());
  const [editingId, setEditingId] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [ledgerQuery, setLedgerQuery] = useState("");
  const [ledgerType, setLedgerType] = useState("all");
  const [showHeadForm, setShowHeadForm] = useState(false);
  const [newHead, setNewHead] = useState({ name: "", defaultAmount: "", notes: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const visibleMembers = useMemo(() => members.filter((m) => fuzzySearch([m.fullName, m.memberNo, m.email], memberQuery)), [members, memberQuery]);
  const visibleHeads = useMemo(() => heads.filter((h) => h.kind === form.type && h.isActive), [heads, form.type]);

  async function load(includeLedger = true) {
    if (!isAdmin) return;
    setLoading(true); setError("");
    try {
      const [m, h, o, s] = await Promise.all([fetchFinanceMembers(), fetchFinanceHeads(), fetchFinanceOfficers(), fetchFinanceSummary()]);
      setMembers(m); setHeads(h); setOfficers(o); setSummary(s);
      if (includeLedger) setLedger(await fetchFinanceLedger(ledgerQuery, ledgerType));
    } catch (e: any) { setError(e?.message || "Finance records could not be loaded."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [isAdmin]);
  useEffect(() => {
    if (!isAdmin) return;
    const timer = window.setTimeout(() => fetchFinanceLedger(ledgerQuery, ledgerType).then(setLedger).catch((e) => setError(e?.message || "Ledger search failed.")), 180);
    return () => window.clearTimeout(timer);
  }, [ledgerQuery, ledgerType, isAdmin]);

  if (!isAdmin) return <div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:BG}}><div style={{...panel,textAlign:"center",maxWidth:430}}><ShieldCheck color={GOLD} size={40}/><h2 style={{color:GREEN}}>Admin sign-in required</h2><button style={primary} onClick={()=>location.assign("/admin")}>Open Admin Login</button></div></div>;

  function flash(text: string) { setSuccess(text); window.setTimeout(() => setSuccess(""), 3000); }
  function resetForm() { setEditingId(""); setMemberQuery(""); setForm(blankForm()); }

  function selectType(type: "revenue" | "expense" | "adjustment") {
    const first = heads.find((h) => h.kind === type && h.isActive);
    setForm({ ...form, type, direction: type === "expense" ? "debit" : type === "revenue" ? "credit" : form.direction, category: first?.name || (type === "expense" ? "Office Expense" : type === "adjustment" ? "Adjustment" : "Annual Membership Fee"), amount: first?.defaultAmount != null ? String(first.defaultAmount) : "" });
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
      const amount = Number(form.amount);
      if (!form.partyName.trim()) throw new Error("Enter payer / payee name.");
      if (!form.category.trim()) throw new Error("Select a finance head.");
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid amount greater than zero.");
      if (form.category.trim().toLowerCase() === "contribution" && form.description.trim().length < 3) throw new Error("For Contribution, write its purpose in Remarks / Purpose.");
      const payload = { ...form, amount, memberId: form.memberId || null, handledByAssignmentId: form.handledByAssignmentId || null, direction: form.type === "expense" ? "debit" as const : form.type === "revenue" ? "credit" as const : form.direction };
      if (editingId) await updateFinanceTransaction(editingId, payload); else await createFinanceTransaction(payload);
      const wasEdit = Boolean(editingId); resetForm(); await load(); flash(wasEdit ? "Ledger entry updated. Serial and document number were preserved." : "Ledger entry posted with permanent serial/document number.");
    } catch (e: any) { setError(e?.message || "Could not save finance transaction."); }
    finally { setSaving(false); }
  }

  function editRow(row: FinanceLedgerRow) {
    if (row.source !== "ledger" || row.status === "void") return;
    const officer = officers.find((o) => o.memberId === row.handledByMemberId && (!row.handledByRole || o.role === row.handledByRole));
    setEditingId(row.id); setMemberQuery(row.member?.fullName || row.partyName);
    setForm({ type: row.type, direction: row.direction, memberId: row.memberId || "", partyName: row.partyName, category: row.category, amount: String(row.amount), paymentMethod: row.paymentMethod || "Cash", cashBookNo: row.cashBookNo || "", externalReference: row.externalReference || "", description: row.description || "", transactionDate: dateOnly(row.transactionDate), handledByAssignmentId: officer?.id || "" });
    window.scrollTo({top:0,behavior:"smooth"});
  }

  async function downloadPdf(row: FinanceLedgerRow) {
    try {
      const response = await fetch(financeReceiptUrl(row.id), { headers: { Authorization: `Bearer ${sessionStorage.getItem("araian_admin_token") || ""}` } });
      if (!response.ok) throw new Error("Receipt / voucher PDF could not be generated.");
      const blob = await response.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = `${row.receiptNo || row.voucherNo || row.transactionNo}.pdf`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e: any) { setError(e?.message || "PDF download failed."); }
  }

  return <div style={{minHeight:"100vh",background:BG,fontFamily:"Lato,Arial,sans-serif",color:"#333"}}>
    <style>{`@media(max-width:850px){.finance-main{padding:16px!important}.finance-grid{grid-template-columns:1fr!important}.finance-cards{grid-template-columns:1fr!important}.finance-table{min-width:1100px}.finance-header{padding:18px 16px!important}.finance-actions{width:100%}}`}</style>
    <header className="finance-header" style={{background:DARK,color:"white",borderBottom:`3px solid ${GOLD}`,padding:"22px 6vw",display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}><div><h1 style={{fontFamily:"Playfair Display,Georgia,serif",fontSize:28,margin:0}}>Governance & Operations Center</h1><p style={{margin:"5px 0 0",opacity:.78,fontSize:12}}>Finance Ledger · receipts, contributions, expenses, adjustments and audit trail</p></div><div className="finance-actions" style={{display:"flex",gap:8}}><button style={{...secondary,background:"transparent",color:"white",borderColor:"rgba(255,255,255,.3)"}} onClick={()=>location.assign("/admin/operations")}><ArrowLeft size={14}/> Governance</button><button style={{...secondary,background:"transparent",color:"white",borderColor:"rgba(255,255,255,.3)"}} onClick={()=>location.assign("/admin")}><ArrowLeft size={14}/> Main Admin</button></div></header>
    <main className="finance-main" style={{padding:"24px 6vw 60px"}}>
      {error&&<div style={{padding:"11px 14px",borderRadius:9,background:"#fee2e2",color:"#991b1b",marginBottom:14,fontSize:12,fontWeight:700}}>{error}</div>}
      {success&&<div style={{padding:"11px 14px",borderRadius:9,background:"#dcfce7",color:"#166534",marginBottom:14,fontSize:12,fontWeight:700}}>{success}</div>}
      <div className="finance-cards" style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:12,marginBottom:18}}><MoneyCard title="Total Credits / Revenue" value={summary.credits} icon={CircleDollarSign}/><MoneyCard title="Total Debits / Expenses" value={summary.debits} icon={ReceiptText}/><MoneyCard title="Current Ledger Balance" value={summary.balance} icon={Landmark}/></div>
      <section style={{...panel,marginBottom:18}}><div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start",flexWrap:"wrap"}}><div><h2 style={{color:GREEN,fontFamily:"Playfair Display,serif",margin:"0 0 5px"}}>{editingId?"Edit Posted Ledger Entry":"Post Revenue, Expense or Adjustment"}</h2><p style={{fontSize:12,color:"#777",margin:"0 0 14px"}}>Annual membership defaults to Rs. 1,000, life membership to Rs. 3,000 and Executive Committee annual contribution to Rs. 12,000. Amounts remain editable for instalments. Serial/document numbers stay permanent.</p></div>{editingId&&<span style={{padding:"4px 9px",background:"#dcfce7",color:"#166534",borderRadius:999,fontSize:11,fontWeight:800}}>Editing posted entry</span>}</div>
        <div className="finance-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:12}}>
          <Field title="Transaction"><select disabled={!!editingId} style={{...field,background:editingId?"#f5f5f5":"#fff"}} value={form.type} onChange={(e)=>selectType(e.target.value as any)}><option value="revenue">Revenue / Receipt</option><option value="expense">Expense / Payment</option><option value="adjustment">Adjustment (+ / -)</option></select></Field>
          {form.type==="adjustment"&&<Field title="Adjustment direction"><select disabled={!!editingId} style={field} value={form.direction} onChange={(e)=>setForm({...form,direction:e.target.value as any})}><option value="credit">Plus / Credit</option><option value="debit">Minus / Debit</option></select></Field>}
          <Field title="Search & link approved member (optional)"><input style={{...field,marginBottom:6}} placeholder="Type 3+ letters: Khalid, Shouq, member no..." value={memberQuery} onChange={(e)=>setMemberQuery(e.target.value)}/><select style={field} value={form.memberId} onChange={(e)=>selectMember(e.target.value)}><option value="">No member link ({visibleMembers.length} matching)</option>{visibleMembers.map((m)=><option key={m.id} value={m.id}>{m.fullName} · {m.memberNo}</option>)}</select></Field>
          <Field title="Name / payer / payee"><input style={field} value={form.partyName} onChange={(e)=>setForm({...form,partyName:e.target.value})}/></Field>
          <Field title="Finance head / category"><div style={{display:"flex",gap:6}}><select style={field} value={form.category} onChange={(e)=>selectHead(e.target.value)}>{!visibleHeads.some(h=>h.name===form.category)&&form.category&&<option value={form.category}>{form.category}</option>}{visibleHeads.map((h)=><option key={h.id} value={h.name}>{h.name}{h.defaultAmount!=null?` · ${money(h.defaultAmount)}`:""}</option>)}</select><button style={{...secondary,padding:"8px 10px",whiteSpace:"nowrap"}} onClick={()=>setShowHeadForm(v=>!v)}><Plus size={13}/> Head</button></div></Field>
          <Field title="Amount"><input type="number" min="0" step="0.01" style={field} value={form.amount} onChange={(e)=>setForm({...form,amount:e.target.value})}/></Field>
          <Field title="Cash / C-in-book No."><input style={field} value={form.cashBookNo} onChange={(e)=>setForm({...form,cashBookNo:e.target.value})}/></Field>
          <Field title="Payment method"><select style={field} value={form.paymentMethod} onChange={(e)=>setForm({...form,paymentMethod:e.target.value})}><option>Cash</option><option>Bank Transfer</option><option>Cheque</option><option>Online</option><option>Other</option></select></Field>
          <Field title="Date"><input type="date" style={field} value={form.transactionDate} onChange={(e)=>setForm({...form,transactionDate:e.target.value})}/></Field>
          <Field title={form.type==="expense"||form.direction==="debit"?"Paid / authorized by":"Payment received by"}><select style={field} value={form.handledByAssignmentId} onChange={(e)=>setForm({...form,handledByAssignmentId:e.target.value})}><option value="">Current logged-in administrator</option>{officers.map((o)=><option key={o.id} value={o.id}>{o.name} · {o.role}{o.unit?` · ${o.unit}`:""}</option>)}</select>{!officers.length&&<small style={{display:"block",color:"#999",marginTop:5}}>Assign Finance Secretary / Assistant Finance Secretary in Governance Members & Roles to list them here.</small>}</Field>
          <Field title="External reference"><input style={field} value={form.externalReference} onChange={(e)=>setForm({...form,externalReference:e.target.value})}/></Field>
        </div>
        {showHeadForm&&<div style={{background:BG,border:`1px solid ${BORDER}`,borderRadius:10,padding:12,marginTop:12}}><strong style={{color:GREEN,fontSize:12}}>Create reusable {form.type} head</strong><div className="finance-grid" style={{display:"grid",gridTemplateColumns:"1.2fr .7fr 1.5fr",gap:8,marginTop:8}}><input style={field} placeholder="New head name" value={newHead.name} onChange={(e)=>setNewHead({...newHead,name:e.target.value})}/><input style={field} type="number" min="0" placeholder="Default amount (optional)" value={newHead.defaultAmount} onChange={(e)=>setNewHead({...newHead,defaultAmount:e.target.value})}/><input style={field} placeholder="Head note / purpose" value={newHead.notes} onChange={(e)=>setNewHead({...newHead,notes:e.target.value})}/></div><div style={{display:"flex",gap:7,marginTop:8}}><button style={primary} onClick={()=>void saveHead()}><Save size={13}/> Save Head</button><button style={secondary} onClick={()=>setShowHeadForm(false)}>Cancel</button></div></div>}
        <div style={{marginTop:12}}><Field title="Remarks / purpose"><textarea style={{...field,minHeight:72}} placeholder={form.category==="Contribution"?"Required: what is this contribution for?":"Details printed on receipt / voucher"} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})}/></Field></div>
        <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}><button disabled={saving} style={{...primary,opacity:saving?.6:1}} onClick={()=>void saveTransaction()}><Save size={14}/> {editingId?"Update Ledger Entry":"Post to Ledger"}</button>{editingId&&<button style={secondary} onClick={resetForm}>Cancel Edit</button>}</div>
      </section>
      <section style={panel}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:12}}><div><h2 style={{color:GREEN,fontFamily:"Playfair Display,serif",margin:0}}>One-Page Ledger</h2><small style={{color:"#888"}}>Fuzzy search works from short name fragments and tolerates small spelling errors.</small></div><div style={{display:"flex",gap:7,flexWrap:"wrap"}}><input style={{...field,width:280}} placeholder="Search name, head, receipt, member no..." value={ledgerQuery} onChange={(e)=>setLedgerQuery(e.target.value)}/><select style={{...field,width:150}} value={ledgerType} onChange={(e)=>setLedgerType(e.target.value)}><option value="all">All</option><option value="revenue">Revenue</option><option value="expense">Expense</option><option value="adjustment">Adjustments</option></select><button style={secondary} onClick={()=>void load()}><RefreshCw size={13}/> Refresh</button></div></div>
        {loading?<div style={{padding:30,textAlign:"center",color:"#777"}}>Loading finance records...</div>:<div style={{overflowX:"auto"}}><table className="finance-table" style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{background:BG}}>{["S.No.","Date","Party","Head / Remarks","Receipt / Voucher","Cash Book","Credit","Debit","Received / Paid By","Action"].map(h=><th key={h} style={{padding:10,textAlign:"left",color:"#777",fontSize:10,textTransform:"uppercase"}}>{h}</th>)}</tr></thead><tbody>{ledger.map((r)=><tr key={r.id} style={{borderTop:`1px solid ${BORDER}`,opacity:r.status==="void"?.45:1}}><td style={{padding:10}}>{r.serialNo??"Legacy"}</td><td style={{padding:10}}>{shownDate(r.transactionDate)}</td><td style={{padding:10}}><strong>{r.partyName}</strong>{r.member?.memberNo&&<small style={{display:"block",color:"#999"}}>{r.member.memberNo}</small>}</td><td style={{padding:10}}><strong>{r.category}</strong>{r.description&&<small style={{display:"block",color:"#888",maxWidth:240}}>{r.description}</small>}</td><td style={{padding:10}}>{r.receiptNo||r.voucherNo||r.transactionNo}</td><td style={{padding:10}}>{r.cashBookNo||"-"}</td><td style={{padding:10,color:GREEN,fontWeight:800}}>{r.direction==="credit"?money(r.amount):"-"}</td><td style={{padding:10,color:"#b42318",fontWeight:800}}>{r.direction==="debit"?money(r.amount):"-"}</td><td style={{padding:10}}>{r.handledByName||r.issuedByName||"Legacy"}<small style={{display:"block",color:"#999"}}>{r.handledByRole||r.issuedByRole?.replace(/_/g," ")||""}</small></td><td style={{padding:10}}><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{r.source==="ledger"&&r.status!=="void"&&<button style={secondary} onClick={()=>editRow(r)}><Edit2 size={12}/> Edit</button>}{r.source==="ledger"&&<button style={secondary} onClick={()=>void downloadPdf(r)}><Download size={12}/> PDF</button>}{r.source==="ledger"&&r.status!=="void"&&<button style={secondary} onClick={async()=>{const reason=prompt("Reason for voiding this transaction?");if(reason&&reason.trim().length>=3){await voidFinanceTransaction(r.id,reason.trim());await load();}}}><Trash2 size={12}/> Void</button>}</div></td></tr>)}{!ledger.length&&<tr><td colSpan={10} style={{padding:30,textAlign:"center",color:"#888"}}>No ledger entries found.</td></tr>}</tbody></table></div>}
      </section>
    </main>
  </div>;
}

function MoneyCard({title,value,icon:Icon}:{title:string;value:number;icon:any}) { return <div style={panel}><Icon size={20} color={GOLD}/><p style={{fontSize:11,color:"#777",textTransform:"uppercase",fontWeight:800,margin:"10px 0 4px"}}>{title}</p><strong style={{fontFamily:"Playfair Display,serif",color:GREEN,fontSize:24}}>{money(value)}</strong></div>; }
