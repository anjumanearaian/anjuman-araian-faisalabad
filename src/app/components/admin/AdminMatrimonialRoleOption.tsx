import { useEffect } from "react";
import { useAdmin } from "../../context/AdminContext";

const ROLE_VALUE = "matrimonial_manager";

function isAdminRoleSelect(select: HTMLSelectElement) {
  const values = Array.from(select.options).map((option) => option.value);
  return values.includes("admin") && values.includes("welfare_manager") && values.includes("content_manager");
}

export function AdminMatrimonialRoleOption() {
  const { isAdmin, role } = useAdmin();
  const enabled = isAdmin && role === "super_admin";

  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;

    const inject = () => {
      if (window.location.pathname !== "/admin") return;
      document.querySelectorAll<HTMLSelectElement>("select").forEach((select) => {
        if (!isAdminRoleSelect(select) || Array.from(select.options).some((option) => option.value === ROLE_VALUE)) return;
        const option = document.createElement("option");
        option.value = ROLE_VALUE;
        option.textContent = "Matrimonial Manager";
        const welfare = Array.from(select.options).find((item) => item.value === "welfare_manager");
        if (welfare?.nextSibling) select.insertBefore(option, welfare.nextSibling);
        else select.appendChild(option);
      });
    };

    inject();
    const observer = new MutationObserver(inject);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [enabled]);

  return null;
}
