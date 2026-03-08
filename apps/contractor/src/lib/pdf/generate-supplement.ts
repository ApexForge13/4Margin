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

  // Depreciation context (optional — backward compatible)
  depreciationMethod?: string | null; // "RCV" | "ACV" | "MODIFIED_ACV" | "UNKNOWN"
  depreciationPercent?: number | null; // e.g., 0.40 for 40%

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
    total_price: number;        // RCV
    depreciation?: number;     // Depreciation amount (typically negative); defaults to 0
    acv?: number;              // ACV = RCV - |depreciation|; defaults to total_price
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
  // PAGE 1: CONTRACTOR-BRANDED HEADER
  // ══════════════════════════════════════════════

  // Top brand bar
  setFillColor(BRAND.accent);
  doc.rect(0, 0, pageWidth, 72, "F");

  // Contractor name (replaces "4MARGIN")
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  setColor(BRAND.white);
  const displayName = data.companyName || "Supplement Request";
  doc.text(displayName.toUpperCase(), margin, 38);

  // Contractor contact line
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(BRAND.textLight);
  const contactParts = [data.companyPhone, data.companyAddress].filter(Boolean);
  if (contactParts.length > 0) {
    doc.text(contactParts.join("  |  "), margin, 54);
  }

  // License number (top right)
  if (data.companyLicense) {
    doc.text(`License: ${data.companyLicense}`, pageWidth - margin, 38, { align: "right" });
  }

  // Date (top right, below license)
  doc.setFontSize(8);
  setColor(BRAND.textLight);
  doc.text(data.generatedDate, pageWidth - margin, 50, { align: "right" });

  y = 90;

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
  // XACTIMATE-STYLE LINE ITEMS TABLE (7-col + line #)
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

  // Helper: format depreciation in parentheses
  const fmtDeprec = (n: number) => {
    const abs = Math.abs(n);
    const str = abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return n === 0 ? "$0.00" : `($${str})`;
  };

  if (data.items.length === 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    setColor(BRAND.textMuted);
    doc.text("No line items detected.", margin, y);
    y += 20;
  } else {
    // 8 column definitions — #, Description, Qty, Unit, Unit Price, RCV, Deprec., ACV
    const cols = [
      { label: "#",          x: margin,       w: 20,  align: "left"  as const },
      { label: "Description", x: margin + 20,  w: 200, align: "left"  as const },
      { label: "Qty",         x: margin + 220, w: 36,  align: "left"  as const },
      { label: "Unit",        x: margin + 256, w: 32,  align: "left"  as const },
      { label: "Unit Price",  x: margin + 288, w: 56,  align: "right" as const },
      { label: "RCV",         x: margin + 344, w: 56,  align: "right" as const },
      { label: "Deprec.",     x: margin + 400, w: 52,  align: "right" as const },
      { label: "ACV",         x: margin + 452, w: 64,  align: "right" as const },
    ];

    // Render table header row helper (reused after page breaks)
    const renderTableHeader = () => {
      setFillColor(BRAND.accent);
      doc.rect(margin, y - 10, contentWidth, 16, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      setColor(BRAND.white);
      cols.forEach((col) => {
        if (col.align === "right") {
          doc.text(col.label, col.x + col.w - 4, y, { align: "right" });
        } else {
          doc.text(col.label, col.x + 3, y);
        }
      });
      y += 12;
    };

    // Group items by category
    const categoryOrder: string[] = [];
    const categoryGroups: Record<string, typeof data.items> = {};
    data.items.forEach((item) => {
      const cat = item.category || "General";
      if (!categoryGroups[cat]) {
        categoryGroups[cat] = [];
        categoryOrder.push(cat);
      }
      categoryGroups[cat].push(item);
    });

    // Initial table header
    checkPage(50);
    renderTableHeader();

    let lineNum = 1;

    categoryOrder.forEach((category) => {
      const groupItems = categoryGroups[category];

      // ── Category header row ──
      checkPage(32);
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
      doc.text(category.toUpperCase(), margin + 6, y);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      setColor(BRAND.text);
      y += 14;

      // Category subtotal accumulators
      let catRcv = 0;
      let catDeprec = 0;
      let catAcv = 0;

      // ── Render each item row ──
      groupItems.forEach((item, rowIdx) => {
        checkPage(32);

        const deprec = item.depreciation ?? 0;
        const acv = item.acv ?? item.total_price;

        catRcv += item.total_price;
        catDeprec += deprec;
        catAcv += acv;

        // Alternating row background
        if (rowIdx % 2 === 0) {
          setFillColor(BRAND.bgLight);
          doc.rect(margin, y - 9, contentWidth, 14, "F");
        }

        doc.setFontSize(7);

        // # (line number)
        doc.setFont("helvetica", "normal");
        setColor(BRAND.textMuted);
        doc.text(String(lineNum), cols[0].x + 3, y);

        // Description — truncate to fit 200pt column
        doc.setFont("helvetica", "normal");
        setColor(BRAND.text);
        const desc = item.description.length > 48
          ? item.description.substring(0, 46) + "..."
          : item.description;
        doc.text(desc, cols[1].x + 3, y);

        // Qty
        doc.text(String(item.quantity), cols[2].x + 3, y);

        // Unit
        setColor(BRAND.textMuted);
        doc.text(item.unit, cols[3].x + 3, y);

        // Unit Price (right aligned)
        setColor(BRAND.text);
        doc.text(fmt(item.unit_price), cols[4].x + cols[4].w - 4, y, { align: "right" });

        // RCV (right aligned, bold)
        doc.setFont("helvetica", "bold");
        doc.text(fmt(item.total_price), cols[5].x + cols[5].w - 4, y, { align: "right" });

        // Deprec. (right aligned, parentheses)
        doc.setFont("helvetica", "normal");
        setColor(BRAND.textMuted);
        doc.text(fmtDeprec(deprec), cols[6].x + cols[6].w - 4, y, { align: "right" });

        // ACV (right aligned, bold)
        doc.setFont("helvetica", "bold");
        setColor(BRAND.text);
        doc.text(fmt(acv), cols[7].x + cols[7].w - 4, y, { align: "right" });
        doc.setFont("helvetica", "normal");

        y += 14;

        // Light divider
        setDrawColor(BRAND.border);
        doc.setLineWidth(0.2);
        doc.line(margin, y - 5, pageWidth - margin, y - 5);

        lineNum++;
      });

      // ── Category subtotal row ──
      checkPage(20);
      y += 2;
      setFillColor(BRAND.bgAccent);
      doc.rect(margin, y - 9, contentWidth, 14, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      setColor(BRAND.primaryDark);
      doc.text(`${category} Subtotal`, cols[1].x + 3, y);

      // RCV subtotal
      doc.text(fmt(catRcv), cols[5].x + cols[5].w - 4, y, { align: "right" });
      // Deprec. subtotal
      setColor(BRAND.textMuted);
      doc.text(fmtDeprec(catDeprec), cols[6].x + cols[6].w - 4, y, { align: "right" });
      // ACV subtotal
      setColor(BRAND.primaryDark);
      doc.text(fmt(catAcv), cols[7].x + cols[7].w - 4, y, { align: "right" });

      y += 16;
    });

    // ── Grand total row ──
    const grandRcv = data.supplementTotal;
    const grandDeprec = data.items.reduce((sum, it) => sum + (it.depreciation ?? 0), 0);
    const grandAcv = data.items.reduce((sum, it) => sum + (it.acv ?? it.total_price), 0);

    y += 2;
    checkPage(24);
    setFillColor(BRAND.accent);
    doc.rect(margin, y - 9, contentWidth, 18, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    setColor(BRAND.white);
    doc.text("SUPPLEMENT TOTAL", margin + 6, y + 1);

    // Grand RCV
    doc.text(fmt(grandRcv), cols[5].x + cols[5].w - 4, y + 1, { align: "right" });
    // Grand Deprec.
    doc.text(fmtDeprec(grandDeprec), cols[6].x + cols[6].w - 4, y + 1, { align: "right" });
    // Grand ACV
    doc.text(fmt(grandAcv), cols[7].x + cols[7].w - 4, y + 1, { align: "right" });

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
        doc.text(`Code Ref: ${item.irc_reference}`, margin + 12, y);
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

    // Left: contractor branding
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    setColor(BRAND.textMuted);
    doc.text(
      `${data.companyName}  |  ${data.generatedDate}`,
      margin,
      pageHeight - 18
    );

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

  // Split by sentence boundaries — period/!/?  followed by space + uppercase letter.
  // This protects decimals ($2,153.62), code refs (R905.2.8.4), and abbreviations.
  const sentenceParts = text.split(/(?<=[.!?])\s+(?=[A-Z])/);
  if (sentenceParts.length > 1) {
    return sentenceParts.map((s) => s.trim()).filter((s) => s.length > 0);
  }

  // Fallback: return as single point
  return [text];
}
