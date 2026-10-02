import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../../lib/apiClient";

type Draft = {
  id: string;
  formType?: string;
  data?: any;
  status?: string;
  completion?: number;
  paymentStatus?: string;
  submittedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  approvedAt?: string | null;
  paymentSubmittedAt?: string | null;
  paymentApprovedAt?: string | null;
  expiryDate?: string | null;
  memberNo?: string | null;
  membershipType?: string | null;
  authUser?: { email?: string | null; name?: string | null } | null;
};

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

function titleCase(value: string) {
  return String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isUrl(value: unknown) {
  return typeof value === "string" && /^(https?:\/\/|\/api\/files\/|\/uploads\/)/i.test(value);
}

function renderValue(value: any, keyPath: string): React.ReactNode {
  if (value === null || value === undefined || value === "") return <span style={{ color: "#aaa" }}>Not provided</span>;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (isUrl(value)) {
    return <a href={String(value)} target="_blank" rel="noreferrer" style={{ color: GREEN, fontWeight: 700 }}>Open file / image</a>;
  }
  if (Array.isArray(value)) {
    if (!value.length) return <span style={{ color: "#aaa" }}>Not provided</span>;
    return <div style={{ display: "grid", gap: 6 }}>{value.map((item, index) => <div key={`${keyPath}-${index}`}>{typeof item === "object" ? renderObject(item, `${keyPath}.${index}`) : renderValue(item, `${keyPath}.${index}`)}</div>)}</div>;
  }
  if (typeof value === "object") return renderObject(value, keyPath);
  const shown = String(value);
  if (shown.length > 5000) return <span>{shown.slice(0, 5000)}…</span>;
  return shown;
}

function renderObject(obj: Record<string, any>, keyPath: string) {
  const entries = Object.entries(obj || {}).filter(([key]) => !["password", "passwordHash"].includes(key));
  if (!entries.length) return <span style={{ color: "#aaa" }}>Not provided</span>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 }}>
      {entries.map(([key, value]) => (
        <div key={`${keyPath}.${key}`} style={{ background: "#faf9f6", border: "1px solid #eee8dc", borderRadius: 8, padding: "10px 12px", minWidth: 0 }}>
          <div style={{ color: "#888", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 4 }}>{titleCase(key)}</div>
          <div style={{ color: "#333", fontSize: 12, lineHeight: 1.55, overflowWrap: "anywhere" }}>{renderValue(value, `${keyPath}.${key}`)}</div>
        </div>
      ))}
    </div>
  );
}

function fmt(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export function AdminSavedFormViewer() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selected, setSelected] = useState<Draft | null>(null);

  const serialMap = useMemo(() => {
    const ordered = [...drafts].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    return new Map(ordered.map((draft, index) => [index + 1, draft]));
  }, [drafts]);

  useEffect(() => {
    if (typeof window === "undefined" || window.location.pathname !== "/admin/forms") return;
    let cancelled = false;
    apiClient<Draft[]>("/forms/admin/all")
      .then((rows) => { if (!cancelled) setDrafts(Array.isArray(rows) ? rows : []); })
      .catch((error) => console.error("Failed to load Saved Forms viewer data", error));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || window.location.pathname !== "/admin/forms" || !drafts.length) return;

    const enhance = () => {
      const tables = Array.from(document.querySelectorAll<HTMLTableElement>("table"));
      const table = tables.find((candidate) => {
        const head = candidate.querySelector("thead")?.textContent || "";
        return head.includes("Applicant") && head.includes("Lifecycle Dates") && head.includes("Progress");
      });
      if (table) {
        const headerRow = table.querySelector("thead tr");
        if (headerRow && !headerRow.querySelector('[data-saved-form-actions-header="1"]')) {
          const th = document.createElement("th");
          th.dataset.savedFormActionsHeader = "1";
          th.textContent = "Actions";
          Object.assign(th.style, { padding: "10px 9px", textAlign: "left", fontSize: "11px", fontWeight: "700", color: "#888", textTransform: "uppercase", whiteSpace: "nowrap" });
          headerRow.appendChild(th);
        }
        for (const row of Array.from(table.querySelectorAll<HTMLTableRowElement>("tbody tr"))) {
          if (row.querySelector('[data-saved-form-view-cell="1"]')) continue;
          const first = row.querySelector("td")?.textContent?.trim() || "";
          const serial = Number(first);
          const draft = serialMap.get(serial);
          if (!draft) continue;
          const td = document.createElement("td");
          td.dataset.savedFormViewCell = "1";
          Object.assign(td.style, { padding: "8px 9px", whiteSpace: "nowrap" });
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = draft.status === "submitted" ? "View Submitted Form" : "Open Saved Form";
          button.title = "Open this saved form in read-only mode";
          Object.assign(button.style, { border: "1px solid #c8a04a", background: "#fffaf0", color: GREEN, borderRadius: "7px", padding: "6px 9px", fontSize: "10.5px", fontWeight: "800", cursor: "pointer" });
          button.addEventListener("click", () => setSelected(draft));
          td.appendChild(button);
          row.appendChild(td);
        }
      }

      for (const card of Array.from(document.querySelectorAll<HTMLElement>(".forms-mobile-card"))) {
        if (card.querySelector('[data-saved-form-mobile-view="1"]')) continue;
        const strong = card.querySelector("strong")?.textContent || "";
        const serial = Number((strong.match(/^\s*(\d+)/) || [])[1]);
        const draft = serialMap.get(serial);
        if (!draft) continue;
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.savedFormMobileView = "1";
        button.textContent = draft.status === "submitted" ? "View Submitted Form" : "Open Saved Form";
        Object.assign(button.style, { width: "100%", marginTop: "10px", border: "1px solid #c8a04a", background: "#fffaf0", color: GREEN, borderRadius: "8px", padding: "8px 10px", fontSize: "11px", fontWeight: "800", cursor: "pointer" });
        button.addEventListener("click", () => setSelected(draft));
        card.appendChild(button);
      }
    };

    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [drafts, serialMap]);

  if (!selected) return null;

  const data = selected.data && typeof selected.data === "object" ? selected.data : {};
  const displayName = String(data?.form?.fullName || data?.fullName || data?.name || data?.ownerName || selected.authUser?.name || "Applicant");

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10050, background: "rgba(0,0,0,.58)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
      <div role="dialog" aria-modal="true" aria-label="Saved form details" style={{ width: "min(980px, 100%)", maxHeight: "92vh", overflow: "hidden", background: "white", borderRadius: 14, boxShadow: "0 24px 70px rgba(0,0,0,.28)", display: "flex", flexDirection: "column" }}>
        <div style={{ background: GREEN, color: "white", padding: "18px 22px", display: "flex", justifyContent: "space-between", gap: 18, alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 11, opacity: .8, textTransform: "uppercase", letterSpacing: ".07em" }}>Read-only saved form</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 800, marginTop: 3 }}>{displayName}</div>
            <div style={{ fontSize: 12, opacity: .9, marginTop: 4 }}>{titleCase(String(selected.formType || "Form"))} · {Number(selected.completion || 0)}% complete · {titleCase(String(selected.status || "incomplete"))}</div>
          </div>
          <button type="button" onClick={() => setSelected(null)} style={{ border: "1px solid rgba(255,255,255,.35)", background: "transparent", color: "white", borderRadius: 8, padding: "7px 11px", fontWeight: 800, cursor: "pointer" }}>Close</button>
        </div>

        <div style={{ padding: "16px 22px", borderBottom: "1px solid #eee", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, background: "#fffdf8" }}>
          {[
            ["Applicant Email", selected.authUser?.email || data?.email || data?.form?.email || "—"],
            ["Payment Status", titleCase(String(selected.paymentStatus || "pending"))],
            ["Submitted", fmt(selected.submittedAt)],
            ["Approved", fmt(selected.approvedAt)],
            ["Member No.", selected.memberNo || "—"],
            ["Last Updated", fmt(selected.updatedAt)],
          ].map(([label, value]) => <div key={label}><div style={{ color: "#999", fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>{label}</div><div style={{ color: "#333", fontSize: 12, fontWeight: 700, marginTop: 3, overflowWrap: "anywhere" }}>{value}</div></div>)}
        </div>

        <div style={{ overflowY: "auto", padding: "20px 22px" }}>
          <div style={{ color: GREEN, fontSize: 13, fontWeight: 900, marginBottom: 12, borderBottom: `2px solid ${GOLD}`, paddingBottom: 8 }}>Saved information</div>
          {renderObject(data, "data")}
          <div style={{ marginTop: 18, padding: "10px 12px", borderRadius: 8, background: "#f3f7f4", color: "#5b665f", fontSize: 11, lineHeight: 1.6 }}>
            This is a read-only admin view of the applicant's saved data. Opening this window does not change the application or database record.
          </div>
        </div>
      </div>
    </div>
  );
}
