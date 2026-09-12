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
    ${officeRecord ? `<div class="office-note"><b>Office Record Reference:</b> Internal Form Serial ${escapeHtml(m.formNo || "—")}. This copy is retained with the Association record after required signatures and verification.</div>` : `<div class="member-note">Member copy. Membership remains subject to the Constitution, rules and current membership status of Anjuman-e-Araian Faisalabad.</div>`}
    <div class="signatures">
      <div><i></i><b>Member Signature</b><small>Thumb impression if required</small></div>
      <div><i></i><b>Payment Received By</b><small>${escapeHtml(receivedBy)}</small></div>
      <div><i></i><b>${escapeHtml(generalSecretary)}</b><small>General Secretary · Signature & Stamp</small></div>
      <div><i></i><b>${escapeHtml(president)}</b><small>President · Signature & Stamp</small></div>
    </div>
    <div class="footer"><div><b>${escapeHtml(website)}</b><br><span>Registration No. ${escapeHtml(m.memberNo || "—")} · Internal Serial ${escapeHtml(m.formNo || "—")}</span></div><div class="dev">Prepared by: <b>${escapeHtml(developerName)}</b> · System Developer · ${escapeHtml(developerPhone)}<br><span>Generated: ${escapeHtml(generated)}</span></div></div>
  </section>`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(m.memberNo || m.formNo)} - Membership Form</title><style>
    @page{size:A4 portrait;margin:7mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#edf0ed;font-family:Arial,"Segoe UI",sans-serif;color:#202722}
    .sheet{position:relative;width:196mm;height:283mm;margin:0 auto 10mm;background:white;border:1.4px solid #243b2f;border-top:7px solid #174e32;padding:9mm 9mm 34mm;overflow:hidden;page-break-after:always;break-after:page}.sheet:last-of-type{page-break-after:auto;break-after:auto}
    .copytag{position:absolute;right:9mm;top:5mm;border:1px solid #d6c486;background:#fff9e9;color:#66521e;padding:3px 9px;border-radius:20px;font-size:8px;font-weight:800;letter-spacing:.08em}
    .header{display:grid;grid-template-columns:31mm 1fr 31mm;align-items:center;gap:5mm;height:43mm}.logo{width:28mm;height:28mm;object-fit:contain}.brand{text-align:center}.eng{font-family:Georgia,"Times New Roman",serif;font-size:24px;line-height:1;color:#173e2c;font-weight:800}.urdu-title{font-family:"Noto Nastaliq Urdu","Noto Naskh Arabic",Tahoma,Arial,sans-serif;direction:rtl;color:#a3242d;font-size:23px;font-weight:800;line-height:1.45;margin-top:2px}.ribbon{display:inline-block;margin-top:3px;padding:3px 22px;border-top:3px solid #c7a249;border-bottom:3px solid #c7a249;color:#1c392a;font-family:Georgia,"Times New Roman",serif;font-size:12px;font-weight:800;letter-spacing:.08em}.photo{width:29mm;height:38mm;object-fit:cover;border:1.2px solid #3e4742;background:#fafafa}.placeholder{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-size:8px;color:#666;line-height:1.5}.placeholder small{font-size:7px}
    .meta{display:grid;grid-template-columns:1.35fr 1.15fr .8fr 1fr;gap:4mm;border-top:1px solid #d2bb67;border-bottom:1px solid #d2bb67;background:#fffdf7;padding:3mm 3mm;margin:2mm 0 4mm}.section-title,.payment-title{font-size:9px;text-transform:uppercase;letter-spacing:.12em;font-weight:800;color:#174e32;border-bottom:1px solid #d9dfdb;padding-bottom:1.5mm;margin-bottom:1mm}.payment-title{margin-top:4mm}
    .grid,.paygrid{display:grid;grid-template-columns:repeat(4,1fr);gap:1mm 5mm}.field{min-height:13mm;border-bottom:1px solid #aeb8b2;padding:2mm .6mm 1mm}.field span{display:block;font-size:7px;color:#5d665f;text-transform:uppercase;letter-spacing:.03em}.field b{display:block;font-size:9.3px;color:#202a24;margin-top:1mm;word-break:break-word;line-height:1.3}.wide{grid-column:span 2}.full{grid-column:span 4}
    .declaration{margin-top:5mm;border:1px solid #4a544e;display:grid;grid-template-columns:39mm 1fr;min-height:47mm}.declabel{background:#174e32;color:white;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:4mm;font-family:"Noto Nastaliq Urdu","Noto Naskh Arabic",Tahoma,Arial,sans-serif;font-size:11px;font-weight:800;line-height:1.8}.declabel span{font-family:Arial,"Segoe UI",sans-serif;font-size:7px;letter-spacing:.08em}.decltext{font-family:"Noto Nastaliq Urdu","Noto Naskh Arabic",Tahoma,Arial,sans-serif;direction:rtl;unicode-bidi:plaintext;text-align:right;padding:4mm 5mm;font-size:10.4px;line-height:2.15;word-spacing:.08em;color:#26332c}
    .paygrid{background:#fbf8ef;border:1px solid #d8c68b;padding:1.5mm 3mm}.member-note,.office-note{margin-top:4mm;padding:3mm 4mm;border-left:4px solid #c7a249;background:#fafbf9;font-size:8px;line-height:1.55;color:#4f5b54}
    .signatures{position:absolute;left:9mm;right:9mm;bottom:25mm;display:grid;grid-template-columns:repeat(4,1fr);gap:6mm;text-align:center}.signatures i{display:block;height:17mm;border-bottom:1px solid #4d5c53}.signatures b{display:block;font-size:8px;margin-top:1.5mm;color:#25372d}.signatures small{display:block;font-size:6.5px;color:#6e766f;margin-top:.7mm;line-height:1.35}
    .footer{position:absolute;left:9mm;right:9mm;bottom:6mm;border-top:1px solid #d1d8d3;padding-top:2mm;display:grid;grid-template-columns:1fr 1.2fr;gap:5mm;align-items:end;font-size:7px;color:#58645d}.footer b{color:#174e32;font-size:8px}.footer span{font-size:6.5px}.dev{text-align:right;line-height:1.5}
    @media print{html,body{background:white}.sheet{margin:0}.sheet+ .sheet{margin-top:0}}
  </style></head><body>${makePage("MEMBERSHIP COPY", false)}${makePage("OFFICE RECORD COPY", true)}<script>window.onload=()=>setTimeout(()=>window.print(),650)</script></body></html>`;

  const w = window.open("", "_blank", "width=950,height=1150");
  if (!w) { alert("Please allow pop-ups to print the membership document."); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
