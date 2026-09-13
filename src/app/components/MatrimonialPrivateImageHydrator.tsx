import { useEffect } from "react";

function getToken() {
  if (typeof window === "undefined") return null;
  const admin = sessionStorage.getItem("araian_admin_token");
  const member = localStorage.getItem("araian_member_token");
  return window.location.pathname.startsWith("/admin") ? (admin || member) : (member || admin);
}

function proxyUrl(src: string) {
  const endpoint = src.replace(/^\/api/, "");
  const q = endpoint.indexOf("?");
  const pathname = q >= 0 ? endpoint.slice(0, q) : endpoint;
  const query = q >= 0 ? endpoint.slice(q + 1) : "";
  const encoded = pathname.replace(/^\/+/, "").split("/").filter(Boolean).map(encodeURIComponent).join("__");
  return `/api/__proxy__${encoded}${query ? `?${query}` : ""}`;
}

export function MatrimonialPrivateImageHydrator() {
  useEffect(() => {
    const objectUrls = new Set<string>();
    const pending = new WeakSet<HTMLImageElement>();

    const hydrate = async (img: HTMLImageElement) => {
      const original = img.getAttribute("src") || "";
      if (!original.startsWith("/api/matrimonial/private-file/") || pending.has(img) || img.dataset.privateHydrated === "1") return;
      const token = getToken();
      if (!token) return;
      pending.add(img);
      try {
        const response = await fetch(proxyUrl(original), { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        if (!response.ok) throw new Error("Private media access denied");
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        objectUrls.add(url);
        img.dataset.privateOriginal = original;
        img.dataset.privateHydrated = "1";
        img.src = url;
      } catch {
        img.alt = img.alt || "Private image locked";
        img.dataset.privateHydrationFailed = "1";
      }
    };

    const scan = (root: ParentNode = document) => root.querySelectorAll<HTMLImageElement>('img[src^="/api/matrimonial/private-file/"]').forEach((img) => { void hydrate(img); });
    scan();
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node instanceof HTMLImageElement) void hydrate(node);
          scan(node);
        });
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return () => { observer.disconnect(); objectUrls.forEach((url) => URL.revokeObjectURL(url)); };
  }, []);
  return null;
}
