/**
 * Rebuttal Letter PDF Generator.
 *
 * Generates a professional letter on contractor letterhead responding
 * to denied supplement line items with code authority, manufacturer
 * requirements, and policy language.
 */

import { jsPDF } from "jspdf";
import {
  getCodesForXactimateCode,
  type BuildingCode,
} from "@/data/building-codes";
import { getRequirementsForXactimateCode } from "@/data/manufacturers";

/* ─────── Colors (match cover letter) ─────── */

const CL = {
  accent: [15, 23, 42] as [number, number, number],
  primary: [14, 165, 233] as [number, number, number],
  primaryDark: [2, 132, 199] as [number, number, number],
  text: [15, 23, 42] as [number, number, number],
  textMuted: [100, 116, 139] as [number, number, number],
  bgLight: [248, 250, 252] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  red: [220, 38, 38] as [number, number, number],
};

/* ─────── Types ─────── */

export interface RebuttalLetterData {
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
  propertyState: string;
  dateOfLoss: string;
  adjusterName: string;
  // Denied items
  deniedItems: Array<{
    xactimate_code: string;
    description: string;
    quantity: number;
    unit: string;
    total_price: number;
    justification: string;
    irc_reference: string;
    /** AI-extracted denial reason (if from uploaded denial letter) */
    denial_reason?: string;
  }>;
  generatedDate: string;
}

/* ─────── PDF Generation ─────── */

export function generateRebuttalLetter(data: RebuttalLetterData): ArrayBuffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let y = 48;

  const fmt = (n: number) =>
    "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const setColor = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);

  const checkPage = (needed: number) => {
    if (y + needed > pageHeight - 60) {
      doc.addPage();
      y = 48;
    }
  };

  // ── Contractor Letterhead ──
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  setColor(CL.accent);
  doc.text((data.companyName || "Contractor").toUpperCase(), margin, y);
  y += 16;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor(CL.textMuted);
  const contactLine = [data.companyAddress, data.companyPhone].filter(Boolean).join("  |  ");
  if (contactLine) { doc.text(contactLine, margin, y); y += 12; }
  if (data.companyLicense) { doc.text(`License: ${data.companyLicense}`, margin, y); y += 12; }

  y += 8;
  doc.setDrawColor(CL.primary[0], CL.primary[1], CL.primary[2]);
  doc.setLineWidth(2);
  doc.line(margin, y, margin + 140, y);

  // Date
  y += 28;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  setColor(CL.text);
  doc.text(data.generatedDate, margin, y);

  // ── RE: block ──
  y += 28;
  doc.setFont("helvetica", "bold");
  doc.text("RE: Supplemental Claim Rebuttal", margin, y);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const reFields = [
    ["Claim #", data.claimNumber || "N/A"],
    ["Policy #", data.policyNumber || "N/A"],
    ["Carrier", data.carrierName || "Insurance Carrier"],
    ["Property", data.propertyAddress || "See claim file"],
    ["Date of Loss", data.dateOfLoss || "See claim file"],
    ["Adjuster", data.adjusterName || "Claims Department"],
  ];

  for (const [label, value] of reFields) {
    setColor(CL.textMuted);
    doc.text(label + ":", margin + 8, y);
    setColor(CL.text);
    doc.text(value, margin + 80, y);
    y += 14;
  }

  // ── Salutation + Opening ──
  y += 16;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  setColor(CL.text);
  doc.text(`Dear ${data.adjusterName || "Claims Department"},`, margin, y);
  y += 24;

  const opening = [
    "We are writing to formally dispute the denial of the following supplemental line items",
    "for the above-referenced claim. Each item below is supported by applicable building code",
    "sections, manufacturer installation requirements, and/or policy language.",
  ];
  for (const line of opening) {
    doc.text(line, margin, y);
    y += 14;
  }
  y += 10;

  // ── Per-Item Rebuttals ──
  for (let i = 0; i < data.deniedItems.length; i++) {
    const item = data.deniedItems[i];
    checkPage(80);

    // Item header
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    setColor(CL.accent);
    doc.text(`Item ${i + 1}: ${item.xactimate_code} \u2014 ${item.description}`, margin, y);
    y += 14;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    setColor(CL.textMuted);
    doc.text(`${item.quantity} ${item.unit} \u2014 ${fmt(item.total_price)}`, margin + 8, y);
    y += 16;

    // Denial reason (if AI-extracted)
    if (item.denial_reason) {
      checkPage(30);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "italic");
      setColor(CL.red);
      doc.text("Stated denial reason:", margin + 8, y);
      y += 12;
      setColor(CL.text);
      const reasonLines = doc.splitTextToSize(`"${item.denial_reason}"`, contentWidth - 24);
      doc.text(reasonLines, margin + 8, y);
      y += reasonLines.length * 11 + 8;
    }

    // Code authority rebuttal
    const codes = getCodesForXactimateCode(item.xactimate_code, data.propertyState || "MD");
    if (codes.length > 0) {
      checkPage(40);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      setColor(CL.primaryDark);
      doc.text("Code Authority:", margin + 8, y);
      y += 12;

      for (const code of codes) {
        checkPage(30);
        doc.setFont("helvetica", "normal");
        setColor(CL.text);
        const codeText = `IRC ${code.section} (${code.title}): ${code.rebuttal}`;
        const codeLines = doc.splitTextToSize(codeText, contentWidth - 28);
        doc.text(codeLines, margin + 16, y);
        y += codeLines.length * 11 + 4;
      }
    }

    // Manufacturer requirement rebuttal
    const mfrMatches = getRequirementsForXactimateCode(item.xactimate_code);
    if (mfrMatches.length > 0) {
      checkPage(40);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      setColor(CL.primaryDark);
      doc.text("Manufacturer Requirement:", margin + 8, y);
      y += 12;

      for (const { manufacturer, requirement: req } of mfrMatches) {
        checkPage(30);
        doc.setFont("helvetica", "normal");
        setColor(CL.text);
        const mfrText = `${manufacturer}: ${req.rebuttal}${req.mandatoryForWarranty ? ` (${req.warrantyImpact})` : ""}`;
        const mfrLines = doc.splitTextToSize(mfrText, contentWidth - 28);
        doc.text(mfrLines, margin + 16, y);
        y += mfrLines.length * 11 + 4;
      }
    }

    // Divider between items
    if (i < data.deniedItems.length - 1) {
      y += 6;
      doc.setDrawColor(CL.border[0], CL.border[1], CL.border[2]);
      doc.setLineWidth(0.3);
      doc.line(margin + 10, y, pageWidth - margin - 10, y);
      y += 14;
    }
  }

  // ── Closing ──
  y += 20;
  checkPage(100);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  setColor(CL.text);

  const closing = [
    "Based on the above code citations and manufacturer requirements, we respectfully",
    "request reconsideration and approval of these supplemental items. These items are",
    "necessary for a code-compliant, manufacturer-warranted roof system.",
    "",
    "We are available to discuss any of these items in detail at your convenience.",
    "",
    "",
    "Respectfully,",
    "",
    data.companyName || "Contractor",
    data.companyPhone || "",
  ];

  for (const line of closing) {
    doc.text(line, margin, y);
    y += line === "" ? 8 : 14;
  }

  // ── Footer on every page ──
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    setColor(CL.textMuted);
    doc.text(
      "This document is provided for informational and educational purposes only and does not constitute legal advice.",
      margin, pageHeight - 28
    );
    doc.setFont("helvetica", "normal");
    doc.text(
      `${data.companyName || "Contractor"}  |  ${data.generatedDate}`,
      margin, pageHeight - 18
    );
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 18, { align: "right" });
  }

  return doc.output("arraybuffer");
}
