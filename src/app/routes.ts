import { createBrowserRouter, redirect } from "react-router";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";

const lazyPage = <T extends Record<string, any>>(loader: () => Promise<T>, exportName: keyof T) => async () => {
  const mod = await loader();
  return { Component: mod[exportName] as React.ComponentType };
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
      { path: "executive-members", lazy: lazyPage(() => import("./pages/ExecutiveMembersPage"), "ExecutiveMembersPage") },
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
