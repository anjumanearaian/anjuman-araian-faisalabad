import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router";
import { Briefcase, CheckCircle, Eye, FileText, Search, UserCheck, UserX, X } from "lucide-react";
import { useAdmin } from "../context/AdminContext";
import {
  Business,
  BusinessStatus,
  PaymentStatus,
  businessStatusColors,
  deleteBusiness,
  fetchAllBusinesses,
  paymentStatusColors,
  sponsorshipPackages,
  updateBusinessStatus,
} from "../lib/businessStore";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

function isPdf(url?: string | null) {
  return /\.pdf(?:$|\?)/i.test(String(url || ""));
}

export function AdminBusinessCenterPage() {
  const { isAdmin, role } = useAdmin();
  const allowed = ["admin", "super_admin", "welfare_manager"].includes(String(role || ""));
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BusinessStatus>("pending");
  const [selected, setSelected] = useState<Business | null>(null);
  const [rejecting, setRejecting] = useState<Business | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetchAllBusinesses(1, 100, true);
      setBusinesses(res.data || []);
      if (selected) {
        const fresh = (res.data || []).find((x) => x.id === selected.id);
        setSelected(fresh || null);
      }
    } catch (e: any) {
      setError(e?.message || "Could not load business submissions.");
    } finally { setLoading(false); }
  };

  useEffect(() => { if (isAdmin && allowed) void load(); }, [isAdmin, allowed]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return businesses.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (!q) return true;
      return [b.businessName, b.ownerName, b.category, b.city, b.phone, b.email]
        .some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [businesses, query, statusFilter]);

  if (!isAdmin) return <Navigate to="/admin" replace />;
  if (!allowed) return <Navigate to="/admin" replace />;

  const confirmSlipAndApprove = async (b: Business) => {
    if (!b.paymentProofUrl && !window.confirm("No payment slip is attached. Approve this listing anyway and mark payment as received?")) return;
    setBusyId(b.id); setError("");
    try {
      // "received" means the listing admin has checked the uploaded slip. Final
      // finance verification and ledger posting remain in the Finance Center.
      await updateBusinessStatus(b.id, "approved", "received", "Business profile and uploaded payment proof reviewed by admin. Finance verification remains separate.");
      setSelected(null);
      await load();
    } catch (e: any) {
      setError(e?.message || "Could not approve the business listing.");
    } finally { setBusyId(null); }
  };

  const reject = async () => {
    if (!rejecting) return;
    setBusyId(rejecting.id); setError("");
    try {
      await updateBusinessStatus(rejecting.id, "rejected", "rejected", rejectReason.trim() || "Business submission rejected by admin.");
      setRejecting(null); setRejectReason(""); setSelected(null);
      await load();
    } catch (e: any) {
      setError(e?.message || "Could not reject the business listing.");
    } finally { setBusyId(null); }
  };

  const setPayment = async (b: Business, paymentStatus: PaymentStatus) => {
    setBusyId(b.id); setError("");
    try {
      await updateBusinessStatus(b.id, b.status, paymentStatus);
      await load();
    } catch (e: any) {
      setError(e?.message || "Could not update payment status.");
    } finally { setBusyId(null); }
  };

  const remove = async (b: Business) => {
    if (!window.confirm(`Permanently delete ${b.businessName}?`)) return;
    setBusyId(b.id); setError("");
    try { await deleteBusiness(b.id); setSelected(null); await load(); }
    catch (e: any) { setError(e?.message || "Could not delete business."); }
    finally { setBusyId(null); }
  };

  const counts = {
    all: businesses.length,
    pending: businesses.filter((x) => x.status === "pending").length,
    approved: businesses.filter((x) => x.status === "approved").length,
    rejected: businesses.filter((x) => x.status === "rejected").length,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8f5ef", padding: "28px 22px 70px", fontFamily: "Lato, sans-serif" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
          <div>
            <div style={{ color: GOLD, fontWeight: 800, fontSize: 12, textTransform: "uppercase", letterSpacing: ".08em" }}>Admin Control Center</div>
            <h1 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", margin: "5px 0 5px", fontSize: 30 }}>Business Directory</h1>
            <p style={{ color: "#666", margin: 0, maxWidth: 720, lineHeight: 1.6 }}>Review customer submissions, inspect payment slips, approve public listings, reject incomplete profiles, or create a business manually.</p>
          </div>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            <Link to="/admin" style={secondaryBtn}>← Admin Dashboard</Link>
            <Link to="/admin/finance" style={secondaryBtn}>Finance Verification</Link>
            <Link to="/admin/businesses/add" style={primaryBtn}>+ Add Business Manually</Link>
          </div>
        </div>

        {error && <div style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca", padding: "12px 14px", borderRadius: 10, marginBottom: 16, fontWeight: 700 }}>{error}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 18 }}>
          {(["all", "pending", "approved", "rejected"] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{ background: statusFilter === s ? GREEN : "white", color: statusFilter === s ? "white" : GREEN, border: `1px solid ${statusFilter === s ? GREEN : "#e5e1d8"}`, borderRadius: 12, padding: 15, cursor: "pointer", textAlign: "left", boxShadow: "0 2px 10px rgba(0,0,0,.04)" }}>
              <div style={{ fontSize: 12, textTransform: "capitalize", opacity: .8 }}>{s === "all" ? "All Businesses" : s}</div>
              <strong style={{ fontSize: 25 }}>{counts[s]}</strong>
            </button>
          ))}
        </div>

        <div style={{ background: "white", borderRadius: 14, boxShadow: "0 3px 16px rgba(0,0,0,.05)", overflow: "hidden" }}>
          <div style={{ padding: 16, borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: "1 1 300px", maxWidth: 520 }}>
              <Search size={16} color="#888" style={{ position: "absolute", left: 12, top: 11 }} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search business, owner, category, city, phone..." style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px 10px 38px", border: "1px solid #ddd", borderRadius: 9, fontSize: 13 }} />
            </div>
            <button onClick={() => void load()} style={secondaryButton}>Refresh</button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
              <thead><tr style={{ background: "#faf8f3" }}>{["Business", "Owner / Contact", "Location", "Package", "Listing", "Payment", "Actions"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map((b, i) => {
                  const sc = businessStatusColors[b.status];
                  const pc = paymentStatusColors[b.paymentStatus] || paymentStatusColors.pending;
                  return <tr key={b.id} style={{ borderTop: "1px solid #eee", background: i % 2 ? "#fdfdfc" : "white" }}>
                    <td style={td}><div style={{ display: "flex", gap: 10, alignItems: "center" }}>{b.logoUrl ? <img src={b.logoUrl} alt="" style={{ width: 42, height: 42, borderRadius: 8, objectFit: "contain", border: "1px solid #eee" }} /> : <div style={{ width: 42, height: 42, borderRadius: 8, background: "#f0f7f3", display: "grid", placeItems: "center" }}><Briefcase size={18} color={GREEN}/></div>}<div><strong style={{ color: GREEN }}>{b.businessName}</strong><div style={{ color: "#888", fontSize: 11 }}>{b.category}</div></div></div></td>
                    <td style={td}><div>{b.ownerName}</div><div style={{ color: "#888", fontSize: 11 }}>{b.phone}</div></td>
                    <td style={td}>{b.city}</td>
                    <td style={td}><span style={{ border: `1px solid ${GOLD}`, color: "#8a6818", borderRadius: 20, padding: "3px 8px", fontSize: 11, fontWeight: 800 }}>{sponsorshipPackages[b.sponsorshipPackage]?.name || b.sponsorshipPackage}</span></td>
                    <td style={td}><span style={{ background: sc.bg, color: sc.text, borderRadius: 20, padding: "4px 9px", fontSize: 11, fontWeight: 800 }}>{sc.label}</span></td>
                    <td style={td}><span style={{ background: pc.bg, color: pc.text, borderRadius: 20, padding: "4px 9px", fontSize: 11, fontWeight: 800 }}>{pc.label}</span></td>
                    <td style={td}><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><button onClick={() => setSelected(b)} style={smallBtn}><Eye size={13}/> View</button>{b.status === "pending" && <><button disabled={busyId === b.id} onClick={() => void confirmSlipAndApprove(b)} style={{ ...smallBtn, color: "#166534", borderColor: "#bbf7d0" }}><UserCheck size={13}/> Approve</button><button disabled={busyId === b.id} onClick={() => { setRejecting(b); setRejectReason(""); }} style={{ ...smallBtn, color: "#991b1b", borderColor: "#fecaca" }}><UserX size={13}/> Reject</button></>}</div></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
          {!loading && filtered.length === 0 && <div style={{ padding: 48, textAlign: "center", color: "#999" }}>No businesses found in this view.</div>}
          {loading && <div style={{ padding: 48, textAlign: "center", color: "#777" }}>Loading business submissions...</div>}
        </div>
      </div>

      {selected && <div style={overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}><div style={modal}>
        <div style={{ background: GREEN, color: "white", padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><div><h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 22 }}>{selected.businessName}</h2><div style={{ opacity: .75, fontSize: 12 }}>{selected.category} · {selected.city}</div></div><button onClick={() => setSelected(null)} style={closeBtn}><X size={20}/></button></div>
        <div style={{ padding: 22 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginBottom: 20 }}>
            <Info label="Owner / Member" value={selected.ownerName}/><Info label="Phone" value={selected.phone}/><Info label="WhatsApp" value={selected.whatsapp || "—"}/><Info label="Email" value={selected.email || "—"}/><Info label="Website" value={selected.website || "—"}/><Info label="Address" value={selected.address || "—"}/><Info label="Package" value={sponsorshipPackages[selected.sponsorshipPackage]?.name || selected.sponsorshipPackage}/><Info label="Listing Status" value={businessStatusColors[selected.status].label}/>
          </div>
          <InfoBlock label="Business Description" value={selected.description || "—"}/><InfoBlock label="Products / Services" value={selected.productsServices || "—"}/><InfoBlock label="Member Discount / Offer" value={selected.discountOffer || "—"}/>

          <div style={{ marginTop: 20, padding: 16, background: "#fffaf0", border: "1px solid #ead7a6", borderRadius: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><div><strong style={{ color: GREEN }}>Payment Slip Review</strong><div style={{ color: "#777", fontSize: 12, marginTop: 3 }}>Customer slip can be reviewed here. Final accounting verification remains in the Finance Center.</div></div><span style={{ background: (paymentStatusColors[selected.paymentStatus] || paymentStatusColors.pending).bg, color: (paymentStatusColors[selected.paymentStatus] || paymentStatusColors.pending).text, borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 800 }}>{(paymentStatusColors[selected.paymentStatus] || paymentStatusColors.pending).label}</span></div>
            {selected.paymentProofUrl ? <div style={{ marginTop: 14 }}>{isPdf(selected.paymentProofUrl) ? <a href={selected.paymentProofUrl} target="_blank" rel="noreferrer" style={proofLink}><FileText size={18}/> Open Payment Slip PDF</a> : <a href={selected.paymentProofUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block" }}><img src={selected.paymentProofUrl} alt="Payment slip" style={{ maxWidth: "100%", maxHeight: 320, objectFit: "contain", borderRadius: 8, border: "1px solid #ddd", background: "white" }}/></a>}</div> : <div style={{ marginTop: 12, color: "#991b1b", fontSize: 12, fontWeight: 700 }}>No payment slip attached.</div>}
            <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}><label style={{ color: "#666", fontSize: 12, fontWeight: 700 }}>Admin payment review:</label><select disabled={busyId === selected.id} value={selected.paymentStatus} onChange={(e) => void setPayment(selected, e.target.value as PaymentStatus)} style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid #ddd" }}><option value="pending">Pending</option><option value="submitted">Slip Submitted</option><option value="received">Received / Admin Checked</option><option value="rejected">Rejected</option>{selected.paymentStatus === "verified" && <option value="verified">Finance Verified</option>}</select><Link to="/admin/finance" style={{ ...proofLink, padding: "7px 10px" }}>Open Finance Verification</Link></div>
          </div>

          {selected.additionalPhotos?.length ? <div style={{ marginTop: 20 }}><strong style={{ color: GREEN }}>Business Photos / Documents</strong><div style={{ display: "flex", gap: 10, overflowX: "auto", marginTop: 10 }}>{selected.additionalPhotos.map((src, i) => isPdf(src) ? <a key={i} href={src} target="_blank" rel="noreferrer" style={proofLink}><FileText size={16}/> Document {i + 1}</a> : <a key={i} href={src} target="_blank" rel="noreferrer"><img src={src} alt="" style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 8, border: "1px solid #ddd" }}/></a>)}</div></div> : null}

          <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 22 }}>{selected.status === "pending" && <><button disabled={busyId === selected.id} onClick={() => void confirmSlipAndApprove(selected)} style={approveBtn}><CheckCircle size={15}/> Confirm Slip & Approve Listing</button><button disabled={busyId === selected.id} onClick={() => { setRejecting(selected); setRejectReason(""); }} style={rejectBtn}><UserX size={15}/> Reject</button></>}<button onClick={() => void remove(selected)} style={secondaryButton}>Delete</button><button onClick={() => setSelected(null)} style={secondaryButton}>Close</button></div>
        </div>
      </div></div>}

      {rejecting && <div style={overlay}><div style={{ ...modal, maxWidth: 500 }}><div style={{ padding: 24 }}><h3 style={{ color: "#991b1b", marginTop: 0 }}>Reject Business Listing</h3><p style={{ color: "#555" }}>Rejecting <strong>{rejecting.businessName}</strong></p><textarea rows={4} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection..." style={{ width: "100%", boxSizing: "border-box", padding: 11, border: "1px solid #ddd", borderRadius: 8, resize: "vertical" }}/><div style={{ display: "flex", gap: 8, marginTop: 14 }}><button disabled={busyId === rejecting.id} onClick={() => void reject()} style={rejectBtn}>Confirm Rejection</button><button onClick={() => setRejecting(null)} style={secondaryButton}>Cancel</button></div></div></div></div>}
    </div>
  );
}

function Info({label,value}:{label:string;value:any}){return <div style={{ background: "#fafafa", border: "1px solid #eee", borderRadius: 9, padding: 11 }}><div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", fontWeight: 800, letterSpacing: ".05em" }}>{label}</div><div style={{ marginTop: 4, color: "#333", fontSize: 13, wordBreak: "break-word" }}>{String(value || "—")}</div></div>}
function InfoBlock({label,value}:{label:string;value:any}){return <div style={{ marginTop: 12 }}><div style={{ color: GREEN, fontSize: 12, fontWeight: 800 }}>{label}</div><div style={{ color: "#555", lineHeight: 1.65, marginTop: 4, whiteSpace: "pre-wrap" }}>{String(value || "—")}</div></div>}

const th: React.CSSProperties = { padding: "13px 12px", textAlign: "left", color: "#777", fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "12px", fontSize: 12, color: "#444", verticalAlign: "middle" };
const smallBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, background: "white", border: "1px solid #ddd", borderRadius: 7, padding: "6px 9px", cursor: "pointer", color: GREEN, fontWeight: 800, fontSize: 11 };
const primaryBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", background: GREEN, color: "white", borderRadius: 8, padding: "10px 13px", textDecoration: "none", fontWeight: 800, fontSize: 12 };
const secondaryBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", background: "white", color: GREEN, border: "1px solid #d9dedb", borderRadius: 8, padding: "10px 13px", textDecoration: "none", fontWeight: 800, fontSize: 12 };
const secondaryButton: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5, background: "#f3f4f6", color: "#444", border: "1px solid #ddd", borderRadius: 8, padding: "9px 12px", cursor: "pointer", fontWeight: 800, fontSize: 12 };
const approveBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, background: "#15803d", color: "white", border: "none", borderRadius: 8, padding: "10px 14px", cursor: "pointer", fontWeight: 800, fontSize: 12 };
const rejectBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, background: "#b91c1c", color: "white", border: "none", borderRadius: 8, padding: "10px 14px", cursor: "pointer", fontWeight: 800, fontSize: 12 };
const proofLink: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, color: GREEN, fontWeight: 800, textDecoration: "none", border: "1px solid #cfd8d2", borderRadius: 8, padding: "9px 12px", background: "white", fontSize: 12 };
const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" };
const modal: React.CSSProperties = { background: "white", borderRadius: 14, width: "100%", maxWidth: 860, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 22px 70px rgba(0,0,0,.25)" };
const closeBtn: React.CSSProperties = { background: "transparent", border: 0, color: "white", cursor: "pointer", display: "grid", placeItems: "center" };
