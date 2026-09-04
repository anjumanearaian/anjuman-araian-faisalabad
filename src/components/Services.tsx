
const services=[
'Membership Registration',
'Matrimonial Services',
'Member Directory',
'Welfare Projects',
'Overseas Community',
'Donations & Support'
];

export default function Services(){
 return <section>
 {services.map(x=><div className="card">{x}</div>)}
 </section>
}
