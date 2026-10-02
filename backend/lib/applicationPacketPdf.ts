type PacketRow = [string, unknown];

export type ApplicationPacketInput = {
  title: string;
  reference?: string | null;
  status?: string | null;
  generatedAt?: Date | string | null;
  rows: PacketRow[];
};

function safe(value: unknown) {
  return String(value ?? "")
    .replace(/[^ -~]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\s+/g, " ")
    .trim();
}

function shown(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (value instanceof Date) return value.toLocaleString("en-GB");
  if (Array.isArray(value)) return value.map(shown).join(", ");
  if (typeof value === "object") return safe(JSON.stringify(value));
  return safe(value);
}

function wrap(text: string, max = 72) {
  if (text.length <= max) return [text];
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? current + " " + word : word;
    if (next.length > max && current) {
      lines.push(current);
      current = word;
    } else current = next;
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
}

function pageStream(input: ApplicationPacketInput, rows: PacketRow[], pageNo: number, totalPages: number) {
  const c: string[] = [];
  const generated = input.generatedAt ? new Date(input.generatedAt) : new Date();
  c.push("0.102 0.302 0.180 rg 0 755 595 87 re f");
  c.push("1 1 1 rg BT /F2 20 Tf 42 798 Td (ANJUMAN-E-ARAIAN FAISALABAD) Tj ET");
  c.push("0.82 0.66 0.29 rg BT /F2 11 Tf 42 777 Td (" + safe(input.title).slice(0, 75) + ") Tj ET");
  c.push("0.12 0.12 0.12 rg");
  let y = 718;
  const meta = [
    ["Reference", input.reference || "-"],
    ["Status", input.status || "-"],
    ["Generated", generated.toLocaleString("en-GB")],
  ] as PacketRow[];
  for (const [label, value] of meta) {
    c.push("BT /F2 9 Tf 42 " + y + " Td (" + safe(label) + ") Tj ET");
    c.push("BT /F1 9 Tf 155 " + y + " Td (" + safe(shown(value)).slice(0, 78) + ") Tj ET");
    y -= 20;
  }
  y -= 8;
  c.push("0.82 0.66 0.29 RG 1 w 42 " + (y + 8) + " m 553 " + (y + 8) + " l S");
  for (const [labelRaw, valueRaw] of rows) {
    const label = safe(labelRaw);
    const valueLines = wrap(safe(shown(valueRaw)), 66);
    c.push("BT /F2 8.5 Tf 42 " + y + " Td (" + label.slice(0, 28) + ") Tj ET");
    valueLines.forEach((line, idx) => {
      c.push("BT /F1 8.5 Tf 190 " + (y - idx * 12) + " Td (" + line + ") Tj ET");
    });
    y -= Math.max(19, valueLines.length * 12 + 7);
  }
  c.push("0.35 0.35 0.35 rg BT /F1 7.5 Tf 42 42 Td (Computer-generated application packet. Keep with the official record.) Tj ET");
  c.push("BT /F1 7.5 Tf 468 42 Td (Page " + pageNo + " of " + totalPages + ") Tj ET");
  return c.join("\n");
}

export function createApplicationPacketPdf(input: ApplicationPacketInput): Buffer {
  const cleanRows = input.rows.filter(([label]) => Boolean(String(label || "").trim()));
  const pages: PacketRow[][] = [];
  const perPage = 22;
  for (let i = 0; i < cleanRows.length; i += perPage) pages.push(cleanRows.slice(i, i + perPage));
  if (!pages.length) pages.push([]);

  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  const pageIds = pages.map((_, i) => 5 + i * 2);
  objects.push("<< /Type /Pages /Kids [" + pageIds.map((id) => id + " 0 R").join(" ") + "] /Count " + pages.length + " >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  pages.forEach((rows, index) => {
    const pageId = 5 + index * 2;
    const contentId = pageId + 1;
    objects.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents " + contentId + " 0 R >>");
    const stream = pageStream(input, rows, index + 1, pages.length);
    objects.push("<< /Length " + Buffer.byteLength(stream, "latin1") + " >>\nstream\n" + stream + "\nendstream");
  });

  let pdf = "%PDF-1.4\n%AAF-APPLICATION\n";
  const offsets = [0];
  objects.forEach((obj, index) => {
    offsets[index + 1] = Buffer.byteLength(pdf, "latin1");
    pdf += (index + 1) + " 0 obj\n" + obj + "\nendobj\n";
  });
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += "xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) pdf += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  pdf += "trailer\n<< /Size " + (objects.length + 1) + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF";
  return Buffer.from(pdf, "latin1");
}

export function rowsFromRecord(record: Record<string, any>, omit: string[] = []) {
  const hidden = new Set(omit);
  return Object.entries(record)
    .filter(([key, value]) => !hidden.has(key) && value !== undefined && value !== null && value !== "")
    .map(([key, value]) => [
      key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/^./, (c) => c.toUpperCase()),
      value,
    ] as PacketRow);
}
