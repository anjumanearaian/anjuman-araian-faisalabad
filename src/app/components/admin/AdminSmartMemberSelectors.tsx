import { useEffect } from "react";
import { useAdmin } from "../../context/AdminContext";
import { fetchAdminMembers, type Member } from "../../lib/memberStore";
import { fetchFinanceMembers } from "../../lib/financeStore";
import { smartSearchMatch, smartSearchSort } from "../../lib/smartSearch";

type SearchMember = Pick<Member, "id" | "memberNo" | "fullName"> & Partial<Pick<Member, "fatherName" | "cnic" | "phone" | "whatsapp" | "email" | "designation" | "city">>;

const TARGET_LABEL = /(approved member|existing member referrer|member referrer|link approved member)/i;
const INPUT_MARKER = "data-admin-smart-member-search";
const SELECT_MARKER = "data-admin-smart-member-select";

function selectContext(select: HTMLSelectElement) {
  const directLabel = select.closest("label")?.textContent || "";
  const parentLabel = select.parentElement?.querySelector(":scope > label")?.textContent || "";
  const preceding = select.previousElementSibling?.textContent || "";
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

/**
 * Progressive smart-search enhancer for existing native member selectors.
 * It intentionally keeps the underlying React <select> intact, so every page
 * continues to use its existing state, permissions and save handlers. The same
 * matching rule is therefore reused without creating duplicate member controls.
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

    const enhance = (select: HTMLSelectElement, index: number) => {
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

    const scan = () => {
      if (disposed) return;
      Array.from(document.querySelectorAll<HTMLSelectElement>("select")).forEach(enhance);
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
    };
  }, [isAdmin, role]);

  return null;
}
