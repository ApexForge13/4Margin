/**
 * Professional supplement PDF generator.
 *
 * Creates a carrier-ready PDF document with:
 * - Header with company info and claim details
 * - Summary of adjuster's estimate vs supplement total
 * - Line items table with Xactimate codes and pricing
 * - Justification section with IRC references
 * - Photo evidence references
 */

import { jsPDF } from "jspdf";

/* ─────── Types ─────── */

export interface SupplementPdfData {
  // Company
  companyName: string;
  companyPhone: string;
  companyAddress: string;
  companyLicense: string;

  // Claim
  claimName: string;
  claimNumber: string;
  policyNumber: string;
  carrierName: string;
  propertyAddress: string;
  dateOfLoss: string;
  adjusterName: string;

  // Financials
  adjusterTotal: number | null;
  supplementTotal: number;

  // Measurements
  measuredSquares: number | null;
  wastePercent: number | null;
  suggestedSquares: number | null;
  pitch: string | null;

  // Line items
  items: Array<{
    xactimate_code: string;
    description: string;
    category: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;
    justification: string;
    irc_reference: string;
  }>;

  // Generated date
  generatedDate: string;
}

/* ─────── PDF Generation ─────── */

export function generateSupplementPdf(data: SupplementPdfData): ArrayBuffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // ── Helper: Add new page if needed ──
  const checkPage = (needed: number) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // ── Helper: Format currency ──
  const fmt = (n: number) =>
    "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ══════════════════════════════════════════════
  // HEADER
  // ══════════════════════════════════════════════
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("SUPPLEMENT REQUEST", margin, y);
  y += 8;

  // Accent line
  doc.setDrawColor(0, 191, 255); // #00BFFF
  doc.setLineWidth(3);
  doc.line(margin, y, margin + 180, y);
  y += 20;

  // Company info
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  const companyLines = [data.companyName, data.companyPhone, data.companyAddress]
    .filter(Boolean);
  if (data.companyLicense) companyLines.push(`License #${data.companyLicense}`);
  companyLines.forEach((line) => {
    doc.text(line, margin, y);
    y += 12;
  });
  y += 10;

  // ══════════════════════════════════════════════
  // CLAIM DETAILS TABLE
  // ══════════════════════════════════════════════
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("CLAIM INFORMATION", margin, y);
  y += 15;

  const claimFields = [
    ["Claim #", data.claimNumber],
    ["Policy #", data.policyNumber],
    ["Insurance Carrier", data.carrierName],
    ["Property Address", data.propertyAddress],
    ["Date of Loss", data.dateOfLoss],
    ["Adjuster", data.adjusterName],
  ].filter(([, v]) => v);

  doc.setFontSize(9);
  const colWidth = contentWidth / 2;
  claimFields.forEach(([label, value]) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(label as string, margin, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(value as string, margin + colWidth * 0.4, y);
    y += 14;
  });
  y += 10;

  // ══════════════════════════════════════════════
  // FINANCIAL SUMMARY
  // ══════════════════════════════════════════════
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 15;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("FINANCIAL SUMMARY", margin, y);
  y += 18;

  doc.setFontSize(10);
  if (data.adjusterTotal != null) {
    doc.setFont("helvetica", "normal");
    doc.text("Adjuster's Estimate Total (RCV):", margin, y);
    doc.setFont("helvetica", "bold");
    doc.text(fmt(data.adjusterTotal), margin + 280, y);
    y += 16;
  }

  doc.setFont("helvetica", "normal");
  doc.text("Supplement Amount Requested:", margin, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 130, 0);
  doc.text(fmt(data.supplementTotal), margin + 280, y);
  doc.setTextColor(0, 0, 0);
  y += 16;

  if (data.adjusterTotal != null) {
    const newTotal = data.adjusterTotal + data.supplementTotal;
    doc.setFont("helvetica", "normal");
    doc.text("Revised Total (RCV):", margin, y);
    doc.setFont("helvetica", "bold");
    doc.text(fmt(newTotal), margin + 280, y);
    y += 16;
  }
  y += 10;

  // ══════════════════════════════════════════════
  // LINE ITEMS TABLE
  // ══════════════════════════════════════════════
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 15;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("SUPPLEMENT LINE ITEMS", margin, y);
  y += 18;

  if (data.items.length === 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text("No line items detected.", margin, y);
    y += 20;
  } else {
    // Table header
    const cols = [
      { label: "Code", x: margin, w: 70 },
      { label: "Description", x: margin + 75, w: 175 },
      { label: "Qty", x: margin + 260, w: 35 },
      { label: "Unit", x: margin + 300, w: 30 },
      { label: "Price", x: margin + 340, w: 60 },
      { label: "Total", x: margin + 410, w: 70 },
    ];

    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 10, contentWidth, 16, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    cols.forEach((col) => {
      doc.text(col.label, col.x + 2, y);
    });
    y += 12;

    // Table rows
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    let currentCategory = "";
    data.items.forEach((item) => {
      checkPage(40);

      // Category separator
      if (item.category !== currentCategory) {
        currentCategory = item.category;
        y += 4;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(7);
        doc.text(currentCategory.toUpperCase(), margin, y);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        y += 12;
      }

      doc.text(item.xactimate_code, cols[0].x + 2, y);
      // Truncate description to fit
      const desc =
        item.description.length > 40
          ? item.description.substring(0, 38) + "..."
          : item.description;
      doc.text(desc, cols[1].x + 2, y);
      doc.text(String(item.quantity), cols[2].x + 2, y);
      doc.text(item.unit, cols[3].x + 2, y);
      doc.text(fmt(item.unit_price), cols[4].x + 2, y);
      doc.setFont("helvetica", "bold");
      doc.text(fmt(item.total_price), cols[5].x + 2, y);
      doc.setFont("helvetica", "normal");
      y += 14;

      // Light divider
      doc.setDrawColor(240, 240, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, y - 4, pageWidth - margin, y - 4);
    });

    // Total row
    y += 6;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.line(margin + 380, y - 4, pageWidth - margin, y - 4);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("SUPPLEMENT TOTAL:", margin + 280, y + 4);
    doc.setTextColor(0, 130, 0);
    doc.text(fmt(data.supplementTotal), margin + 410, y + 4);
    doc.setTextColor(0, 0, 0);
    y += 25;
  }

  // ══════════════════════════════════════════════
  // JUSTIFICATIONS (NEW PAGE)
  // ══════════════════════════════════════════════
  if (data.items.length > 0) {
    doc.addPage();
    y = margin;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("JUSTIFICATION & CODE REFERENCES", margin, y);
    y += 8;
    doc.setDrawColor(0, 191, 255);
    doc.setLineWidth(3);
    doc.line(margin, y, margin + 250, y);
    y += 20;

    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text(
      "The following justifications support each supplemental line item per applicable building codes and manufacturer specifications.",
      margin,
      y,
      { maxWidth: contentWidth }
    );
    doc.setTextColor(0, 0, 0);
    y += 24;

    data.items.forEach((item, i) => {
      checkPage(80);

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(`${i + 1}. ${item.xactimate_code} — ${item.description}`, margin, y);
      y += 14;

      if (item.justification) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(item.justification, contentWidth - 10);
        checkPage(lines.length * 10 + 10);
        doc.text(lines, margin + 10, y);
        y += lines.length * 10 + 4;
      }

      if (item.irc_reference) {
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 100, 180);
        doc.text(`Reference: ${item.irc_reference}`, margin + 10, y);
        doc.setTextColor(0, 0, 0);
        y += 12;
      }

      y += 8;
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 12;
    });
  }

  // ══════════════════════════════════════════════
  // FOOTER on every page
  // ══════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated by 4Margin — ${data.generatedDate}`,
      margin,
      pageHeight - 25
    );
    doc.text(
      `Page ${p} of ${totalPages}`,
      pageWidth - margin - 50,
      pageHeight - 25
    );
  }

  return doc.output("arraybuffer");
}
