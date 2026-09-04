import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { HomePage } from "./components/HomePage";
import { AboutPage } from "./pages/AboutPage";
import { VisionMissionPage } from "./pages/VisionMissionPage";
import { HistoryPage } from "./pages/HistoryPage";
import { ConstitutionPage } from "./pages/ConstitutionPage";
import { PresidentMessagePage } from "./pages/PresidentMessagePage";
import { SecretaryMessagePage } from "./pages/SecretaryMessagePage";
import { FoundersPage } from "./pages/FoundersPage";
import { ExPresidentsPage } from "./pages/ExPresidentsPage";
import { CabinetPage } from "./pages/CabinetPage";
import { ExecutiveMembersPage } from "./pages/ExecutiveMembersPage";
import { AdvisoryBoardPage } from "./pages/AdvisoryBoardPage";
import { EventsPage } from "./pages/EventsPage";
import { MediaPage } from "./pages/MediaPage";
import { NewsPage } from "./pages/NewsPage";
import { OverseasPage } from "./pages/OverseasPage";
import { ContactPage } from "./pages/ContactPage";
import { MatrimonialPage } from "./pages/MatrimonialPage";
import { AdminPage } from "./pages/AdminPage";
import { MemberRegisterPage } from "./pages/MemberRegisterPage";
import { MemberLoginPage } from "./pages/MemberLoginPage";
import { MemberPortalPage } from "./pages/MemberPortalPage";
import { MemberForgotPasswordPage } from "./pages/MemberForgotPasswordPage";
import { BusinessPage } from "./pages/BusinessPage";
import { BusinessSubmitPage } from "./pages/BusinessSubmitPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "admin",
    Component: AdminPage,
  },
  {
    Component: Layout,
    children: [
      { index: true, Component: HomePage },
      { path: "about", Component: AboutPage },
      { path: "vision-mission", Component: VisionMissionPage },
      { path: "history", Component: HistoryPage },
      { path: "constitution", Component: ConstitutionPage },
      { path: "president-message", Component: PresidentMessagePage },
      { path: "secretary-message", Component: SecretaryMessagePage },
      { path: "founders", Component: FoundersPage },
      { path: "ex-presidents", Component: ExPresidentsPage },
      { path: "cabinet", Component: CabinetPage },
      { path: "executive-members", Component: ExecutiveMembersPage },
      { path: "advisory-board", Component: AdvisoryBoardPage },
      { path: "events", Component: EventsPage },
      { path: "media", Component: MediaPage },
      { path: "news", Component: NewsPage },
      { path: "overseas", Component: OverseasPage },
      { path: "contact", Component: ContactPage },
      { path: "matrimonial", Component: MatrimonialPage },
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
