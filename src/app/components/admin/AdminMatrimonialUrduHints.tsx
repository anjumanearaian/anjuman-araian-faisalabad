import { useEffect } from "react";
import { useAdmin } from "../../context/AdminContext";

const FIELD_HINTS: Record<string, string> = {
  "Managed For": "یہ پروفائل کس کے لیے درج کیا جا رہا ہے؟",
  "Private Contact *": "یہ نمبر صرف انتظامیہ اور رضامندی کے بعد استعمال ہوگا۔",
  "Residence / Visa": "موجودہ رہائش یا ویزا کی حیثیت منتخب کریں۔",
  "Employment Type": "ملازمت، کاروبار یا روزگار کی نوعیت۔",
  "Employer Type": "مثلاً سرکاری، نجی ادارہ یا ذاتی کاروبار۔",
  "Income Band": "تقریباً ماہانہ آمدن کی حد۔",
  "Family Setup": "مثلاً جوائنٹ فیملی یا الگ/نیوکلیئر فیملی۔",
  "Sect (optional)": "مسلک، صرف اگر بتانا چاہیں۔",
  "Languages": "بولی یا سمجھی جانے والی زبانیں، مثلاً اردو، پنجابی، انگریزی۔",
  "Hobbies": "اہم مشاغل یا دلچسپیاں۔",
  "Relocation": "شادی کے بعد دوسرے شہر یا ملک منتقل ہونے کی آمادگی۔",
  "Family Notes": "خاندان کے بارے میں مختصر اہم معلومات۔",
  "Other Partner Expectations": "وہ اضافی باتیں جو شریکِ حیات کے انتخاب میں اہم ہوں۔",
  "Photo Privacy": "طے کریں کہ تصویر کس مرحلے پر دکھائی جا سکتی ہے۔",
  "Contact Privacy": "طے کریں کہ رابطہ کس مرحلے پر شیئر کیا جا سکتا ہے۔",
  "Candidate Photo": "امیدوار کی تصویر، نجی ریکارڈ کے لیے۔",
  "Payment Receipt / Proof": "فیس یا ادائیگی کی رسید/ثبوت۔",
  "Profile Status": "درخواست کی موجودہ انتظامی حیثیت۔",
  "Verification": "شناخت یا کمیٹی کی تصدیق کی سطح۔",
  "Admin / Manager Note": "صرف انتظامیہ کے لیے داخلی نوٹ۔",
  "Minimum Monthly Income": "شریکِ حیات کے لیے کم از کم مطلوبہ ماہانہ آمدن۔",
  "Income Importance": "یہ شرط کتنی اہم ہے: لازمی، ترجیحی یا ہو تو بہتر۔"
};

const SECTION_HINTS: Record<string, string> = {
  "Candidate & Consent": "امیدوار کی بنیادی معلومات اور امیدوار/سرپرست کی اجازت۔",
  "Location, Education & Career": "رہائش، تعلیم اور پیشہ ورانہ معلومات۔",
  "Family & Lifestyle": "خاندانی ماحول، طرزِ زندگی اور شادی کی ترجیحات۔",
  "Family, Lifestyle & Compatibility": "خاندانی ماحول، طرزِ زندگی، شادی کا متوقع وقت اور مختصر مطابقتی سوالات۔",
  "Layered Partner Preferences": "Primary = پہلی ترجیح، Secondary = دوسری ترجیح، Acceptable = قابلِ قبول۔ Must = لازمی، Preferred = ترجیحی، Nice to have = ہو تو بہتر۔",
  "Privacy, Media & Approval": "تصویر، رابطہ، دستاویزات اور منظوری کی رازداری کی ترتیبات۔"
};

const CHECKBOX_HINTS: Record<string, string> = {
  "Candidate/guardian consent recorded": "امیدوار یا سرپرست کی اجازت ریکارڈ ہو چکی ہے۔",
  "Enable for private matching": "پروفائل صرف نجی میچنگ سسٹم میں شامل ہوگا، عوامی طور پر نہیں۔",
  "Priority / Featured": "صرف اندرونی میچنگ رینکنگ میں ترجیح کے لیے۔"
};

const PLACEHOLDERS: Record<string, string> = {
  "Relocation": "e.g. Yes - UAE / No / Within Pakistan",
  "Employer Type": "e.g. Government / Private / Own business",
  "Languages": "e.g. Urdu, Punjabi, English",
  "Hobbies": "e.g. Reading, Cricket, Travel"
};

function cleanText(value: string | null | undefined) { return String(value || "").replace(/\s+/g, " ").trim(); }
function makeUrduHint(text: string, kind: "field" | "section" | "checkbox") {
  const el = document.createElement(kind === "section" ? "div" : "small");
  el.setAttribute("data-matrimonial-urdu-hint", kind); el.setAttribute("lang", "ur"); el.setAttribute("dir", "rtl"); el.textContent = text;
  Object.assign(el.style, kind === "section" ? { display:"block", margin:"-7px 0 11px", padding:"7px 10px", borderRadius:"7px", background:"#f5f8f6", color:"#496555", fontSize:"10px", lineHeight:"1.7", textAlign:"right" } : { display:"block", marginTop:"3px", color:kind === "checkbox" ? "#66756c" : "#708078", fontSize:"9px", fontWeight:"500", lineHeight:"1.55", textAlign:"right" });
  return el;
}

function enhanceForm() {
  const path = window.location.pathname;
  const isTarget = path === "/admin/matrimonial/new" || /^\/admin\/matrimonial\/[^/]+\/edit$/.test(path);
  if (!isTarget) return;
  document.querySelectorAll<HTMLLabelElement>("form label").forEach((label) => {
    if (label.querySelector("[data-matrimonial-urdu-hint]")) return;
    const labelText = cleanText(Array.from(label.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join(" "));
    const hint = FIELD_HINTS[labelText];
    if (hint) { label.appendChild(makeUrduHint(hint, "field")); const control = label.parentElement?.querySelector<HTMLInputElement | HTMLTextAreaElement>("input:not([type='file']), textarea"); if (control && PLACEHOLDERS[labelText] && !control.placeholder) control.placeholder = PLACEHOLDERS[labelText]; }
  });
  document.querySelectorAll<HTMLHeadingElement>("form h3").forEach((heading) => { if (heading.nextElementSibling?.getAttribute("data-matrimonial-urdu-hint") === "section") return; const hint = SECTION_HINTS[cleanText(heading.textContent)]; if (hint) heading.insertAdjacentElement("afterend", makeUrduHint(hint, "section")); });
  document.querySelectorAll<HTMLElement>("form strong").forEach((strong) => { const text=cleanText(strong.textContent), hint=CHECKBOX_HINTS[text]; if(!hint)return; const span=strong.parentElement; if(!span||span.querySelector("[data-matrimonial-urdu-hint]"))return; span.appendChild(makeUrduHint(hint,"checkbox")); });
}

export function AdminMatrimonialUrduHints() {
  const { isAdmin, role } = useAdmin();
  const allowed = ["admin", "super_admin", "welfare_manager", "matrimonial_manager"].includes(String(role || ""));
  useEffect(() => { if (!isAdmin || !allowed || typeof document === "undefined") return; enhanceForm(); const observer = new MutationObserver(enhanceForm); observer.observe(document.body, { childList:true, subtree:true }); return () => observer.disconnect(); }, [isAdmin, allowed]);
  return null;
}
