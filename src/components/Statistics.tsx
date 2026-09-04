
const stats=[
['500+','Members'],
['7+','Committees'],
['25+','Welfare Projects'],
['3+','Countries'],
['35+','Years']
];

export default function Statistics(){
 return <section className="stats">
 {stats.map(s=><div><h2>{s[0]}</h2><p>{s[1]}</p></div>)}
 </section>
}
