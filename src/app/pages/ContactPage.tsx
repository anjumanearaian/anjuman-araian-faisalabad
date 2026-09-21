import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Phone, MapPin, Send, CheckCircle } from "lucide-react";
import { createMessage } from "../lib/messageStore";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

const leadershipContacts = [
  { role: "President", name: "Dr M. Ahsanul Haq", phone: "+92 301 866 5199" },
  { role: "General Secretary", name: "Dr Mian Saqib Rehman", phone: "+92 300 865 5522" },
];

const blank = { name: "", email: "", phone: "", subject: "", message: "" };

export function ContactPage() {
  const [form, setForm] = useState(blank);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createMessage({
        type: "contact",
        name: form.name,
        email: form.email,
        phone: form.phone,
        message: `Subject: ${form.subject}\n\n${form.message}`,
      });
      setSent(true);
      setForm(blank);
      setTimeout(() => setSent(false), 5000);
    } catch (err) {
      console.error("Failed to send message", err);
      alert("Failed to send message. Please try again.");
    }
  };

  return (
    <div>
      <PageHeader title="Contact Us" subtitle="Official contact information for Anjuman-e-Araian Faisalabad" breadcrumb={["Home", "Contact"]} />

      <div style={{ width: "100%", minHeight: 210, backgroundColor: "#fce8e6", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: `3px solid ${GOLD}`, padding: "28px 20px", boxSizing: "border-box" }}>
        <div style={{ textAlign: "center", maxWidth: 760 }}>
          <MapPin size={36} color={GREEN} style={{ margin: "0 auto 8px" }} />
          <p style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, margin: "0 0 14px" }}>Faisalabad</p>
          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 14 }}>
            {leadershipContacts.map((contact) => (
              <a
                key={contact.role}
                href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#555", fontSize: 14, textDecoration: "none", background: "rgba(255,255,255,.62)", border: "1px solid rgba(26,77,46,.12)", borderRadius: 999, padding: "8px 14px" }}
              >
                <Phone size={14} color={GOLD} />
                <strong style={{ color: GREEN }}>{contact.role}:</strong>
                <span>{contact.name}</span>
                <span>{contact.phone}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 48 }} className="contact-layout">
          {/* Info */}
          <div>
            <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, marginBottom: 6 }}>Get in Touch</h2>
            <div style={{ width: 48, height: 3, backgroundColor: GOLD, borderRadius: 2, marginBottom: 24 }} />

            <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Faisalabad</h3>
            <div style={{ backgroundColor: "#f8f5ef", borderRadius: 10, padding: "18px", border: `1px solid rgba(200,160,74,0.2)` }}>
              <p style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, margin: "0 0 14px" }}>Faisalabad</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {leadershipContacts.map((contact) => (
                  <div key={contact.role}>
                    <p style={{ margin: 0, color: "#555", fontSize: 13, fontWeight: 700 }}>{contact.role}</p>
                    <p style={{ margin: "2px 0 5px", color: GREEN, fontSize: 14, fontWeight: 700 }}>{contact.name}</p>
                    <a href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`} style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#555", fontSize: 13, textDecoration: "none" }}>
                      <Phone size={13} color={GOLD} /> {contact.phone}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Form */}
          <div style={{ backgroundColor: "white", borderRadius: 14, padding: "36px 32px", boxShadow: "0 4px 24px rgba(0,0,0,0.07)", border: `1px solid rgba(26,77,46,0.08)` }}>
            {sent ? (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <CheckCircle size={52} color={GREEN} style={{ margin: "0 auto 16px" }} />
                <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Message Sent!</h3>
                <p style={{ color: "#666", fontSize: 15, lineHeight: 1.8 }}>Thank you for contacting us. We will respond within 24–48 hours.</p>
              </div>
            ) : (
              <>
                <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Send a Message</h3>
                <form onSubmit={submit}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    {[{ key: "name", label: "Full Name *", type: "text", placeholder: "Ch. Muhammad Ali" }, { key: "email", label: "Email *", type: "email", placeholder: "you@example.com" }].map(({ key, label, type, placeholder }) => (
                      <div key={key}>
                        <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{label}</label>
                        <input required type={type} placeholder={placeholder} value={form[key as keyof typeof form]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                          style={{ width: "100%", padding: "10px 14px", border: `1px solid rgba(26,77,46,0.2)`, borderRadius: 7, fontSize: 14, boxSizing: "border-box" }} />
                      </div>
                    ))}
                  </div>
                  {[{ key: "phone", label: "Phone Number", type: "tel", placeholder: "+92 300 000 0000" }, { key: "subject", label: "Subject *", type: "text", placeholder: "Membership Inquiry" }].map(({ key, label, type, placeholder }) => (
                    <div key={key} style={{ marginBottom: 16 }}>
                      <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{label}</label>
                      <input type={type} placeholder={placeholder} value={form[key as keyof typeof form]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                        style={{ width: "100%", padding: "10px 14px", border: `1px solid rgba(26,77,46,0.2)`, borderRadius: 7, fontSize: 14, boxSizing: "border-box" }} />
                    </div>
                  ))}
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Message *</label>
                    <textarea required rows={5} placeholder="How can we help you?" value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                      style={{ width: "100%", padding: "10px 14px", border: `1px solid rgba(26,77,46,0.2)`, borderRadius: 7, fontSize: 14, resize: "vertical", boxSizing: "border-box" }} />
                  </div>
                  <button type="submit" style={{ display: "flex", alignItems: "center", gap: 10, backgroundColor: GREEN, color: "white", border: "none", borderRadius: 8, padding: "13px 28px", fontWeight: 700, fontSize: 14, cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    <Send size={16} /> Send Message
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
      <style>{`@media (max-width: 900px) { .contact-layout { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
