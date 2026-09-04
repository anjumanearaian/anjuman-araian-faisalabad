import { useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { getSiteSettings } from "../lib/settingsStore";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";
const WA_GREEN = "#25D366";

const quickMessages = [
  "Assalam-o-Alaikum! I'd like to know more about Anjuman-e-Araian membership.",
  "I need help with my membership application.",
  "Please share details about upcoming events.",
  "I have a welfare-related inquiry.",
];

export function WhatsAppButton() {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");

  const openChat = (msg: string) => {
    const num = getSiteSettings().whatsappNumber || "923001234567";
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank");
    setOpen(false);
    setCustom("");
  };

  return (
    <>
      {/* Popup panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: 90, right: 24, zIndex: 999,
          backgroundColor: "white", borderRadius: 16, width: 310,
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)", overflow: "hidden",
          animation: "waSlideUp 0.2s ease",
        }}>
          {/* Header */}
          <div style={{ backgroundColor: WA_GREEN, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "white", fontFamily: "'Amiri', serif", fontSize: 18, fontWeight: 700 }}>ع</span>
              </div>
              <div>
                <p style={{ color: "white", fontWeight: 700, fontSize: 14, margin: 0 }}>Anjuman-e-Araian</p>
                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, margin: 0 }}>Typically replies within hours</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.8)", cursor: "pointer" }}>
              <X size={18} />
            </button>
          </div>

          {/* Chat bubble */}
          <div style={{ padding: "14px 16px", backgroundColor: "#f0f7f3" }}>
            <div style={{ backgroundColor: "white", borderRadius: "4px 12px 12px 12px", padding: "10px 14px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", maxWidth: "85%", display: "inline-block" }}>
              <p style={{ color: "#333", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                Assalam-o-Alaikum! 👋<br />
                How can we help you today? Select a topic or type your message below.
              </p>
              <p style={{ color: "#aaa", fontSize: 11, margin: "6px 0 0", textAlign: "right" }}>Anjuman Support</p>
            </div>
          </div>

          {/* Quick message options */}
          <div style={{ padding: "12px 14px", borderTop: "1px solid #f0f0f0" }}>
            <p style={{ color: "#888", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Quick Messages</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {quickMessages.map((msg) => (
                <button key={msg} onClick={() => openChat(msg)} style={{ textAlign: "left", backgroundColor: "#f0f7f3", border: `1px solid rgba(26,77,46,0.15)`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: GREEN, cursor: "pointer", fontFamily: "'Lato', sans-serif", lineHeight: 1.4, fontWeight: 500 }}>
                  {msg}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && custom.trim() && openChat(custom)}
                placeholder="Type your message…"
                style={{ flex: 1, padding: "9px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontFamily: "'Lato', sans-serif", outline: "none" }}
              />
              <button onClick={() => custom.trim() && openChat(custom)} style={{ backgroundColor: WA_GREEN, color: "white", border: "none", borderRadius: 8, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="WhatsApp Chat"
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 1000,
          width: 56, height: 56, borderRadius: "50%",
          backgroundColor: WA_GREEN,
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(37,211,102,0.5)",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.1)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
      >
        {open ? <X size={24} color="white" /> : <MessageCircle size={26} color="white" fill="white" />}
      </button>

      {/* Tooltip label */}
      {!open && (
        <div style={{
          position: "fixed", bottom: 32, right: 88, zIndex: 999,
          backgroundColor: "#333", color: "white", fontSize: 12, fontWeight: 600,
          padding: "6px 12px", borderRadius: 20, whiteSpace: "nowrap",
          pointerEvents: "none",
        }}>
          Chat on WhatsApp
        </div>
      )}

      <style>{`
        @keyframes waSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
