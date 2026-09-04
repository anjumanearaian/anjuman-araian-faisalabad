import { PageHeader } from "../components/PageHeader";
import { FileText, Download, BookOpen, Shield, Scale } from "lucide-react";
import { getSiteSettings } from "../lib/settingsStore";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

const chapters = [
  { num: "I", title: "Name, Address and Objectives", desc: "Defines the official name, registered address, and founding objectives of the organization." },
  { num: "II", title: "Membership", desc: "Eligibility, categories of membership, registration process, fees, and rights of members." },
  { num: "III", title: "Central Executive Committee", desc: "Composition, powers, duties, election procedure, and term of the Central Executive Committee." },
  { num: "IV", title: "Office Bearers", desc: "Roles and responsibilities of the President, Vice Presidents, General Secretary, and Finance Secretary." },
  { num: "V", title: "District and Local Bodies", desc: "Formation, powers, and accountability of district, tehsil, and union council level bodies." },
  { num: "VI", title: "Women and Youth Wings", desc: "Structure and mandate of the Women's Wing and Youth Wing of the organization." },
  { num: "VII", title: "Finance and Accounts", desc: "Management of funds, audit requirements, financial year, and reporting obligations." },
  { num: "VIII", title: "Elections", desc: "Procedure for free, fair and transparent elections at all levels of the organization." },
  { num: "IX", title: "Amendments", desc: "Procedure for amending the constitution, requiring a two-thirds majority in General Assembly." },
  { num: "X", title: "Dissolution", desc: "Conditions under which the organization may be dissolved and disposal of assets." },
];

export function ConstitutionPage() {
  const settings = getSiteSettings();

  const handleDownload = (pdfUrl?: string, filename = "document.pdf") => {
    if (!pdfUrl) {
      alert("No PDF has been uploaded yet by the administrator.");
      return;
    }
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <PageHeader title="Constitution and Memorandum" subtitle="The foundational document governing Anjuman-e-Araian Pakistan" breadcrumb={["Home", "About", "Constitution"]} />

      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px" }}>
        {/* Download cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, marginBottom: 56 }} className="doc-grid">
          {[
            { icon: FileText, title: "Constitution of Anjuman-e-Araian", desc: "Complete constitution including all amendments up to 2024.", lang: "English and Urdu", size: "2.4 MB", url: settings.constitutionPdfUrl, filename: "Anjuman_Constitution.pdf" },
            { icon: BookOpen, title: "Memorandum of Association", desc: "Official memorandum filed with the Registrar of Societies, Punjab.", lang: "English", size: "1.1 MB", url: settings.memorandumPdfUrl, filename: "Anjuman_Memorandum.pdf" },
            { icon: Shield, title: "Rules and Regulations", desc: "Supplementary rules governing day-to-day operations and conduct.", lang: "Urdu", size: "0.9 MB", url: settings.rulesPdfUrl, filename: "Anjuman_Rules.pdf" },
          ].map(({ icon: Icon, title, desc, lang, size, url, filename }) => (
            <div key={title} style={{ backgroundColor: "#f8f5ef", borderRadius: 12, padding: 28, border: `1px solid rgba(200,160,74,0.25)`, textAlign: "center" }}>
              <div style={{ backgroundColor: GREEN, width: 60, height: 60, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Icon size={26} color={GOLD} />
              </div>
              <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, marginBottom: 10, lineHeight: 1.4 }}>{title}</h3>
              <p style={{ color: "#666", fontSize: 13, lineHeight: 1.7, marginBottom: 12 }}>{desc}</p>
              <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 18, fontSize: 12, color: "#888" }}>
                <span>📄 {lang}</span>
                {url && <span style={{ color: "#15803d", fontWeight: "bold" }}>✓ Available</span>}
              </div>
              <button
                style={{ display: "flex", alignItems: "center", gap: 8, backgroundColor: url ? GREEN : "#9ca3af", color: "white", border: "none", borderRadius: 6, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: url ? "pointer" : "not-allowed", margin: "0 auto", letterSpacing: "0.05em" }}
                onClick={() => handleDownload(url, filename)}
                disabled={!url}
              >
                <Download size={15} /> {url ? "Download PDF" : "Not Uploaded"}
              </button>
            </div>
          ))}
        </div>

        {/* Chapter overview */}
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Chapter Overview</h2>
          <div style={{ width: 56, height: 3, backgroundColor: GOLD, borderRadius: 2, marginBottom: 32 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="chapters-grid">
            {chapters.map((ch) => (
              <div key={ch.num} style={{ display: "flex", gap: 16, padding: "16px 20px", backgroundColor: "white", borderRadius: 8, border: `1px solid rgba(26,77,46,0.08)`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                <div style={{ minWidth: 44, height: 44, borderRadius: "50%", backgroundColor: GREEN, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: GOLD, fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700 }}>{ch.num}</span>
                </div>
                <div>
                  <p style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{ch.title}</p>
                  <p style={{ color: "#666", fontSize: 13, lineHeight: 1.7 }}>{ch.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Viewer placeholder */}
        <div style={{ backgroundColor: "#f0f4f1", borderRadius: 12, padding: "40px 24px", textAlign: "center", border: `2px dashed rgba(26,77,46,0.2)` }}>
          <Scale size={40} color={GREEN} style={{ margin: "0 auto 16px" }} />
          <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Online PDF Viewer</h3>
          <p style={{ color: "#666", fontSize: 14, lineHeight: 1.8, maxWidth: 480, margin: "0 auto 20px" }}>
            {settings.constitutionPdfUrl 
              ? "Read and navigate the official constitution online directly in your browser below."
              : "The interactive PDF viewer will display the full constitution here once the document is uploaded by the administrator."}
          </p>
          {settings.constitutionPdfUrl ? (
            <iframe 
              src={settings.constitutionPdfUrl} 
              style={{ width: "100%", height: 600, border: "none", borderRadius: 8, marginTop: 12, backgroundColor: "white" }} 
              title="Constitution PDF Viewer"
            />
          ) : (
            <button
              style={{ backgroundColor: GREEN, color: "white", border: "none", borderRadius: 6, padding: "10px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
              onClick={() => alert("Admin can upload the PDF from the Site Settings panel.")}
            >
              View Full Document
            </button>
          )}
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) { .doc-grid { grid-template-columns: 1fr !important; } .chapters-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
