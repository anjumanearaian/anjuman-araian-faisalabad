export default function LeadershipSection() {
  const leaders = [
    { name: "President", role: "Leadership Team" },
    { name: "General Secretary", role: "Management" },
    { name: "Executive Committee", role: "Members" }
  ];

  return (
    <section>
      <h2>Leadership</h2>
      <div>
        {leaders.map((item) => (
          <div key={item.name}>
            <h3>{item.name}</h3>
            <p>{item.role}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
