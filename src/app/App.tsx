import "../styles/fonts.css";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AdminProvider, useAdmin } from "./context/AdminContext";
import { MemberProvider } from "./context/MemberContext";
import { AdminDashboardNavigation } from "./components/admin/AdminDashboardNavigation";
import { OperationsFinanceRedirect } from "./components/admin/OperationsFinanceRedirect";
import { AdminSmartMemberSelectors } from "./components/admin/AdminSmartMemberSelectors";
import { AdminRoleAssignmentEditor } from "./components/admin/AdminRoleAssignmentEditor";

function AdminBusinessShortcut() {
  const { isAdmin, role } = useAdmin();
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const allowed = ["admin", "super_admin", "welfare_manager"].includes(String(role || ""));
  if (!isAdmin || !allowed || path !== "/admin") return null;
  return (
    <a
      href="/admin/businesses/add"
      style={{
        position: "fixed",
        right: 18,
        bottom: 70,
        zIndex: 9999,
        background: "#fffaf0",
        color: "#1a4d2e",
        border: "2px solid #c8a04a",
        borderRadius: 10,
        padding: "11px 15px",
        textDecoration: "none",
        fontFamily: "Lato, sans-serif",
        fontSize: 12,
        fontWeight: 800,
        boxShadow: "0 8px 24px rgba(0,0,0,.18)",
      }}
      title="Create a complete business profile manually from the admin panel"
    >
      + Add Business Manually
    </a>
  );
}

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
      <AdminSmartMemberSelectors />
      <AdminRoleAssignmentEditor />
      <AdminBusinessShortcut />
      <AdminMemberCenterShortcut />
      <MemberProvider>
        <RouterProvider router={router} />
      </MemberProvider>
    </AdminProvider>
  );
}
