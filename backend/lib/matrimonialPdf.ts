type ReferenceRecord = {
  name?: string;
  profession?: string;
  phone?: string;
  city?: string;
  address?: string;
  isMember?: boolean;
  memberNo?: string;
  memberName?: string;
};

type MatrimonialPdfProfile = Record<string, any> & {
  profileData?: Record<string, any>;
  preferenceData?: Record<string, any>;
  privacyData?: Record<string, any>;
};

const GREEN = "0.055 0.263 0.157";
const GOLD = "0.80 0.65 0.30";

function ascii(value: unknown) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[\r\n]+/g, " ")
    .replace(/[^\x20-\x7E]/g, "?")
    .trim();
}

function profileCode(id: string) {
  return `AAF-MAT-${String(id || "").replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function list(value: any) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return String(value ?? "");
}

function prefText(value: any) {
  if (!value || typeof value !== "object") return "";
  if (value.min || value.max) return `${value.min || "Any"} - ${value.max || "Any"}${value.importance ? ` (${String(value.importance).replace(/_/g, " ")})` : ""}`;
  if (value.minimum) return `Minimum ${value.minimum}${value.importance ? ` (${String(value.importance).replace(/_/g, " ")})` : ""}`;
  const parts = [
    Array.isArray(value.primary) && value.primary.length ? `Primary: ${value.primary.join(", ")}` : "",
    Array.isArray(value.secondary) && value.secondary.length ? `Secondary: ${value.secondary.join(", ")}` : "",
    Array.isArray(value.acceptable) && value.acceptable.length ? `Acceptable: ${value.acceptable.join(", ")}` : "",
  ].filter(Boolean);
  return `${parts.join(" | ")}${value.importance ? ` (${String(value.importance).replace(/_/g, " ")})` : ""}`;
}

function wrapText(text: string, width = 82) {
  const value = ascii(text);
  if (!value) return ["-"];
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length <= width) current = (current + " " + word).trim();
    else {
      if (current) lines.push(current);
      current = word.length > width ? word.slice(0, width) : word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : ["-"];
}

function text(font: "F1" | "F2", size: number, x: number, y: number, value: unknown, color = "0.16 0.16 0.16") {
  return `${color} rg BT /${font} ${size} Tf ${x} ${y} Td (${ascii(value)}) Tj ET`;
}

function buildRows(profile: MatrimonialPdfProfile) {
  const d = profile.profileData || {};
  const pref = profile.preferenceData || {};
  const privacy = profile.privacyData || {};
  const refs = Array.isArray(d.references) ? d.references as ReferenceRecord[] : [];
  const rows: Array<{ kind: "section" | "row" | "note"; label?: string; value?: string }> = [];
  const section = (value: string) => rows.push({ kind: "section", value });
  const row = (label: string, value: any) => { if (value !== undefined && value !== null && String(value).trim()) rows.push({ kind: "row", label, value: String(value) }); };
  const note = (label: string, value: any) => { if (value) rows.push({ kind: "note", label, value: String(value) }); };

  section("Candidate Identification");
  row("Profile Code", profile.profileCode || profileCode(profile.id));
  row("Candidate Name", profile.name);
  row("Email", profile.email);
  row("Private Contact", profile.contact);
  row("Managed For", profile.relationToCandidate || "Self");
  row("Gender", profile.gender);
  row("Age", profile.age);
  row("Date of Birth", profile.dateOfBirth);
  row("Height", profile.heightCm ? `${profile.heightCm} cm` : "");
  row("Marital Status", profile.maritalStatus);
  row("Candidate Consent", profile.candidateConsent ? "Recorded" : "Not recorded");

  section("Location, Education & Career");
  row("Country", profile.country || "Pakistan");
  row("Province / State", profile.province);
  row("City", profile.city);
  row("Nationality", profile.nationality);
  row("Residence / Visa", profile.residenceStatus);
  row("Education", profile.education);
  row("Profession", profile.profession);
  row("Employment Type", profile.employmentType || d.employmentType);
  row("Employer Type", profile.employerType || d.employerType);
  row("Income Band", profile.incomeBand || d.incomeBand);
  row("Currency", profile.currency || "PKR");

  section("Family, Lifestyle & Intentions");
  row("Family Setup", d.familySetup);
  row("Sect", d.sect);
  row("Languages", list(d.languages));
  row("Hobbies", d.hobbies);
  row("Marriage Timeline", d.marriageTimeline);
  row("Timeline (normalized)", d.marriageTimelineDays ? `${d.marriageTimelineDays} days` : "");
  row("Timeline Flexibility", d.marriageTimelineFlexibility);
  row("Relocation", d.relocation);
  note("Family Notes", d.familyNotes || profile.familyBackground);

  section("Partner Preferences");
  row("Preferred Age", prefText(pref.age));
  row("Preferred Height", prefText(pref.height));
  row("Education", prefText(pref.education));
  row("Profession", prefText(pref.profession));
  row("Country", prefText(pref.country));
  row("City", prefText(pref.city));
  row("Marital Status", prefText(pref.maritalStatus));
  row("Residence", prefText(pref.residenceStatus));
  row("Family Setup", prefText(pref.familySetup));
  row("Relocation", prefText(pref.relocation));
  row("Income", prefText(pref.income));
  note("Other Expectations", pref.notes || profile.requirements);

  section("References / Verification");
  refs.forEach((r, index) => {
    row(`Reference ${index + 1}`, `${r.name || "-"}${r.isMember ? ` | Anjuman Member${r.memberNo ? ` ${r.memberNo}` : ""}` : " | Non-member"}`);
    row("Profession", r.profession);
    row("Mobile", r.phone);
    row("City / Address", [r.city, r.address].filter(Boolean).join(" | "));
  });
  if (!refs.length) row("References", "Not recorded");

  section("Privacy, Verification & Workflow");
  row("Profile Status", profile.status);
  row("Payment Status", profile.paymentStatus);
  row("Verification", profile.verificationStatus);
  row("Profile & Match Readiness", `${profile.profileCompleteness || 0}%`);
  row("Private Matching", profile.showOnPortal ? "Enabled" : "Disabled");
  row("Photo Privacy", privacy.photoVisibility);
  row("Contact Privacy", privacy.contactVisibility);
  row("Application Source", profile.applicationSource);
  note("Admin / Manager Note", profile.adminNote);

  return rows;
}

function pageContent(profile: MatrimonialPdfProfile, pageRows: ReturnType<typeof buildRows>, pageNo: number, totalPages: number) {
  const commands: string[] = [];
  commands.push(`${GREEN} rg 0 758 595 84 re f`);
  commands.push(`${GOLD} rg 0 754 595 4 re f`);
  commands.push(text("F2", 19, 42, 807, "ANJUMAN-E-ARAIAN FAISALABAD", "1 1 1"));
  commands.push(text("F2", 11, 42, 787, "CONFIDENTIAL MATRIMONIAL CANDIDATE FILE", "0.90 0.76 0.38"));
  commands.push(text("F1", 8, 42, 770, `${profile.profileCode || profileCode(profile.id)} | Authorized internal record`, "0.88 0.92 0.89"));
  commands.push(text("F1", 8, 485, 770, `Page ${pageNo}/${totalPages}`, "0.88 0.92 0.89"));

  let y = 725;
  for (const item of pageRows) {
    if (item.kind === "section") {
      y -= 4;
      commands.push(`${GOLD} RG 1.2 w 42 ${y - 5} m 553 ${y - 5} l S`);
      commands.push(text("F2", 11.5, 42, y + 7, item.value || "" , GREEN));
      y -= 23;
      continue;
    }
    if (item.kind === "row") {
      const lines = wrapText(item.value || "", 58);
      commands.push(text("F1", 8.5, 48, y, item.label || "", "0.38 0.38 0.38"));
      commands.push(text("F2", 9.2, 180, y, lines[0] || "-", GREEN));
      let yy = y - 12;
      for (const extra of lines.slice(1, 3)) { commands.push(text("F1", 8.7, 180, yy, extra)); yy -= 11; }
      y -= Math.max(22, 12 + (Math.min(lines.length, 3) - 1) * 11);
      continue;
    }
    const lines = wrapText(item.value || "", 78).slice(0, 5);
    commands.push(text("F2", 8.5, 48, y, item.label || "", GREEN));
    y -= 13;
    for (const line of lines) { commands.push(text("F1", 8.5, 58, y, line)); y -= 11; }
    y -= 7;
  }

  commands.push("0.92 0.94 0.92 rg 42 54 511 45 re f");
  commands.push(text("F2", 8.5, 52, 82, "CONFIDENTIAL - HANDLE ONLY WITHIN AUTHORIZED MATRIMONIAL PROCESS", GREEN));
  commands.push(text("F1", 7.5, 52, 67, "Candidate information, references and contact details are not for public distribution.", "0.38 0.42 0.39"));
  commands.push(text("F1", 7.5, 42, 35, `Generated ${new Date().toLocaleString("en-PK")} | Anjuman-e-Araian Faisalabad`, "0.45 0.45 0.45"));
  return Buffer.from(commands.join("\n"), "latin1");
}

export function createMatrimonialProfilePdf(profile: MatrimonialPdfProfile): Buffer {
  const rows = buildRows(profile);
  const pages: typeof rows[] = [];
  let current: typeof rows = [];
  let units = 0;
  for (const item of rows) {
    const cost = item.kind === "section" ? 2 : item.kind === "note" ? 4 : 1;
    if (current.length && units + cost > 24) { pages.push(current); current = []; units = 0; }
    current.push(item); units += cost;
  }
  if (current.length) pages.push(current);
  if (!pages.length) pages.push([]);

  const objects: Buffer[] = [];
  const pageObjectNumbers: number[] = [];
  const contentObjectNumbers: number[] = [];
  const fontRegular = 3 + pages.length * 2;
  const fontBold = fontRegular + 1;

  objects.push(Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "latin1"));
  // Pages object is filled after page numbers are known.
  objects.push(Buffer.alloc(0));

  for (let i = 0; i < pages.length; i++) {
    const pageObj = 3 + i * 2;
    const contentObj = pageObj + 1;
    pageObjectNumbers.push(pageObj);
    contentObjectNumbers.push(contentObj);
    const stream = pageContent(profile, pages[i], i + 1, pages.length);
    objects.push(Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentObj} 0 R >>`, "latin1"));
    objects.push(Buffer.concat([Buffer.from(`<< /Length ${stream.length} >>\nstream\n`, "latin1"), stream, Buffer.from("\nendstream", "latin1")]));
  }
  objects[1] = Buffer.from(`<< /Type /Pages /Kids [${pageObjectNumbers.map((n) => `${n} 0 R`).join(" ")}] /Count ${pages.length} >>`, "latin1");
  objects.push(Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", "latin1"));
  objects.push(Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>", "latin1"));

  const parts: Buffer[] = [Buffer.from("%PDF-1.4\n%AAF-MATRIMONIAL\n", "latin1")];
  const offsets: number[] = [0];
  let size = parts[0].length;
  objects.forEach((body, index) => {
    offsets[index + 1] = size;
    const wrapped = Buffer.concat([Buffer.from(`${index + 1} 0 obj\n`, "latin1"), body, Buffer.from("\nendobj\n", "latin1")]);
    parts.push(wrapped); size += wrapped.length;
  });
  const xrefOffset = size;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  parts.push(Buffer.from(xref, "latin1"));
  return Buffer.concat(parts);
}
