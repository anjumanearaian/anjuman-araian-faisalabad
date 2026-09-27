import { useEffect, useState, useSyncExternalStore } from "react";
import { fetchSiteSettings, getSiteSettings, subscribeSiteSettings } from "./settingsStore";

// Open forms refresh after an admin edits settings on another device or tab.
export function useSiteSettings() {
  const settings = useSyncExternalStore(subscribeSiteSettings, getSiteSettings, getSiteSettings);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    let refreshing = false;
    setStatus("loading");
    const refresh = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        await fetchSiteSettings({ throwOnError: true });
        if (active) setStatus("ready");
      } catch {
        if (active) setStatus("error");
      } finally { refreshing = false; }
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    void refresh();
    const timer = window.setInterval(refreshWhenVisible, 30_000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [retry]);

  return { settings, status, refresh: () => setRetry((value) => value + 1) };
}
