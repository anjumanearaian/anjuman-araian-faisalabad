const stats = [
  ["500+", "Members"],
  ["7+", "Committees"],
  ["25+", "Welfare Projects"],
  ["3+", "Countries"],
  ["35+", "Years"]
];

export default function Statistics() {
  return (
    <section className="statistics">
      {stats.map(([number, title]) => (
        <div key={title}>
          <h2>{number}</h2>
          <p>{title}</p>
        </div>
      ))}
    </section>
  );
}