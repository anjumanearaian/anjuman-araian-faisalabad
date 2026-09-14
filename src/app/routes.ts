import { createElement, type ComponentType } from "react";
import { createBrowserRouter, redirect } from "react-router";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";

const CHUNK_RELOAD_KEY = "araian_chunk_reload_once";

function isChunkLoadError(error: unknown) {
  const message = String((error as any)?.message || error || "");
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk .* failed/i.test(message);
}

function ChunkLoadRecoveryPage() {
  const reload = () => {
    try { sessionStorage.removeItem(CHUNK_RELOAD_KEY); } catch {}
    window.location.reload();
  };
  const home = () => window.location.assign("/");
  return createElement(
    "main",
    {
      style: {
        minHeight: "100vh", display: "grid", placeItems: "center", padding: 24,
        background: "#f7f4ee", fontFamily: "Lato, sans-serif", boxSizing: "border-box",
      },
    },
    createElement(
      "section",
      {
        style: {
          width: "min(560px, 100%)", background: "white", border: "1px solid #e7e1d7",
          borderRadius: 16, padding: 28, boxShadow: "0 16px 44px rgba(26,77,46,.10)", textAlign: "center",
        },
      },
      createElement("div", { style: { width: 54, height: 54, margin: "0 auto 14px", borderRadius: "50%", display: "grid", placeItems: "center", background: "#eef7f1", color: "#1a4d2e", fontSize: 24, fontWeight: 900 } }, "↻"),
      createElement("h1", { style: { margin: 0, color: "#1a4d2e", fontFamily: "'Playfair Display', serif", fontSize: 26 } }, "A newer version is available"),
      createElement("p", { style: { margin: "10px auto 18px", color: "#66736b", fontSize: 14, lineHeight: 1.65, maxWidth: 460 } }, "The website was updated while this page was open. Refresh once to load the latest secure application files. Your saved database records are not affected."),
      createElement("div", { style: { display: "flex", justifyContent: "center", gap: 9, flexWrap: "wrap" } },
        createElement("button", { type: "button", onClick: reload, style: { border: 0, borderRadius: 9, background: "#1a4d2e", color: "white", padding: "11px 17px", fontSize: 13, fontWeight: 800, cursor: "pointer" } }, "Refresh Now"),
        createElement("button", { type: "button", onClick: home, style: { border: "1px solid #c8a04a", borderRadius: 9, background: "white", color: "#1a4d2e", padding: "10px 17px", fontSize: 13, fontWeight: 800, cursor: "pointer" } }, "Go to Home")
      )
    )
  );
}

const lazyPage = <T extends Record<string, any>>(loader: () => Promise<T>, exportName: keyof T) => async () => {
  try {
    const mod = await loader();
    try { sessionStorage.removeItem(CHUNK_RELOAD_KEY); } catch {}
    return { Component: mod[exportName] as ComponentType };
  } catch (error) {
    if (typeof window !== "undefined" && isChunkLoadError(error)) {
      const now = Date.now();
      let previous: { path?: string; at?: number } | null = null;
      try { previous = JSON.parse(sessionStorage.getItem(CHUNK_RELOAD_KEY) || "null"); } catch {}
      const sameRecentAttempt = previous?.path === window.location.pathname && now - Number(previous?.at || 0) < 30000;
      if (!sameRecentAttempt) {
        try { sessionStorage.setItem(CHUNK_RELOAD_KEY, JSON.stringify({ path: window.location.pathname, at: now })); } catch {}
        window.location.reload();
        return await new Promise<{ Component: ComponentType }>(() => {});
      }
      console.error("Lazy route chunk remained unavailable after one refresh", error);
      return { Component: ChunkLoadRecoveryPage as ComponentType };
    }
    throw error;
  }
};

export const router = createBrowserRouter([
  { path: "admin", lazy: lazyPage(() => import("./pages/AdminPage"), "AdminPage") },
  { path: "admin/members", lazy: lazyPage(() => import("./pages/AdminMemberCenterPage"), "AdminMemberCenterPage") },
  { path: "admin/matrimonial", lazy: lazyPage(() => import("./pages/AdminMatrimonialPage"), "AdminMatrimonialPage") },
  { path: "admin/matrimonial/new", lazy: lazyPage(() => import("./pages/AdminMatrimonialProfilePage"), "AdminMatrimonialProfilePage") },
  { path: "admin/matrimonial/edit/:id", lazy: lazyPage(() => import("./pages/AdminMatrimonialProfilePage"), "AdminMatrimonialProfilePage") },
  { path: "admin/matrimonial/print/:id", lazy: lazyPage(() => import("./pages/AdminMatrimonialPrintPage"), "AdminMatrimonialPrintPage") },
  { path: "admin/matrimonial/matching", lazy: lazyPage(() => import("./pages/AdminMatrimonialManualMatchPage"), "AdminMatrimonialManualMatchPage") },
  { path: "admin/businesses", lazy: lazyPage(() => import("./pages/AdminBusinessCenterPage"), "AdminBusinessCenterPage") },
  { path: "admin/businesses/add", lazy: lazyPage(() => import("./pages/AdminBusinessCreatePage"), "AdminBusinessCreatePage") },
  { path: "admin/operations", lazy: lazyPage(() => import("./pages/AdminOperationsShellPage"), "AdminOperationsShellPage") },
  { path: "admin/finance", lazy: lazyPage(() => import("./pages/AdminFinancePage"), "AdminFinancePage") },
  {
    Component: Layout,
    children: [
      { index: true, Component: HomePage },
      { path: "about", lazy: lazyPage(() => import("./pages/AboutPage"), "AboutPage") },
      { path: "vision-mission", lazy: lazyPage(() => import("./pages/VisionMissionPage"), "VisionMissionPage") },
      { path: "history", lazy: lazyPage(() => import("./pages/HistoryPage"), "HistoryPage") },
      { path: "constitution", lazy: lazyPage(() => import("./pages/ConstitutionPage"), "ConstitutionPage") },
      { path: "leadership-messages", lazy: lazyPage(() => import("./pages/LeadershipMessagesPage"), "LeadershipMessagesPage") },
      { path: "president-message", loader: () => redirect("/leadership-messages#president") },
      { path: "secretary-message", loader: () => redirect("/leadership-messages#secretary") },
      { path: "founders", lazy: lazyPage(() => import("./pages/FoundersPage"), "FoundersPage") },
      { path: "ex-presidents", lazy: lazyPage(() => import("./pages/ExPresidentsPage"), "ExPresidentsPage") },
      { path: "members", lazy: lazyPage(() => import("./pages/MembersPage"), "MembersPage") },
      { path: "cabinet", lazy: lazyPage(() => import("./pages/CabinetPage"), "CabinetPage") },
      { path: "executive-members", loader: () => redirect("/cabinet") },
      { path: "advisory-board", lazy: lazyPage(() => import("./pages/AdvisoryBoardPage"), "AdvisoryBoardPage") },
      { path: "updates", lazy: lazyPage(() => import("./pages/UpdatesPage"), "UpdatesPage") },
      { path: "updates/:id/:slug?", lazy: lazyPage(() => import("./pages/ContentDetailPage"), "ContentDetailPage") },
      { path: "events", loader: () => redirect("/updates?section=events") },
      { path: "media", lazy: lazyPage(() => import("./pages/MediaPage"), "MediaPage") },
      { path: "news", loader: () => redirect("/updates") },
      { path: "overseas", lazy: lazyPage(() => import("./pages/OverseasPage"), "OverseasPage") },
      { path: "contact", lazy: lazyPage(() => import("./pages/ContactPage"), "ContactPage") },
      { path: "matrimonial", lazy: lazyPage(() => import("./pages/MatrimonialMemberOnlyPage"), "MatrimonialMemberOnlyPage") },
      { path: "matrimonial/new", lazy: lazyPage(() => import("./pages/MatrimonialPage"), "MatrimonialPage") },
      { path: "matrimonial/matches", lazy: lazyPage(() => import("./pages/MatrimonialMatchesPage"), "MatrimonialMatchesPage") },
      { path: "matrimonial/requests", lazy: lazyPage(() => import("./pages/MatrimonialRequestsPage"), "MatrimonialRequestsPage") },
      { path: "business", lazy: lazyPage(() => import("./pages/BusinessPage"), "BusinessPage") },
      { path: "business/submit", lazy: lazyPage(() => import("./pages/BusinessSubmitVerifiedPage"), "BusinessSubmitVerifiedPage") },
      { path: "member/register", lazy: lazyPage(() => import("./pages/MemberRegisterPage"), "MemberRegisterPage") },
      { path: "member/login", lazy: lazyPage(() => import("./pages/MemberLoginPage"), "MemberLoginPage") },
      { path: "member/forgot-password", lazy: lazyPage(() => import("./pages/MemberForgotPasswordPage"), "MemberForgotPasswordPage") },
      { path: "member/portal", lazy: lazyPage(() => import("./pages/MemberPortalPage"), "MemberPortalPage") },
      { path: "*", lazy: lazyPage(() => import("./pages/NotFoundPage"), "NotFoundPage") },
    ],
  },
]);
