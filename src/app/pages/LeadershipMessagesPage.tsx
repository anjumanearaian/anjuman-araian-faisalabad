import { useEffect, useState } from "react";
import { Quote } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { ResponsiveImage } from "../components/ui/ResponsiveImage";
import { fetchLeadershipMessages, fetchLeadershipProfiles, LeadershipMessageData } from "../lib/leadershipStore";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

type MessageWithType = LeadershipMessageData & { type: string };

const defaults: Record<"president" | "secretary", MessageWithType> = {
  president: {
    type: "president",
    name: "Dr Ahsan-ul-Haq",
    body: "It is a privilege to serve the Araian community of Faisalabad. Our priorities are unity, welfare, education and transparent community service.",
    attributes: [],
  },
  secretary: {
    type: "secretary",
    name: "Dr Mian Saqib Rahman",
    body: "We welcome members to participate in Anjuman-e-Araian Faisalabad's welfare, educational and community programmes.",
    attributes: [],
  },
};

export function LeadershipMessagesPage() {
  const [president, setPresident] = useState<MessageWithType>(defaults.president);
  const [secretary, setSecretary] = useState<MessageWithType>(defaults.secretary);
  const [profileImages, setProfileImages] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([fetchLeadershipMessages(), fetchLeadershipProfiles()])
      .then(([messages, profiles]) => {
        const p = messages.find((m) => m.type === "president");
        const s = messages.find((m) => m.type === "secretary");
        if (p) setPresident(p);
        if (s) setSecretary(s);
        const next: Record<string, string> = {};
        const pProfile = profiles.find((profile) => /president/i.test(profile.role));
        const sProfile = profiles.find((profile) => /general secretary/i.test(profile.role));
        if (pProfile?.image) next.president = pProfile.image;
        if (sProfile?.image) next.secretary = sProfile.image;
        setProfileImages(next);
      })
      .catch(() => {});
  }, []);

  const sections = [
    { id: "president", role: "President", message: president, image: president.photo || profileImages.president },
    { id: "secretary", role: "General Secretary", message: secretary, image: secretary.photo || profileImages.secretary },
  ];

  return (
    <div>
      <PageHeader title="Leadership Messages" subtitle="Messages from the President and General Secretary of Anjuman-e-Araian Faisalabad" breadcrumb={["Home", "About Us", "Leadership Messages"]} />
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "58px 24px 76px" }}>
        <div style={{ display: "grid", gap: 28 }}>
          {sections.map(({ id, role, message, image }) => (
            <article id={id} key={id} style={{ background: "white", border: "1px solid #e4e9e5", borderRadius: 16, overflow: "hidden", boxShadow: "0 10px 34px rgba(26,77,46,.07)" }}>
              <div className="leadership-message-grid" style={{ display: "grid", gridTemplateColumns: "280px minmax(0,1fr)" }}>
                <aside style={{ background: "linear-gradient(180deg,#f8f5ef,#eef5f0)", padding: 28, borderRight: "1px solid #e3e7e3", textAlign: "center" }}>
                  {image ? (
                    <ResponsiveImage src={image} alt={`${message.name}, ${role}`} widthHint={560} sizes="280px" style={{ width: "100%", maxWidth: 220, aspectRatio: "5 / 6", objectFit: "cover", objectPosition: "top", borderRadius: 12, border: `3px solid ${GOLD}`, background: "white" }} />
                  ) : (
                    <div style={{ width: "100%", maxWidth: 220, aspectRatio: "5 / 6", margin: "0 auto", borderRadius: 12, border: `3px solid ${GOLD}`, background: "#f0f7f3", color: GREEN, display: "grid", placeItems: "center", fontFamily: "'Playfair Display', serif", fontSize: 58, fontWeight: 700 }}>{message.name?.[0] || role[0]}</div>
                  )}
                  <p style={{ color: GOLD, textTransform: "uppercase", fontSize: 11, fontWeight: 900, letterSpacing: ".09em", margin: "18px 0 5px" }}>{role}</p>
                  <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22, lineHeight: 1.25, margin: 0 }}>{message.name}</h2>
                  <p style={{ color: "#7b837d", fontSize: 12, marginTop: 6 }}>Anjuman-e-Araian Faisalabad</p>
                  {!!message.attributes?.length && (
                    <div style={{ textAlign: "left", marginTop: 18, borderTop: "1px solid #dfe6e0", paddingTop: 12 }}>
                      {message.attributes.map((attr, index) => (
                        <div key={`${attr.label}-${index}`} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", fontSize: 12, borderBottom: "1px solid #e7ebe8" }}><span style={{ color: "#858c86" }}>{attr.label}</span><strong style={{ color: GREEN, textAlign: "right" }}>{attr.value}</strong></div>
                      ))}
                    </div>
                  )}
                </aside>

                <div style={{ padding: "clamp(28px,5vw,52px)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, color: GOLD, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", fontSize: 11, marginBottom: 13 }}><Quote size={23} /> Leadership Message</div>
                  <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.8rem,4vw,2.55rem)", margin: "0 0 8px" }}>{message.name}</h3>
                  <p style={{ color: "#7c847e", margin: "0 0 24px", fontSize: 13 }}>{role}, Anjuman-e-Araian Faisalabad</p>
                  <div dir="auto" className="leadership-message-body" style={{ color: "#414942", fontSize: 16, lineHeight: 1.95 }} dangerouslySetInnerHTML={{ __html: message.body }} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
      <style>{`@media(max-width:760px){.leadership-message-grid{grid-template-columns:1fr!important}.leadership-message-grid aside{border-right:0!important;border-bottom:1px solid #e3e7e3}} .leadership-message-body img{max-width:100%;height:auto}`}</style>
    </div>
  );
}
