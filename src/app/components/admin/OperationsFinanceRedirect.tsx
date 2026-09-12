import { useEffect } from "react";
import { useAdmin } from "../../context/AdminContext";

export function OperationsFinanceRedirect() {
  const { isAdmin, role } = useAdmin();

  useEffect(() => {
    if (!isAdmin || window.location.pathname !== "/admin/operations") return;
    if (role === "finance_secretary" || role === "assistant_finance_secretary") {
      window.location.replace("/admin/finance");
      return;
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button,a,[role='button']") as HTMLElement | null;
      if (!button) return;
      const text = (button.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
      if (text !== "finance ledger" && text !== "open finance") return;
      event.preventDefault();
      event.stopPropagation();
      window.location.assign("/admin/finance");
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [isAdmin, role]);

  return null;
}
