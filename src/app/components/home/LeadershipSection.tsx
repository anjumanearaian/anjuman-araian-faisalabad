import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, UserRound } from "lucide-react";
import { fetchLeadershipProfiles, LeadershipProfile } from "../../lib/leadershipStore";

export default function LeadershipSection() {
  const [leaders, setLeaders] = useState<LeadershipProfile[]>([]);
  useEffect(() => { fetchLeadershipProfiles().then((p) => setLeaders(p.filter((x) => x.category === "cabinet").slice(0, 4))).catch(() => setLeaders([])); }, []);
  const display = leaders.length ? leaders : [
    { id: "president", name: "Dr Ahsan-ul-Haq", role: "President", city: "Faisalabad", category: "cabinet" as const },
    { id: "secretary", name: "Dr Mian Saqib Rahman", role: "General Secretary", city: "Faisalabad", category: "cabinet" as const },
  ];
  return <section className="home-section home-section--green"><div className="home-shell">
    <div className="home-heading home-heading--light"><div><span className="home-eyebrow">Community stewardship</span><h2>Our Leadership</h2></div><Link to="/cabinet">Executive Council <ArrowRight size={17} /></Link></div>
    <div className="home-leaders">{display.map((leader) => <article key={leader.id}><div className="home-leader-photo">{leader.image ? <img src={leader.image} alt={leader.name} /> : <UserRound size={34} />}</div><div><h3>{leader.name}</h3><p>{leader.role}</p><span>{leader.city}</span></div></article>)}</div>
  </div></section>;
}
