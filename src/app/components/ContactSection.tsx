import { useState } from "react";
import { Phone, Mail, MapPin, Clock, Send } from "lucide-react";
import { getSiteSettings } from "../lib/settingsStore";

export function ContactSection() {
  const settings = getSiteSettings();
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
    setForm({ name: "", email: "", phone: "", subject: "", message: "" });
  };

  return (
    <section id="contact" style={{ backgroundColor: "#f8f5ef" }} className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-12">
          <p style={{ color: "#c8a04a", fontFamily: "'Poppins', sans-serif", fontSize: 13, letterSpacing: "0.12em", fontWeight: 600 }} className="uppercase mb-2">
            Get In Touch
          </p>
          <h2 style={{ color: "#1a4d2e", fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 3vw, 38px)", fontWeight: 700 }}>
            Contact Us
          </h2>
          <div style={{ backgroundColor: "#c8a04a", height: 3, width: 64 }} className="mx-auto mt-4 rounded" />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Info cards */}
          <div className="space-y-4">
            {[
              {
                icon: MapPin,
                title: "Head Office",
                lines: settings.address ? [settings.address] : ["Anjuman-e-Araian House,", "12 Temple Road, Lahore — 54000", "Punjab, Pakistan"],
              },
              {
                icon: Phone,
                title: "Phone",
                lines: settings.contactPhone ? [settings.contactPhone] : ["+92 42 1234 5678", "+92 42 1234 5679 (Fax)", "+92 300 1234 567 (Mobile)"],
              },
              {
                icon: Mail,
                title: "Email",
                lines: [settings.contactEmail || "anjumanearaianfaisalabad@gmail.com", "info@anjumanearaian.org"],
              },
              {
                icon: Clock,
                title: "Office Hours",
                lines: ["Mon – Fri: 9:00 AM – 5:00 PM", "Saturday: 9:00 AM – 1:00 PM", "Sunday: Closed"],
              },
            ].map(({ icon: Icon, title, lines }) => (
              <div
                key={title}
                className="flex items-start gap-4 bg-white rounded-lg p-4 shadow-sm"
                style={{ border: "1px solid rgba(26,77,46,0.08)" }}
              >
                <div
                  style={{ backgroundColor: "#1a4d2e", width: 44, height: 44, borderRadius: "50%", flexShrink: 0 }}
                  className="flex items-center justify-center"
                >
                  <Icon size={18} color="#c8a04a" />
                </div>
                <div>
                  <p style={{ color: "#1a4d2e", fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 600 }} className="mb-1">
                    {title}
                  </p>
                  {lines.map((line) => (
                    <p key={line} style={{ color: "#666", fontFamily: "'Poppins', sans-serif", fontSize: 13, lineHeight: 1.7 }}>
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Contact form */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-8" style={{ border: "1px solid rgba(26,77,46,0.08)" }}>
            {submitted ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <div style={{ backgroundColor: "#1a4d2e", width: 64, height: 64, borderRadius: "50%" }} className="flex items-center justify-center mb-4">
                  <Send size={28} color="#c8a04a" />
                </div>
                <h3 style={{ color: "#1a4d2e", fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700 }} className="mb-2">
                  Message Sent!
                </h3>
                <p style={{ color: "#666", fontFamily: "'Poppins', sans-serif", fontSize: 15 }}>
                  Thank you for contacting us. We will get back to you within 24–48 hours.
                </p>
              </div>
            ) : (
              <>
                <h3 style={{ color: "#1a4d2e", fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700 }} className="mb-6">
                  Send Us a Message
                </h3>
                <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
                  {[
                    { name: "name", label: "Full Name *", type: "text", placeholder: "Ch. Muhammad Ali", colSpan: false },
                    { name: "email", label: "Email Address *", type: "email", placeholder: "you@example.com", colSpan: false },
                    { name: "phone", label: "Phone Number", type: "tel", placeholder: "+92 300 000 0000", colSpan: false },
                    { name: "subject", label: "Subject *", type: "text", placeholder: "Membership Inquiry", colSpan: false },
                  ].map((field) => (
                    <div key={field.name}>
                      <label
                        style={{ color: "#1a4d2e", fontFamily: "'Poppins', sans-serif", fontSize: 13, fontWeight: 600 }}
                        className="block mb-1"
                      >
                        {field.label}
                      </label>
                      <input
                        type={field.type}
                        placeholder={field.placeholder}
                        required={field.label.includes("*")}
                        value={form[field.name as keyof typeof form]}
                        onChange={(e) => setForm((f) => ({ ...f, [field.name]: e.target.value }))}
                        style={{
                          border: "1px solid rgba(26,77,46,0.2)",
                          borderRadius: 6,
                          fontFamily: "'Poppins', sans-serif",
                          fontSize: 14,
                          color: "#333",
                          backgroundColor: "#fafaf8",
                          outline: "none",
                          width: "100%",
                          padding: "10px 14px",
                        }}
                      />
                    </div>
                  ))}

                  <div className="sm:col-span-2">
                    <label
                      style={{ color: "#1a4d2e", fontFamily: "'Poppins', sans-serif", fontSize: 13, fontWeight: 600 }}
                      className="block mb-1"
                    >
                      Message *
                    </label>
                    <textarea
                      rows={5}
                      placeholder="How can we help you?"
                      required
                      value={form.message}
                      onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                      style={{
                        border: "1px solid rgba(26,77,46,0.2)",
                        borderRadius: 6,
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: 14,
                        color: "#333",
                        backgroundColor: "#fafaf8",
                        outline: "none",
                        width: "100%",
                        padding: "10px 14px",
                        resize: "vertical",
                      }}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      style={{
                        backgroundColor: "#1a4d2e",
                        color: "white",
                        fontFamily: "'Poppins', sans-serif",
                        fontWeight: 700,
                        fontSize: 14,
                        letterSpacing: "0.08em",
                      }}
                      className="flex items-center gap-2 px-8 py-3 rounded uppercase hover:brightness-110 transition-all"
                    >
                      <Send size={15} /> Send Message
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
