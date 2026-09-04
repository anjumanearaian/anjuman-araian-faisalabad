import { useState, useMemo, useEffect } from "react";
import { Search, Heart, MapPin, BookOpen, Briefcase, Star, MessageCircle, Info, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchAllMatrimonials, MatrimonialProfile } from "../lib/matrimonialStore";
import { getSiteSettings } from "../lib/settingsStore";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

interface MatrimonialPortalDirectoryProps {
  currentMember: {
    fullName: string;
    memberNo?: string;
  };
}

export function MatrimonialPortalDirectory({ currentMember }: MatrimonialPortalDirectoryProps) {
  const [allProfiles, setAllProfiles] = useState<MatrimonialProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllMatrimonials(1, 1000).then((res) => {
      setAllProfiles(res.data.filter((m) => m.status === "approved" && m.showOnPortal === true));
      setLoading(false);
    });
  }, []);

  const [genderFilter, setGenderFilter] = useState<"all" | "Male" | "Female">("all");
  const [cityFilter, setCityFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Pagination
  const [page, setPage] = useState(1);
  const limit = 6; // Limit 6 profiles per page

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [genderFilter, cityFilter, searchQuery]);

  const filtered = useMemo(() => {
    return allProfiles.filter((p) => {
      const matchesGender = genderFilter === "all" || p.gender.toLowerCase() === genderFilter.toLowerCase();
      const matchesCity = !cityFilter || p.city.toLowerCase().includes(cityFilter.toLowerCase());
      const matchesSearch =
        !searchQuery ||
        p.profession.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.education.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesGender && matchesCity && matchesSearch;
    });
  }, [allProfiles, genderFilter, cityFilter, searchQuery]);

  const featured = useMemo(() => {
    return filtered.filter((p) => p.isFeatured);
  }, [filtered]);

  const standard = useMemo(() => {
    return filtered
      .filter((p) => !p.isFeatured)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [filtered]);

  const paginatedStandard = useMemo(() => {
    const offset = (page - 1) * limit;
    return standard.slice(offset, offset + limit);
  }, [standard, page, limit]);

  const totalPages = Math.ceil(standard.length / limit);

  const handleConnect = (p: MatrimonialProfile) => {
    const settings = getSiteSettings();
    const phone = settings.whatsappNumber || "923008655522";
    const text = `Assalam-o-Alaikum Anjuman Matrimonial Coordinator,\n\nI am registered member *${currentMember.fullName}* ${
      currentMember.memberNo ? `(Member No: ${currentMember.memberNo})` : ""
    }.\n\nI am interested in matrimonial profile *${p.name}* (ID: ${p.id}, ${p.gender}, Age ${p.age}, ${p.profession} in ${p.city}).\n\nPlease facilitate contact exchange.`;
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "#666" }}>Loading directory...</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 14, borderBottom: "2px solid #f5f5f5" }}>
        <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, margin: 0 }}>
          Matrimonial Directory
        </h3>
      </div>

      <div style={{ backgroundColor: "#fefcbf", border: "1px solid #ecc94b", borderRadius: 8, padding: "12px 16px", marginBottom: 24, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Info size={16} color="#b7791f" style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ color: "#b7791f", fontSize: 13, margin: 0, lineHeight: 1.6 }}>
          <strong>Privacy Guard Active:</strong> To protect candidates' privacy, direct phone numbers are hidden. Click "Connect via Admin" to reach out to our official matrimonial coordinator to initiate a secure match request.
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 12, marginBottom: 24 }} className="filters-grid">
        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="Search education, profession..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "100%", padding: "10px 14px 10px 38px", border: "1px solid rgba(26,77,46,0.15)", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}
          />
          <Search size={16} color="#aaa" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
        </div>

        <select
          value={genderFilter}
          onChange={(e) => setGenderFilter(e.target.value as any)}
          style={{ width: "100%", padding: "10px 14px", border: "1px solid rgba(26,77,46,0.15)", borderRadius: 8, fontSize: 13, backgroundColor: "white" }}
        >
          <option value="all">All Genders</option>
          <option value="Male">Male / Groom</option>
          <option value="Female">Female / Bride</option>
        </select>

        <input
          type="text"
          placeholder="Filter by City..."
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          style={{ width: "100%", padding: "10px 14px", border: "1px solid rgba(26,77,46,0.15)", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}
        />
      </div>

      {/* Featured Profiles Section */}
      {featured.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h4 style={{ color: GOLD, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <Star size={14} fill={GOLD} /> Featured Proposals
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="profiles-grid">
            {featured.map((p) => (
              <ProfileCard key={p.id} p={p} onConnect={() => handleConnect(p)} isFeatured />
            ))}
          </div>
        </div>
      )}

      {/* Standard Profiles Section */}
      <div>
        <h4 style={{ color: GREEN, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
          All Proposals ({standard.length})
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="profiles-grid">
          {paginatedStandard.map((p) => (
            <ProfileCard key={p.id} p={p} onConnect={() => handleConnect(p)} />
          ))}
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 32 }}>
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid #ddd",
                backgroundColor: page === 1 ? "#fafafa" : "white",
                color: page === 1 ? "#aaa" : GREEN,
                cursor: page === 1 ? "not-allowed" : "pointer",
                fontSize: 13,
                fontWeight: 600,
                transition: "all 0.2s"
              }}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <span style={{ fontSize: 13, color: "#666", fontWeight: 600 }}>
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid #ddd",
                backgroundColor: page === totalPages ? "#fafafa" : "white",
                color: page === totalPages ? "#aaa" : GREEN,
                cursor: page === totalPages ? "not-allowed" : "pointer",
                fontSize: 13,
                fontWeight: 600,
                transition: "all 0.2s"
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa" }}>
            <Heart size={40} style={{ margin: "0 auto 12px", display: "block" }} />
            <p>No matching matrimonial profiles found.</p>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .filters-grid, .profiles-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

function ProfileCard({ p, onConnect, isFeatured = false }: { p: MatrimonialProfile; onConnect: () => void; isFeatured?: boolean }) {
  return (
    <div
      style={{
        backgroundColor: "white",
        border: isFeatured ? `2px solid ${GOLD}` : "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 20,
        boxShadow: isFeatured ? "0 4px 20px rgba(200,160,74,0.12)" : "0 2px 8px rgba(0,0,0,0.03)",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%"
      }}
    >
      {isFeatured && (
        <span
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            backgroundColor: GOLD,
            color: "white",
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            gap: 4
          }}
        >
          <Star size={10} fill="white" /> Featured
        </span>
      )}

      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              backgroundColor: isFeatured ? "#fdfbf7" : "#f3f4f6",
              border: `2px solid ${isFeatured ? GOLD : GREEN}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0
            }}
          >
            {p.photoUrl ? (
              <img src={p.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <Heart size={20} color={GREEN} />
            )}
          </div>
          <div>
            <h5 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, margin: 0 }}>
              {p.name}
            </h5>
            <p style={{ color: "#666", fontSize: 12, margin: "2px 0 0" }}>
              {p.gender} · {p.age} Years
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#4b5563" }}>
            <MapPin size={14} color={GOLD} /> <span>{p.city}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#4b5563" }}>
            <BookOpen size={14} color={GOLD} /> <span>{p.education}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#4b5563" }}>
            <Briefcase size={14} color={GOLD} /> <span>{p.profession}</span>
          </div>
        </div>

        {p.requirements && (
          <div style={{ backgroundColor: "#f9fafb", borderRadius: 8, padding: 12, marginBottom: 16 }}>
            <p style={{ color: "#9ca3af", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 4px 0" }}>Requirements</p>
            <p style={{ color: "#4b5563", fontSize: 12, margin: 0, lineHeight: 1.5 }}>{p.requirements}</p>
          </div>
        )}
      </div>

      <button
        onClick={onConnect}
        style={{
          width: "100%",
          backgroundColor: isFeatured ? GOLD : GREEN,
          color: "white",
          border: "none",
          borderRadius: 8,
          padding: "10px 0",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6
        }}
      >
        <MessageCircle size={15} /> Connect via Admin
      </button>
    </div>
  );
}
