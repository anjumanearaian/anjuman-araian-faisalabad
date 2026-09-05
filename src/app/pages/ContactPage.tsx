import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Phone, Mail, MapPin, Clock, Send, CheckCircle } from "lucide-react";
import { createMessage } from "../lib/messageStore";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

const offices = [
  { city: "Faisalabad (Head Office)", address: "Central Secretariat, Anjuman-e-Araian, Faisalabad", phone: "+92 300 865 5522", email: "anjumanearaianfaisalabad@gmail.com" },
  { city: "Karachi", address: "Plot 45, Block 7, Gulshan-e-Iqbal, Karachi", phone: "+92 21 3456 7890", email: "karachi@anjumanearaian.org" },
  { city: "Islamabad", address: "House 10, Street 4, F-8/2, Islamabad", phone: "+92 51 2345 6789", email: "islamabad@anjumanearaian.org" },
  { city: "Faisalabad", address: "Canal Road, Near Government College, Faisalabad", phone: "+92 41 3456 7890", email: "faisalabad@anjumanearaian.org" },
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
      <PageHeader title="Contact Us" subtitle="We are here to help — reach out to any of our offices" breadcrumb={["Home", "Contact"]} />

      {/* Map placeholder */}
      <div style={{ width: "100%", height: 240, backgroundColor: "#fce8e6", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: `3px solid ${GOLD}` }}>
        <div style={{ textAlign: "center" }}>
          <MapPin size={36} color={GREEN} style={{ margin: "0 auto 8px" }} />
          <p style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700 }}>Anjuman-e-Araian Head Office</p>
          <p style={{ color: "#666", fontSize: 14 }}>12 Temple Road, Lahore — 54000, Pakistan</p>
        </div>
      </div>

      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 48 }} className="contact-layout">
          {/* Info */}
          <div>
            <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, marginBottom: 6 }}>Get in Touch</h2>
            <div style={{ width: 48, height: 3, backgroundColor: GOLD, borderRadius: 2, marginBottom: 24 }} />

            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", backgroundColor: GREEN, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Clock size={18} color={GOLD} />
              </div>
              <div>
                <p style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Office Hours</p>
                <p style={{ color: "#666", fontSize: 13, lineHeight: 1.8 }}>Monday – Friday: 9:00 AM – 5:00 PM<br />Saturday: 9:00 AM – 1:00 PM<br />Sunday: Closed</p>
              </div>
            </div>

            <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Our Offices</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {offices.map((o) => (
                <div key={o.city} style={{ backgroundColor: "#f8f5ef", borderRadius: 10, padding: "16px 18px", border: `1px solid rgba(200,160,74,0.2)` }}>
                  <p style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{o.city}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, color: "#555", fontSize: 13 }}><MapPin size={12} color={GOLD} /> {o.address}</span>
                    <a href={`tel:${o.phone}`} style={{ display: "flex", alignItems: "center", gap: 8, color: "#555", fontSize: 13, textDecoration: "none" }}><Phone size={12} color={GOLD} /> {o.phone}</a>
                    <a href={`mailto:${o.email}`} style={{ display: "flex", alignItems: "center", gap: 8, color: "#555", fontSize: 13, textDecoration: "none" }}><Mail size={12} color={GOLD} /> {o.email}</a>
                  </div>
                </div>
              ))}
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
