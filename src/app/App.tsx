import "../styles/fonts.css";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AdminProvider, useAdmin } from "./context/AdminContext";
import { MemberProvider } from "./context/MemberContext";
import { AdminDashboardNavigation } from "./components/admin/AdminDashboardNavigation";
import { OperationsFinanceRedirect } from "./components/admin/OperationsFinanceRedirect";

function AdminMemberCenterShortcut() {
  const { isAdmin } = useAdmin();
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  if (!isAdmin || path !== "/admin") return null;
  return (
    <a
      href="/admin/members"
      style={{
        position: "fixed",
        right: 18,
        bottom: 18,
        zIndex: 9999,
        background: "#1a4d2e",
        color: "white",
        border: "2px solid #c8a04a",
        borderRadius: 10,
        padding: "11px 15px",
        textDecoration: "none",
        fontFamily: "Lato, sans-serif",
        fontSize: 12,
        fontWeight: 800,
        boxShadow: "0 8px 24px rgba(0,0,0,.22)",
      }}
      title="Open the full member approval, registration-form and committee assignment center"
    >
      Member & Approval Center
    </a>
  );
}

export default function App() {
  return (
    <AdminProvider>
      <AdminDashboardNavigation />
      <OperationsFinanceRedirect />
      <AdminMemberCenterShortcut />
      <MemberProvider>
        <RouterProvider router={router} />
      </MemberProvider>
    </AdminProvider>
  );
}
