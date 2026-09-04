import { useState } from "react";
import { Link } from "react-router";
import { PageHeader } from "../components/PageHeader";
import { Mail, ArrowLeft, User, MessageCircle, FileText, Send, CheckCircle } from "lucide-react";
import { getSiteSettings } from "../lib/settingsStore";
import { createMessage } from "../lib/messageStore";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

export function MemberForgotPasswordPage() {
  const settings = getSiteSettings();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("I forgot my password for the Anjuman member portal. Please reset my password and send me a temporary password.");
  const [sent, setSent] = useState(false);

  const adminWhatsApp = settings.whatsappNumber ? settings.whatsappNumber.replace(/\D/g, "") : "923000000000";
  const adminEmail = settings.contactEmail || "info@anjumanearaien.com";

  // Pre-formatted messages
  const getMessageString = () => {
    return `Assalam-o-Alaikum Admin,\n\nI need to reset my Anjuman-e-Araian Member Portal password.\n\n*My Details:*\n- *Name:* ${name}\n- *Email:* ${email}\n- *Message:* ${message}`;
  };

  const handleSubmit = async () => {
    if (!name || !email) {
      alert("Please fill in your Name and Email first.");
      return;
    }
    
    try {
      await createMessage({
        type: "forgot_password",
        name,
        email,
        message,
      });

      setSent(true);
      setTimeout(() => {
        setSent(false);
        setName("");
        setEmail("");
        setMessage("I forgot my password for the Anjuman member portal. Please reset my password and send me a temporary password.");
      }, 5000);
    } catch (err) {
      console.error("Failed to send request", err);
      alert("Failed to send request. Please try again.");
    }
  };

  const handleWhatsApp = () => {
    if (!name || !email) {
      alert("Please fill in your Name and Email first.");
      return;
    }
    const text = encodeURIComponent(getMessageString());
    window.open(`https://wa.me/${adminWhatsApp}?text=${text}`, "_blank");
  };

  const handleEmail = () => {
    if (!name || !email) {
      alert("Please fill in your Name and Email first.");
      return;
    }
    const subject = encodeURIComponent("Anjuman Member Password Reset Request");
    const body = encodeURIComponent(`Admin,\n\nI need to reset my Anjuman-e-Araian Member Portal password.\n\nMy Details:\n- Name: ${name}\n- Email: ${email}\n- Message: ${message}`);
    window.location.href = `mailto:${adminEmail}?subject=${subject}&body=${body}`;
  };

  return (
    <div>
      <PageHeader title="Forgot Password" subtitle="Request a password reset from the Anjuman Administration" breadcrumb={["Home", "Member Portal", "Forgot Password"]} />
      
      <div style={{ minHeight: "65vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px", backgroundColor: "#f8f5ef" }}>
        <div style={{ backgroundColor: "white", borderRadius: 16, padding: "40px", width: "100%", maxWidth: 500, boxShadow: "0 8px 40px rgba(0,0,0,0.08)" }}>
          
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: "rgba(26,77,46,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <ShieldIcon size={24} color={GREEN} />
            </div>
            <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Password Reset Help</h2>
            <p style={{ color: "#666", fontSize: 13, lineHeight: 1.6 }}>
              Since all member profiles are securely verified by the administration, please fill in your details below to request a password reset from the Admin.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                <User size={14} /> Full Name
              </label>
              <input 
                type="text" 
                required 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your registered name"
                style={inputStyle} 
              />
            </div>

            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                <Mail size={14} /> Registered Email
              </label>
              <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={inputStyle} 
              />
            </div>

            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                <FileText size={14} /> Message / Description
              </label>
              <textarea 
                rows={3}
                value={message} 
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Explain details if needed..."
                style={{ ...inputStyle, resize: "vertical" }} 
              />
            </div>
          </div>
          
          {sent ? (
            <div style={{ textAlign: "center", padding: "32px 0", marginBottom: 24 }}>
              <CheckCircle size={48} color={GREEN} style={{ margin: "0 auto 16px" }} />
              <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Request Sent!</h3>
              <p style={{ color: "#666", fontSize: 14, lineHeight: 1.6 }}>The admin has received your password reset request and will process it shortly.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              <button 
                onClick={handleSubmit}
                style={{ width: "100%", backgroundColor: GREEN, color: "white", border: "none", borderRadius: 8, padding: "13px 0", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Poppins', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <Send size={18} /> Submit Request to Admin
              </button>
              
              <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "8px 0" }}>
                <div style={{ flex: 1, height: 1, backgroundColor: "#eee" }} />
                <span style={{ color: "#aaa", fontSize: 12, fontWeight: 600, textTransform: "uppercase" }}>Or Contact Directly</span>
                <div style={{ flex: 1, height: 1, backgroundColor: "#eee" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <button 
                  onClick={handleWhatsApp}
                  style={{ width: "100%", backgroundColor: "#25D366", color: "white", border: "none", borderRadius: 8, padding: "11px 0", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Poppins', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  <MessageCircle size={16} fill="white" /> WhatsApp
                </button>

                <button 
                  onClick={handleEmail}
                  style={{ width: "100%", backgroundColor: "#333", color: "white", border: "none", borderRadius: 8, padding: "11px 0", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Poppins', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  <Mail size={16} /> Email
                </button>
              </div>
            </div>
          )}

          <div style={{ textAlign: "center", borderTop: "1px solid #f3f4f6", paddingTop: 16 }}>
            <Link to="/member/login" style={{ color: "#666", fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <ArrowLeft size={14} /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple Shield icon using lucide SVG structure
function ShieldIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  border: "1px solid rgba(26,77,46,0.2)",
  borderRadius: 8,
  fontSize: 14,
  boxSizing: "border-box" as const,
  fontFamily: "'Lato', sans-serif"
};
