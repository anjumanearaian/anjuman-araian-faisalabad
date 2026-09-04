import { Outlet, useLocation } from "react-router";
import { useEffect } from "react";
import { Navbar } from "./Navbar";
import Footer from "./Footer";
import { WhatsAppButton } from "./WhatsAppButton";
import { fetchSiteSettings } from "../lib/settingsStore";

export function Layout() {
  const { pathname } = useLocation();
  useEffect(() => { 
    window.scrollTo(0, 0); 
  }, [pathname]);

  useEffect(() => {
    fetchSiteSettings().catch(console.error);
  }, []);

  return (
    <div style={{ fontFamily: "'Lato', sans-serif", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
