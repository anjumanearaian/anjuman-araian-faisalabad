import { useEffect, useState } from "react";
import { Link } from "react-router";
import { PageHeader } from "../components/PageHeader";
import { PasswordlessSignIn } from "../components/PasswordlessSignIn";
import { CheckCircle, Clock, Heart, ShieldCheck, XCircle, ArrowLeft, Phone } from "lucide-react";
import { fetchMyMatchRequests, MatchRequestView, respondToMatchRequest } from "../lib/matrimonialStore";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

export function MatrimonialRequestsPage() {
  const [authenticated, setAuthenticated] = useState(() => Boolean(localStorage.getItem("araian_member_token")));
  const [requests, setRequests] = useState<MatchRequestView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    if (!authenticated) return;
    setLoading(true);
    setError("");
    try {
      setRequests(await fetchMyMatchRequests());
    } catch (e: any) {
      if (e?.status === 401) {
        localStorage.removeItem("araian_member_token");
        setAuthenticated(false);
      } else {
        setError(e?.message || "Could not load your match requests.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [authenticated]);

  const respond = async (id: string, decision: "accept" | "decline") => {
    if (decision === "accept" && !confirm("Accept this match request? Your contact details and the requester's contact details will then be released to both sides.")) return;
    if (decision === "decline" && !confirm("Decline this match request? No contact details will be shared.")) return;
    setBusyId(id);
    setError("");
    try {
      await respondToMatchRequest(id, decision);
      await load();
    } catch (e: any) {
      setError(e?.message || "Could not update this request.");
    } finally {
      setBusyId(null);
    }
  };

  if (!authenticated) {
    return (
      <div>
        <PageHeader title="Matrimonial Match Requests" subtitle="Private, consent-based matching" breadcrumb={["Home", "Matrimonial", "Requests"]} />
        <section style={{ maxWidth: 500, margin: "48px auto", padding: "0 24px" }}>
          <div style={{ background: "white", borderRadius: 14, padding: 32, boxShadow: "0 6px 30px rgba(0,0,0,.08)" }}>
            <ShieldCheck size={28} color={GREEN} />
            <h2 style={{ color: GREEN, margin: "14px 0 8px", fontFamily: "'Playfair Display', serif" }}>Verify your account</h2>
            <p style={{ color: "#666", fontSize: 14, lineHeight: 1.7 }}>Use the same verified email/Google account used for your matrimonial profile. Requests and contact details are visible only to the relevant profile owners and authorized administrators.</p>
            <PasswordlessSignIn onAuthenticated={() => setAuthenticated(true)} compact />
          </div>
        </section>
      </div>
    );
  }

  const incoming = requests.filter((r) => r.direction === "incoming");
  const outgoing = requests.filter((r) => r.direction === "outgoing");

  return (
    <div>
      <PageHeader title="Matrimonial Match Requests" subtitle="Admin-reviewed and consent-based contact exchange" breadcrumb={["Home", "Matrimonial", "Requests"]} />
      <section style={{ maxWidth: 980, margin: "0 auto", padding: "36px 20px 60px" }}>
        <Link to="/member/portal" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: GREEN, textDecoration: "none", fontSize: 13, fontWeight: 700, marginBottom: 18 }}><ArrowLeft size={15} /> Back to Member Portal</Link>

        <div style={{ background: "#f0f7f3", border: "1px solid rgba(26,77,46,.15)", borderRadius: 12, padding: "16px 18px", display: "flex", gap: 10, marginBottom: 24 }}>
          <ShieldCheck size={20} color={GREEN} style={{ flexShrink: 0 }} />
          <p style={{ margin: 0, color: "#4b5563", fontSize: 13, lineHeight: 1.7 }}><strong style={{ color: GREEN }}>Privacy rule:</strong> basic profile information is visible before consent. Contact details are released only after the administrator forwards the request and the receiving profile accepts it.</p>
        </div>

        {error && <div style={{ background: "#fee2e2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 8, padding: "11px 14px", marginBottom: 18, fontSize: 13 }}>{error}</div>}
        {loading && <div style={{ color: "#777", padding: 20 }}>Loading requests...</div>}

        {!loading && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }} className="request-cols">
            <RequestColumn title={`Incoming Requests (${incoming.length})`} requests={incoming} busyId={busyId} onRespond={respond} />
            <RequestColumn title={`Outgoing Requests (${outgoing.length})`} requests={outgoing} busyId={busyId} onRespond={respond} />
          </div>
        )}
      </section>
      <style>{`@media (max-width: 800px) { .request-cols { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

function RequestColumn({ title, requests, busyId, onRespond }: { title: string; requests: MatchRequestView[]; busyId: string | null; onRespond: (id: string, decision: "accept" | "decline") => void }) {
  return (
    <div>
      <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 19, margin: "0 0 14px" }}>{title}</h3>
      <div style={{ display: "grid", gap: 14 }}>
        {requests.map((r) => <RequestCard key={r.id} request={r} busy={busyId === r.id} onRespond={onRespond} />)}
        {requests.length === 0 && <div style={{ background: "white", border: "1px solid #eee", borderRadius: 12, padding: 30, textAlign: "center", color: "#aaa" }}><Heart size={28} style={{ margin: "0 auto 8px" }} /><p style={{ margin: 0, fontSize: 13 }}>No requests here yet.</p></div>}
      </div>
    </div>
  );
}

function RequestCard({ request: r, busy, onRespond }: { request: MatchRequestView; busy: boolean; onRespond: (id: string, decision: "accept" | "decline") => void }) {
  const p = r.counterpart;
  const status = statusMeta(r.status);
  const accepted = r.status === "accepted" && Boolean(r.contactReleasedAt);
  return (
    <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 18, boxShadow: "0 2px 8px rgba(0,0,0,.03)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 12, alignItems: "flex-start" }}>
        <div><div style={{ color: GREEN, fontWeight: 800, fontSize: 14 }}>{p.profileCode || p.id.slice(0, 8)}</div><div style={{ color: "#777", fontSize: 12, marginTop: 3, textTransform: "capitalize" }}>{p.gender} · {p.age} years · {p.city}</div></div>
        <span style={{ background: status.bg, color: status.color, borderRadius: 20, padding: "4px 9px", fontSize: 10, fontWeight: 800 }}>{status.label}</span>
      </div>
      <div style={{ color: "#4b5563", fontSize: 13, lineHeight: 1.7 }}><div><strong>Education:</strong> {p.education}</div><div><strong>Profession:</strong> {p.profession}</div></div>
      {r.requesterMessage && <div style={{ marginTop: 10, background: "#f8fafc", borderRadius: 7, padding: 10, color: "#555", fontSize: 12 }}><strong>Message:</strong> {r.requesterMessage}</div>}

      {accepted && (
        <div style={{ marginTop: 12, background: "#dcfce7", border: "1px solid #86efac", borderRadius: 8, padding: 11, color: "#166534", fontSize: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}><CheckCircle size={13} style={{ verticalAlign: "middle", marginRight: 5 }} /> Mutual consent completed</div>
          {p.name && <div><strong>Name:</strong> {p.name}</div>}
          {p.contact && <div style={{ marginTop: 3 }}><Phone size={12} style={{ verticalAlign: "middle", marginRight: 5 }} /><strong>Contact:</strong> {p.contact}</div>}
        </div>
      )}

      {r.direction === "incoming" && r.status === "awaiting_target" && (
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button disabled={busy} onClick={() => onRespond(r.id, "accept")} style={{ flex: 1, background: GREEN, color: "white", border: 0, borderRadius: 7, padding: "9px 8px", fontWeight: 700, cursor: busy ? "wait" : "pointer" }}><CheckCircle size={14} style={{ verticalAlign: "middle", marginRight: 5 }} /> Accept</button>
          <button disabled={busy} onClick={() => onRespond(r.id, "decline")} style={{ flex: 1, background: "#fff", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: 7, padding: "9px 8px", fontWeight: 700, cursor: busy ? "wait" : "pointer" }}><XCircle size={14} style={{ verticalAlign: "middle", marginRight: 5 }} /> Decline</button>
        </div>
      )}
      {r.status === "pending_admin" && <div style={{ marginTop: 12, color: "#8a6118", fontSize: 12 }}><Clock size={13} style={{ verticalAlign: "middle", marginRight: 5 }} /> Waiting for admin review.</div>}
    </div>
  );
}

function statusMeta(status: string) {
  if (status === "accepted") return { label: "Accepted", bg: "#dcfce7", color: "#166534" };
  if (status === "awaiting_target") return { label: "Awaiting Consent", bg: "#dbeafe", color: "#1d4ed8" };
  if (status === "declined" || status === "rejected") return { label: status === "declined" ? "Declined" : "Admin Rejected", bg: "#fee2e2", color: "#b91c1c" };
  if (status === "closed") return { label: "Closed", bg: "#f3f4f6", color: "#4b5563" };
  return { label: "Admin Review", bg: "#fef9c3", color: "#854d0e" };
}
