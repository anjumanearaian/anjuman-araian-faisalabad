type PaymentEmailInput = {
  recipientName: string;
  amount: number;
  currency?: string | null;
  category: string;
  paymentMethod?: string | null;
  transactionReference?: string | null;
  receiptNo?: string | null;
  transactionNo?: string | null;
  paymentDate: Date | string;
  memberNo?: string | null;
  reviewNote?: string | null;
};

function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(amount: number, currency = "PKR") {
  const code = String(currency || "PKR").toUpperCase();
  const n = Number(amount || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
  return code === "PKR" ? `Rs. ${n}` : `${code} ${n}`;
}

function dateText(value: Date | string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value || "")
    : date.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Karachi" });
}

function row(label: string, value: unknown) {
  return `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e8e2d7;color:#6b7280;width:42%;font-size:13px">${esc(label)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e8e2d7;color:#173d2b;font-weight:700;font-size:13px">${esc(value || "-")}</td>
    </tr>`;
}

export function paymentApprovedEmail(input: PaymentEmailInput) {
  const documentNo = input.receiptNo || input.transactionNo || "-";
  const subject = `Payment Received & Verified | Receipt ${documentNo} | Anjuman-e-Araian Faisalabad`;
  const html = `
  <div style="background:#f6f3ec;padding:28px 12px;font-family:Arial,Helvetica,sans-serif;color:#374151">
    <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e4dfd4;border-radius:14px;overflow:hidden;box-shadow:0 8px 28px rgba(26,77,46,.08)">
      <div style="background:#0d4328;padding:26px 28px;color:#ffffff;border-bottom:4px solid #cda84d">
        <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#e9d59d">Anjuman-e-Araian Faisalabad</div>
        <h1 style="margin:7px 0 0;font-size:24px;line-height:1.25">Official Payment Confirmation</h1>
      </div>
      <div style="padding:28px">
        <div style="font-size:13px;color:#6b7280;text-align:right;margin-bottom:20px">Date: ${esc(dateText(input.paymentDate))}</div>

        <p style="font-size:15px;line-height:1.75;margin:0 0 14px">Dear <strong>${esc(input.recipientName)}</strong>,</p>

        <p style="font-size:14px;line-height:1.8;margin:0 0 18px">
          This is to confirm that your payment has been <strong>received, verified by Finance/Accounts, and recorded in the official ledger</strong> of Anjuman-e-Araian Faisalabad.
        </p>

        <div style="background:#f8fbf9;border:1px solid #d8e5dc;border-radius:10px;overflow:hidden;margin:18px 0 22px">
          <div style="padding:11px 14px;background:#eef6f1;color:#155a35;font-weight:700;font-size:13px">Payment Details</div>
          <table style="width:100%;border-collapse:collapse">
            ${row("Receipt No.", documentNo)}
            ${row("Amount Received", money(input.amount, input.currency || "PKR"))}
            ${row("Payment For", input.category)}
            ${row("Payment Method", input.paymentMethod || "Not specified")}
            ${row("Transaction / Reference", input.transactionReference || "-")}
            ${input.memberNo ? row("Member No.", input.memberNo) : ""}
            ${row("Payment Date", dateText(input.paymentDate))}
          </table>
        </div>

        <div style="padding:13px 15px;background:#fff9e9;border:1px solid #ead39a;border-radius:9px;color:#63552c;font-size:13px;line-height:1.65">
          <strong>Official receipt attached:</strong> Please keep the attached PDF receipt for your record. The receipt number and ledger record are system generated and form part of the organization’s finance audit trail.
        </div>

        <p style="font-size:14px;line-height:1.8;margin:22px 0 0">
          Thank you for your payment and continued association with Anjuman-e-Araian Faisalabad.
        </p>

        <p style="font-size:14px;line-height:1.7;margin:26px 0 0">
          Regards,<br>
          <strong>Finance &amp; Accounts</strong><br>
          Anjuman-e-Araian Faisalabad<br>
          <span style="color:#6b7280">Central Secretariat, Faisalabad, Pakistan</span>
        </p>
      </div>
      <div style="padding:14px 28px;background:#f3f6f4;color:#7a837d;font-size:11px;line-height:1.55">
        This is an automated official notification generated after finance verification. Please do not treat a payment as confirmed until this verification email and official receipt are issued.
      </div>
    </div>
  </div>`;
  return { subject, html };
}

export function paymentRejectedEmail(input: PaymentEmailInput) {
  const subject = `Payment Verification Required | Anjuman-e-Araian Faisalabad`;
  const html = `
  <div style="background:#f6f3ec;padding:28px 12px;font-family:Arial,Helvetica,sans-serif;color:#374151">
    <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #e4dfd4;border-radius:14px;overflow:hidden">
      <div style="background:#0d4328;padding:26px 28px;color:#fff;border-bottom:4px solid #cda84d">
        <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#e9d59d">Anjuman-e-Araian Faisalabad</div>
        <h1 style="margin:7px 0 0;font-size:24px">Payment Verification Update</h1>
      </div>
      <div style="padding:28px">
        <p style="font-size:15px;line-height:1.75">Dear <strong>${esc(input.recipientName)}</strong>,</p>
        <p style="font-size:14px;line-height:1.8">
          The payment proof submitted for <strong>${esc(input.category)}</strong> could not be verified by Finance/Accounts at this stage.
        </p>
        <div style="background:#fff4f2;border:1px solid #f1c8c2;border-radius:9px;padding:14px;color:#7f1d1d;font-size:13px;line-height:1.7">
          <strong>Verification note:</strong> ${esc(input.reviewNote || "The payment proof or reference did not match the available account record.")}
        </div>
        <p style="font-size:14px;line-height:1.8;margin-top:18px">
          Please review the payment details and submit a clear, correct receipt or transaction reference. No amount has been posted to the official ledger for this submission.
        </p>
        <p style="font-size:14px;line-height:1.7;margin-top:24px">
          Regards,<br>
          <strong>Finance &amp; Accounts</strong><br>
          Anjuman-e-Araian Faisalabad
        </p>
      </div>
    </div>
  </div>`;
  return { subject, html };
}
