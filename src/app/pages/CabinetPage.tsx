import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { fetchMemberDirectory, type DirectoryMember } from "../lib/memberDirectoryStore";
import { UserRound } from "lucide-react";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

type LeadershipMember = DirectoryMember & { leadershipRole: string; leadershipRank: number };

function roleKey(value?: string | null) {
  return String(value || "").toLowerCase().replace(/[._-]/g, " ").replace(/\s+/g, " ").trim();
}

function MemberCard({ member, featured = false }: { member: LeadershipMember; featured?: boolean }) {
  return (
    <article style={{
      textAlign: "center",
      padding: featured ? "22px 18px" : "18px 14px",
      background: "white",
      borderRadius: 14,
      border: `1px solid ${featured ? "rgba(200,160,74,.55)" : "#e6ebe7"}`,
      boxShadow: featured ? "0 10px 28px rgba(26,77,46,.10)" : "0 4px 16px rgba(26,77,46,.05)",
      minHeight: featured ? 210 : 190,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{ width: featured ? 82 : 68, height: featured ? 82 : 68, borderRadius: "50%", overflow: "hidden", background: "#f4f7f5", border: `3px solid ${GOLD}`, display: "grid", placeItems: "center", color: GREEN, marginBottom: 12 }}>
        {member.photoUrl ? <img src={member.photoUrl} alt={member.fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <UserRound size={featured ? 34 : 28} />}
      </div>
      <h3 style={{ margin: 0, color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: featured ? 18 : 15, lineHeight: 1.28 }}>{member.fullName}</h3>
      <div style={{ color: GOLD, fontWeight: 900, fontSize: 11.5, marginTop: 6 }}>{member.leadershipRole}</div>
      <div style={{ color: "#89928c", fontSize: 11, marginTop: 4 }}>{member.city || "Faisalabad"}</div>
    </article>
  );
}

function Section({ title, members, columns = 3 }: { title: string; members: LeadershipMember[]; columns?: number }) {
  if (!members.length) return null;
  return (
    <section style={{ marginTop: 30 }}>
      <h2 style={{ textAlign: "center", color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 20, margin: "0 0 16px" }}>{title}</h2>
      <div className="council-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(columns, Math.max(1, members.length))}, minmax(0, 1fr))`, gap: 16 }}>
        {members.map((member) => <MemberCard key={`${member.id}-${member.leadershipRole}`} member={member} />)}
      </div>
    </section>
  );
}

export function CabinetPage() {
  const [members, setMembers] = useState<LeadershipMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMemberDirectory(1, 500)
      .then((res) => {
        const rows = (res.members || [])
          .filter((member): member is LeadershipMember =>
            member.leadershipUnit === "Executive Council / Cabinet" &&
            Boolean(member.leadershipRole) &&
            typeof member.leadershipRank === "number"
          )
          .sort((a, b) => a.leadershipRank - b.leadershipRank || a.fullName.localeCompare(b.fullName));
        setMembers(rows);
      })
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(() => {
    const president = members.filter((m) => {
      const role = roleKey(m.leadershipRole);
      return role === "president" || role === "chairman";
    });
    const vicePresidents = members.filter((m) => roleKey(m.leadershipRole).includes("vice president"));
    const generalSecretary = members.filter((m) => roleKey(m.leadershipRole).includes("general secretary"));
    const secretariat = members.filter((m) => {
      const role = roleKey(m.leadershipRole);
      return !president.includes(m) && !vicePresidents.includes(m) && !generalSecretary.includes(m) &&
        (role.includes("secretary") || role.includes("treasurer") || role.includes("media coordinator") || role.includes("coordinator"));
    });
    const used = new Set([...president, ...vicePresidents, ...generalSecretary, ...secretariat].map((m) => m.id));
    const executives = members.filter((m) => !used.has(m.id));
    return { president, vicePresidents, generalSecretary, secretariat, executives };
  }, [members]);

  return (
    <div>
      <PageHeader title="Executive Council" subtitle="Current office bearers and executive leadership" breadcrumb={["Home", "Leadership", "Executive Council"]} />
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "54px 24px 64px" }}>
        <p style={{ color: "#66736b", fontSize: 15, lineHeight: 1.8, textAlign: "center", maxWidth: 900, margin: "0 auto 34px" }}>
          This page is linked directly to the active Governance & Operations assignments. When an authorized administrator updates an office bearer, the public hierarchy follows the same record and does not maintain a second duplicate leadership list.
        </p>

        {loading && <div style={{ textAlign: "center", color: "#7b867f", padding: 36 }}>Loading current Executive Council...</div>}
        {!loading && members.length === 0 && <div style={{ textAlign: "center", color: "#7b867f", padding: 36, background: "#fafbf9", border: "1px dashed #d8dfda", borderRadius: 12 }}>No active Executive Council assignments are currently published.</div>}

        {!loading && groups.president.length > 0 && <div style={{ maxWidth: 330, margin: "0 auto" }}>{groups.president.map((member) => <MemberCard key={member.id} member={member} featured />)}</div>}
        <Section title="General Secretary" members={groups.generalSecretary} columns={2} />
        <Section title="Senior & Vice Presidents" members={groups.vicePresidents} columns={3} />
        <Section title="Secretariat & Office Bearers" members={groups.secretariat} columns={4} />
        <Section title="Executive Members" members={groups.executives} columns={4} />
      </section>
      <style>{`
        @media(max-width:900px){.council-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
        @media(max-width:560px){.council-grid{grid-template-columns:1fr!important}}
      `}</style>
    </div>
  );
}
