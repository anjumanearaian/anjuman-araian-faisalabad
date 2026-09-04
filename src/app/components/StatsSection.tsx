const stats=[
 ["500+","Members"],
 ["7+","Committees"],
 ["25+","Welfare Projects"],
 ["3+","Countries"],
 ["35+","Years"]
];

export default function StatsSection(){
 return <section className="stats-final">
 {stats.map(([n,t])=><div key={t}><h2>{n}</h2><p>{t}</p></div>)}
 </section>
}