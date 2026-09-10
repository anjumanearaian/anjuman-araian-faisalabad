import { useEffect, useState } from "react";
import { Quote, UserRound } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { fetchLeadershipMessages, fetchLeadershipProfiles, LeadershipMessageData } from "../lib/leadershipStore";

const GREEN = "#1a4d2e";
const DARK_GREEN = "#123d28";
const GOLD = "#c8a04a";

export function SecretaryMessagePage() {
  const [msg, setMsg] = useState<LeadershipMessageData>({
    name: "Dr Mian Saqib Rahman",
    body: "We welcome members to participate in Anjuman-e-Araian Faisalabad's welfare, educational and community programmes.",
    attributes: [],
  });
  const [profileImage, setProfileImage] = useState("");

  useEffect(() => {
    Promise.all([fetchLeadershipMessages(), fetchLeadershipProfiles()])
      .then(([messages, profiles]) => {
        const secretaryMessage = messages.find((item) => item.type === "secretary");
        if (secretaryMessage) setMsg(secretaryMessage);
        const profile = profiles.find((item) => item.role.toLowerCase().includes("general secretary"));
        if (profile?.image) setProfileImage(profile.image);
      })
      .catch(() => {});
  }, []);

  const photo = msg.photo || profileImage;

  return (
    <div style={{ background: "#f7faf8" }}>
      <PageHeader
        title="General Secretary's Message"
        subtitle="A message from the General Secretary of Anjuman-e-Araian Faisalabad"
        breadcrumb={["Home", "Leadership", "General Secretary's Message"]}
      />

      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "56px 24px 72px" }}>
        <div className="leadership-message-grid" style={{ display: "grid", gridTemplateColumns: "300px minmax(0, 1fr)", gap: 34, alignItems: "start" }}>
          <aside style={{ background: "white", borderRadius: 18, overflow: "hidden", border: "1px solid #e7eee9", boxShadow: "0 12px 34px rgba(18,61,40,0.08)" }}>
            <div style={{ height: 8, background: `linear-gradient(90deg, ${GREEN}, ${GOLD})` }} />
            <div style={{ padding: "26px 24px 24px", textAlign: "center" }}>
              <div style={{ width: 230, height: 285, maxWidth: "100%", margin: "0 auto", borderRadius: 14, overflow: "hidden", background: "#eef5f0", border: `3px solid ${GOLD}`, display: "grid", placeItems: "center" }}>
                {photo ? (
                  <img src={photo} alt={`${msg.name || "General Secretary"}, General Secretary`} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }} />
                ) : (
                  <UserRound size={72} color={GREEN} strokeWidth={1.4} />
                )}
              </div>

              <p style={{ color: GOLD, fontSize: 11, fontWeight: 800, letterSpacing: "0.11em", textTransform: "uppercase", margin: "20px 0 8px" }}>General Secretary</p>
              <h2 style={{ color: DARK_GREEN, fontFamily: "'Playfair Display', serif", fontSize: 23, lineHeight: 1.25, fontWeight: 700, margin: 0 }}>{msg.name || "General Secretary"}</h2>
              <p style={{ color: "#728078", fontSize: 12, lineHeight: 1.6, margin: "7px 0 0" }}>Anjuman-e-Araian Faisalabad</p>

              {msg.attributes && msg.attributes.length > 0 && (
                <div style={{ marginTop: 22, paddingTop: 16, borderTop: "1px solid #edf1ee", textAlign: "left" }}>
                  {msg.attributes.map((attr, index) => (
                    <div key={`${attr.label}-${index}`} style={{ padding: "9px 0", borderBottom: index === msg.attributes!.length - 1 ? "none" : "1px solid #f0f3f1" }}>
                      <div style={{ color: "#8a938e", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{attr.label}</div>
                      <div style={{ color: DARK_GREEN, fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>{attr.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <article style={{ background: "white", borderRadius: 18, border: "1px solid #e7eee9", boxShadow: "0 12px 34px rgba(18,61,40,0.07)", overflow: "hidden" }}>
            <div style={{ padding: "34px 38px 14px", borderBottom: "1px solid #edf1ee" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", display: "grid", placeItems: "center", background: "#f4efe4", color: GOLD }}>
                  <Quote size={21} fill="currentColor" />
                </div>
                <div>
                  <p style={{ color: GOLD, fontSize: 11, fontWeight: 800, letterSpacing: "0.11em", textTransform: "uppercase", margin: 0 }}>Leadership Message</p>
                  <p style={{ color: "#7d8882", fontSize: 12, margin: "4px 0 0" }}>From the office of the General Secretary</p>
                </div>
              </div>
              <h2 style={{ color: DARK_GREEN, fontFamily: "'Playfair Display', serif", fontSize: "clamp(25px, 3vw, 34px)", lineHeight: 1.25, margin: "0 0 8px" }}>{msg.name}</h2>
              <p style={{ color: "#728078", fontSize: 13, margin: 0 }}>General Secretary, Anjuman-e-Araian Faisalabad</p>
            </div>

            <div className="leadership-message-body" dir="auto" style={{ padding: "30px 38px 38px", color: "#39453f", fontSize: 16, lineHeight: 2 }} dangerouslySetInnerHTML={{ __html: msg.body }} />
          </article>
        </div>
      </section>

      <style>{`
        .leadership-message-body p { margin: 0 0 18px; }
        .leadership-message-body p:last-child { margin-bottom: 0; }
        .leadership-message-body ul, .leadership-message-body ol { padding-inline-start: 24px; margin: 0 0 18px; }
        .leadership-message-body blockquote { margin: 22px 0; padding: 14px 20px; border-inline-start: 3px solid ${GOLD}; background: #faf8f3; border-radius: 0 10px 10px 0; }
        @media (max-width: 820px) {
          .leadership-message-grid { grid-template-columns: 1fr !important; }
          .leadership-message-grid aside { max-width: 420px; width: 100%; margin: 0 auto; }
        }
        @media (max-width: 560px) {
          .leadership-message-body { padding: 24px !important; font-size: 15px !important; }
          .leadership-message-grid article > div:first-child { padding: 26px 24px 14px !important; }
        }
      `}</style>
    </div>
  );
}
