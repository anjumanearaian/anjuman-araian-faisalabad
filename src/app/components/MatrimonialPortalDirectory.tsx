import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router";
import { Search, Heart, MapPin, BookOpen, Briefcase, Star, ShieldCheck, ChevronLeft, ChevronRight, Send, Inbox } from "lucide-react";
import { fetchAllMatrimonials, MatrimonialProfile, requestMatrimonialMatch } from "../lib/matrimonialStore";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

interface MatrimonialPortalDirectoryProps {
  currentMember: {
    fullName: string;
    memberNo?: string;
  };
}

export function MatrimonialPortalDirectory({ currentMember: _currentMember }: MatrimonialPortalDirectoryProps) {
  const [allProfiles, setAllProfiles] = useState<MatrimonialProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAllMatrimonials(1, 1000)
      .then((res) => setAllProfiles(res.data))
      .catch((e) => setError(e?.message || "Could not load matrimonial profiles."))
      .finally(() => setLoading(false));
  }, []);

  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female">("all");
  const [cityFilter, setCityFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const limit = 6;

  useEffect(() => setPage(1), [genderFilter, cityFilter, searchQuery]);

  const filtered = useMemo(() => {
    return allProfiles.filter((p) => {
      const matchesGender = genderFilter === "all" || p.gender.toLowerCase() === genderFilter;
      const matchesCity = !cityFilter || p.city.toLowerCase().includes(cityFilter.toLowerCase());
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || p.profession.toLowerCase().includes(q) || p.education.toLowerCase().includes(q) || (p.profileCode || "").toLowerCase().includes(q);
      return matchesGender && matchesCity && matchesSearch;
    });
  }, [allProfiles, genderFilter, cityFilter, searchQuery]);

  const featured = useMemo(() => filtered.filter((p) => p.isFeatured), [filtered]);
  const standard = useMemo(() => filtered.filter((p) => !p.isFeatured).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [filtered]);
  const totalPages = Math.ceil(standard.length / limit);
  const paginatedStandard = standard.slice((page - 1) * limit, page * limit);

  const handleRequest = async (p: MatrimonialProfile) => {
    if (!confirm(`Send a private match request for ${p.profileCode || "this profile"}? The other person will not receive your contact details unless the admin first reviews the request and they then consent.`)) return;
    setActionId(p.id);
    setError("");
    setMessage("");
    try {
      await requestMatrimonialMatch(p.id);
      setMessage(`Match request sent for ${p.profileCode || "the selected profile"}. It is now awaiting admin review.`);
    } catch (e: any) {
      setError(e?.message || "Could not send match request.");
    } finally {
      setActionId(null);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#666" }}>Loading privacy-protected directory...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 24, paddingBottom: 14, borderBottom: "2px solid #f5f5f5", flexWrap: "wrap" }}>
        <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, margin: 0 }}>Matrimonial Directory</h3>
        <Link to="/matrimonial/requests" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#f0f7f3", color: GREEN, border: "1px solid rgba(26,77,46,.15)", borderRadius: 8, padding: "8px 12px", textDecoration: "none", fontWeight: 700, fontSize: 12 }}><Inbox size={14} /> My Match Requests</Link>
      </div>

      <div style={{ backgroundColor: "#fefcbf", border: "1px solid #ecc94b", borderRadius: 8, padding: "14px 16px", marginBottom: 18, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <ShieldCheck size={18} color="#b7791f" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ color: "#8a6118", fontSize: 13, margin: 0, lineHeight: 1.7 }}><strong>Privacy Guard Active:</strong> The directory shows only a profile code and basic matching information. Names, photographs, family details and contact numbers remain hidden. A match request is first reviewed by the Anjuman administrator, then the other profile owner must explicitly accept before contact details are released.</p>
      </div>

      {message && <div style={{ background: "#dcfce7", color: "#166534", border: "1px solid #86efac", borderRadius: 8, padding: "11px 14px", fontSize: 13, marginBottom: 16 }}>{message}</div>}
      {error && <div style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: 8, padding: "11px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 12, marginBottom: 24 }} className="filters-grid">
        <div style={{ position: "relative" }}>
          <input type="text" placeholder="Search education, profession or code..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: "100%", padding: "10px 14px 10px 38px", border: "1px solid rgba(26,77,46,0.15)", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
          <Search size={16} color="#aaa" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
        </div>
        <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value as any)} style={{ width: "100%", padding: "10px 14px", border: "1px solid rgba(26,77,46,0.15)", borderRadius: 8, fontSize: 13, backgroundColor: "white" }}>
          <option value="all">All Genders</option><option value="male">Male / Groom</option><option value="female">Female / Bride</option>
        </select>
        <input type="text" placeholder="Filter by City..." value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} style={{ width: "100%", padding: "10px 14px", border: "1px solid rgba(26,77,46,0.15)", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
      </div>

      {featured.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h4 style={{ color: GOLD, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}><Star size={14} fill={GOLD} /> Featured Proposals</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="profiles-grid">{featured.map((p) => <ProfileCard key={p.id} p={p} busy={actionId === p.id} onRequest={() => handleRequest(p)} isFeatured />)}</div>
        </div>
      )}

      <div>
        <h4 style={{ color: GREEN, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>All Proposals ({standard.length})</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="profiles-grid">{paginatedStandard.map((p) => <ProfileCard key={p.id} p={p} busy={actionId === p.id} onRequest={() => handleRequest(p)} />)}</div>
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 32 }}>
            <button disabled={page === 1} onClick={() => setPage((v) => Math.max(v - 1, 1))} style={pageButton(page === 1)}><ChevronLeft size={14} /> Previous</button>
            <span style={{ fontSize: 13, color: "#666", fontWeight: 600 }}>Page {page} of {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage((v) => Math.min(v + 1, totalPages))} style={pageButton(page === totalPages)}>Next <ChevronRight size={14} /></button>
          </div>
        )}
        {filtered.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa" }}><Heart size={40} style={{ margin: "0 auto 12px", display: "block" }} /><p>No approved, payment-verified profiles match your filters.</p></div>}
      </div>

      <style>{`@media (max-width: 768px) { .filters-grid, .profiles-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

function ProfileCard({ p, onRequest, busy, isFeatured = false }: { p: MatrimonialProfile; onRequest: () => void; busy: boolean; isFeatured?: boolean }) {
  const code = p.profileCode || `Profile ${p.id.slice(0, 8)}`;
  return (
    <div style={{ backgroundColor: "white", border: isFeatured ? `2px solid ${GOLD}` : "1px solid #e5e7eb", borderRadius: 12, padding: 20, boxShadow: isFeatured ? "0 4px 20px rgba(200,160,74,0.12)" : "0 2px 8px rgba(0,0,0,0.03)", position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 235 }}>
      {isFeatured && <span style={{ position: "absolute", top: 12, right: 12, backgroundColor: GOLD, color: "white", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, display: "flex", alignItems: "center", gap: 4 }}><Star size={10} fill="white" /> Featured</span>}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 54, height: 54, borderRadius: "50%", backgroundColor: "#f0f7f3", border: `2px solid ${isFeatured ? GOLD : GREEN}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><ShieldCheck size={22} color={GREEN} /></div>
          <div><h5 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, margin: 0 }}>{code}</h5><p style={{ color: "#666", fontSize: 12, margin: "3px 0 0", textTransform: "capitalize" }}>{p.gender} · {p.age} Years</p></div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
          <Row icon={<MapPin size={14} color={GOLD} />} text={p.city} />
          <Row icon={<BookOpen size={14} color={GOLD} />} text={p.education} />
          <Row icon={<Briefcase size={14} color={GOLD} />} text={p.profession} />
        </div>
      </div>
      <button disabled={busy} onClick={onRequest} style={{ width: "100%", backgroundColor: busy ? "#7a9483" : isFeatured ? GOLD : GREEN, color: "white", border: "none", borderRadius: 8, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: busy ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Send size={15} /> {busy ? "Sending..." : "Request Private Match"}</button>
    </div>
  );
}

function Row({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#4b5563" }}>{icon}<span>{text}</span></div>;
}

function pageButton(disabled: boolean): React.CSSProperties {
  return { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1px solid #ddd", backgroundColor: disabled ? "#fafafa" : "white", color: disabled ? "#aaa" : GREEN, cursor: disabled ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 };
}
