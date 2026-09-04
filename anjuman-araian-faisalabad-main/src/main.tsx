import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { MemberProvider } from "./app/context/MemberContext";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(<App />);