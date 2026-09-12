import { deflateSync, inflateSync } from "node:zlib";
import { ANJUMAN_LOGO_PNG_BASE64 } from "../assets/anjumanLogo";

type FinancePdfRow = {
  serialNo: number;
  transactionNo: string;
  type: string;
  direction: string;
  partyName: string;
  category: string;
  amount: number;
  paymentMethod?: string | null;
  cashBookNo?: string | null;
  receiptNo?: string | null;
  voucherNo?: string | null;
  externalReference?: string | null;
  description?: string | null;
  handledByName?: string | null;
  handledByRole?: string | null;
  issuedByName?: string | null;
  issuedByRole?: string | null;
  status: string;
  transactionDate: Date | string;
  member?: { memberNo: string; fullName: string } | null;
};

const esc = (value: unknown) => String(value ?? "")
  .replace(/\\/g, "\\\\")
  .replace(/\(/g, "\\(")
  .replace(/\)/g, "\\)")
  .replace(/[\r\n]+/g, " ")
  .replace(/[^\x20-\x7E]/g, "?");

function money(amount: number) {
  return `Rs. ${Number(amount || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;
}

function dateText(value: Date | string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function documentTitle(row: FinancePdfRow) {
  const category = String(row.category || "").toLowerCase();
  if (row.type === "expense" || row.direction === "debit") return row.type === "adjustment" ? "DEBIT ADJUSTMENT VOUCHER" : "PAYMENT / EXPENSE VOUCHER";
  if (row.type === "adjustment") return "CREDIT ADJUSTMENT RECEIPT";
  if (category.includes("executive") && category.includes("contribution")) return "EXECUTIVE COMMITTEE CONTRIBUTION RECEIPT";
  if (category.includes("life") && category.includes("membership")) return "LIFE MEMBERSHIP RECEIPT";
  if (category.includes("annual") && category.includes("membership")) return "ANNUAL MEMBERSHIP RECEIPT";
  if (category.includes("contribution")) return "CONTRIBUTION RECEIPT";
  if (category.includes("donation")) return "DONATION RECEIPT";
  return "OFFICIAL PAYMENT RECEIPT";
}

function paeth(a: number, b: number, c: number) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function pngToRgb(png: Buffer) {
  const signature = "89504e470d0a1a0a";
  if (png.subarray(0, 8).toString("hex") !== signature) throw new Error("Invalid PNG logo");
  let offset = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat: Buffer[] = [];
  while (offset + 12 <= png.length) {
    const length = png.readUInt32BE(offset); offset += 4;
    const type = png.subarray(offset, offset + 4).toString("ascii"); offset += 4;
    const data = png.subarray(offset, offset + length); offset += length + 4;
    if (type === "IHDR") {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9];
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
  }
  if (!width || !height || bitDepth !== 8 || ![0, 2, 4, 6].includes(colorType)) throw new Error("Unsupported PNG logo format");
  const channels = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 4 ? 2 : 4;
  const bpp = channels;
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idat));
  const scan = Buffer.alloc(height * stride);
  let input = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[input++];
    const rowStart = y * stride;
    for (let x = 0; x < stride; x++) {
      const current = raw[input++];
      const left = x >= bpp ? scan[rowStart + x - bpp] : 0;
      const up = y > 0 ? scan[rowStart - stride + x] : 0;
      const upLeft = y > 0 && x >= bpp ? scan[rowStart - stride + x - bpp] : 0;
      let value = current;
      if (filter === 1) value = (current + left) & 255;
      else if (filter === 2) value = (current + up) & 255;
      else if (filter === 3) value = (current + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) value = (current + paeth(left, up, upLeft)) & 255;
      else if (filter !== 0) throw new Error("Unsupported PNG filter");
      scan[rowStart + x] = value;
    }
  }
  const rgb = Buffer.alloc(width * height * 3);
  let out = 0;
  const matte = [14, 67, 40];
  for (let i = 0; i < scan.length; i += channels) {
    const alpha = colorType === 4 ? scan[i + 1] : colorType === 6 ? scan[i + 3] : 255;
    const src = colorType === 0 || colorType === 4 ? [scan[i], scan[i], scan[i]] : [scan[i], scan[i + 1], scan[i + 2]];
    for (let c = 0; c < 3; c++) rgb[out++] = Math.round((src[c] * alpha + matte[c] * (255 - alpha)) / 255);
  }
  return { width, height, compressed: deflateSync(rgb, { level: 9 }) };
}

function wrapObject(index: number, body: Buffer) {
  return Buffer.concat([Buffer.from(`${index} 0 obj\n`, "latin1"), body, Buffer.from("\nendobj\n", "latin1")]);
}

function textCmd(font: "F1" | "F2", size: number, x: number, y: number, text: unknown, rgb = "0.12 0.12 0.12") {
  return `${rgb} rg BT /${font} ${size} Tf ${x} ${y} Td (${esc(text)}) Tj ET`;
}

export function createFinanceDocumentPdf(row: FinancePdfRow): Buffer {
  const isDebit = row.direction === "debit";
  const documentNo = isDebit ? row.voucherNo : row.receiptNo;
  const logo = pngToRgb(Buffer.from(ANJUMAN_LOGO_PNG_BASE64, "base64"));
  const title = documentTitle(row);
  const handledLabel = isDebit ? "Paid / Authorized by" : "Payment Received by";

  const commands: string[] = [];
  commands.push("0.055 0.263 0.157 rg 0 742 595 100 re f");
  commands.push("0.80 0.65 0.30 rg 0 738 595 4 re f");
  commands.push("q 62 0 0 62 42 761 cm /Im1 Do Q");
  commands.push(textCmd("F2", 20, 118, 804, "ANJUMAN-E-ARAIAN FAISALABAD", "1 1 1"));
  commands.push(textCmd("F2", 11, 118, 782, title, "0.84 0.70 0.34"));
  commands.push(textCmd("F1", 8, 118, 765, "Official Finance Ledger Document", "0.88 0.92 0.89"));

  commands.push(textCmd("F2", 15, 44, 704, title));
  commands.push("0.80 0.65 0.30 RG 1.4 w 44 691 m 551 691 l S");

  const rows: Array<[string, unknown]> = [
    ["Document No.", documentNo || row.transactionNo],
    ["Ledger Serial", row.serialNo],
    ["Transaction No.", row.transactionNo],
    ["Date", dateText(row.transactionDate)],
    ["Name / Party", row.partyName],
    ...(row.member ? [["Member", `${row.member.fullName} (${row.member.memberNo})`] as [string, unknown]] : []),
    ["Head / Category", row.category],
    ["Amount", money(row.amount)],
    ["Payment Method", row.paymentMethod || "Not specified"],
    ["Cash / C-in-book No.", row.cashBookNo || "-"],
    ["Reference", row.externalReference || "-"],
    ["Remarks / Purpose", row.description || "-"],
    [handledLabel, row.handledByName ? `${row.handledByName}${row.handledByRole ? ` (${row.handledByRole})` : ""}` : `${row.issuedByName || "Administrator"}${row.issuedByRole ? ` (${row.issuedByRole.replace(/_/g, " ")})` : ""}`],
    ["Recorded By", `${row.issuedByName || "Administrator"}${row.issuedByRole ? ` (${row.issuedByRole.replace(/_/g, " ")})` : ""}`],
  ];

  let y = 660;
  for (const [label, value] of rows) {
    commands.push(textCmd("F1", 9, 53, y, label, "0.38 0.38 0.38"));
    commands.push(textCmd("F2", 10.5, 190, y, String(value).slice(0, 78), "0.055 0.263 0.157"));
    commands.push(`0.90 0.90 0.88 RG .55 w 53 ${y - 10} m 542 ${y - 10} l S`);
    y -= 34;
  }

  const boxY = Math.max(98, y - 10);
  commands.push(`0.96 0.97 0.95 rg 44 ${boxY} 507 62 re f`);
  commands.push(textCmd("F2", 9.5, 58, boxY + 39, "Verified Digital Ledger Record", "0.055 0.263 0.157"));
  commands.push(textCmd("F1", 8.5, 58, boxY + 20, "Serial and document numbers are system generated. Corrections remain in the audit trail.", "0.34 0.38 0.35"));
  commands.push(textCmd("F1", 8, 44, 49, "Anjuman-e-Araian Faisalabad | Official Community Platform", "0.42 0.42 0.42"));

  const stream = Buffer.from(commands.join("\n"), "latin1");
  const imageBody = Buffer.concat([
    Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${logo.compressed.length} >>\nstream\n`, "latin1"),
    logo.compressed,
    Buffer.from("\nendstream", "latin1"),
  ]);
  const objects: Buffer[] = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "latin1"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "latin1"),
    Buffer.from("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> /XObject << /Im1 7 0 R >> >> /Contents 4 0 R >>", "latin1"),
    Buffer.concat([Buffer.from(`<< /Length ${stream.length} >>\nstream\n`, "latin1"), stream, Buffer.from("\nendstream", "latin1")]),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", "latin1"),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>", "latin1"),
    imageBody,
  ];

  const parts: Buffer[] = [Buffer.from("%PDF-1.4\n%AAF\n", "latin1")];
  const offsets: number[] = [0];
  let size = parts[0].length;
  objects.forEach((body, index) => {
    offsets[index + 1] = size;
    const wrapped = wrapObject(index + 1, body);
    parts.push(wrapped);
    size += wrapped.length;
  });
  const xrefOffset = size;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  parts.push(Buffer.from(xref, "latin1"));
  return Buffer.concat(parts);
}
