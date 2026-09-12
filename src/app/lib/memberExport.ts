import * as XLSX from "xlsx";
import { Member, blankFamily } from "./memberStore";

export type MemberExportFormat = "xlsx" | "csv";

function cleanDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
}

function memberRow(m: Member) {
  const family = m.familyInfo || m.family || blankFamily();
  const children = m.children || [];
  return {
    "Internal Form Serial": m.formNo || "",
    "Registration / Member No.": m.memberNo || "",
    "Full Name": m.fullName || "",
    "Father / Husband": m.fatherName || "",
    "CNIC": m.cnic || "",
    "Date of Birth": m.dob || "",
    "Gender": m.gender || "",
    "Blood Group": m.bloodGroup || "",
    "Email": m.email || "",
    "Mobile": m.phone || "",
    "WhatsApp": m.whatsapp || "",
    "Address": m.address || "",
    "Local Area": m.localArea || "",
    "City": m.city || "",
    "District": m.district || "",
    "Province": m.province || "",
    "Education": m.education || "",
    "Occupation": m.occupation || "",
    "Designation": m.designation || "",
    "Institution / Organization": m.institutionName || "",
    "Business Name": m.businessName || "",
    "Membership Type": String(m.membershipType || "") === "life" ? "Lifetime Membership" : String(m.membershipType || "") === "ordinary" ? "Annual Membership" : String(m.membershipType || ""),
    "Payment Status": m.paymentStatus || "",
    "Member Status": m.status || "",
    "Referral Status": m.referralStatus || "",
    "Referrer Name": m.referrerMember?.fullName || "",
    "Referrer Member No.": m.referrerMember?.memberNo || "",
    "Spouse Name": family.spouseName || "",
    "Family Branch": family.familyBranch || "",
    "Caste / Biradari": family.caste || "",
    "Religious Affiliation": family.religiousSect || "",
    "Family City": family.familyCity || "",
    "Family Contact Name": family.familyContactName || "",
    "Family Contact Number": family.familyContactNumber || "",
    "Emergency Contact Name": family.emergencyContactName || "",
    "Emergency Contact Number": family.emergencyContactNumber || "",
    "Children Count": children.length,
    "Children": children.map((c) => [c.fullName, c.dob, c.education].filter(Boolean).join(" | ")).join(" ; "),
    "Show on Portal": m.showOnPortal ? "Yes" : "No",
    "Show on Public Web": m.showOnWeb ? "Yes" : "No",
    "Created At": cleanDate(m.createdAt),
    "Approved At": cleanDate(m.approvedAt),
    "Updated At": cleanDate(m.updatedAt),
    "Admin Note": m.adminNote || "",
  };
}

export function exportMemberRecords(members: Member[], format: MemberExportFormat) {
  if (!members.length) throw new Error("No member records are selected for export.");
  const rows = members.map(memberRow);
  const sheet = XLSX.utils.json_to_sheet(rows);
  const stamp = new Date().toISOString().slice(0, 10);
  const base = `Anjuman-Members-${stamp}`;

  if (format === "xlsx") {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Members");
    XLSX.writeFile(workbook, `${base}.xlsx`);
    return;
  }

  const csv = `\uFEFF${XLSX.utils.sheet_to_csv(sheet)}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${base}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
