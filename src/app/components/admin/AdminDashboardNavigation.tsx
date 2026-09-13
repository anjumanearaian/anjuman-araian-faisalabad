import { useEffect } from "react";

const KPI_TARGETS: Record<string, { sidebar: string; filter?: string }> = {
  "Total News": { sidebar: "Content Hub" },
  "Total Events": { sidebar: "Content Hub" },
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

function addCenterLink(headingText: string, href: string, label: string, title: string, datasetKey: string) {
  if (window.location.pathname !== "/admin") return;
  const heading = Array.from(document.querySelectorAll<HTMLElement>("h1,h2,h3"))
    .find((el) => (el.textContent || "").toLowerCase().includes(headingText.toLowerCase()));
  if (!heading) return;
  const row = heading.parentElement;
  if (!row || row.dataset[datasetKey] === "1") return;
  row.dataset[datasetKey] = "1";
  const link = document.createElement("a");
  link.href = href;
  link.textContent = label;
  link.title = title;
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

function enhanceMatrimonialPanel() {
  addCenterLink(
    "matrimonial submissions",
    "/admin/matrimonial",
    "Open Matrimonial Control Center",
    "Edit profiles, control privacy and review requirement-based match requests",
    "matrimonialCenterLinked",
  );
}

function enhanceBusinessPanel() {
  addCenterLink(
    "business directory submissions",
    "/admin/businesses",
    "Open Business Control Center",
    "Review payment slips, approve listings and manually manage business profiles",
    "businessCenterLinked",
  );

  const heading = Array.from(document.querySelectorAll<HTMLElement>("h1,h2,h3"))
    .find((el) => (el.textContent || "").toLowerCase().includes("business directory submissions"));
  if (!heading) return;

  // The legacy Businesses tab must never directly turn an uploaded receipt into
  // a finance-verified payment. Approval is intentionally routed to the Business
  // Control Center, where the slip/profile are reviewed and payment is only marked
  // "received". Final verification and ledger posting stay in Finance Verification.
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
  for (const button of buttons) {
    const label = (button.textContent || "").trim().toLowerCase();
    if (label !== "approve" && label !== "approve listing") continue;
    if (button.dataset.businessReviewRouted === "1") continue;
    button.dataset.businessReviewRouted = "1";
    button.textContent = "Review";
    button.title = "Review profile and payment slip in Business Control Center before approval";
    button.setAttribute("aria-label", "Review business before approval");
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      window.location.assign("/admin/businesses");
    }, true);
  }

  // The original inline business detail modal predates the "submitted" status.
  // Keep the current value readable, but disable manual Verified selection here
  // so finance verification cannot be bypassed from the legacy screen.
  const selects = Array.from(document.querySelectorAll<HTMLSelectElement>("select"));
  for (const select of selects) {
    if (select.value === "submitted" && !select.querySelector('option[value="submitted"]')) {
      const option = document.createElement("option");
      option.value = "submitted";
      option.textContent = "Slip Submitted";
      const received = select.querySelector('option[value="received"]');
      if (received) select.insertBefore(option, received);
      else select.appendChild(option);
    }

    const hasPaymentStates = Boolean(
      select.querySelector('option[value="pending"]') &&
      select.querySelector('option[value="received"]') &&
      select.querySelector('option[value="verified"]') &&
      select.querySelector('option[value="rejected"]'),
    );
    if (!hasPaymentStates) continue;
    select.disabled = true;
    select.title = "Use Business Control Center for slip review and Finance Verification for final payment verification.";
    select.style.cursor = "not-allowed";
    select.style.opacity = "0.72";
  }
}

function enhanceAdminUi() {
  enhanceCards();
  enhanceMatrimonialPanel();
  enhanceBusinessPanel();
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
