import "../styles/fonts.css";
import { useEffect, useState } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AdminProvider, useAdmin } from "./context/AdminContext";
import { MemberProvider, useMember } from "./context/MemberContext";
import { AdminDashboardNavigation } from "./components/admin/AdminDashboardNavigation";
import { OperationsFinanceRedirect } from "./components/admin/OperationsFinanceRedirect";
import { AdminSmartMemberSelectors } from "./components/admin/AdminSmartMemberSelectors";
import { AdminRoleAssignmentEditor } from "./components/admin/AdminRoleAssignmentEditor";
import { AdminMatrimonialRoleOption } from "./components/admin/AdminMatrimonialRoleOption";
import { AdminMatrimonialUrduHints } from "./components/admin/AdminMatrimonialUrduHints";
import { AdminMatrimonialIdentityReferences } from "./components/admin/AdminMatrimonialIdentityReferences";
import { AdminMatrimonialSuccessCenter } from "./components/admin/AdminMatrimonialSuccessCenter";
import { AdminSessionHandoff } from "./components/admin/AdminSessionHandoff";
import { MatrimonialSelfReferences } from "./components/matrimonial/MatrimonialSelfReferences";
import { MatrimonialStructuredInputEnhancer } from "./components/matrimonial/MatrimonialStructuredInputEnhancer";
import { MatrimonialPrivateImageHydrator } from "./components/MatrimonialPrivateImageHydrator";

const SITE_NAME = "Anjuman-e-Araian Faisalabad";
const DEFAULT_DESCRIPTION = "Official platform of Anjuman-e-Araian Faisalabad for membership, community welfare, news, events, leadership, business directory and matrimonial services.";
const SEO: Record<string, { title: string; description: string }> = {
  "/": { title: `${SITE_NAME} | Official Community Platform`, description: DEFAULT_DESCRIPTION },
  "/about": { title: `About Us | ${SITE_NAME}`, description: "Learn about Anjuman-e-Araian Faisalabad, its community service, purpose and organization." },
  "/history": { title: `History | ${SITE_NAME}`, description: "Explore the history and community journey of Anjuman-e-Araian Faisalabad." },
  "/vision-mission": { title: `Vision & Mission | ${SITE_NAME}`, description: "Read the vision, mission and community priorities of Anjuman-e-Araian Faisalabad." },
  "/leadership-messages": { title: `Leadership Messages | ${SITE_NAME}`, description: "Messages and updates from the leadership of Anjuman-e-Araian Faisalabad." },
  "/members": { title: `Members Directory | ${SITE_NAME}`, description: "Browse approved members and community leadership of Anjuman-e-Araian Faisalabad." },
  "/cabinet": { title: `Cabinet | ${SITE_NAME}`, description: "View the cabinet and office bearers of Anjuman-e-Araian Faisalabad." },
  "/executive-members": { title: `Executive Members | ${SITE_NAME}`, description: "View executive members of Anjuman-e-Araian Faisalabad." },
  "/advisory-board": { title: `Advisory Board | ${SITE_NAME}`, description: "View the advisory leadership of Anjuman-e-Araian Faisalabad." },
  "/updates": { title: `News, Meetings & Updates | ${SITE_NAME}`, description: "Official news, meetings, announcements and community updates from Anjuman-e-Araian Faisalabad." },
  "/media": { title: `Media Gallery | ${SITE_NAME}`, description: "Official photos and media from Anjuman-e-Araian Faisalabad activities and events." },
  "/overseas": { title: `Overseas Chapters | ${SITE_NAME}`, description: "International and overseas community chapters of Anjuman-e-Araian Faisalabad." },
  "/business": { title: `Business Directory | ${SITE_NAME}`, description: "Discover businesses and professional services connected with the Anjuman-e-Araian Faisalabad community." },
  "/matrimonial": { title: `Private Matrimonial Service | ${SITE_NAME}`, description: "A privacy-first matrimonial service for approved members and verified applicants." },
  "/contact": { title: `Contact Us | ${SITE_NAME}`, description: "Contact Anjuman-e-Araian Faisalabad for membership, welfare, business and community services." },
};

function upsertMeta(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([key, value]) => el!.setAttribute(key, value));
}

function RouteMetadata({ observedPath }: { observedPath: string }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const pathname = window.location.pathname.replace(/\/$/, "") || "/";
    const privateRoute = pathname.startsWith("/admin") || pathname.startsWith("/member/") || pathname === "/business/submit" || ["/matrimonial/new", "/matrimonial/matches", "/matrimonial/requests"].includes(pathname);
    const isUpdateDetail = pathname.startsWith("/updates/");
    const meta = SEO[pathname] || (isUpdateDetail
      ? { title: `Official Update | ${SITE_NAME}`, description: "Official community update from Anjuman-e-Araian Faisalabad." }
      : { title: SITE_NAME, description: DEFAULT_DESCRIPTION });

    document.title = meta.title;
    upsertMeta('meta[name="description"]', { name: "description", content: meta.description });
    upsertMeta('meta[name="robots"]', { name: "robots", content: privateRoute ? "noindex, nofollow, noarchive, nosnippet" : "index, follow" });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: meta.title });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: meta.description });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: `${window.location.origin}${pathname}` });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: meta.title });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: meta.description });

    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `${window.location.origin}${pathname}`;
  }, [observedPath]);
  return null;
}

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

function ExistingMemberRegistrationRedirect() {
  const { member } = useMember();
  useEffect(() => {
    if (!member || typeof window === "undefined") return;
    if (window.location.pathname === "/member/register") window.location.replace("/member/portal");
  }, [member]);
  return null;
}

export default function App() {
  const [observedPath, setObservedPath] = useState(() => typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "");
  useEffect(() => {
    if (typeof window === "undefined") return;
    let last = `${window.location.pathname}${window.location.search}`;
    const check = () => {
      const next = `${window.location.pathname}${window.location.search}`;
      if (next !== last) { last = next; setObservedPath(next); }
    };
    const timer = window.setInterval(check, 250);
    window.addEventListener("popstate", check);
    return () => { window.clearInterval(timer); window.removeEventListener("popstate", check); };
  }, []);

  return (
    <AdminProvider>
      <RouteMetadata observedPath={observedPath} />
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
      <MatrimonialSelfReferences />
      <MatrimonialStructuredInputEnhancer />
      <MatrimonialPrivateImageHydrator />
      <MemberProvider><ExistingMemberRegistrationRedirect /><RouterProvider router={router} /></MemberProvider>
    </AdminProvider>
  );
}
