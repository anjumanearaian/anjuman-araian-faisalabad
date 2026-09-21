import { deflateSync, inflateSync } from "node:zlib";
import { ANJUMAN_LOGO_PNG_BASE64 } from "../assets/anjumanLogo";

export type MeetingDocumentType = "notice" | "agenda" | "attendance" | "minutes" | "decisions" | "package";

type AttendanceRow = {
  attendeeType?: string | null;
  status?: string | null;
  guestName?: string | null;
  guestDesignation?: string | null;
  remarks?: string | null;
  member?: { fullName?: string | null; memberNo?: string | null } | null;
};

type AgendaItem = {
  itemNo?: number | null;
  title?: string | null;
  discussion?: string | null;
  decision?: string | null;
  responsibleName?: string | null;
  deadline?: string | null;
  status?: string | null;
};

type MeetingPdfData = {
  id: string;
  title: string;
  meetingType?: string | null;
  date: string;
  time?: string | null;
  venue?: string | null;
  status?: string | null;
  notice?: string | null;
  agenda?: string | null;
  minutes?: string | null;
  organization?: { name?: string | null } | null;
  chairName?: string | null;
  chairDesignation?: string | null;
  preparedByName?: string | null;
  approvedByName?: string | null;
  approvedAt?: Date | string | null;
  publishedAt?: Date | string | null;
  minutesStatus?: string | null;
  attendance?: AttendanceRow[];
  agendaItems?: AgendaItem[];
};

const PAGE_W = 595;
const PAGE_H = 842;
const LEFT = 56;
const RIGHT = 545;
const TOP = 700;
const BOTTOM = 72;
const GREEN = "0.055 0.263 0.157";
const GOLD = "0.80 0.65 0.30";
const DARK = "0.12 0.12 0.12";
const GREY = "0.36 0.39 0.37";
const LIGHT = "0.94 0.96 0.94";

const esc = (value: unknown) => String(value ?? "")
  .replace(/\\/g, "\\\\")
  .replace(/\(/g, "\\(")
  .replace(/\)/g, "\\)")
  .replace(/[\r\n]+/g, " ")
  .replace(/[^\x20-\x7E]/g, "?");

function dateText(value: unknown) {
  if (!value) return "-";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

function timeText(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  const m = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return raw;
  let h = Number(m[1]);
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m[2]} ${suffix}`;
}

function titleFor(type: MeetingDocumentType) {
  if (type === "notice") return "MEETING NOTICE";
  if (type === "agenda") return "MEETING AGENDA";
  if (type === "attendance") return "ATTENDANCE SHEET";
  if (type === "decisions") return "KEY DECISIONS & ACTION POINTS";
  if (type === "package") return "COMPLETE MEETING FILE";
  return "MINUTES OF MEETING";
}

function clean(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function splitParagraphs(value: unknown) {
  return String(value || "")
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function wrap(text: string, maxChars: number) {
  const words = clean(text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) current = next;
    else {
      if (current) lines.push(current);
      current = word.length > maxChars ? word.slice(0, maxChars) : word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function textCmd(font: "F1" | "F2", size: number, x: number, y: number, text: unknown, rgb = DARK) {
  return `${rgb} rg BT /${font} ${size} Tf ${x} ${y} Td (${esc(text)}) Tj ET`;
}

function paeth(a: number, b: number, c: number) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function pngToRgb(png: Buffer) {
  if (png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error("Invalid PNG logo");
  let offset = 8, width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat: Buffer[] = [];
  while (offset + 12 <= png.length) {
    const length = png.readUInt32BE(offset); offset += 4;
    const type = png.subarray(offset, offset + 4).toString("ascii"); offset += 4;
    const data = png.subarray(offset, offset + length); offset += length + 4;
    if (type === "IHDR") { width = data.readUInt32BE(0); height = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; }
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
  }
  if (!width || !height || bitDepth !== 8 || ![0,2,4,6].includes(colorType)) throw new Error("Unsupported PNG logo format");
  const channels = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 4 ? 2 : 4;
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idat));
  const scan = Buffer.alloc(height * stride);
  let input = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[input++], rowStart = y * stride;
    for (let x = 0; x < stride; x++) {
      const current = raw[input++], left = x >= channels ? scan[rowStart + x - channels] : 0;
      const up = y > 0 ? scan[rowStart - stride + x] : 0, upLeft = y > 0 && x >= channels ? scan[rowStart - stride + x - channels] : 0;
      let value = current;
      if (filter === 1) value = (current + left) & 255;
      else if (filter === 2) value = (current + up) & 255;
      else if (filter === 3) value = (current + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) value = (current + paeth(left, up, upLeft)) & 255;
      scan[rowStart + x] = value;
    }
  }
  const rgb = Buffer.alloc(width * height * 3);
  let out = 0;
  const matte = [255,255,255];
  for (let i=0;i<scan.length;i+=channels) {
    const alpha = colorType === 4 ? scan[i+1] : colorType === 6 ? scan[i+3] : 255;
    const src = colorType === 0 || colorType === 4 ? [scan[i],scan[i],scan[i]] : [scan[i],scan[i+1],scan[i+2]];
    for (let c=0;c<3;c++) rgb[out++] = Math.round((src[c]*alpha + matte[c]*(255-alpha))/255);
  }
  return { width, height, compressed: deflateSync(rgb, { level: 9 }) };
}

class Composer {
  pages: string[][] = [[]];
  y = TOP;
  pageIndex = 0;
  constructor(private data: MeetingPdfData, private docType: MeetingDocumentType) { this.header(); }
  private cmds() { return this.pages[this.pageIndex]; }
  private header() {
    const c = this.cmds();
    c.push(`${GREEN} rg 0 0 20 ${PAGE_H} re f`);
    c.push("q 54 0 0 54 55 760 cm /Im1 Do Q");
    c.push(textCmd("F2", 20, 122, 803, "Anjuman-e-Araian Faisalabad", DARK));
    c.push(`${GREEN} RG 1.2 w 122 785 m 348 785 l S`);
    c.push(`${GOLD} RG .8 w 350 785 m 520 785 l S`);
    c.push(textCmd("F1", 8.5, 55, 45, "+92 328 8655522 | +92 300 8655522", GREY));
    c.push(textCmd("F1", 8.5, 255, 45, "info@anjumanearaian.org | www.anjumanearaian.org", GREY));
    c.push(textCmd("F1", 8.5, 520, 45, `Page ${this.pageIndex + 1}`, GREY));
  }
  newPage() { this.pages.push([]); this.pageIndex++; this.y = TOP; this.header(); }
  ensure(height: number) { if (this.y - height < BOTTOM) this.newPage(); }
  heading(text: string, level = 1) {
    const size = level === 1 ? 17 : level === 2 ? 12.5 : 10.5;
    this.ensure(size + 18);
    this.cmds().push(textCmd("F2", size, LEFT, this.y, text, level === 1 ? DARK : GREEN));
    this.y -= level === 1 ? 25 : 19;
  }
  paragraph(text: string, opts?: { bold?: boolean; color?: string; indent?: number }) {
    const lines = wrap(text, opts?.indent ? 82 : 90);
    this.ensure(lines.length * 14 + 8);
    for (const line of lines) {
      this.cmds().push(textCmd(opts?.bold ? "F2" : "F1", 9.3, LEFT + (opts?.indent || 0), this.y, line, opts?.color || DARK));
      this.y -= 14;
    }
    this.y -= 4;
  }
  kv(rows: Array<[string,string]>) {
    const rowH = 25;
    for (const [label, value] of rows) {
      this.ensure(rowH + 2);
      this.cmds().push(`${LIGHT} rg ${LEFT} ${this.y-15} 132 22 re f`);
      this.cmds().push(textCmd("F2", 8.4, LEFT+7, this.y-1, label, GREEN));
      this.cmds().push(textCmd("F1", 8.8, LEFT+142, this.y-1, value || "-", DARK));
      this.cmds().push(`0.82 0.86 0.83 RG .45 w ${LEFT} ${this.y-16} m ${RIGHT} ${this.y-16} l S`);
      this.y -= rowH;
    }
    this.y -= 6;
  }
  bullet(text: string, no?: number) {
    const prefix = no ? `${no}.` : "•";
    const lines = wrap(text, 82);
    this.ensure(lines.length * 14 + 4);
    this.cmds().push(textCmd("F2", 9.3, LEFT, this.y, prefix, GREEN));
    for (let i=0;i<lines.length;i++) {
      this.cmds().push(textCmd("F1", 9.2, LEFT+20, this.y-(i*14), lines[i], DARK));
    }
    this.y -= lines.length * 14 + 5;
  }
  table(headers: string[], rows: string[][], widths: number[]) {
    const x0 = LEFT;
    const headerH = 24;
    const drawHeader = () => {
      this.ensure(headerH + 30);
      let x=x0;
      headers.forEach((h,i)=>{ this.cmds().push(`${GREEN} rg ${x} ${this.y-headerH+5} ${widths[i]} ${headerH} re f`); this.cmds().push(textCmd("F2",7.5,x+4,this.y-8,h,"1 1 1")); x+=widths[i]; });
      this.y -= headerH;
    };
    drawHeader();
    for (const row of rows) {
      const wrapped = row.map((cell,i)=>wrap(cell, Math.max(8, Math.floor(widths[i]/5.7))));
      const h = Math.max(...wrapped.map(x=>x.length))*11 + 10;
      if (this.y-h < BOTTOM) { this.newPage(); drawHeader(); }
      let x=x0;
      row.forEach((_,i)=>{
        this.cmds().push(`0.80 0.84 0.81 RG .45 w ${x} ${this.y-h} ${widths[i]} ${h} re S`);
        wrapped[i].forEach((line,j)=>this.cmds().push(textCmd("F1",7.7,x+4,this.y-13-(j*11),line,DARK)));
        x+=widths[i];
      });
      this.y -= h;
    }
    this.y -= 10;
  }
}

function meetingMeta(data: MeetingPdfData) {
  const officialAttendance = (data.attendance || []).filter(a=>a.attendeeType === "member" || !a.attendeeType);
  const present = officialAttendance.filter(a=>["present","late","online"].includes(String(a.status))).length;
  const guests = (data.attendance || []).filter(a=>a.attendeeType && a.attendeeType !== "member" && ["present","late","online"].includes(String(a.status))).length;
  return [
    ["Meeting", data.title],
    ["Unit / Committee", data.organization?.name || "General"],
    ["Date", dateText(data.date)],
    ["Time", timeText(data.time)],
    ["Venue", data.venue || "-"],
    ["Attendance", `${present} member(s)${guests ? ` + ${guests} guest(s) / volunteer(s)` : ""}`],
    ["Presiding Officer", data.chairName ? `${data.chairName}${data.chairDesignation ? ` - ${data.chairDesignation}` : ""}` : "To be confirmed"],
  ] as Array<[string,string]>;
}

function addOpening(c: Composer, data: MeetingPdfData) {
  c.heading("Proceedings", 2);
  c.paragraph(`The meeting commenced at ${timeText(data.time)} with the recitation of the Holy Quran. ${data.chairName ? `${data.chairName}, ${data.chairDesignation || "Presiding Officer"}, presided over the meeting.` : "The presiding officer was confirmed from the attendance record."} The agenda was then presented for discussion and decision.`);
}

function agendaLines(data: MeetingPdfData) {
  const items = data.agendaItems || [];
  if (items.length) return items.map((x,i)=>({ no:x.itemNo || i+1, text:x.title || "" }));
  return splitParagraphs(data.agenda).map((x,i)=>({ no:i+1, text:x.replace(/^\d+[.)]\s*/, "") }));
}

function attendanceRows(data: MeetingPdfData) {
  return (data.attendance || []).map((a,i)=>[
    String(i+1),
    a.member?.fullName || a.guestName || "Attendee",
    a.attendeeType === "member" || !a.attendeeType ? "Official Member" : clean(a.guestDesignation || a.attendeeType?.replace(/_/g," ") || "Guest"),
    clean(a.status || "not marked").replace(/_/g," "),
    clean(a.remarks || ""),
  ]);
}

function decisionRows(data: MeetingPdfData) {
  const items=(data.agendaItems || []).filter(x=>clean(x.decision));
  if (items.length) return items.map((x,i)=>[
    String(x.itemNo || i+1),
    clean(x.decision),
    clean(x.responsibleName || "-"),
    clean(x.deadline || "-"),
    clean(x.status || "pending").replace(/_/g," "),
  ]);
  const paragraphs=splitParagraphs(data.minutes).filter(x=>/^\d+[.)]/.test(x));
  return paragraphs.map((x,i)=>[String(i+1),x.replace(/^\d+[.)]\s*/,""),"-","-","-"]);
}

function buildSection(c: Composer, data: MeetingPdfData, type: MeetingDocumentType) {
  c.heading(titleFor(type), 1);
  c.kv(meetingMeta(data));

  if (type === "notice") {
    c.heading("Meeting Notice",2);
    splitParagraphs(data.notice).forEach(p=>c.paragraph(p));
    c.heading("Agenda",2);
    agendaLines(data).forEach(x=>c.bullet(x.text,x.no));
    return;
  }
  if (type === "agenda") {
    c.heading("Agenda",2);
    agendaLines(data).forEach(x=>c.bullet(x.text,x.no));
    return;
  }
  if (type === "attendance") {
    c.heading("Attendance Record",2);
    c.table(["No.","Name","Designation / Type","Status","Remarks"],attendanceRows(data),[30,160,120,70,85]);
    return;
  }
  if (type === "decisions") {
    c.heading("Key Decisions & Action Points",2);
    c.table(["No.","Decision / Action","Responsible","Deadline","Status"],decisionRows(data),[28,220,95,72,50]);
    return;
  }

  addOpening(c,data);
  c.heading("Agenda & Minutes",2);
  const items=data.agendaItems || [];
  if (items.length) {
    items.forEach((x,i)=>{
      c.heading(`${x.itemNo || i+1}. ${clean(x.title)}`,3);
      if (clean(x.discussion)) { c.paragraph("Discussion",{bold:true,color:GREEN}); c.paragraph(clean(x.discussion)); }
      if (clean(x.decision)) { c.paragraph("Decision / Resolution",{bold:true,color:GREEN}); c.paragraph(clean(x.decision)); }
      if (x.responsibleName || x.deadline) c.paragraph(`Responsibility: ${x.responsibleName || "-"} | Deadline: ${x.deadline || "-"}`,{bold:true});
    });
  } else {
    splitParagraphs(data.minutes).forEach(p=>c.paragraph(p));
  }
  c.heading("Attendance Summary",2);
  c.paragraph(meetingMeta(data).find(x=>x[0]==="Attendance")?.[1] || "-");
  c.heading("Closing Remarks",2);
  c.paragraph("After discussion on the agenda items, the presiding officer thanked the participants for their contributions. The meeting concluded with a prayer for the progress, unity and welfare of the community.");
  c.heading("Approval",2);
  c.kv([
    ["Prepared By", data.preparedByName || "General Secretary / Authorized Officer"],
    ["Presided / Approved By", data.approvedByName || data.chairName || "Pending approval"],
    ["Approval Date", dateText(data.approvedAt || data.publishedAt || "")],
    ["Document Status", data.minutesStatus === "finalized" ? "Finalized Official Internal Record" : "Draft / Internal"],
  ]);
}

function wrapObject(index: number, body: Buffer) {
  return Buffer.concat([Buffer.from(`${index} 0 obj\n`, "latin1"), body, Buffer.from("\nendobj\n", "latin1")]);
}

export function createMeetingDocumentPdf(data: MeetingPdfData, type: MeetingDocumentType): Buffer {
  const composer = new Composer(data,type);
  if (type === "package") {
    buildSection(composer,data,"notice");
    composer.newPage();
    buildSection(composer,data,"attendance");
    composer.newPage();
    buildSection(composer,data,"minutes");
    composer.newPage();
    buildSection(composer,data,"decisions");
  } else buildSection(composer,data,type);

  const logo=pngToRgb(Buffer.from(ANJUMAN_LOGO_PNG_BASE64,"base64"));
  const objects: Buffer[] = [];
  const kids: string[] = [];
  const pageObjBase = 4;
  const font1Index = pageObjBase + composer.pages.length * 2;
  const font2Index = font1Index + 1;
  const imageIndex = font2Index + 1;

  composer.pages.forEach((commands,i)=>{
    const pageIndex = pageObjBase + i*2;
    const streamIndex = pageIndex + 1;
    kids.push(`${pageIndex} 0 R`);
    const stream=Buffer.from(commands.join("\n"),"latin1");
    objects[pageIndex-1]=Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${font1Index} 0 R /F2 ${font2Index} 0 R >> /XObject << /Im1 ${imageIndex} 0 R >> >> /Contents ${streamIndex} 0 R >>`,"latin1");
    objects[streamIndex-1]=Buffer.concat([Buffer.from(`<< /Length ${stream.length} >>\nstream\n`,"latin1"),stream,Buffer.from("\nendstream","latin1")]);
  });

  objects[0]=Buffer.from("<< /Type /Catalog /Pages 2 0 R >>","latin1");
  objects[1]=Buffer.from(`<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${composer.pages.length} >>`,"latin1");
  objects[2]=Buffer.from(`<< /Title (${esc(titleFor(type))}) /Author (Anjuman-e-Araian Faisalabad) /Subject (${esc(data.title)}) >>`,"latin1");
  objects[font1Index-1]=Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>","latin1");
  objects[font2Index-1]=Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>","latin1");
  const imageBody=Buffer.concat([
    Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${logo.compressed.length} >>\nstream\n`,"latin1"),
    logo.compressed,Buffer.from("\nendstream","latin1")
  ]);
  objects[imageIndex-1]=imageBody;

  const parts: Buffer[]=[Buffer.from("%PDF-1.4\n%AAF\n","latin1")];
  const offsets:number[]=[0];
  let size=parts[0].length;
  for (let i=0;i<objects.length;i++) {
    const body=objects[i] || Buffer.from("<<>>","latin1");
    offsets[i+1]=size;
    const wrapped=wrapObject(i+1,body);
    parts.push(wrapped); size+=wrapped.length;
  }
  const xrefOffset=size;
  let xref=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  for (let i=1;i<=objects.length;i++) xref += `${String(offsets[i]).padStart(10,"0")} 00000 n \n`;
  xref += `trailer\n<< /Size ${objects.length+1} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  parts.push(Buffer.from(xref,"latin1"));
  return Buffer.concat(parts);
}
