import { useEffect } from "react";
import { useAdmin } from "../../context/AdminContext";
import { fetchAdminMembers, type Member } from "../../lib/memberStore";
import { fetchFinanceMembers } from "../../lib/financeStore";
import { smartSearchMatch, smartSearchSort } from "../../lib/smartSearch";

type SearchMember = Pick<Member, "id" | "memberNo" | "fullName"> & Partial<Pick<Member, "fatherName" | "cnic" | "phone" | "whatsapp" | "email" | "designation" | "city">>;

const TARGET_LABEL = /(approved member|existing member referrer|member referrer|link approved member)/i;
const INPUT_MARKER = "data-admin-smart-member-search";
const SELECT_MARKER = "data-admin-smart-member-select";
const RANK_MARKER = "data-admin-auto-role-rank";

function selectContext(select: HTMLSelectElement) {
  const directLabel = select.closest("label")?.textContent || "";
  const parentLabel = select.parentElement?.querySelector(":scope > label")?.textContent || "";
  const preceding = select.previousElementSibling?.textContent || "";
  return `${directLabel} ${parentLabel} ${preceding}`.replace(/\s+/g, " ").trim();
}

function inputContext(input: HTMLInputElement) {
  const directLabel = input.closest("label")?.textContent || "";
  const parentLabel = input.parentElement?.querySelector(":scope > label")?.textContent || "";
  const preceding = input.previousElementSibling?.textContent || "";
  return `${directLabel} ${parentLabel} ${preceding}`.replace(/\s+/g, " ").trim();
}

function searchableValues(member: SearchMember) {
  return [
    member.fullName,
    member.fatherName,
    member.memberNo,
    member.cnic,
    member.phone,
    member.whatsapp,
    member.email,
    member.designation,
    member.city,
  ];
}

function suggestedRoleRank(role: string) {
  const key = String(role || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (key === "president") return 10;
  if (key.includes("senior vice president")) return 20;
  if (key === "vice president" || key.startsWith("vice president")) return 30;
  if (key.includes("general secretary")) return 40;
  if (key.includes("joint secretary")) return 50;
  if (key.includes("finance secretary")) return 60;
  if (key.includes("information secretary")) return 70;
  if (key.includes("media")) return 80;
  if (key.includes("welfare")) return 90;
  if (key.includes("convener")) return 110;
  if (key.includes("committee secretary")) return 120;
  if (key.includes("coordinator")) return 130;
  if (key.includes("executive member")) return 200;
  if (key === "member") return 300;
  return 150;
}

function setControlledInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (setter) setter.call(input, value); else input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * Reuses one progressive member-search rule across native admin member selectors
 * without replacing the pages' existing React state/save handlers. It also gives
 * governance roles a spaced hierarchy order while preserving a manual override.
 */
export function AdminSmartMemberSelectors() {
  const { isAdmin, role } = useAdmin();

  useEffect(() => {
    if (!isAdmin || typeof document === "undefined" || !window.location.pathname.startsWith("/admin")) return;

    let disposed = false;
    let members: SearchMember[] = [];
    const financeOnly = role === "finance_secretary" || role === "assistant_finance_secretary";

    const applyFilter = (select: HTMLSelectElement) => {
      const inputId = select.dataset.adminSmartMemberInputId;
      const input = inputId ? document.getElementById(inputId) as HTMLInputElement | null : null;
      if (!input) return;
      const query = input.value.trim();
      const ranked = query ? smartSearchSort(members, query, searchableValues, (m) => m.fullName || m.memberNo || "") : members;
      const allowed = new Set(ranked.map((m) => m.id));

      for (const option of Array.from(select.options)) {
        if (!option.value) { option.hidden = false; continue; }
        const memberHit = allowed.has(option.value);
        const textFallback = query ? smartSearchMatch([option.textContent], query) : true;
        option.hidden = Boolean(query) && !memberHit && !textFallback && option.value !== select.value;
      }
    };

    const enhanceSelect = (select: HTMLSelectElement, index: number) => {
      const context = selectContext(select);
      if (!TARGET_LABEL.test(context)) return;

      if (select.hasAttribute(SELECT_MARKER)) {
        applyFilter(select);
        return;
      }

      const id = `admin-smart-member-search-${Date.now()}-${index}`;
      const input = document.createElement("input");
      input.id = id;
      input.type = "search";
      input.autocomplete = "off";
      input.placeholder = financeOnly
        ? "Search member name, AAF / registration no. or email..."
        : "Search any part of name, AAF / member no., mobile, CNIC or designation...";
      input.setAttribute(INPUT_MARKER, "true");
      input.style.width = "100%";
      input.style.boxSizing = "border-box";
      input.style.minHeight = "38px";
      input.style.marginBottom = "6px";
      input.style.padding = "8px 10px";
      input.style.border = "1px solid #d9e2dc";
      input.style.borderRadius = "7px";
      input.style.background = "#fffdf8";
      input.style.color = "#333";
      input.style.fontSize = "12px";
      input.style.outline = "none";

      select.setAttribute(SELECT_MARKER, "true");
      select.dataset.adminSmartMemberInputId = id;
      select.parentElement?.insertBefore(input, select);
      input.addEventListener("input", () => applyFilter(select));
      applyFilter(select);
    };

    const enhanceRoleRank = () => {
      if (!window.location.pathname.startsWith("/admin/operations")) return;
      const inputs = Array.from(document.querySelectorAll<HTMLInputElement>("input"));
      const roleInput = inputs.find((item) => /role\s*\/\s*designation/i.test(inputContext(item)));
      const rankInput = inputs.find((item) => /display\s*\/\s*hierarchy order/i.test(inputContext(item)));
      if (!roleInput || !rankInput || roleInput.hasAttribute(RANK_MARKER)) return;

      roleInput.setAttribute(RANK_MARKER, "true");
      roleInput.dataset.lastSuggestedRank = ["", "10", "150"].includes(rankInput.value) ? rankInput.value : "";
      const updateRank = () => {
        const next = String(suggestedRoleRank(roleInput.value));
        const last = roleInput.dataset.lastSuggestedRank || "";
        const current = rankInput.value;
        const canAutoUpdate = current === "" || current === "10" || current === "150" || current === last;
        if (!canAutoUpdate) return;
        roleInput.dataset.lastSuggestedRank = next;
        setControlledInputValue(rankInput, next);
      };
      roleInput.addEventListener("input", updateRank);
      roleInput.addEventListener("change", updateRank);
      if (roleInput.value.trim()) updateRank();
    };

    const scan = () => {
      if (disposed) return;
      Array.from(document.querySelectorAll<HTMLSelectElement>("select")).forEach(enhanceSelect);
      enhanceRoleRank();
    };

    const load = async () => {
      try {
        if (financeOnly) {
          members = (await fetchFinanceMembers()).map((m) => ({ id: m.id, memberNo: m.memberNo, fullName: m.fullName, email: m.email || "" }));
        } else {
          members = (await fetchAdminMembers()).map((m) => ({
            id: m.id, memberNo: m.memberNo, fullName: m.fullName, fatherName: m.fatherName,
            cnic: m.cnic, phone: m.phone, whatsapp: m.whatsapp, email: m.email,
            designation: m.designation, city: m.city,
          }));
        }
      } catch {
        members = [];
      }
      scan();
    };

    void load();
    const observer = new MutationObserver(() => scan());
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = window.setInterval(scan, 1200);

    return () => {
      disposed = true;
      observer.disconnect();
      window.clearInterval(timer);
      document.querySelectorAll<HTMLInputElement>(`input[${INPUT_MARKER}]`).forEach((input) => input.remove());
      document.querySelectorAll<HTMLSelectElement>(`select[${SELECT_MARKER}]`).forEach((select) => {
        select.removeAttribute(SELECT_MARKER);
        delete select.dataset.adminSmartMemberInputId;
        Array.from(select.options).forEach((option) => { option.hidden = false; });
      });
      document.querySelectorAll<HTMLInputElement>(`input[${RANK_MARKER}]`).forEach((input) => {
        input.removeAttribute(RANK_MARKER);
        delete input.dataset.lastSuggestedRank;
      });
    };
  }, [isAdmin, role]);

  return null;
}
