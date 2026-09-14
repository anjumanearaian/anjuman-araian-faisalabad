import "../styles/fonts.css";
import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AdminProvider, useAdmin } from "./context/AdminContext";
import { MemberProvider } from "./context/MemberContext";
import { AdminDashboardNavigation } from "./components/admin/AdminDashboardNavigation";
import { OperationsFinanceRedirect } from "./components/admin/OperationsFinanceRedirect";
import { AdminSmartMemberSelectors } from "./components/admin/AdminSmartMemberSelectors";
import { AdminRoleAssignmentEditor } from "./components/admin/AdminRoleAssignmentEditor";
import { AdminMatrimonialRoleOption } from "./components/admin/AdminMatrimonialRoleOption";
import { AdminMatrimonialUrduHints } from "./components/admin/AdminMatrimonialUrduHints";
import { AdminMatrimonialIdentityReferences } from "./components/admin/AdminMatrimonialIdentityReferences";
import { AdminMatrimonialSuccessCenter } from "./components/admin/AdminMatrimonialSuccessCenter";
import { AdminSessionHandoff } from "./components/admin/AdminSessionHandoff";
import { MatrimonialPrivateImageHydrator } from "./components/MatrimonialPrivateImageHydrator";

function ScopedAdminRedirect() {
  const { isAdmin, role } = useAdmin();
  useEffect(() => {
    if (!isAdmin || typeof window === "undefined") return;
    if (role === "matrimonial_manager" && window.location.pathname === "/admin") window.location.replace("/admin/matrimonial");
  }, [isAdmin, role]);
  return null;
}

function AdminBusinessShortcut() {
  const { isAdmin, role } = useAdmin();
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const allowed = ["admin", "super_admin", "welfare_manager"].includes(String(role || ""));
  if (!isAdmin || !allowed || path !== "/admin") return null;
  return <a href="/admin/businesses/add" style={{ position:"fixed",right:18,bottom:70,zIndex:9999,background:"#fffaf0",color:"#1a4d2e",border:"2px solid #c8a04a",borderRadius:10,padding:"11px 15px",textDecoration:"none",fontFamily:"Lato, sans-serif",fontSize:12,fontWeight:800,boxShadow:"0 8px 24px rgba(0,0,0,.18)" }}>+ Add Business Manually</a>;
}

function AdminMemberCenterShortcut() {
  const { isAdmin, role } = useAdmin();
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  if (!isAdmin || path !== "/admin" || role === "matrimonial_manager") return null;
  return <a href="/admin/members" style={{ position:"fixed",right:18,bottom:18,zIndex:9999,background:"#1a4d2e",color:"white",border:"2px solid #c8a04a",borderRadius:10,padding:"11px 15px",textDecoration:"none",fontFamily:"Lato, sans-serif",fontSize:12,fontWeight:800,boxShadow:"0 8px 24px rgba(0,0,0,.22)" }}>Member & Approval Center</a>;
}

function MatrimonialMatchingShortcut() {
  const { isAdmin, role } = useAdmin();
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const allowed = ["admin", "super_admin", "welfare_manager", "matrimonial_manager"].includes(String(role || ""));
  if (!isAdmin || !allowed || !path.startsWith("/admin/matrimonial") || path === "/admin/matrimonial/matching") return null;
  return <a href="/admin/matrimonial/matching" style={{ position:"fixed",left:18,bottom:18,zIndex:9999,background:"#1a4d2e",color:"white",border:"2px solid #c8a04a",borderRadius:10,padding:"11px 15px",textDecoration:"none",fontFamily:"Lato, sans-serif",fontSize:12,fontWeight:800,boxShadow:"0 8px 24px rgba(0,0,0,.22)" }} title="Open the private two-way compatibility, manager review and consent workflow">Private Matching Desk</a>;
}

export default function App() {
  return (
    <AdminProvider>
      <ScopedAdminRedirect />
      <AdminDashboardNavigation />
      <OperationsFinanceRedirect />
      <AdminSmartMemberSelectors />
      <AdminRoleAssignmentEditor />
      <AdminMatrimonialRoleOption />
      <AdminMatrimonialUrduHints />
      <AdminMatrimonialIdentityReferences />
      <AdminMatrimonialSuccessCenter />
      <AdminSessionHandoff />
      <AdminBusinessShortcut />
      <AdminMemberCenterShortcut />
      <MatrimonialMatchingShortcut />
      <MatrimonialPrivateImageHydrator />
      <MemberProvider><RouterProvider router={router} /></MemberProvider>
    </AdminProvider>
  );
}
