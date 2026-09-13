import { useSearchParams } from "react-router";
import { MemberDirectory } from "../components/MemberDirectory";

export function MembersPage() {
  const [params] = useSearchParams();
  const rawCell = params.get("cell");
  const rawType = params.get("type");
  const cell = rawCell === "male" || rawCell === "women" ? rawCell : "all";
  const membershipType = rawType === "life" || rawType === "ordinary" || rawType === "patron" || rawType === "overseas" ? rawType : "all";

  return (
    <div style={{ background: "#f8f5ef", minHeight: "70vh", padding: "54px 0 72px" }}>
      <div style={{ width: "min(1160px, calc(100% - 32px))", margin: "0 auto", background: "white", borderRadius: 14, padding: "28px", boxShadow: "0 5px 24px rgba(18,63,41,.06)" }}>
        <MemberDirectory initialCell={cell} initialType={membershipType} publicHeading />
      </div>
    </div>
  );
}
