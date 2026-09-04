const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "src/app/pages/AdminPage.tsx");
let content = fs.readFileSync(filePath, "utf-8");

// 1. Imports
content = content.replace(
  'Settings2 } from "lucide-react";',
  'Settings2, LayoutDashboard, ShieldAlert } from "lucide-react";'
);

// 2. Initial Tab
content = content.replace(
  '    if (role === "welfare_manager") return "members";\n    return "news";\n  };\n  const [tab, setTab] = useState<"news" |',
  '    if (role === "welfare_manager") return "dashboard";\n    return "dashboard";\n  };\n  const [tab, setTab] = useState<"dashboard" | "news" |'
);

// 3. Layout Top (from return to the end of tab switcher)
const layoutTopStart = content.indexOf('return (\n  <div style={{ backgroundColor: "#f8f5ef", minHeight: "100vh" }}>');
const layoutTopEndStr = '            </button>\n          ));\n        })()}\n      </div>';
const layoutTopEnd = content.indexOf(layoutTopEndStr, layoutTopStart) + layoutTopEndStr.length;

if (layoutTopStart === -1 || layoutTopEnd === -1) {
  console.error("Could not find layout top markers");
  process.exit(1);
}

const replacementTop = `return (
  <div style={{ display: "flex", backgroundColor: "#f8f5ef", minHeight: "100vh" }}>
    {/* Sidebar */}
    <aside style={{ width: 260, backgroundColor: "white", borderRight: "1px solid #eee", display: "flex", flexDirection: "column", position: "fixed", height: "100vh", overflowY: "auto", zIndex: 10 }}>
      {/* Sidebar Header */}
      <div style={{ padding: "24px", backgroundColor: GREEN, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: GOLD, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Shield size={18} color={GREEN} />
          </div>
          <div>
            <p style={{ color: "white", fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>Admin Panel</p>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>
              {role?.replace("_", " ")}
            </p>
          </div>
        </div>
      </div>
      
      {/* Navigation Links */}
      <nav style={{ flex: 1, padding: "24px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, paddingLeft: 12 }}>Menu</div>
        {(() => {
          const all = [
            ["dashboard", "Dashboard", <LayoutDashboard size={18} />],
            ["news", "News & Updates", <Newspaper size={18} />],
            ["events", "Events", <CalendarDays size={18} />],
            ["members", \`Members \${members.filter((m) => m.status === "pending").length > 0 ? \`(\${members.filter((m) => m.status === "pending").length})\` : ""}\`, <Users size={18} />],
            ["businesses", \`Businesses \${businesses.filter((b) => b.status === "pending").length > 0 ? \`(\${businesses.filter((b) => b.status === "pending").length})\` : ""}\`, <Briefcase size={18} />],
            ["matrimonial", \`Matrimonial \${matrimonials.filter((m) => m.status === "pending").length > 0 ? \`(\${matrimonials.filter((m) => m.status === "pending").length})\` : ""}\`, <Heart size={18} />],
            ["leadership", "Leadership", <Crown size={18} />],
            ["media", "Media Gallery", <ImageIcon size={18} />],
            ["overseas", "Overseas Chapters", <Globe size={18} />],
            ["settings", "Site Settings", <Settings size={18} />],
            ["analytics", "Revenue Analytics", <BarChart3 size={18} />],
            ["messages", \`Messages \${messages.filter((m) => m.status === "unread").length > 0 ? \`(\${messages.filter((m) => m.status === "unread").length})\` : ""}\`, <MessageCircle size={18} />],
            ["admins", "Admin Users", <ShieldAlert size={18} />],
          ] as const;

          const allowed = role === "content_manager"
            ? all.filter(([t]) => t === "dashboard" || t === "news" || t === "events" || t === "media")
            : role === "welfare_manager"
              ? all.filter(([t]) => t === "dashboard" || t === "members" || t === "businesses" || t === "matrimonial")
              : all;

          return allowed.map(([t, label, icon]) => (
            <button 
              key={t} 
              onClick={() => setTab(t as any)} 
              style={{ 
                display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 8, border: "none", cursor: "pointer", 
                backgroundColor: tab === t ? "#f0f7f3" : "transparent", 
                color: tab === t ? GREEN : "#555", 
                fontWeight: tab === t ? 700 : 600, 
                fontSize: 14, fontFamily: "'Lato', sans-serif", position: "relative", textAlign: "left", transition: "all 0.2s" 
              }}
            >
              <div style={{ color: tab === t ? GREEN : "#888", display: "flex" }}>{icon}</div>
              {label}
              
              {t === "members" && members.filter((m) => m.status === "pending").length > 0 && (
                <span style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", right: 16, width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ef4444" }} />
              )}
              {t === "businesses" && businesses.filter((b) => b.status === "pending").length > 0 && (
                <span style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", right: 16, width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ef4444" }} />
              )}
              {t === "matrimonial" && matrimonials.filter((m) => m.status === "pending").length > 0 && (
                <span style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", right: 16, width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ef4444" }} />
              )}
              {t === "messages" && messages.filter((m) => m.status === "unread").length > 0 && (
                <span style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", right: 16, width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ef4444" }} />
              )}
            </button>
          ));
        })()}
      </nav>

      {/* Sidebar Footer */}
      <div style={{ padding: "20px 24px", borderTop: "1px solid #eee", display: "flex", flexDirection: "column", gap: 12 }}>
        <button onClick={() => { logout(); window.location.href = "/"; }} style={{ display: "flex", alignItems: "center", gap: 8, backgroundColor: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", width: "100%", justifyContent: "center" }}>
          <LogOut size={16} /> Logout
        </button>
      </div>
    </aside>

    {/* Main Content Area */}
    <main style={{ flex: 1, marginLeft: 260, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      
      {/* Top Header */}
      <header style={{ backgroundColor: "white", padding: "18px 32px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 5 }}>
        <h1 style={{ color: "#333", fontSize: 18, fontWeight: 700, margin: 0, textTransform: "capitalize" }}>
          {tab === "dashboard" ? "Dashboard Overview" : tab.replace("-", " ")}
        </h1>
        <div style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>
          Welcome back, {role?.replace("_", " ")}
        </div>
      </header>

      <div style={{ padding: "32px", flex: 1, maxWidth: 1400, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        
        {/* ── DASHBOARD TAB ── */}
        {tab === "dashboard" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, margin: 0 }}>System Overview</h2>
              <p style={{ color: "#666", fontSize: 14, marginTop: 4 }}>A quick summary of the Anjuman-e-Araian platform.</p>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20, marginBottom: 32 }} className="stats-grid">
              {stats.map(({ icon: Icon, label, value, sub }) => (
                <div key={label} style={{ backgroundColor: "white", borderRadius: 12, padding: "22px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", borderTop: \`3px solid \${GOLD}\` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "#f0f7f3", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={18} color={GREEN} />
                    </div>
                    <span style={{ color: "#888", fontSize: 13, fontWeight: 600 }}>{label}</span>
                  </div>
                  <div style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{value}</div>
                  <div style={{ color: "#aaa", fontSize: 12, marginTop: 4 }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}`;

content = content.substring(0, layoutTopStart) + replacementTop + content.substring(layoutTopEnd);

// 4. Layout End
const layoutEndStr = '    </div>\n\n    <style>{`@media (max-width: 900px) { .stats-grid { grid-template-columns: repeat(2,1fr) !important; } } @media (max-width: 500px) { .stats-grid { grid-template-columns: 1fr !important; } }`}</style>\n    <ImageModal imageUrl={zoomImage} onClose={() => setZoomImage(null)} />\n  </div>\n);\n}';
const replacementEnd = '      </div>\n    </main>\n\n    <style>{`@media (max-width: 900px) { .stats-grid { grid-template-columns: repeat(2,1fr) !important; } } @media (max-width: 500px) { .stats-grid { grid-template-columns: 1fr !important; } }`}</style>\n    <ImageModal imageUrl={zoomImage} onClose={() => setZoomImage(null)} />\n  </div>\n);\n}';

if (!content.includes(layoutEndStr)) {
  console.error("Could not find layout end markers");
  process.exit(1);
}

content = content.replace(layoutEndStr, replacementEnd);

fs.writeFileSync(filePath, content);
console.log("SUCCESS");
