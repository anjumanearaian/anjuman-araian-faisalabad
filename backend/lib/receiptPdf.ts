type ReceiptData = {
  receiptNo: string;
  date: Date | string;
  payerName: string;
  memberNo?: string | null;
  itemName: string;
  amount: number;
  paymentStatus?: string;
  reference?: string | null;
};

const esc = (value: unknown) => String(value ?? "")
  .replace(/\\/g, "\\\\")
  .replace(/\(/g, "\\(")
  .replace(/\)/g, "\\)")
  .replace(/[\r\n]+/g, " ")
  .replace(/[^\x20-\x7E]/g, "?");

function money(amount: number) {
  return `PKR ${Number(amount || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function createReceiptPdf(data: ReceiptData): Buffer {
  const date = new Date(data.date);
  const dateText = Number.isNaN(date.getTime()) ? String(data.date) : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const lines = [
    ["Receipt No", data.receiptNo],
    ["Date", dateText],
    ["Received From", data.payerName],
    ...(data.memberNo ? [["Member No", data.memberNo]] : []),
    ["For", data.itemName],
    ["Amount", money(data.amount)],
    ["Payment Status", data.paymentStatus || "Verified"],
    ...(data.reference ? [["System Reference", data.reference]] : []),
  ];

  const commands: string[] = [];
  commands.push("0.102 0.302 0.180 rg 0 755 595 87 re f");
  commands.push("1 1 1 rg BT /F2 22 Tf 52 798 Td (ANJUMAN-E-ARAIAN FAISALABAD) Tj ET");
  commands.push("0.82 0.66 0.29 rg BT /F2 12 Tf 52 777 Td (OFFICIAL PAYMENT RECEIPT) Tj ET");
  commands.push("0.12 0.12 0.12 rg");
  commands.push(`BT /F2 18 Tf 52 720 Td (Payment Receipt) Tj ET`);
  commands.push("0.82 0.66 0.29 RG 1.5 w 52 706 m 543 706 l S");

  let y = 665;
  for (const [label, value] of lines) {
    commands.push(`0.35 0.35 0.35 rg BT /F1 10 Tf 62 ${y} Td (${esc(label)}) Tj ET`);
    commands.push(`0.08 0.20 0.12 rg BT /F2 11 Tf 205 ${y} Td (${esc(value)}) Tj ET`);
    commands.push(`0.90 0.91 0.90 RG 0.6 w 62 ${y - 11} m 532 ${y - 11} l S`);
    y -= 45;
  }

  commands.push("0.95 0.97 0.95 rg 52 165 491 74 re f");
  commands.push("0.10 0.30 0.18 rg BT /F2 11 Tf 68 213 Td (Payment recorded in the Anjuman accounting system.) Tj ET");
  commands.push("0.30 0.35 0.31 rg BT /F1 9 Tf 68 191 Td (This computer-generated receipt is valid without a manual signature.) Tj ET");
  commands.push("0.35 0.35 0.35 rg BT /F1 8 Tf 52 70 Td (Anjuman-e-Araian Faisalabad | Official Community Platform) Tj ET");

  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];

  let pdf = "%PDF-1.4\n%AAF\n";
  const offsets = [0];
  objects.forEach((obj, index) => {
    offsets[index + 1] = Buffer.byteLength(pdf, "utf8");
    pdf += `${index + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}
