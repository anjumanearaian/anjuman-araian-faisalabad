import { useEffect, useState } from "react";
import { Link } from "react-router";
import { fetchHomepageStatistics, type MemberDirectorySummary } from "../../lib/memberDirectoryStore";

const fallback: MemberDirectorySummary = { approvedMembers: 0, menMembers: 0, womenMembers: 0, lifeMembers: 0 };

export default function StatisticsSection() {
  const [stats, setStats] = useState<MemberDirectorySummary>(fallback);

  useEffect(() => {
    fetchHomepageStatistics().then(setStats).catch(() => setStats(fallback));
  }, []);

  const data = [
    [String(stats.approvedMembers), "Approved Members", "/members"],
    [String(stats.menMembers), "Men's Wing", "/members?cell=male"],
    [String(stats.womenMembers), "Women's Wing", "/members?cell=women"],
    [String(stats.lifeMembers), "Lifetime Members", "/members?type=life"],
  ];

  return <section className="home-stats"><div className="home-shell">{data.map(([value, label, to]) => <Link to={to} key={label} className="home-stat-link"><strong>{value}</strong><span>{label}</span></Link>)}</div></section>;
}
