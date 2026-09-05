const data = [["300+", "Community Members"], ["7", "Working Committees"], ["35+", "Years of Service"], ["1", "Shared Community"]];
export default function StatisticsSection() { return <section className="home-stats"><div className="home-shell">{data.map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div></section>; }
