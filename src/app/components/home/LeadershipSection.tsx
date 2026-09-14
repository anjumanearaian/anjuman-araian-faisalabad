import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, UserRound } from "lucide-react";
import { fetchMemberDirectory, type DirectoryMember } from "../../lib/memberDirectoryStore";

function roleKey(value?: string | null) {
  return String(value || "").toLowerCase().replace(/[^a-z]+/g, " ").replace(/\s+/g, " ").trim();
}

type HomeLeader = Pick<DirectoryMember, "id" | "fullName" | "city" | "photoUrl"> & { leadershipRole: string };

export default function LeadershipSection() {
  const [leaders, setLeaders] = useState<HomeLeader[]>([]);

  useEffect(() => {
    fetchMemberDirectory(1, 500)
      .then((res) => {
        setLeaders((res.members || [])
          .filter((member): member is DirectoryMember & { leadershipRole: string } => member.leadershipUnit === "Executive Council / Cabinet" && Boolean(member.leadershipRole))
          .map((member) => ({ id: member.id, fullName: member.fullName, city: member.city, photoUrl: member.photoUrl, leadershipRole: member.leadershipRole! }))
        );
      })
      .catch(() => setLeaders([]));
  }, []);

  const display = useMemo(() => {
    const president = leaders.find((leader) => roleKey(leader.leadershipRole) === "president");
    const secretary = leaders.find((leader) => roleKey(leader.leadershipRole).includes("general secretary"));
    const chosen = [president, secretary].filter(Boolean) as HomeLeader[];
    return chosen.length ? chosen : [
      { id: "president", fullName: "Dr. Muhammad Ahsanul Haq", leadershipRole: "President", city: "Faisalabad", photoUrl: "" },
      { id: "secretary", fullName: "Dr. Mian Saqib-ur-Rehman", leadershipRole: "General Secretary", city: "Faisalabad", photoUrl: "" },
    ];
  }, [leaders]);

  return <section className="home-section home-section--green home-leadership-section"><div className="home-shell">
    <div className="home-heading home-heading--light"><div><span className="home-eyebrow">Community stewardship</span><h2>Our Leadership</h2></div><Link to="/cabinet">View Full Executive Council <ArrowRight size={17} /></Link></div>
    <div className="home-leaders home-leaders--primary">{display.map((leader) => <article key={leader.id}><div className="home-leader-photo">{leader.photoUrl ? <img src={leader.photoUrl} alt={leader.fullName} /> : <UserRound size={34} />}</div><div><h3>{leader.fullName}</h3><p>{leader.leadershipRole}</p><span>{leader.city || "Faisalabad"}</span></div></article>)}</div>
  </div></section>;
}
