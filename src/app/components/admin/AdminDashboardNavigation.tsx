import { useEffect } from "react";

const KPI_TARGETS: Record<string, { sidebar: string; filter?: string }> = {
  "Total News": { sidebar: "News & Updates" },
  "Total Events": { sidebar: "Events" },
  "Total Members": { sidebar: "Members" },
  "Total Businesses": { sidebar: "Businesses" },
  "Total Messages": { sidebar: "Messages" },
  "Pending Members": { sidebar: "Members", filter: "Pending" },
  "Pending Businesses": { sidebar: "Businesses", filter: "Pending" },
};

function clickByText(text: string, root: ParentNode = document) {
  const candidates = Array.from(root.querySelectorAll<HTMLElement>("button,a,[role='button']"));
  const normalized = text.trim().toLowerCase();
  const exact = candidates.find((el) => (el.textContent || "").trim().toLowerCase() === normalized);
  const partial = candidates.find((el) => (el.textContent || "").trim().toLowerCase().includes(normalized));
  (exact || partial)?.click();
}

function enhanceCards() {
  if (window.location.pathname !== "/admin") return;
  const paragraphs = Array.from(document.querySelectorAll<HTMLElement>("p"));
  for (const p of paragraphs) {
    const target = KPI_TARGETS[(p.textContent || "").trim()];
    if (!target) continue;
    const card = (p.parentElement?.parentElement || p.parentElement) as HTMLElement | null;
    if (!card || card.dataset.adminKpiLinked === "1") continue;
    card.dataset.adminKpiLinked = "1";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("title", `Open ${target.sidebar}${target.filter ? ` - ${target.filter}` : ""}`);
    card.style.cursor = "pointer";
    card.style.transition = "transform .18s ease, box-shadow .18s ease, border-color .18s ease";
    const open = () => {
      clickByText(target.sidebar);
      if (target.filter) window.setTimeout(() => clickByText(target.filter), 120);
    };
    card.addEventListener("click", open);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); }
    });
    card.addEventListener("mouseenter", () => { card.style.transform = "translateY(-2px)"; card.style.boxShadow = "0 8px 20px rgba(26,77,46,.10)"; });
    card.addEventListener("mouseleave", () => { card.style.transform = ""; card.style.boxShadow = ""; });
  }
}

export function AdminDashboardNavigation() {
  useEffect(() => {
    enhanceCards();
    const observer = new MutationObserver(() => enhanceCards());
    observer.observe(document.body, { childList: true, subtree: true });
    const onPop = () => window.setTimeout(enhanceCards, 0);
    window.addEventListener("popstate", onPop);
    return () => { observer.disconnect(); window.removeEventListener("popstate", onPop); };
  }, []);
  return null;
}
