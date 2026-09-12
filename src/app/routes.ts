import { createBrowserRouter, redirect } from "react-router";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { AboutPage } from "./pages/AboutPage";
import { VisionMissionPage } from "./pages/VisionMissionPage";
import { HistoryPage } from "./pages/HistoryPage";
import { ConstitutionPage } from "./pages/ConstitutionPage";
import { FoundersPage } from "./pages/FoundersPage";
import { ExPresidentsPage } from "./pages/ExPresidentsPage";
import { CabinetPage } from "./pages/CabinetPage";
import { ExecutiveMembersPage } from "./pages/ExecutiveMembersPage";
import { AdvisoryBoardPage } from "./pages/AdvisoryBoardPage";
import { MediaPage } from "./pages/MediaPage";
import { OverseasPage } from "./pages/OverseasPage";
import { ContactPage } from "./pages/ContactPage";
import { MatrimonialMemberOnlyPage } from "./pages/MatrimonialMemberOnlyPage";
import { MatrimonialRequestsPage } from "./pages/MatrimonialRequestsPage";
import { AdminPage } from "./pages/AdminPage";
import { AdminMemberCenterPage } from "./pages/AdminMemberCenterPage";
import { AdminMatrimonialPage } from "./pages/AdminMatrimonialPage";
import { AdminOperationsCenterPage } from "./pages/AdminOperationsCenterPage";
import { AdminFinancePage } from "./pages/AdminFinancePage";
import { MemberRegisterPage } from "./pages/MemberRegisterPage";
import { MemberLoginPage } from "./pages/MemberLoginPage";
import { MemberPortalPage } from "./pages/MemberPortalPage";
import { MemberForgotPasswordPage } from "./pages/MemberForgotPasswordPage";
import { BusinessPage } from "./pages/BusinessPage";
import { BusinessSubmitPage } from "./pages/BusinessSubmitPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { UpdatesPage } from "./pages/UpdatesPage";
import { ContentDetailPage } from "./pages/ContentDetailPage";
import { LeadershipMessagesPage } from "./pages/LeadershipMessagesPage";

export const router = createBrowserRouter([
  {
    path: "admin",
    Component: AdminPage,
  },
  {
    path: "admin/members",
    Component: AdminMemberCenterPage,
  },
  {
    path: "admin/matrimonial",
    Component: AdminMatrimonialPage,
  },
  {
    path: "admin/operations",
    Component: AdminOperationsCenterPage,
  },
  {
    path: "admin/finance",
    Component: AdminFinancePage,
  },
  {
    Component: Layout,
    children: [
      { index: true, Component: HomePage },
      { path: "about", Component: AboutPage },
      { path: "vision-mission", Component: VisionMissionPage },
      { path: "history", Component: HistoryPage },
      { path: "constitution", Component: ConstitutionPage },
      { path: "leadership-messages", Component: LeadershipMessagesPage },
      { path: "president-message", loader: () => redirect("/leadership-messages#president") },
      { path: "secretary-message", loader: () => redirect("/leadership-messages#secretary") },
      { path: "founders", Component: FoundersPage },
      { path: "ex-presidents", Component: ExPresidentsPage },
      { path: "cabinet", Component: CabinetPage },
      { path: "executive-members", Component: ExecutiveMembersPage },
      { path: "advisory-board", Component: AdvisoryBoardPage },
      { path: "updates", Component: UpdatesPage },
      { path: "updates/:id/:slug?", Component: ContentDetailPage },
      { path: "events", loader: () => redirect("/updates?section=events") },
      { path: "media", Component: MediaPage },
      { path: "news", loader: () => redirect("/updates") },
      { path: "overseas", Component: OverseasPage },
      { path: "contact", Component: ContactPage },
      { path: "matrimonial", Component: MatrimonialMemberOnlyPage },
      { path: "matrimonial/requests", Component: MatrimonialRequestsPage },
      { path: "business", Component: BusinessPage },
      { path: "business/submit", Component: BusinessSubmitPage },
      { path: "member/register", Component: MemberRegisterPage },
      { path: "member/login", Component: MemberLoginPage },
      { path: "member/forgot-password", Component: MemberForgotPasswordPage },
      { path: "member/portal", Component: MemberPortalPage },
      { path: "*", Component: NotFoundPage },
    ],
  },
]);
