/**
 * Professional supplement PDF generator — 4Margin branded.
 *
 * Creates a carrier-ready PDF document in Xactimate-style format:
 * - Branded header with 4Margin identity
 * - Claim information panel
 * - Summary of adjuster's estimate vs supplement total
 * - Xactimate-style line items table grouped by category
 * - Point-by-point justifications with IRC code references
 * - Professional footer with page numbers
 */

import { jsPDF } from "jspdf";

/* ─────── Brand Colors ─────── */

const BRAND = {
  primary: [14, 165, 233] as [number, number, number], // Sky-500 #0EA5E9
  primaryDark: [2, 132, 199] as [number, number, number], // Sky-600
  accent: [15, 23, 42] as [number, number, number], // Slate-900
  text: [15, 23, 42] as [number, number, number], // Slate-900
  textMuted: [100, 116, 139] as [number, number, number], // Slate-500
  textLight: [148, 163, 184] as [number, number, number], // Slate-400
  border: [226, 232, 240] as [number, number, number], // Slate-200
  bgLight: [248, 250, 252] as [number, number, number], // Slate-50
  bgAccent: [240, 249, 255] as [number, number, number], // Sky-50
  green: [22, 163, 74] as [number, number, number], // Green-600
  white: [255, 255, 255] as [number, number, number],
  black: [0, 0, 0] as [number, number, number],
};

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
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  // ── Helpers ──
  const checkPage = (needed: number) => {
    if (y + needed > pageHeight - 60) {
      doc.addPage();
      y = 48;
    }
  };

  const fmt = (n: number) =>
    "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const setColor = (color: [number, number, number]) => {
    doc.setTextColor(color[0], color[1], color[2]);
  };

  const setFillColor = (color: [number, number, number]) => {
    doc.setFillColor(color[0], color[1], color[2]);
  };

  const setDrawColor = (color: [number, number, number]) => {
    doc.setDrawColor(color[0], color[1], color[2]);
  };

  // ══════════════════════════════════════════════
  // PAGE 1: BRANDED HEADER
  // ══════════════════════════════════════════════

  // Top brand bar
  setFillColor(BRAND.accent);
  doc.rect(0, 0, pageWidth, 72, "F");

  // 4MARGIN wordmark
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  setColor(BRAND.white);
  doc.text("4MARGIN", margin, 44);

  // Subtitle
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor(BRAND.textLight);
  doc.text("Supplement Analysis Report", margin + 120, 44);

  // Date in top right
  doc.setFontSize(8);
  setColor(BRAND.textLight);
  doc.text(data.generatedDate, pageWidth - margin, 44, { align: "right" });

  y = 90;

  // ── Document title ──
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  setColor(BRAND.accent);
  doc.text("SUPPLEMENT REQUEST", margin, y);
  y += 6;

  // Primary brand accent line
  setDrawColor(BRAND.primary);
  doc.setLineWidth(2.5);
  doc.line(margin, y, margin + 170, y);
  y += 18;

  // Company info (right-aligned block)
  if (data.companyName) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    setColor(BRAND.textMuted);
    const companyLines = [data.companyName, data.companyPhone, data.companyAddress].filter(Boolean);
    if (data.companyLicense) companyLines.push(`License #${data.companyLicense}`);
    companyLines.forEach((line) => {
      doc.text(line, margin, y);
      y += 11;
    });
    y += 8;
  }

  // ══════════════════════════════════════════════
  // CLAIM INFORMATION PANEL
  // ══════════════════════════════════════════════
  const panelTop = y;
  setFillColor(BRAND.bgLight);
  setDrawColor(BRAND.border);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, panelTop, contentWidth, 100, 3, 3, "FD");

  y = panelTop + 16;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  setColor(BRAND.primary);
  doc.text("CLAIM INFORMATION", margin + 14, y);
  y += 14;

  const claimFields = [
    ["Claim #", data.claimNumber],
    ["Policy #", data.policyNumber],
    ["Carrier", data.carrierName],
    ["Property", data.propertyAddress],
    ["Date of Loss", data.dateOfLoss],
    ["Adjuster", data.adjusterName],
  ].filter(([, v]) => v);

  doc.setFontSize(8);
  const halfContent = (contentWidth - 28) / 2;

  claimFields.forEach(([label, value], i) => {
    const col = i % 2;
    const xBase = margin + 14 + col * halfContent;

    doc.setFont("helvetica", "normal");
    setColor(BRAND.textMuted);
    doc.text(label as string, xBase, y);

    doc.setFont("helvetica", "bold");
    setColor(BRAND.text);
    const valStr = value as string;
    const truncated = valStr.length > 38 ? valStr.substring(0, 36) + "..." : valStr;
    doc.text(truncated, xBase + 75, y);

    if (col === 1 || i === claimFields.length - 1) y += 13;
  });

  y = panelTop + 108;

  // ══════════════════════════════════════════════
  // FINANCIAL SUMMARY
  // ══════════════════════════════════════════════
  setDrawColor(BRAND.border);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  setColor(BRAND.accent);
  doc.text("FINANCIAL SUMMARY", margin, y);
  y += 18;

  doc.setFontSize(9);
  const finCol1 = margin;
  const finCol2 = margin + 220;

  if (data.adjusterTotal != null) {
    doc.setFont("helvetica", "normal");
    setColor(BRAND.textMuted);
    doc.text("Adjuster's Estimate (RCV):", finCol1, y);
    doc.setFont("helvetica", "bold");
    setColor(BRAND.text);
    doc.text(fmt(data.adjusterTotal), finCol2, y);
    y += 16;
  }

  doc.setFont("helvetica", "normal");
  setColor(BRAND.textMuted);
  doc.text("Supplement Amount Requested:", finCol1, y);
  doc.setFont("helvetica", "bold");
  setColor(BRAND.green);
  doc.text(fmt(data.supplementTotal), finCol2, y);
  y += 16;

  if (data.adjusterTotal != null) {
    const newTotal = data.adjusterTotal + data.supplementTotal;
    doc.setFont("helvetica", "normal");
    setColor(BRAND.textMuted);
    doc.text("Revised Total (RCV):", finCol1, y);
    doc.setFont("helvetica", "bold");
    setColor(BRAND.text);
    doc.text(fmt(newTotal), finCol2, y);
    y += 16;
  }

  y += 12;

  // ══════════════════════════════════════════════
  // XACTIMATE-STYLE LINE ITEMS TABLE
  // ══════════════════════════════════════════════
  setDrawColor(BRAND.border);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  setColor(BRAND.accent);
  doc.text("SUPPLEMENT LINE ITEMS", margin, y);
  y += 18;

  if (data.items.length === 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    setColor(BRAND.textMuted);
    doc.text("No line items detected.", margin, y);
    y += 20;
  } else {
    // Column definitions — Xactimate style
    const cols = [
      { label: "Code", x: margin, w: 72 },
      { label: "Description", x: margin + 72, w: 180 },
      { label: "Qty", x: margin + 252, w: 36 },
      { label: "Unit", x: margin + 288, w: 32 },
      { label: "Unit Price", x: margin + 320, w: 65 },
      { label: "RCV", x: margin + 385, w: 80 },
    ];

    // Table header row
    checkPage(50);
    setFillColor(BRAND.accent);
    doc.rect(margin, y - 10, contentWidth, 16, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    setColor(BRAND.white);
    cols.forEach((col) => {
      const align = col.label === "RCV" || col.label === "Unit Price" ? "right" : "left";
      if (align === "right") {
        doc.text(col.label, col.x + col.w - 4, y, { align: "right" });
      } else {
        doc.text(col.label, col.x + 3, y);
      }
    });
    y += 12;

    // Table rows — grouped by category
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    let currentCategory = "";
    let rowIndex = 0;

    data.items.forEach((item) => {
      checkPage(32);

      // Category header row
      if (item.category !== currentCategory) {
        currentCategory = item.category;
        y += 3;
        setFillColor(BRAND.bgAccent);
        doc.rect(margin, y - 9, contentWidth, 14, "F");
        setDrawColor(BRAND.primary);
        doc.setLineWidth(0.5);
        doc.line(margin, y - 9, margin + 3, y - 9);
        doc.line(margin, y + 5, margin + 3, y + 5);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        setColor(BRAND.primaryDark);
        doc.text(currentCategory.toUpperCase(), margin + 6, y);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        setColor(BRAND.text);
        y += 14;
        rowIndex = 0;
      }

      // Alternating row background
      if (rowIndex % 2 === 0) {
        setFillColor(BRAND.bgLight);
        doc.rect(margin, y - 9, contentWidth, 14, "F");
      }

      // Code
      doc.setFont("helvetica", "bold");
      setColor(BRAND.text);
      doc.text(item.xactimate_code, cols[0].x + 3, y);

      // Description — truncate to fit
      doc.setFont("helvetica", "normal");
      setColor(BRAND.text);
      const desc = item.description.length > 42
        ? item.description.substring(0, 40) + "..."
        : item.description;
      doc.text(desc, cols[1].x + 3, y);

      // Qty
      doc.text(String(item.quantity), cols[2].x + 3, y);

      // Unit
      setColor(BRAND.textMuted);
      doc.text(item.unit, cols[3].x + 3, y);

      // Unit price (right aligned)
      setColor(BRAND.text);
      doc.text(fmt(item.unit_price), cols[4].x + cols[4].w - 4, y, { align: "right" });

      // RCV total (right aligned, bold)
      doc.setFont("helvetica", "bold");
      doc.text(fmt(item.total_price), cols[5].x + cols[5].w - 4, y, { align: "right" });
      doc.setFont("helvetica", "normal");

      y += 14;

      // Light divider
      setDrawColor(BRAND.border);
      doc.setLineWidth(0.2);
      doc.line(margin, y - 5, pageWidth - margin, y - 5);

      rowIndex++;
    });

    // ── Total row ──
    y += 4;
    setFillColor(BRAND.accent);
    doc.rect(margin, y - 9, contentWidth, 18, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    setColor(BRAND.white);
    doc.text("SUPPLEMENT TOTAL", margin + 6, y + 1);
    doc.text(fmt(data.supplementTotal), cols[5].x + cols[5].w - 4, y + 1, { align: "right" });
    y += 20;
  }

  // ══════════════════════════════════════════════
  // JUSTIFICATIONS — Point-by-Point (New Page)
  // ══════════════════════════════════════════════
  if (data.items.length > 0) {
    doc.addPage();
    y = 48;

    // Section header
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    setColor(BRAND.accent);
    doc.text("SUPPORTING ARGUMENTS", margin, y);
    y += 6;

    setDrawColor(BRAND.primary);
    doc.setLineWidth(2.5);
    doc.line(margin, y, margin + 190, y);
    y += 16;

    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    setColor(BRAND.textMuted);
    doc.text(
      "Each supplemental line item below is justified per applicable building codes, manufacturer specifications, and industry standards.",
      margin,
      y,
      { maxWidth: contentWidth }
    );
    y += 22;

    data.items.forEach((item, i) => {
      // Each justification block needs space for header + at least 2 lines
      checkPage(90);

      // Item number + code badge
      setFillColor(BRAND.bgAccent);
      setDrawColor(BRAND.primary);
      doc.setLineWidth(0.5);
      const blockTop = y - 6;

      // Left accent bar
      setFillColor(BRAND.primary);
      doc.rect(margin, blockTop, 3, 14, "F");

      // Item header background
      setFillColor(BRAND.bgAccent);
      doc.rect(margin + 3, blockTop, contentWidth - 3, 14, "F");

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      setColor(BRAND.accent);
      doc.text(`${i + 1}.`, margin + 8, y + 2);

      // Xactimate code in monospace-style
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      setColor(BRAND.primaryDark);
      doc.text(item.xactimate_code, margin + 22, y + 2);

      // Description
      doc.setFont("helvetica", "normal");
      setColor(BRAND.text);
      doc.text(`— ${item.description}`, margin + 22 + doc.getTextWidth(item.xactimate_code) + 6, y + 2);

      // Price on right
      doc.setFont("helvetica", "bold");
      setColor(BRAND.green);
      doc.text(fmt(item.total_price), pageWidth - margin - 4, y + 2, { align: "right" });

      y += 18;

      // Justification text as bullet points
      if (item.justification) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        setColor(BRAND.text);

        // Split justification into sentences/points
        const points = splitIntoPoints(item.justification);

        points.forEach((point) => {
          checkPage(24);

          // Bullet point
          setColor(BRAND.primary);
          doc.text("•", margin + 12, y);

          // Point text (wrapped)
          setColor(BRAND.text);
          const lines = doc.splitTextToSize(point.trim(), contentWidth - 30);
          doc.text(lines, margin + 24, y);
          y += lines.length * 10 + 3;
        });
      }

      // IRC Reference
      if (item.irc_reference) {
        checkPage(16);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        setColor(BRAND.primaryDark);
        doc.text(`📋 Code Reference: ${item.irc_reference}`, margin + 12, y);
        y += 12;
      }

      // Spacer between items
      y += 6;
      setDrawColor(BRAND.border);
      doc.setLineWidth(0.3);
      doc.line(margin + 10, y, pageWidth - margin - 10, y);
      y += 12;
    });
  }

  // ══════════════════════════════════════════════
  // FOOTER on every page
  // ══════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Bottom brand bar
    setFillColor(BRAND.bgLight);
    doc.rect(0, pageHeight - 36, pageWidth, 36, "F");

    // Divider line
    setDrawColor(BRAND.border);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 36, pageWidth - margin, pageHeight - 36);

    // Left: 4Margin branding
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    setColor(BRAND.primary);
    doc.text("4MARGIN", margin, pageHeight - 18);
    doc.setFont("helvetica", "normal");
    setColor(BRAND.textLight);
    doc.text(`  |  ${data.generatedDate}`, margin + 40, pageHeight - 18);

    // Right: Page number
    doc.setFont("helvetica", "normal");
    setColor(BRAND.textMuted);
    doc.text(
      `Page ${p} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 18,
      { align: "right" }
    );
  }

  return doc.output("arraybuffer");
}

/* ─────── Helper: Split justification text into bullet points ─────── */

function splitIntoPoints(text: string): string[] {
  // Try splitting by numbered points first (1. 2. 3. or 1) 2) 3))
  const numberedPattern = /(?:^|\n)\s*\d+[\.\)]\s*/;
  if (numberedPattern.test(text)) {
    return text
      .split(/\n?\s*\d+[\.\)]\s*/)
      .filter((s) => s.trim().length > 0);
  }

  // Try splitting by bullet markers
  if (text.includes("•") || text.includes("-  ") || text.includes("- ")) {
    return text
      .split(/[•\-]\s+/)
      .filter((s) => s.trim().length > 0);
  }

  // Try splitting by sentences (periods followed by space + capital letter)
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 1) {
    return sentences.map((s) => s.trim()).filter((s) => s.length > 0);
  }

  // Fallback: return as single point
  return [text];
}
