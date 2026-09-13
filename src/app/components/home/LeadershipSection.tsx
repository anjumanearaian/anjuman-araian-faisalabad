import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, UserRound } from "lucide-react";
import { fetchLeadershipProfiles, LeadershipProfile } from "../../lib/leadershipStore";

function roleKey(value: string) {
  return String(value || "").toLowerCase().replace(/[^a-z]+/g, " ").replace(/\s+/g, " ").trim();
}

export default function LeadershipSection() {
  const [leaders, setLeaders] = useState<LeadershipProfile[]>([]);

  useEffect(() => {
    fetchLeadershipProfiles().then((profiles) => setLeaders(profiles.filter((x) => x.category === "cabinet"))).catch(() => setLeaders([]));
  }, []);

  const display = useMemo(() => {
    const president = leaders.find((leader) => roleKey(leader.role) === "president");
    const secretary = leaders.find((leader) => roleKey(leader.role).includes("general secretary"));
    const chosen = [president, secretary].filter(Boolean) as LeadershipProfile[];
    return chosen.length ? chosen : [
      { id: "president", name: "Dr. Muhammad Ahsanul Haq", role: "President", city: "Faisalabad", category: "cabinet" as const },
      { id: "secretary", name: "Dr. Mian Saqib-ur-Rehman", role: "General Secretary", city: "Faisalabad", category: "cabinet" as const },
    ];
  }, [leaders]);

  return <section className="home-section home-section--green home-leadership-section"><div className="home-shell">
    <div className="home-heading home-heading--light"><div><span className="home-eyebrow">Community stewardship</span><h2>Our Leadership</h2></div><Link to="/cabinet">View Full Executive Council <ArrowRight size={17} /></Link></div>
    <div className="home-leaders home-leaders--primary">{display.map((leader) => <article key={leader.id}><div className="home-leader-photo">{leader.image ? <img src={leader.image} alt={leader.name} /> : <UserRound size={34} />}</div><div><h3>{leader.name}</h3><p>{leader.role}</p><span>{leader.city}</span></div></article>)}</div>
  </div></section>;
}
