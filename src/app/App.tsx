import "../styles/fonts.css";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AdminProvider } from "./context/AdminContext";
import { MemberProvider } from "./context/MemberContext";

export default function App() {
  return (
    <AdminProvider>
      <MemberProvider>
        <RouterProvider router={router} />
      </MemberProvider>
    </AdminProvider>
  );
}
