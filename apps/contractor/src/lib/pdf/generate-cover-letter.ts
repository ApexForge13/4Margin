/**
 * Cover Letter Generator — Document 1 of the supplement package.
 *
 * Professional contractor-branded cover letter with claim summary,
 * financial snapshot, and formal request for supplement review.
 */

import { jsPDF } from "jspdf";

/* ─────── Types ─────── */

export interface CoverLetterData {
  // Contractor
  companyName: string;
  companyPhone: string;
  companyAddress: string;
  companyLicense: string;
  // Claim
  claimNumber: string;
  policyNumber: string;
  carrierName: string;
  propertyAddress: string;
  dateOfLoss: string;
  adjusterName: string;
  // Financials
  adjusterTotal: number | null;
  supplementTotal: number;
  // Metadata
  itemCount: number;
  generatedDate: string;
}

/* ─────── Colors (match supplement PDF) ─────── */

const CL = {
  accent: [15, 23, 42] as [number, number, number],
  primary: [14, 165, 233] as [number, number, number],
  text: [15, 23, 42] as [number, number, number],
  textMuted: [100, 116, 139] as [number, number, number],
  green: [22, 163, 74] as [number, number, number],
  bgLight: [248, 250, 252] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
};

/* ─────── PDF Generation ─────── */

export function generateCoverLetter(data: CoverLetterData): ArrayBuffer {
  console.log("[cover-letter] Generating cover letter...", { companyName: data.companyName, itemCount: data.itemCount, supplementTotal: data.supplementTotal });
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let y = 48;

  const fmt = (n: number) =>
    "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Contractor letterhead ──
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(CL.accent[0], CL.accent[1], CL.accent[2]);
  doc.text((data.companyName || "Contractor").toUpperCase(), margin, y);
  y += 16;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(CL.textMuted[0], CL.textMuted[1], CL.textMuted[2]);
  const contactLine = [data.companyAddress || "", data.companyPhone || ""].filter(Boolean).join("  |  ");
  if (contactLine) {
    doc.text(contactLine, margin, y);
    y += 12;
  }
  if (data.companyLicense) {
    doc.text(`License: ${data.companyLicense}`, margin, y);
    y += 12;
  }

  // Accent divider
  y += 8;
  doc.setDrawColor(CL.primary[0], CL.primary[1], CL.primary[2]);
  doc.setLineWidth(2);
  doc.line(margin, y, margin + 140, y);

  // Date
  y += 28;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(CL.text[0], CL.text[1], CL.text[2]);
  doc.text(data.generatedDate, margin, y);

  // ── RE: block ──
  y += 28;
  doc.setFont("helvetica", "bold");
  doc.text("RE: Supplement Request", margin, y);
  y += 18;

  doc.setFont("helvetica", "normal");
  const reFields = [
    ["Claim #", data.claimNumber || "N/A"],
    ["Policy #", data.policyNumber || "N/A"],
    ["Carrier", data.carrierName || "Insurance Carrier"],
    ["Property", data.propertyAddress || "See claim file"],
    ["Date of Loss", data.dateOfLoss || "See claim file"],
    ["Adjuster", data.adjusterName || "Claims Department"],
  ].filter(([, v]) => v);

  doc.setFontSize(9);
  reFields.forEach(([label, value]) => {
    doc.setTextColor(CL.textMuted[0], CL.textMuted[1], CL.textMuted[2]);
    doc.text(label as string + ":", margin + 8, y);
    doc.setTextColor(CL.text[0], CL.text[1], CL.text[2]);
    doc.text(value as string, margin + 80, y);
    y += 14;
  });

  // ── Body ──
  y += 16;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(CL.text[0], CL.text[1], CL.text[2]);

  const salutation = `Dear ${data.adjusterName || "Claims Department"},`;
  doc.text(salutation, margin, y);
  y += 24;

  const bodyText = [
    "Please find enclosed our supplement request for the above-referenced claim.",
    "",
    "Upon thorough review of the adjuster's estimate, field inspection, and applicable",
    "building codes, we have identified additional scope items required for a complete,",
    "code-compliant roof replacement.",
    "",
    "Each supplemental item is supported by specific policy language, applicable",
    "building code sections, and/or manufacturer installation requirements.",
  ];

  for (const line of bodyText) {
    doc.text(line, margin, y);
    y += line === "" ? 8 : 14;
  }

  // ── Financial summary box ──
  y += 16;
  doc.setFillColor(CL.bgLight[0], CL.bgLight[1], CL.bgLight[2]);
  doc.setDrawColor(CL.border[0], CL.border[1], CL.border[2]);
  doc.setLineWidth(0.5);

  const boxHeight = data.adjusterTotal != null ? 90 : 54;
  doc.roundedRect(margin, y, contentWidth, boxHeight, 4, 4, "FD");
  y += 20;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(CL.primary[0], CL.primary[1], CL.primary[2]);
  doc.text("FINANCIAL SUMMARY", margin + 14, y);
  y += 18;

  doc.setFontSize(10);
  doc.setTextColor(CL.text[0], CL.text[1], CL.text[2]);

  if (data.adjusterTotal != null) {
    doc.setFont("helvetica", "normal");
    doc.text("Adjuster's Estimate (RCV):", margin + 14, y);
    doc.text(fmt(data.adjusterTotal), pageWidth - margin - 14, y, { align: "right" });
    y += 16;
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(CL.green[0], CL.green[1], CL.green[2]);
  doc.text("Supplement Amount Requested:", margin + 14, y);
  doc.text(fmt(data.supplementTotal), pageWidth - margin - 14, y, { align: "right" });
  y += 16;

  if (data.adjusterTotal != null) {
    doc.setTextColor(CL.text[0], CL.text[1], CL.text[2]);
    doc.text("Revised Total (RCV):", margin + 14, y);
    doc.text(fmt(data.adjusterTotal + data.supplementTotal), pageWidth - margin - 14, y, { align: "right" });
  }

  // ── Closing ──
  y += 44;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(CL.text[0], CL.text[1], CL.text[2]);

  const closingText = [
    "We respectfully request your prompt review and approval of this supplement.",
    "All supporting documentation, code references, and manufacturer specifications",
    "are included in the attached supplement package.",
    "",
    "Please do not hesitate to contact us with any questions.",
    "",
    "",
    "Respectfully,",
    "",
    data.companyName || "Contractor",
    data.companyPhone || "",
  ];

  for (const line of closingText) {
    doc.text(line, margin, y);
    y += line === "" ? 8 : 14;
  }

  // ── Footer ──
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(CL.textMuted[0], CL.textMuted[1], CL.textMuted[2]);
  doc.text(
    `${data.companyName || "Contractor"}  |  ${data.generatedDate}`,
    margin,
    pageHeight - 18
  );
  doc.text("Page 1 of 1", pageWidth - margin, pageHeight - 18, { align: "right" });

  return doc.output("arraybuffer");
}
