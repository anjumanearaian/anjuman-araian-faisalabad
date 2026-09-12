import { useEffect } from "react";
import { useAdmin } from "../context/AdminContext";
import { AdminOperationsCenterPage } from "./AdminOperationsCenterPage";

/**
 * Keeps the Governance & Operations Center as the single governance screen while
 * making /admin/finance the only finance UI. The older embedded finance tab is
 * deliberately bypassed so there is no second form that can circumvent payment
 * proof verification or the locked-ledger workflow.
 */
export function AdminOperationsShellPage() {
  const { isAdmin, role } = useAdmin();
  const financeOnly = role === "finance_secretary" || role === "assistant_finance_secretary";

  useEffect(() => {
    if (isAdmin && financeOnly) {
      window.location.replace("/admin/finance");
      return;
    }

    const captureFinanceNavigation = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button");
      const text = String(button?.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
      if (!button || (text !== "finance ledger" && text !== "open finance")) return;
      event.preventDefault();
      event.stopPropagation();
      window.location.assign("/admin/finance");
    };

    document.addEventListener("click", captureFinanceNavigation, true);
    return () => document.removeEventListener("click", captureFinanceNavigation, true);
  }, [isAdmin, financeOnly]);

  if (isAdmin && financeOnly) return null;
  return <AdminOperationsCenterPage />;
}
