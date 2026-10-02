import { useId, useState } from "react";
import { Copy, Landmark, RefreshCw } from "lucide-react";
import type { SiteSettings } from "../lib/settingsStore";

type Props = {
  settings: SiteSettings;
  status: "loading" | "ready" | "error";
  onRetry: () => void;
  selectedMethod?: string;
  onSelectMethod?: (method: string) => void;
};

export function PaymentInstructions({ settings, status, onRetry, selectedMethod, onSelectMethod }: Props) {
  const headingId = useId();
  const [copyMessage, setCopyMessage] = useState("");
  const methods = settings.paymentMethods || [];

  const copyAccount = async (account: string, bank: string) => {
    try {
      await navigator.clipboard.writeText(account);
      setCopyMessage(`${bank}: account number / IBAN copied.`);
    } catch {
      setCopyMessage("Could not copy automatically. Select and copy the account number shown above.");
    }
  };

  return <section aria-labelledby={headingId} style={{ border: "1px solid #dfcc99", borderRadius: 10, background: "#fffaf0", padding: 16, margin: "16px 0 20px" }}>
    <h3 id={headingId} style={{ display: "flex", alignItems: "center", gap: 8, color: "#1a4d2e", fontSize: 16, margin: "0 0 8px" }}><Landmark size={19} aria-hidden="true"/>Where to deposit payment</h3>
    {status === "loading" ? <p role="status" style={{ fontSize: 13 }}>Loading official payment details...</p>
      : status === "error" ? <div role="alert" style={{ color: "#854d0e", fontSize: 13, lineHeight: 1.6 }}>
        <p>We could not load the latest payment details. Please retry or contact the office before making a payment.</p>
        <button type="button" onClick={onRetry} style={actionStyle}><RefreshCw size={14} aria-hidden="true"/>Retry payment details</button>
        <OfficeContact settings={settings}/>
      </div>
      : methods.length === 0 ? <div role="status" style={{ fontSize: 13, lineHeight: 1.6 }}>
        <p>Official payment details are not available yet. Please contact the office for deposit instructions before paying.</p>
        <OfficeContact settings={settings}/>
      </div>
      : <>
        <p style={{ fontSize: 13, color: "#59645b", lineHeight: 1.65, margin: "0 0 14px" }}>Deposit the applicable fee into one of the accounts below. Check the account title and number before confirming the transfer, then upload your payment slip / receipt.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 12 }}>
          {methods.map((method) => <div key={method.id} style={{ minWidth: 0, background: "white", border: `1px solid ${selectedMethod === method.bankName ? "#1a4d2e" : "#e4ded1"}`, borderRadius: 8, padding: 14 }}>
            <strong style={{ display: "block", color: "#1a4d2e", fontSize: 14, overflowWrap: "anywhere" }}>{method.bankName}</strong>
            <dl style={{ margin: "12px 0", fontSize: 13, lineHeight: 1.6 }}>
              <dt style={detailLabel}>Account title</dt><dd style={detailValue}>{method.accountTitle}</dd>
              <dt style={{ ...detailLabel, marginTop: 8 }}>Account number / IBAN</dt><dd dir="ltr" style={{ ...detailValue, fontWeight: 800, userSelect: "all" }}>{method.accountNo}</dd>
            </dl>
            <button type="button" aria-label={`Copy account number / IBAN for ${method.bankName}`} onClick={() => void copyAccount(method.accountNo, method.bankName)} style={actionStyle}><Copy size={14} aria-hidden="true"/>Copy number / IBAN</button>
            {onSelectMethod && <label style={{ display: "flex", alignItems: "flex-start", gap: 7, marginTop: 13, color: "#1a4d2e", fontSize: 12, cursor: "pointer" }}>
              <input type="radio" name={`${headingId}-payment-method`} aria-label={`I paid into ${method.bankName}`} checked={selectedMethod === method.bankName} onChange={() => onSelectMethod(method.bankName)}/>I paid into this account
            </label>}
          </div>)}
        </div>
        <p style={{ fontSize: 12, color: "#59645b", lineHeight: 1.6, margin: "12px 0 0" }}>Payment is confirmed only after the office verifies your receipt.</p>
        <p role="status" aria-live="polite" style={{ fontSize: 12, color: "#1a4d2e", margin: copyMessage ? "8px 0 0" : 0 }}>{copyMessage}</p>
      </>}
  </section>;
}

function OfficeContact({ settings }: { settings: SiteSettings }) {
  const phone = settings.contactPhone?.replace(/[^+\d]/g, "");
  return <p style={{ margin: "10px 0 0", overflowWrap: "anywhere" }}>
    {phone && <a href={`tel:${phone}`} style={{ color: "#1a4d2e", marginRight: 12 }}>Call {settings.contactPhone}</a>}
    {settings.contactEmail && <a href={`mailto:${settings.contactEmail}`} style={{ color: "#1a4d2e" }}>Email the office</a>}
  </p>;
}

const actionStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 10px", border: "1px solid #cddbd1", borderRadius: 6, background: "#f0f7f3", color: "#1a4d2e", fontSize: 12, cursor: "pointer" };
const detailLabel: React.CSSProperties = { color: "#68736b", fontSize: 11 };
const detailValue: React.CSSProperties = { margin: 0, color: "#263c2c", overflowWrap: "anywhere" };
