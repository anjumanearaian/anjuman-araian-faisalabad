import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Heart, LockKeyhole, ShieldCheck, UserPlus, Users, Globe2, BadgeCheck, ArrowRight, LogIn } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { PasswordlessSignIn } from "../components/PasswordlessSignIn";
import { fetchMyMatrimonialProfiles, fetchPublicMatrimonialStats, MatrimonialProfile, MatrimonialPublicStats } from "../lib/matrimonialStore";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

export function MatrimonialMemberOnlyPage() {
  const [authenticated, setAuthenticated] = useState(() => Boolean(localStorage.getItem("araian_member_token")));
  const [profiles, setProfiles] = useState<MatrimonialProfile[]>([]);
  const [stats, setStats] = useState<MatrimonialPublicStats>({ total: 0, pakistan: 0, overseas: 0, verified: 0, privacy: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const publicStats = await fetchPublicMatrimonialStats();
      setStats(publicStats);
      if (authenticated) {
        try { setProfiles(await fetchMyMatrimonialProfiles()); }
        catch (e: any) {
          if (e?.status === 401) { localStorage.removeItem("araian_member_token"); setAuthenticated(false); setProfiles([]); }
          else throw e;
        }
      }
    } catch (e: any) { setError(e?.message || "Matrimonial service could not be loaded."); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [authenticated]);

  return (
    <div>
      <PageHeader title="Private Matrimonial Matching" subtitle="Verified profiles, compatibility matching and consent-controlled introductions" breadcrumb={["Home", "Matrimonial"]}/>
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "36px 20px 74px" }}>
        <div style={{ background: "#f0f7f3", border: "1px solid rgba(26,77,46,.15)", borderRadius: 14, padding: 18, display: "flex", gap: 12, marginBottom: 22 }}>
          <ShieldCheck size={22} color={GREEN} style={{ flexShrink: 0 }}/>
          <div><strong style={{ color: GREEN }}>Privacy by design</strong><p style={{ margin: "5px 0 0", color: "#56625a", fontSize: 13, lineHeight: 1.7 }}>No candidate name, photograph, phone number or private family detail is displayed publicly. Matching starts with anonymized profile codes and compatibility scores. Expanded details are released only through the consent workflow.</p></div>
        </div>

        <div className="mat-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 26 }}>
          <Stat icon={<Users size={18}/>} title="Active Profiles" value={stats.total}/>
          <Stat icon={<Heart size={18}/>} title="Pakistan" value={stats.pakistan}/>
          <Stat icon={<Globe2 size={18}/>} title="Overseas" value={stats.overseas}/>
          <Stat icon={<BadgeCheck size={18}/>} title="Verified" value={stats.verified}/>
        </div>

        {error && <div style={{ background: "#fee2e2", color: "#b91c1c", borderRadius: 9, padding: 12, marginBottom: 18 }}>{error}</div>}

        {!authenticated ? (
          <div className="mat-gate" style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 24, alignItems: "stretch" }}>
            <div style={card}>
              <LockKeyhole size={34} color={GOLD}/>
              <h2 style={heading}>Verified sign-in before profile access</h2>
              <p style={body}>Pakistan-based and overseas applicants may use the service. A verified email account is required before creating a candidate profile or viewing anonymized matches. Anjuman membership can be linked where available, but it is not required simply to start a matrimonial application.</p>
              <div style={{ display: "grid", gap: 9, marginTop: 18 }}>
                <Step n="1" text="Verify email or Google account"/>
                <Step n="2" text="Create a candidate profile for self or an authorized family member"/>
                <Step n="3" text="Set layered partner preferences and privacy controls"/>
                <Step n="4" text="Receive compatibility scores and send interest without exposing contact details"/>
              </div>
            </div>
            <div style={card}><LogIn size={30} color={GREEN}/><h2 style={heading}>Sign in securely</h2><p style={body}>Use a verified email account. Your private profile remains separate from the public website.</p><PasswordlessSignIn onAuthenticated={() => setAuthenticated(true)} compact/></div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", flexWrap: "wrap", marginBottom: 18 }}>
              <div><h2 style={{ ...heading, margin: 0 }}>My Candidate Profiles</h2><p style={{ ...body, margin: "5px 0 0" }}>You can manage more than one candidate, for example Self, Son, Daughter, Brother or Sister, under the same verified account.</p></div>
              <Link to="/matrimonial/new" style={primaryLink}><UserPlus size={15}/> Create Candidate Profile</Link>
            </div>

            {loading ? <div style={{ padding: 36, textAlign: "center", color: "#777" }}>Loading candidate records...</div> : profiles.length ? (
              <div style={{ display: "grid", gap: 14 }}>
                {profiles.map((p) => <article key={p.id} style={{ ...card, padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
                    <div><div style={{ color: GREEN, fontWeight: 900, fontSize: 14 }}>{p.profileCode}</div><h3 style={{ margin: "4px 0 3px", color: "#26382d" }}>{p.name || "Candidate"}</h3><div style={{ color: "#777", fontSize: 12, textTransform: "capitalize" }}>{p.relationToCandidate || "Self"} · {p.gender} · {p.age} years · {p.city}{p.country && p.country !== "Pakistan" ? `, ${p.country}` : ""}</div></div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><Badge text={p.status || "pending"}/><Badge text={`Profile ${p.profileCompleteness || 0}%`}/><Badge text={p.verificationStatus || "unverified"}/></div>
                  </div>
                  <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 16 }}>
                    <Link to={`/matrimonial/new?profileId=${encodeURIComponent(p.id)}`} style={secondaryLink}>Edit Profile</Link>
                    {p.status === "approved" && p.showOnPortal ? <Link to={`/matrimonial/matches?profileId=${encodeURIComponent(p.id)}`} style={primaryLink}>View Matches <ArrowRight size={14}/></Link> : <span style={{ ...secondaryLink, opacity: .7, cursor: "default" }}>Matching opens after approval</span>}
                    <Link to="/matrimonial/requests" style={secondaryLink}>Interests & Requests</Link>
                  </div>
                </article>)}
              </div>
            ) : (
              <div style={{ ...card, textAlign: "center", padding: 34 }}><Heart size={32} color={GOLD}/><h3 style={{ color: GREEN, marginBottom: 7 }}>No candidate profile yet</h3><p style={body}>Create the first private candidate profile. It will remain hidden from matching until review and approval.</p><Link to="/matrimonial/new" style={primaryLink}><UserPlus size={15}/> Start Profile</Link></div>
            )}
          </>
        )}
      </section>
      <style>{`@media(max-width:820px){.mat-stats{grid-template-columns:repeat(2,1fr)!important}.mat-gate{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}

function Stat({ icon, title, value }: { icon: React.ReactNode; title: string; value: number }) { return <div style={{ background: "white", border: "1px solid #ebe5dc", borderRadius: 12, padding: 15, boxShadow: "0 2px 10px rgba(0,0,0,.035)" }}><div style={{ color: GOLD }}>{icon}</div><div style={{ color: "#777", fontSize: 11, marginTop: 7 }}>{title}</div><strong style={{ display: "block", color: GREEN, fontSize: 26, marginTop: 2 }}>{value}</strong></div>; }
function Step({ n, text }: { n: string; text: string }) { return <div style={{ display: "flex", gap: 9, alignItems: "center", color: "#4b5563", fontSize: 13 }}><span style={{ width: 23, height: 23, borderRadius: "50%", display: "grid", placeItems: "center", background: "#eef5f0", color: GREEN, fontWeight: 900, fontSize: 11 }}>{n}</span>{text}</div>; }
function Badge({ text }: { text: string }) { return <span style={{ background: "#f4f5f4", color: "#4b5563", borderRadius: 20, padding: "5px 9px", fontSize: 10, fontWeight: 800, textTransform: "capitalize" }}>{text.replace(/_/g, " ")}</span>; }
const card: React.CSSProperties = { background: "white", border: "1px solid #ebe5dc", borderRadius: 15, padding: 28, boxShadow: "0 6px 25px rgba(0,0,0,.055)" };
const heading: React.CSSProperties = { color: GREEN, fontFamily: "'Playfair Display', serif", margin: "12px 0 8px", fontSize: 22 };
const body: React.CSSProperties = { color: "#666", fontSize: 13, lineHeight: 1.75 };
const primaryLink: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, background: GREEN, color: "white", borderRadius: 8, padding: "10px 14px", textDecoration: "none", fontSize: 12, fontWeight: 800 };
const secondaryLink: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, background: "white", color: GREEN, border: "1px solid #d4ded7", borderRadius: 8, padding: "9px 13px", textDecoration: "none", fontSize: 12, fontWeight: 800 };
