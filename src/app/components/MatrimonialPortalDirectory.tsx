import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router";
import { Search, Heart, MapPin, BookOpen, Briefcase, Star, ShieldCheck, ChevronLeft, ChevronRight, Send, Inbox, LockKeyhole } from "lucide-react";
import { fetchAllMatrimonials, MatrimonialProfile, requestMatrimonialMatch } from "../lib/matrimonialStore";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

interface MatrimonialPortalDirectoryProps {
  currentMember: {
    fullName: string;
    memberNo?: string;
    status?: string;
  };
}

export function MatrimonialPortalDirectory({ currentMember }: MatrimonialPortalDirectoryProps) {
  const approvedMember = currentMember.status === "approved";
  const [allProfiles, setAllProfiles] = useState<MatrimonialProfile[]>([]);
  const [loading, setLoading] = useState(approvedMember);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [hasOwnProfile, setHasOwnProfile] = useState(false);

  useEffect(() => {
    if (!approvedMember) { setLoading(false); return; }
    setLoading(true);
    fetchAllMatrimonials(1, 100)
      .then((res) => {
        setAllProfiles(res.data);
        setHasOwnProfile(Boolean((res as any).viewer?.hasApprovedMatrimonialProfile));
      })
      .catch((e) => setError(e?.message || "Could not load matrimonial profiles."))
      .finally(() => setLoading(false));
  }, [approvedMember]);

  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female">("all");
  const [cityFilter, setCityFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<"best" | "newest">("best");
  const [page, setPage] = useState(1);
  const limit = 6;

  useEffect(() => setPage(1), [genderFilter, cityFilter, searchQuery, sortMode]);

  const filtered = useMemo(() => {
    const result = allProfiles.filter((p) => {
      const matchesGender = genderFilter === "all" || p.gender.toLowerCase() === genderFilter;
      const matchesCity = !cityFilter || p.city.toLowerCase().includes(cityFilter.toLowerCase());
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || p.profession.toLowerCase().includes(q) || p.education.toLowerCase().includes(q) || (p.profileCode || "").toLowerCase().includes(q);
      return matchesGender && matchesCity && matchesSearch;
    });
    return [...result].sort((a, b) => sortMode === "best"
      ? ((b.matchScore || 0) - (a.matchScore || 0)) || (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allProfiles, genderFilter, cityFilter, searchQuery, sortMode]);

  const featured = useMemo(() => filtered.filter((p) => p.isFeatured), [filtered]);
  const standard = useMemo(() => filtered.filter((p) => !p.isFeatured), [filtered]);
  const totalPages = Math.ceil(standard.length / limit);
  const paginatedStandard = standard.slice((page - 1) * limit, page * limit);

  const handleRequest = async (p: MatrimonialProfile) => {
    if (!hasOwnProfile) {
      setError("To send a match request, your own matrimonial profile must first be payment-verified, approved and enabled by the administrator.");
      return;
    }
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

  if (!approvedMember) {
    return <div style={{ background: "#fff", border: "1px solid #eadfca", borderRadius: 12, padding: 34, textAlign: "center" }}>
      <LockKeyhole size={34} color={GOLD} style={{ marginBottom: 10 }} />
      <h3 style={{ color: GREEN, margin: "0 0 8px", fontFamily: "'Playfair Display', serif" }}>Approved Membership Required</h3>
      <p style={{ color: "#666", lineHeight: 1.7, maxWidth: 600, margin: "0 auto" }}>Matrimonial profiles are not open to the public. Only approved Anjuman members can view the privacy-protected directory.</p>
    </div>;
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#666" }}>Loading privacy-protected directory...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 24, paddingBottom: 14, borderBottom: "2px solid #f5f5f5", flexWrap: "wrap" }}>
        <div><h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, margin: 0 }}>Matrimonial Directory</h3><p style={{ margin: "4px 0 0", color: "#888", fontSize: 12 }}>Approved members only · privacy-controlled by the administrator</p></div>
        <Link to="/matrimonial/requests" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#f0f7f3", color: GREEN, border: "1px solid rgba(26,77,46,.15)", borderRadius: 8, padding: "8px 12px", textDecoration: "none", fontWeight: 700, fontSize: 12 }}><Inbox size={14} /> My Match Requests</Link>
      </div>

      <div style={{ backgroundColor: "#fefcbf", border: "1px solid #ecc94b", borderRadius: 8, padding: "14px 16px", marginBottom: 18, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <ShieldCheck size={18} color="#b7791f" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ color: "#8a6118", fontSize: 13, margin: 0, lineHeight: 1.7 }}><strong>Privacy Guard Active:</strong> Only profiles explicitly enabled by the administrator are listed. A small candidate photo may appear when that profile is enabled, but the name, contact number and private family details remain hidden. Contact is released only after admin review and the other profile owner's consent.</p>
      </div>

      {!hasOwnProfile && <div style={{ background: "#eef6ff", color: "#1e4f85", border: "1px solid #cfe4fb", borderRadius: 8, padding: "11px 14px", fontSize: 13, marginBottom: 16 }}>You can browse the directory as an approved member. To send a request, first submit your own matrimonial profile and have it approved and enabled.</div>}
      {message && <div style={{ background: "#dcfce7", color: "#166534", border: "1px solid #86efac", borderRadius: 8, padding: "11px 14px", fontSize: 13, marginBottom: 16 }}>{message}</div>}
      {error && <div style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: 8, padding: "11px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr .85fr .85fr .8fr", gap: 12, marginBottom: 24 }} className="filters-grid">
        <div style={{ position: "relative" }}>
          <input type="text" placeholder="Search education, profession or code..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: "100%", padding: "10px 14px 10px 38px", border: "1px solid rgba(26,77,46,0.15)", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
          <Search size={16} color="#aaa" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
        </div>
        <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value as any)} style={selectStyle}><option value="all">All Genders</option><option value="male">Male / Groom</option><option value="female">Female / Bride</option></select>
        <input type="text" placeholder="Filter by City..." value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} style={{ width: "100%", padding: "10px 14px", border: "1px solid rgba(26,77,46,0.15)", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
        <select value={sortMode} onChange={(e) => setSortMode(e.target.value as any)} style={selectStyle}><option value="best">Best Match</option><option value="newest">Newest</option></select>
      </div>

      {featured.length > 0 && <div style={{ marginBottom: 32 }}><h4 style={{ color: GOLD, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}><Star size={14} fill={GOLD} /> Featured Proposals</h4><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="profiles-grid">{featured.map((p) => <ProfileCard key={p.id} p={p} busy={actionId === p.id} onRequest={() => handleRequest(p)} isFeatured />)}</div></div>}

      <div>
        <h4 style={{ color: GREEN, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>All Proposals ({standard.length})</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="profiles-grid">{paginatedStandard.map((p) => <ProfileCard key={p.id} p={p} busy={actionId === p.id} onRequest={() => handleRequest(p)} />)}</div>
        {totalPages > 1 && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 32 }}><button disabled={page === 1} onClick={() => setPage((v) => Math.max(v - 1, 1))} style={pageButton(page === 1)}><ChevronLeft size={14} /> Previous</button><span style={{ fontSize: 13, color: "#666", fontWeight: 600 }}>Page {page} of {totalPages}</span><button disabled={page === totalPages} onClick={() => setPage((v) => Math.min(v + 1, totalPages))} style={pageButton(page === totalPages)}>Next <ChevronRight size={14} /></button></div>}
        {filtered.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa" }}><Heart size={40} style={{ margin: "0 auto 12px", display: "block" }} /><p>No approved, payment-verified profiles match your filters.</p></div>}
      </div>

      <style>{`@media (max-width: 768px) { .filters-grid, .profiles-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

function ProfileCard({ p, onRequest, busy, isFeatured = false }: { p: MatrimonialProfile; onRequest: () => void; busy: boolean; isFeatured?: boolean }) {
  const code = p.profileCode || `Profile ${p.id.slice(0, 8)}`;
  return <div style={{ backgroundColor: "white", border: isFeatured ? `2px solid ${GOLD}` : "1px solid #e5e7eb", borderRadius: 12, padding: 20, boxShadow: isFeatured ? "0 4px 20px rgba(200,160,74,0.12)" : "0 2px 8px rgba(0,0,0,0.03)", position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 245 }}>
    {isFeatured && <span style={{ position: "absolute", top: 12, right: 12, backgroundColor: GOLD, color: "white", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, display: "flex", alignItems: "center", gap: 4 }}><Star size={10} fill="white" /> Featured</span>}
    <div><div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <div style={{ width: 58, height: 58, borderRadius: "50%", overflow: "hidden", backgroundColor: "#f0f7f3", border: `2px solid ${isFeatured ? GOLD : GREEN}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{p.photoUrl ? <img src={p.photoUrl} alt="Candidate thumbnail" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ShieldCheck size={22} color={GREEN} />}</div>
      <div><h5 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, margin: 0 }}>{code}</h5><p style={{ color: "#666", fontSize: 12, margin: "3px 0 0", textTransform: "capitalize" }}>{p.gender} · {p.age} Years</p>{typeof p.matchScore === "number" && <span style={{ display: "inline-block", marginTop: 5, background: p.matchScore >= 60 ? "#dcfce7" : "#f3f4f6", color: p.matchScore >= 60 ? "#166534" : "#555", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 800 }}>Match {p.matchScore}%</span>}</div>
    </div><div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}><Row icon={<MapPin size={14} color={GOLD} />} text={p.city} /><Row icon={<BookOpen size={14} color={GOLD} />} text={p.education} /><Row icon={<Briefcase size={14} color={GOLD} />} text={p.profession} /></div></div>
    <button disabled={busy} onClick={onRequest} style={{ width: "100%", backgroundColor: busy ? "#7a9483" : isFeatured ? GOLD : GREEN, color: "white", border: "none", borderRadius: 8, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: busy ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Send size={15} /> {busy ? "Sending..." : "Request Private Match"}</button>
  </div>;
}

function Row({ icon, text }: { icon: React.ReactNode; text: string }) { return <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#4b5563" }}>{icon}<span>{text}</span></div>; }
const selectStyle: React.CSSProperties = { width: "100%", padding: "10px 14px", border: "1px solid rgba(26,77,46,0.15)", borderRadius: 8, fontSize: 13, backgroundColor: "white" };
function pageButton(disabled: boolean): React.CSSProperties { return { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1px solid #ddd", backgroundColor: disabled ? "#fafafa" : "white", color: disabled ? "#aaa" : GREEN, cursor: disabled ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }; }
