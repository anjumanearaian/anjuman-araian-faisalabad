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

function enhanceMatrimonialPanel() {
  if (window.location.pathname !== "/admin") return;
  const heading = Array.from(document.querySelectorAll<HTMLElement>("h1,h2,h3"))
    .find((el) => (el.textContent || "").toLowerCase().includes("matrimonial submissions"));
  if (!heading) return;
  const row = heading.parentElement;
  if (!row || row.dataset.matrimonialCenterLinked === "1") return;
  row.dataset.matrimonialCenterLinked = "1";
  const link = document.createElement("a");
  link.href = "/admin/matrimonial";
  link.textContent = "Open Matrimonial Control Center";
  link.title = "Edit profiles, control privacy and review requirement-based match requests";
  Object.assign(link.style, {
    display: "inline-flex",
    alignItems: "center",
    marginLeft: "12px",
    padding: "8px 12px",
    borderRadius: "8px",
    background: "#1a4d2e",
    color: "white",
    textDecoration: "none",
    fontSize: "12px",
    fontWeight: "800",
    fontFamily: "Lato, sans-serif",
    boxShadow: "0 2px 8px rgba(26,77,46,.16)",
  });
  row.appendChild(link);
}

function enhanceAdminUi() {
  enhanceCards();
  enhanceMatrimonialPanel();
}

export function AdminDashboardNavigation() {
  useEffect(() => {
    enhanceAdminUi();
    const observer = new MutationObserver(() => enhanceAdminUi());
    observer.observe(document.body, { childList: true, subtree: true });
    const onPop = () => window.setTimeout(enhanceAdminUi, 0);
    window.addEventListener("popstate", onPop);
    return () => { observer.disconnect(); window.removeEventListener("popstate", onPop); };
  }, []);
  return null;
}
