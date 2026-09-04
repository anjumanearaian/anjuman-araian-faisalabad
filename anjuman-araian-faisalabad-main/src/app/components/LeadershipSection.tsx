export default function LeadershipSection() {
  const leaders = [
    "President",
    "General Secretary",
    "Executive Committee"
  ];

  return (
    <section className="py-12">
      <h2 className="text-3xl font-bold text-center">Leadership</h2>
      <div className="grid md:grid-cols-3 gap-6 mt-8">
        {leaders.map((item) => (
          <div className="rounded-xl shadow p-6" key={item}>
            <h3 className="font-semibold">{item}</h3>
            <p>Organization Leadership</p>
          </div>
        ))}
      </div>
    </section>
  );
}
