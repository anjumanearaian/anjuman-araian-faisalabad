import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { PageHeader } from "../components/PageHeader";
import { MemberDirectory } from "../components/MemberDirectory";
import { useMember } from "../context/MemberContext";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

export function MembersDirectoryPage() {
  const [params, setParams] = useSearchParams();
  const { member } = useMember();
  const requestedCell = params.get("cell");
  const cell = useMemo<"all" | "male" | "women">(
    () => requestedCell === "women" ? "women" : requestedCell === "male" ? "male" : "all",
    [requestedCell]
  );

  const womenView = cell === "women";

  return (
    <div>
      <PageHeader
        title={womenView ? "Women Wing" : "Our Community"}
        subtitle={womenView ? "Women members of Anjuman-e-Araian Faisalabad" : "Registered members of Anjuman-e-Araian Faisalabad"}
        breadcrumb={["Home", "Members", womenView ? "Women Wing" : "Members Directory"]}
      />

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "50px 24px 64px" }}>
        <div style={{ backgroundColor: "white", border: "1px solid #e8ece9", borderRadius: 14, padding: "18px 20px", marginBottom: 22, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: "0 0 5px", color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22 }}>
              {womenView ? "Women Members" : "Members Directory"}
            </h2>
            <p style={{ margin: 0, color: "#747474", fontSize: 13, lineHeight: 1.55 }}>
              Names, membership identity, city and approved professional information are shown here. CNIC, residential address, email and business details remain private.
            </p>
          </div>
          <div style={{ display: "flex", border: "1px solid #dde4df", borderRadius: 9, padding: 3, background: "#f8faf8" }}>
            <button
              type="button"
              onClick={() => setParams({})}
              style={{ border: 0, borderRadius: 7, padding: "8px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer", background: cell === "all" ? GREEN : "transparent", color: cell === "all" ? "white" : GREEN }}
            >
              All Members
            </button>
            <button
              type="button"
              onClick={() => setParams({ cell: "women" })}
              style={{ border: 0, borderRadius: 7, padding: "8px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer", background: womenView ? GOLD : "transparent", color: womenView ? "#1d1d1d" : GREEN }}
            >
              Women Wing
            </button>
          </div>
        </div>

        <MemberDirectory currentMemberId={member?.id} initialCell={cell} publicHeading />
      </section>
    </div>
  );
}
