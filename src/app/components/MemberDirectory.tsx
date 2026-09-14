import { useEffect, useMemo, useState } from "react";
import { Search, MapPin, Briefcase, Star, X, Users, UserRound, Crown } from "lucide-react";
import { fetchMemberDirectory, type DirectoryMember, type MemberDirectorySummary } from "../lib/memberDirectoryStore";
import { smartSearchSort } from "../lib/smartSearch";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

function typeLabel(value?: string | null) {
  if (value === "life") return "Lifetime Member";
  if (value === "patron") return "Patron Member";
  if (value === "overseas") return "Overseas Member";
  return "Annual Member";
}

function fallbackLeadershipRank(value?: string | null) {
  const role = String(value || "").toLowerCase().replace(/[._-]/g, " ").replace(/\s+/g, " ").trim();
  if (!role) return 9999;
  if (role === "president" || role.includes(" president ") && !role.includes("vice")) return 10;
  if (role.includes("senior vice president")) return 20;
  if (role.includes("vice president")) return 30;
  if (role.includes("general secretary")) return 40;
  if (role.includes("joint secretary") || role.includes("additional secretary") || role.includes("assistant secretary") || role.includes("deputy secretary")) return 50;
  if (role.includes("finance secretary") || role.includes("treasurer")) return 60;
  if (role.includes("information secretary")) return 70;
  if (role.includes("media coordinator") || role.includes("media secretary")) return 80;
  if (role.includes("executive member") || role.includes("cabinet member")) return 90;
  return 9999;
}

function hierarchyRank(member: DirectoryMember) {
  if (typeof member.leadershipRank === "number" && Number.isFinite(member.leadershipRank)) return member.leadershipRank;
  if (typeof member.leadershipTier === "number" && Number.isFinite(member.leadershipTier)) return member.leadershipTier * 10;
  return fallbackLeadershipRank(member.leadershipRole || member.designation);
}

function hierarchyRole(member: DirectoryMember) {
  return member.leadershipRole || (hierarchyRank(member) < 9999 ? member.designation : "") || "";
}

export function MemberDirectory({
  currentMemberId,
  initialCell = "all",
  initialType = "all",
  publicHeading = false,
}: {
  currentMemberId?: string;
  initialCell?: "all" | "male" | "women";
  initialType?: "all" | "ordinary" | "life" | "patron" | "overseas";
  publicHeading?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [cell, setCell] = useState<"all" | "male" | "women">(initialCell);
  const [membershipType, setMembershipType] = useState(initialType);
  const [selectedMember, setSelectedMember] = useState<DirectoryMember | null>(null);
  const [allMembers, setAllMembers] = useState<DirectoryMember[]>([]);
  const [summary, setSummary] = useState<MemberDirectorySummary>({ approvedMembers: 0, menMembers: 0, womenMembers: 0, lifeMembers: 0 });
  const [contactsVisible, setContactsVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchMemberDirectory(1, 500)
      .then((res) => {
        setAllMembers(res.members || []);
        setSummary(res.summary);
        setContactsVisible(Boolean(res.privacy?.contactDetailsVisible));
      })
      .catch(() => {
        setAllMembers([]);
        setSummary({ approvedMembers: 0, menMembers: 0, womenMembers: 0, lifeMembers: 0 });
        setContactsVisible(false);
      })
      .finally(() => setLoading(false));
  }, [currentMemberId]);

  useEffect(() => { setCell(initialCell); }, [initialCell]);
  useEffect(() => { setMembershipType(initialType); }, [initialType]);

  const filteredMembers = useMemo(() => {
    const filtered = allMembers.filter((m) => {
      const resolvedCell = m.memberCell || "male";
      if (cell !== "all" && resolvedCell !== cell) return false;
      if (membershipType !== "all" && m.membershipType !== membershipType) return false;
      return true;
    });
    const searched = smartSearchSort(
      filtered,
      search,
      (m) => [m.fullName, m.fatherName, m.memberNo, m.city, m.district, m.localArea, m.occupation, m.education, m.designation, m.institutionName, m.businessName, m.leadershipRole],
      (m) => m.fullName || m.memberNo || "",
    );
    if (search.trim()) return searched;
    return [...searched].sort((a, b) => hierarchyRank(a) - hierarchyRank(b) || (a.fullName || "").localeCompare(b.fullName || "", undefined, { sensitivity: "base" }));
  }, [allMembers, search, cell, membershipType]);

  const leadership = filteredMembers.filter((m) => hierarchyRank(m) < 9999);
  const leadershipIds = new Set(leadership.map((m) => m.id));
  const featured = filteredMembers.filter((m) => !leadershipIds.has(m.id) && (currentMemberId ? m.isFeaturedPortal : m.isFeatured));
  const featuredIds = new Set(featured.map((m) => m.id));
  const regular = filteredMembers.filter((m) => !leadershipIds.has(m.id) && !featuredIds.has(m.id));

  const renderCard = (m: DirectoryMember, mode: "leadership" | "featured" | "regular" = "regular") => {
    const highlighted = mode !== "regular";
    const role = hierarchyRole(m);
    return (
      <article key={m.id} style={{
        backgroundColor: highlighted ? "#fff9ef" : "white",
        border: `1px solid ${highlighted ? GOLD : "#e7ebe8"}`,
        borderRadius: 12,
        padding: "18px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        minHeight: 285,
        boxShadow: highlighted ? "0 8px 24px rgba(200,160,74,.14)" : "0 2px 10px rgba(0,0,0,.035)",
      }}>
        {mode === "leadership" && <div style={{ backgroundColor: GREEN, color: "white", fontSize: 9, fontWeight: 800, padding: "4px 9px", borderRadius: 12, marginBottom: 10, display: "inline-flex", alignItems: "center", gap: 4 }}><Crown size={10} color={GOLD} /> LEADERSHIP</div>}
        {mode === "featured" && <div style={{ backgroundColor: GOLD, color: "#1a1a1a", fontSize: 9, fontWeight: 800, padding: "3px 9px", borderRadius: 12, marginBottom: 10, display: "inline-flex", alignItems: "center", gap: 4 }}><Star size={10} fill="#1a1a1a" /> SPOTLIGHT</div>}
        <div style={{ width: 70, height: 70, borderRadius: "50%", marginBottom: 10, overflow: "hidden", border: `2px solid ${highlighted ? GOLD : "#e8eee9"}`, background: "#f3f7f4", display: "grid", placeItems: "center", color: GREEN }}>
          {m.photoUrl ? <img src={m.photoUrl} alt={m.fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <UserRound size={28} />}
        </div>
        <h3 style={{ margin: "0 0 4px", color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700 }}>{m.fullName}</h3>
        {m.memberNo && <p style={{ margin: "0 0 5px", color: "#929b95", fontSize: 10, fontWeight: 700 }}>{m.memberNo}</p>}
        {mode === "leadership" && role && <span style={{ fontSize: 11, color: GREEN, fontWeight: 900, marginBottom: 5 }}>{role}</span>}
        <span style={{ fontSize: 10, color: "#8a6a1d", fontWeight: 800, marginBottom: 8 }}>{typeLabel(m.membershipType)}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#626d66", fontSize: 12, marginBottom: 4, maxWidth: "100%" }}>
          <Briefcase size={12} /> <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 155 }}>{m.designation || m.occupation || "Community Member"}</span>
        </div>
        {(m.businessName || m.institutionName) && <div style={{ color: "#66736b", fontSize: 11, marginBottom: 4, maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.businessName || m.institutionName}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#6f7973", fontSize: 11, marginBottom: 14 }}><MapPin size={12} /> <span>{m.city || "Faisalabad"}</span></div>
        <button onClick={() => setSelectedMember(m)} style={{ marginTop: "auto", width: "100%", padding: "8px", backgroundColor: highlighted ? GOLD : "#f0f7f3", color: highlighted ? "#1a1a1a" : GREEN, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>View Profile</button>
      </article>
    );
  };

  return (
    <div>
      {publicHeading && <div style={{ marginBottom: 24 }}><span style={{ color: GREEN, fontSize: 11, textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 900 }}>Verified community directory</span><h1 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem,5vw,3.4rem)", margin: "6px 0 8px" }}>Our Members</h1><p style={{ color: "#68736c", maxWidth: 760, lineHeight: 1.7, margin: 0 }}>Leadership and senior management are shown first, followed by the wider approved member community. Contact details remain protected from public visitors.</p></div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10, marginBottom: 20 }} className="member-directory-stats">
        <SummaryButton active={cell === "all" && membershipType === "all"} icon={Users} value={summary.approvedMembers} label="All Members" onClick={() => { setCell("all"); setMembershipType("all"); }} />
        <SummaryButton active={cell === "male"} icon={UserRound} value={summary.menMembers} label="Men's Wing" onClick={() => { setCell("male"); setMembershipType("all"); }} />
        <SummaryButton active={cell === "women"} icon={UserRound} value={summary.womenMembers} label="Women's Wing" onClick={() => { setCell("women"); setMembershipType("all"); }} />
        <SummaryButton active={membershipType === "life"} icon={Crown} value={summary.lifeMembers} label="Lifetime Members" onClick={() => { setCell("all"); setMembershipType("life"); }} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, paddingBottom: 14, borderBottom: "2px solid #f5f5f5", gap: 10, flexWrap: "wrap" }}>
        {!publicHeading && <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, margin: 0 }}>Member Directory</h3>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginLeft: publicHeading ? "auto" : undefined }}>
          <select value={cell} onChange={(e) => setCell(e.target.value as any)} style={filterStyle}><option value="all">All Wings</option><option value="male">Men's Wing</option><option value="women">Women's Wing</option></select>
          <select value={membershipType} onChange={(e) => setMembershipType(e.target.value as any)} style={filterStyle}><option value="all">All Memberships</option><option value="ordinary">Annual</option><option value="life">Lifetime</option><option value="patron">Patron</option><option value="overseas">Overseas</option></select>
          <div style={{ position: "relative" }}><Search size={16} color="#aaa" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} /><input type="search" placeholder="Search name, city, profession, role..." value={search} onChange={(e) => setSearch(e.target.value)} autoComplete="off" style={{ padding: "9px 12px 9px 35px", borderRadius: 20, border: "1px solid #d9dfdb", fontSize: 12, width: 300, maxWidth: "74vw", outline: "none", fontFamily: "'Lato', sans-serif" }} /></div>
        </div>
      </div>

      <div style={{ fontSize: 11, color: "#7a867e", marginBottom: 14 }}>{loading ? "Loading approved member directory..." : `${filteredMembers.length} member${filteredMembers.length === 1 ? "" : "s"} shown`}</div>

      {leadership.length > 0 && <section style={{ marginBottom: 30 }}><div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}><Crown size={17} color={GOLD}/><h3 style={{ margin: 0, color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 18 }}>Leadership & Senior Management</h3></div><div style={cardsGrid}>{leadership.map((m) => renderCard(m, "leadership"))}</div></section>}
      {featured.length > 0 && <section style={{ marginBottom: 28 }}><h3 style={{ margin: "0 0 12px", color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 17 }}>Featured Members</h3><div style={cardsGrid}>{featured.map((m) => renderCard(m, "featured"))}</div></section>}
      {regular.length > 0 ? <section><h3 style={{ margin: "0 0 12px", color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 17 }}>{leadership.length || featured.length ? "Members" : "Approved Members"}</h3><div style={cardsGrid}>{regular.map((m) => renderCard(m, "regular"))}</div></section> : !loading && leadership.length === 0 && featured.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#999", backgroundColor: "#fcfcfc", borderRadius: 12, border: "1px dashed #ddd" }}>No members found for this filter.</div>}

      {selectedMember && <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,.52)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}><div style={{ backgroundColor: "white", borderRadius: 16, width: "100%", maxWidth: 620, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 14px 50px rgba(0,0,0,.22)" }}>
        <div style={{ padding: 22, borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}><div style={{ display: "flex", gap: 15 }}><div style={{ width: 78, height: 78, borderRadius: "50%", overflow: "hidden", border: `2px solid ${GOLD}`, flexShrink: 0, background: "#f4f7f5", display: "grid", placeItems: "center", color: GREEN }}>{selectedMember.photoUrl ? <img src={selectedMember.photoUrl} alt={selectedMember.fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <UserRound size={28} />}</div><div><h3 style={{ margin: "0 0 4px", color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22 }}>{selectedMember.fullName}</h3><p style={{ margin: "0 0 6px", color: "#888", fontSize: 11 }}>{selectedMember.memberNo || "Approved Member"}</p>{hierarchyRole(selectedMember) && <div style={{ color: GREEN, fontSize: 12, fontWeight: 900, marginBottom: 5 }}>{hierarchyRole(selectedMember)}</div>}<span style={{ backgroundColor: "#f0f7f3", color: GREEN, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 12 }}>{typeLabel(selectedMember.membershipType)}</span></div></div><button onClick={() => setSelectedMember(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#999" }}><X size={20} /></button></div>
        <div style={{ padding: 22 }}><h4 style={sectionTitle}>Professional & Community Profile</h4><div style={profileGrid}><ProfileItem label="Anjuman Role" value={hierarchyRole(selectedMember)} /><ProfileItem label="Occupation" value={selectedMember.occupation} /><ProfileItem label="Designation" value={selectedMember.designation} /><ProfileItem label="Education" value={selectedMember.education} /><ProfileItem label="Institute / Business" value={selectedMember.businessName || selectedMember.institutionName} /><ProfileItem label="City" value={selectedMember.city} /><ProfileItem label="Wing" value={selectedMember.memberCell === "women" ? "Women's Wing" : "Men's Wing"} /></div>
          {contactsVisible ? <><h4 style={{ ...sectionTitle, marginTop: 24 }}>Member Contact</h4><div style={profileGrid}><ProfileItem label="Mobile" value={selectedMember.phone} /><ProfileItem label="WhatsApp" value={selectedMember.whatsapp} /><ProfileItem label="Email" value={selectedMember.email} /></div></> : <div style={{ marginTop: 22, background: "#f4f8f5", border: "1px solid #dce8df", borderRadius: 9, padding: "12px 14px", color: "#5d6d63", fontSize: 12, lineHeight: 1.6 }}>Contact details are protected. Approved members can sign in to the Member Portal to view member contact information.</div>}
        </div>
      </div></div>}
      <style>{`@media(max-width:760px){.member-directory-stats{grid-template-columns:repeat(2,minmax(0,1fr))!important}}@media(max-width:480px){.member-directory-stats{grid-template-columns:1fr 1fr!important}}`}</style>
    </div>
  );
}

function SummaryButton({ active, icon: Icon, value, label, onClick }: { active: boolean; icon: any; value: number; label: string; onClick: () => void }) {
  return <button onClick={onClick} style={{ border: `1px solid ${active ? GOLD : "#e0e6e2"}`, borderRadius: 10, background: active ? "#fff8e7" : "white", padding: "12px 10px", cursor: "pointer", color: GREEN, textAlign: "left" }}><Icon size={15} color={GOLD} /><strong style={{ display: "block", fontFamily: "'Playfair Display', serif", fontSize: 22, marginTop: 5 }}>{value}</strong><span style={{ fontSize: 10, fontWeight: 800 }}>{label}</span></button>;
}

function ProfileItem({ label, value }: { label: string; value?: string | null }) { return <div><p style={{ margin: 0, fontSize: 10, color: "#929a95", textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</p><p style={{ margin: "4px 0 0", fontSize: 13, color: "#333", fontWeight: 600 }}>{value || "—"}</p></div>; }

const cardsGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 16 };
const filterStyle: React.CSSProperties = { border: "1px solid #d9dfdb", borderRadius: 20, padding: "8px 11px", color: GREEN, background: "white", fontSize: 11 };
const sectionTitle: React.CSSProperties = { color: GREEN, fontSize: 13, fontWeight: 800, marginBottom: 12, borderBottom: "1px solid #eee", paddingBottom: 7 };
const profileGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 };
