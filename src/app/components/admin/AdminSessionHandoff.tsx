import { useEffect } from "react";
import { useAdmin } from "../../context/AdminContext";

function isSameOriginAdminPrint(anchor: HTMLAnchorElement) {
  try {
    const url = new URL(anchor.href, window.location.origin);
    return url.origin === window.location.origin && url.pathname.startsWith("/admin/matrimonial/print/");
  } catch {
    return false;
  }
}

export function AdminSessionHandoff() {
  const { isAdmin } = useAdmin();

  useEffect(() => {
    if (!isAdmin || typeof document === "undefined") return;

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.('a[target="_blank"]') as HTMLAnchorElement | null;
      if (!anchor || !isSameOriginAdminPrint(anchor)) return;

      const token = sessionStorage.getItem("araian_admin_token");
      const role = sessionStorage.getItem("araian_admin_role");
      if (!token || !role) return;

      event.preventDefault();
      const url = new URL(anchor.href, window.location.origin);
      const child = window.open("", "_blank");

      // If the browser blocks the new tab, keep the authenticated session by
      // opening the print view in the current tab instead of forcing re-login.
      if (!child) {
        window.location.assign(url.href);
        return;
      }

      try {
        child.sessionStorage.setItem("araian_admin_token", token);
        child.sessionStorage.setItem("araian_admin_role", role);
        child.opener = null;
        child.location.replace(url.href);
      } catch {
        try { child.close(); } catch {}
        window.location.assign(url.href);
      }
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [isAdmin]);

  return null;
}
