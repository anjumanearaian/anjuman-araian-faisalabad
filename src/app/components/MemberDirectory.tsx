import { useState, useMemo, useEffect } from "react";
import { fetchAllMembers } from "../lib/memberStore";
import type { Member } from "../lib/memberStore";
import { Search, MapPin, Briefcase, Star, X } from "lucide-react";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

export function MemberDirectory({ currentMemberId }: { currentMemberId: string }) {
  const [search, setSearch] = useState("");
  const [cell, setCell] = useState<"all" | "male" | "women">("all");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [allMembers, setAllMembers] = useState<Member[]>([]);

  useEffect(() => {
    fetchAllMembers(1, 1000).then(res => {
      setAllMembers(res.data);
    });
  }, []);

  const filteredMembers = useMemo(() => {
    return allMembers.filter(m => {
      const q = search.toLowerCase();
      return (cell === "all" || (m.memberCell || (m.gender === "female" ? "women" : "male")) === cell) && (
        m.fullName.toLowerCase().includes(q) ||
        m.city.toLowerCase().includes(q) ||
        m.occupation.toLowerCase().includes(q)
      );
    });
  }, [allMembers, search, cell]);

  const featured = filteredMembers.filter(m => m.isFeaturedPortal);
  const regular = filteredMembers.filter(m => !m.isFeaturedPortal).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const renderCard = (m: Member, isFeatured: boolean = false) => (
    <div key={m.id} style={{
      backgroundColor: isFeatured ? "#fff9ef" : "white",
      border: `1px solid ${isFeatured ? GOLD : "#f0f0f0"}`,
      borderRadius: 12, padding: "20px",
      display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
      boxShadow: isFeatured ? "0 4px 12px rgba(200,160,74,0.15)" : "0 2px 8px rgba(0,0,0,0.04)"
    }}>
      {isFeatured && <div style={{ backgroundColor: GOLD, color: "#1a1a1a", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 12, marginBottom: 12, display: "inline-flex", alignItems: "center", gap: 4 }}><Star size={10} fill="#1a1a1a" /> SPOTLIGHT</div>}
      
      <div style={{ width: 72, height: 72, borderRadius: "50%", marginBottom: 12, overflow: "hidden", border: `2px solid ${isFeatured ? GOLD : "#eee"}` }}>
        {m.photoUrl ? (
          <img src={m.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", backgroundColor: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", color: GREEN, fontWeight: 700, fontSize: 24 }}>
            {m.fullName[0]}
          </div>
        )}
      </div>
      
      <h4 style={{ margin: "0 0 4px", color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700 }}>{m.fullName}</h4>
      {m.memberNo && <p style={{ margin: "0 0 8px", color: "#888", fontSize: 11, fontWeight: 600 }}>#{m.memberNo}</p>}
      
      <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#666", fontSize: 12, marginBottom: 4 }}>
        <Briefcase size={12} /> <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 140 }}>{m.occupation || "N/A"}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#666", fontSize: 12, marginBottom: 16 }}>
        <MapPin size={12} /> <span>{m.city}</span>
      </div>
      
      <button onClick={() => setSelectedMember(m)} style={{ marginTop: "auto", width: "100%", padding: "8px", backgroundColor: isFeatured ? GOLD : "#f0f7f3", color: isFeatured ? "#1a1a1a" : GREEN, border: "none", borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
        View Profile
      </button>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 14, borderBottom: "2px solid #f5f5f5", gap: 12, flexWrap: "wrap" }}>
        <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, margin: 0 }}>Member Directory</h3>
        
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><select value={cell} onChange={e => setCell(e.target.value as any)} style={{ border: "1px solid #ddd", borderRadius: 20, padding: "8px 12px", color: GREEN }}><option value="all">All Members</option><option value="male">Men's Cell</option><option value="women">Women's Cell</option></select><div style={{ position: "relative" }}>
          <Search size={16} color="#aaa" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Search name, city, profession..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: "8px 12px 8px 34px", borderRadius: 20, border: "1px solid #ddd", fontSize: 13, width: 240, outline: "none", fontFamily: "'Lato', sans-serif" }}
          />
        </div></div>
      </div>

      {featured.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 20 }}>
            {featured.map(m => renderCard(m, true))}
          </div>
        </div>
      )}

      <div>
        {featured.length > 0 && <h4 style={{ color: "#666", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>All Members</h4>}
        {regular.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 20 }}>
            {regular.map(m => renderCard(m, false))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: 40, color: "#999", backgroundColor: "#fcfcfc", borderRadius: 12, border: "1px dashed #eee" }}>
            No members found.
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {selectedMember && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ backgroundColor: "white", borderRadius: 16, width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ padding: "24px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ width: 80, height: 80, borderRadius: "50%", overflow: "hidden", border: `2px solid ${GOLD}`, flexShrink: 0 }}>
                  {selectedMember.photoUrl ? (
                    <img src={selectedMember.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", backgroundColor: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", color: GREEN, fontWeight: 700, fontSize: 24 }}>{selectedMember.fullName[0]}</div>
                  )}
                </div>
                <div>
                  <h3 style={{ margin: "0 0 4px", color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700 }}>{selectedMember.fullName}</h3>
                  {selectedMember.fatherName && <p style={{ margin: "0 0 4px", color: "#666", fontSize: 13 }}>S/O {selectedMember.fatherName}</p>}
                  <p style={{ margin: "0 0 8px", color: "#888", fontSize: 12 }}>{selectedMember.memberNo ? `Member #${selectedMember.memberNo}` : "Approved Member"}</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ backgroundColor: "#f0f7f3", color: GREEN, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 12 }}>{selectedMember.city}</span>
                    {selectedMember.bloodGroup && <span style={{ backgroundColor: "#f5f5f5", color: "#666", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 12 }}>{selectedMember.bloodGroup}</span>}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedMember(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#999" }}><X size={20} /></button>
            </div>
            
            <div style={{ padding: "24px" }}>
              <h4 style={{ color: GREEN, fontSize: 14, fontWeight: 700, marginBottom: 12, borderBottom: "1px solid #eee", paddingBottom: 6 }}>Professional Details</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                <div><p style={{ margin: 0, fontSize: 11, color: "#888", textTransform: "uppercase" }}>Occupation</p><p style={{ margin: "4px 0 0", fontSize: 14, color: "#333", fontWeight: 500 }}>{selectedMember.occupation || "—"}</p></div>
                <div><p style={{ margin: 0, fontSize: 11, color: "#888", textTransform: "uppercase" }}>Education</p><p style={{ margin: "4px 0 0", fontSize: 14, color: "#333", fontWeight: 500 }}>{selectedMember.education || "—"}</p></div>
                <div><p style={{ margin: 0, fontSize: 11, color: "#888", textTransform: "uppercase" }}>Designation</p><p style={{ margin: "4px 0 0", fontSize: 14, color: "#333", fontWeight: 500 }}>{selectedMember.designation || "—"}</p></div>
                <div><p style={{ margin: 0, fontSize: 11, color: "#888", textTransform: "uppercase" }}>Institute / Business</p><p style={{ margin: "4px 0 0", fontSize: 14, color: "#333", fontWeight: 500 }}>{selectedMember.businessName || selectedMember.institutionName || "—"}</p></div>
              </div>

              {selectedMember.familyInfoPublic && selectedMember.family && (
                <>
                  <h4 style={{ color: GREEN, fontSize: 14, fontWeight: 700, marginBottom: 12, borderBottom: "1px solid #eee", paddingBottom: 6 }}>Family Background</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div><p style={{ margin: 0, fontSize: 11, color: "#888", textTransform: "uppercase" }}>Family Branch</p><p style={{ margin: "4px 0 0", fontSize: 14, color: "#333", fontWeight: 500 }}>{selectedMember.family.familyBranch || "—"}</p></div>
                    <div><p style={{ margin: 0, fontSize: 11, color: "#888", textTransform: "uppercase" }}>Ancestral City</p><p style={{ margin: "4px 0 0", fontSize: 14, color: "#333", fontWeight: 500 }}>{selectedMember.family.familyCity || "—"}</p></div>
                  </div>
                </>
              )}

              {selectedMember.whatsappPublic && (
                <>
                  <h4 style={{ color: GREEN, fontSize: 14, fontWeight: 700, marginTop: 24, marginBottom: 12, borderBottom: "1px solid #eee", paddingBottom: 6 }}>Contact Details</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div><p style={{ margin: 0, fontSize: 11, color: "#888", textTransform: "uppercase" }}>Phone / WhatsApp</p><p style={{ margin: "4px 0 0", fontSize: 14, color: "#333", fontWeight: 500 }}>{selectedMember.whatsapp || selectedMember.phone}</p></div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
