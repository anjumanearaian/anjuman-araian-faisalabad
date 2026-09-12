import { Member, educationLevels, occupations, structuredOptionForEdit } from "./memberStore";
import { fetchFinanceLedger, FinanceLedgerRow } from "./financeStore";
import logo from "../../imports/logo.png";

const MEMBERSHIP_LABELS: Record<string, string> = {
  ordinary: "Annual Membership",
  annual: "Annual Membership",
  life: "Lifetime Membership",
  lifetime: "Lifetime Membership",
  patron: "Patron Membership",
  overseas: "Overseas Membership",
};

function membershipTypeLabel(value?: string | null) {
  const key = String(value || "").trim().toLowerCase();
  return MEMBERSHIP_LABELS[key] || (value ? String(value) : "Not specified");
}

function membershipStandardFee(value?: string | null) {
  const key = String(value || "").trim().toLowerCase();
  if (["ordinary", "annual"].includes(key)) return 1000;
  if (["life", "lifetime"].includes(key)) return 3000;
  return null;
}

function escapeHtml(value: unknown) {
  return String(value || "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c] || c));
}

async function findMembershipPayment(m: Member): Promise<FinanceLedgerRow | null> {
  try {
    const rows = await fetchFinanceLedger(m.memberNo || m.fullName || "", "all");
    const normalizedName = String(m.fullName || "").trim().toLowerCase();
    const candidates = rows.filter((row) => {
      const sameMember = row.memberId === m.id || row.member?.id === m.id || String(row.member?.memberNo || "") === String(m.memberNo || "") || String(row.partyName || "").trim().toLowerCase() === normalizedName;
      const membershipLike = /membership|member|annual|life|lifetime|subscription/i.test(String(row.category || ""));
      return sameMember && row.direction === "credit" && row.status !== "void" && membershipLike;
    });
    return candidates.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())[0] || null;
  } catch {
    return null;
  }
}

export async function printMemberFormV2(m: Member) {
  const edu = structuredOptionForEdit(m.education, educationLevels);
  const occ = structuredOptionForEdit(m.occupation, occupations);
  const logoUrl = new URL(logo, window.location.origin).href;
  const payment = await findMembershipPayment(m);
  const membershipLabel = membershipTypeLabel(m.membershipType);
  const standardFee = membershipStandardFee(m.membershipType);
  const money = (value?: number | null) => value == null ? "—" : `Rs. ${Number(value).toLocaleString("en-PK")}`;
  const paymentNo = payment?.receiptNo || payment?.transactionNo || "Not linked";
  const paymentAmount = payment ? money(payment.amount) : (standardFee ? money(standardFee) : "See Finance Ledger");
  const receivedBy = payment ? [payment.handledByName || payment.issuedByName, payment.handledByRole || payment.issuedByRole].filter(Boolean).join(" · ") : "________________";
  const paymentDate = payment?.transactionDate ? new Date(payment.transactionDate).toLocaleDateString("en-PK") : "—";
  const approvedDate = m.approvedAt ? new Date(m.approvedAt).toLocaleDateString("en-PK") : "Pending";
  const generated = new Date().toLocaleString("en-PK");
  const developerName = "Muhammad Atif Naseem";
  const developerPhone = "0300-7600037";
  const website = "www.anjumanearaian.org";
  const generalSecretary = "Dr. Mian Saqib Rehman";
  const president = "Dr. Ahsan-ul-Haq";
  const photo = m.photoUrl ? `<img src="${escapeHtml(m.photoUrl)}" class="photo" />` : `<div class="photo placeholder">Fresh Photograph<br><small>Passport style</small></div>`;
  const undertaking = `میں اقرار کرتا/کرتی ہوں کہ میں مسلمان ہوں، اللہ تعالیٰ کی وحدانیت اور حضرت محمد ﷺ کو اللہ تعالیٰ کا آخری نبی و رسول مانتا/مانتی ہوں۔ میں انجمنِ آرائیاں فیصل آباد کے دستور، مقاصد، قواعد و ضوابط اور مجاز فیصلوں کی پابندی اور برادری کی فلاح، اتحاد، تعلیم، سماجی خدمت اور باہمی احترام کے لیے ذمہ داری سے کام کرنے کا عہد کرتا/کرتی ہوں۔ میں انجمن کے نام، عہدے، ریکارڈ، مالی وسائل، سہولیات یا کسی کمیٹی/ذمہ داری کو ذاتی، کاروباری، گروہی یا سیاسی مقصد کے لیے استعمال نہیں کروں گا/گی اور اپنی سیاسی وابستگی کو انجمن کے غیر سیاسی کردار، مالی معاملات یا داخلی نظم پر اثر انداز نہیں ہونے دوں گا/گی۔ دستور و قواعد کی خلاف ورزی یا اختیارات کے غلط استعمال کی صورت میں مجاز باڈی مقررہ طریقۂ کار کے مطابق ذمہ داری ختم، رکنیت معطل یا منسوخ کر سکتی ہے۔`;
  const field = (label: string, value?: string | null, cls = "") => `<div class="field ${cls}"><span>${escapeHtml(label)}</span><b>${escapeHtml(value || "—")}</b></div>`;

  const makePage = (copyLabel: string, officeRecord: boolean) => `<section class="sheet">
    <div class="copytag">${escapeHtml(copyLabel)}</div>
    <div class="header">
      <img class="logo" src="${logoUrl}">
      <div class="brand">
        <div class="eng">Anjuman-e-Araian Faisalabad</div>
        <div class="urdu-title">انجمن آرائیاں فیصل آباد</div>
        <div class="ribbon">MEMBERSHIP FORM</div>
      </div>
      ${photo}
    </div>
    <div class="meta">${field("Registration / Member No.", m.memberNo)}${field("Membership Type", membershipLabel)}${field("Status", String(m.status || "").replace(/_/g, " "))}${field("Approved On", approvedDate)}</div>
    <div class="section-title">Member Information</div>
    <div class="grid">${field("Name / نام", m.fullName, "wide")}${field("Father / Husband", m.fatherName, "wide")}${field("CNIC", m.cnic)}${field("Date of Birth", m.dob)}${field("Gender", m.gender)}${field("Blood Group", m.bloodGroup)}${field("Education", [edu.base, edu.detail].filter(Boolean).join(" · "), "wide")}${field("Profession / Designation", [occ.base, m.designation].filter(Boolean).join(" · "), "wide")}${field("Mobile", m.phone)}${field("WhatsApp", m.whatsapp)}${field("Email", m.email, "wide")}${field("City / Area", [m.city, m.localArea].filter(Boolean).join(" · "), "wide")}${field("Address", m.address, "full")}</div>
    <div class="declaration"><div class="declabel">اقرار و حلفیہ بیان<br><span>DECLARATION & UNDERTAKING</span></div><div class="decltext">${escapeHtml(undertaking)}</div></div>
    <div class="payment-title">Membership & Payment Record</div>
    <div class="paygrid">${field("Receipt / Slip No.", paymentNo)}${field("Membership Fee", paymentAmount)}${field("Payment Date", paymentDate)}${field("Payment Status", m.paymentStatus)}${field("Received By", receivedBy, "wide")}${field("Payment Head", membershipLabel, "wide")}</div>
    <div class="copy-note">${officeRecord ? `<b>Office Record Reference:</b> Internal Form Serial ${escapeHtml(m.formNo || "—")}. Retain this copy after signatures and verification.` : `Member copy. Valid subject to the Constitution, rules and current membership status of Anjuman-e-Araian Faisalabad.`}</div>
    <div class="signature-title">Signatures & Authorization</div>
    <div class="signatures">
      <div class="signature-box"><div class="signature-space"></div><div class="signature-line"></div><b>Member Signature</b><small>Signature / thumb impression</small></div>
      <div class="signature-box"><div class="signature-space"></div><div class="signature-line"></div><b>Payment Received By</b><small>Name, signature & stamp</small></div>
      <div class="signature-box"><div class="signature-space"></div><div class="signature-line"></div><b>${escapeHtml(generalSecretary)}</b><small>General Secretary · Signature & Stamp</small></div>
      <div class="signature-box"><div class="signature-space"></div><div class="signature-line"></div><b>${escapeHtml(president)}</b><small>President · Signature & Stamp</small></div>
    </div>
    <div class="footer"><div class="footer-left"><b>${escapeHtml(website)}</b><span>Registration No. ${escapeHtml(m.memberNo || "—")} · Internal Serial ${escapeHtml(m.formNo || "—")}</span></div><div class="dev">Prepared by: <b>${escapeHtml(developerName)}</b> · System Developer · ${escapeHtml(developerPhone)}<span>Generated: ${escapeHtml(generated)}</span></div></div>
  </section>`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(m.memberNo || m.formNo)} - Membership Form</title><style>
    @page{size:A4 portrait;margin:7mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#edf0ed;font-family:Arial,"Segoe UI",sans-serif;color:#202722}
    .sheet{position:relative;width:196mm;height:283mm;margin:0 auto 10mm;background:white;border:1.4px solid #243b2f;border-top:7px solid #174e32;padding:7mm 9mm 20mm;overflow:hidden;page-break-after:always;break-after:page}.sheet:last-of-type{page-break-after:auto;break-after:auto}
    .copytag{position:absolute;right:9mm;top:4mm;border:1px solid #d6c486;background:#fff9e9;color:#66521e;padding:3px 9px;border-radius:20px;font-size:8px;font-weight:800;letter-spacing:.08em}
    .header{display:grid;grid-template-columns:28mm 1fr 29mm;align-items:center;gap:5mm;height:36mm}.logo{width:25mm;height:25mm;object-fit:contain}.brand{text-align:center}.eng{font-family:Georgia,"Times New Roman",serif;font-size:22px;line-height:1;color:#173e2c;font-weight:800}.urdu-title{font-family:"Noto Nastaliq Urdu","Noto Naskh Arabic",Tahoma,Arial,sans-serif;direction:rtl;color:#a3242d;font-size:21px;font-weight:800;line-height:1.35;margin-top:1px}.ribbon{display:inline-block;margin-top:2px;padding:2px 20px;border-top:2px solid #c7a249;border-bottom:2px solid #c7a249;color:#1c392a;font-family:Georgia,"Times New Roman",serif;font-size:10px;font-weight:800;letter-spacing:.08em}.photo{width:28mm;height:35mm;object-fit:cover;border:1.2px solid #3e4742;background:#fafafa}.placeholder{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-size:8px;color:#666;line-height:1.45}.placeholder small{font-size:7px}
    .meta{display:grid;grid-template-columns:1.35fr 1.15fr .8fr 1fr;gap:4mm;border-top:1px solid #d2bb67;border-bottom:1px solid #d2bb67;background:#fffdf7;padding:1.8mm 2.5mm;margin:1.5mm 0 3mm}.section-title,.payment-title,.signature-title{font-size:8.6px;text-transform:uppercase;letter-spacing:.12em;font-weight:800;color:#174e32;border-bottom:1px solid #d9dfdb;padding-bottom:1.2mm;margin-bottom:1mm}.payment-title{margin-top:3mm}.signature-title{margin-top:3.2mm}
    .grid,.paygrid{display:grid;grid-template-columns:repeat(4,1fr);gap:.5mm 4.5mm}.field{min-height:9mm;border-bottom:1px solid #aeb8b2;padding:1.2mm .5mm .7mm}.field span{display:block;font-size:6.3px;color:#5d665f;text-transform:uppercase;letter-spacing:.03em}.field b{display:block;font-size:8.2px;color:#202a24;margin-top:.6mm;word-break:break-word;line-height:1.22}.wide{grid-column:span 2}.full{grid-column:span 4}
    .declaration{margin-top:3.5mm;border:1px solid #4a544e;display:grid;grid-template-columns:34mm 1fr;min-height:39mm}.declabel{background:#174e32;color:white;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:3mm;font-family:"Noto Nastaliq Urdu","Noto Naskh Arabic",Tahoma,Arial,sans-serif;font-size:10px;font-weight:800;line-height:1.65}.declabel span{font-family:Arial,"Segoe UI",sans-serif;font-size:6.5px;letter-spacing:.07em}.decltext{font-family:"Noto Nastaliq Urdu","Noto Naskh Arabic",Tahoma,Arial,sans-serif;direction:rtl;unicode-bidi:plaintext;text-align:right;padding:3mm 4mm;font-size:9.3px;line-height:1.9;word-spacing:.06em;color:#26332c}
    .paygrid{background:#fbf8ef;border:1px solid #d8c68b;padding:1.1mm 2.5mm}.paygrid .field{min-height:8.2mm}.copy-note{margin-top:2.2mm;padding:1.6mm 2.5mm;border-left:3px solid #c7a249;background:#fafbf9;font-size:6.8px;line-height:1.45;color:#536159}
    .signatures{display:grid;grid-template-columns:repeat(4,1fr);gap:5mm;text-align:center;align-items:end}.signature-box{min-width:0}.signature-space{height:10mm}.signature-line{border-bottom:1px solid #53655a;margin:0 1.5mm 1.2mm}.signature-box b{display:block;font-size:7.3px;color:#25372d;line-height:1.25;min-height:3.5mm}.signature-box small{display:block;font-size:5.8px;color:#6e766f;margin-top:.5mm;line-height:1.25;min-height:3.5mm}
    .footer{position:absolute;left:9mm;right:9mm;bottom:4.5mm;border-top:1px solid #d1d8d3;padding-top:1.8mm;display:grid;grid-template-columns:1fr 1.3fr;gap:5mm;align-items:end;font-size:6.5px;color:#58645d;background:#fff}.footer-left{display:grid;gap:.6mm}.footer-left b{color:#174e32;font-size:7.6px}.footer-left span{font-size:6px}.dev{text-align:right;line-height:1.35}.dev b{color:#174e32}.dev span{display:block;font-size:5.9px;margin-top:.5mm}
    @media print{html,body{background:white}.sheet{margin:0}.sheet+.sheet{margin-top:0}}
  </style></head><body>${makePage("MEMBERSHIP COPY", false)}${makePage("OFFICE RECORD COPY", true)}<script>window.onload=()=>setTimeout(()=>window.print(),650)</script></body></html>`;

  const w = window.open("", "_blank", "width=950,height=1150");
  if (!w) { alert("Please allow pop-ups to print the membership document."); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
