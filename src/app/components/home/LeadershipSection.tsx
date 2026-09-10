import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, UserRound } from "lucide-react";
import { fetchLeadershipProfiles, LeadershipProfile } from "../../lib/leadershipStore";

const fallbackLeaders: LeadershipProfile[] = [
  { id: "president", name: "Dr Ahsan-ul-Haq", role: "President", city: "Faisalabad", category: "cabinet" },
  { id: "secretary", name: "Dr Mian Saqib Rahman", role: "General Secretary", city: "Faisalabad", category: "cabinet" },
];

function selectHomeLeaders(profiles: LeadershipProfile[]) {
  const cabinet = profiles.filter((profile) => profile.category === "cabinet");
  const president = cabinet.find((profile) => profile.role.trim().toLowerCase() === "president");
  const generalSecretary = cabinet.find((profile) => profile.role.trim().toLowerCase().includes("general secretary"));

  return [president || fallbackLeaders[0], generalSecretary || fallbackLeaders[1]];
}

export default function LeadershipSection() {
  const [leaders, setLeaders] = useState<LeadershipProfile[]>(fallbackLeaders);

  useEffect(() => {
    fetchLeadershipProfiles()
      .then((profiles) => setLeaders(selectHomeLeaders(profiles)))
      .catch(() => setLeaders(fallbackLeaders));
  }, []);

  return <section className="home-section home-section--green"><div className="home-shell">
    <div className="home-heading home-heading--light"><div><span className="home-eyebrow">Community stewardship</span><h2>Our Leadership</h2></div><Link to="/cabinet">Executive Council <ArrowRight size={17} /></Link></div>
    <div className="home-leaders">{leaders.map((leader) => <article key={leader.id}><div className="home-leader-photo">{leader.image ? <img src={leader.image} alt={leader.name} /> : <UserRound size={34} />}</div><div><h3>{leader.name}</h3><p>{leader.role}</p><span>{leader.city}</span></div></article>)}</div>
  </div></section>;
}
