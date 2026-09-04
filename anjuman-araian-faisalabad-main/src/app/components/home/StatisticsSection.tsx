
const data=[["500+","Members"],["7+","Committees"],["25+","Welfare Projects"],["3+","Countries"],["35+","Years"]];
export default function StatisticsSection(){
 return <section className="stats-final">{data.map(x=><div><h2>{x[0]}</h2><p>{x[1]}</p></div>)}</section>
}
