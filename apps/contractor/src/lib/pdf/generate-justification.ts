/**
 * 4Margin Justification & Support Points PDF Generator.
 *
 * Creates a standalone carrier-ready PDF with point-by-point
 * justifications for each supplement line item. Designed for
 * contractors to copy/paste or attach when communicating with carriers.
 */

import { jsPDF } from "jspdf";

/* ─────── Brand Colors ─────── */

const BRAND = {
  primary: [14, 165, 233] as [number, number, number],
  primaryDark: [2, 132, 199] as [number, number, number],
  accent: [15, 23, 42] as [number, number, number],
  text: [15, 23, 42] as [number, number, number],
  textMuted: [100, 116, 139] as [number, number, number],
  textLight: [148, 163, 184] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  bgLight: [248, 250, 252] as [number, number, number],
  bgAccent: [240, 249, 255] as [number, number, number],
  green: [22, 163, 74] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

/* ─────── Types ─────── */

export interface JustificationPdfData {
  claimNumber: string;
  carrierName: string;
  propertyAddress: string;
  companyName: string;
  generatedDate: string;
  items: Array<{
    xactimate_code: string;
    description: string;
    quantity: number;
    unit: string;
    total_price: number;
    justification: string;
    irc_reference: string;
    photo_references?: string[];
  }>;
  // Optional waste info
  wastePercent?: number | null;
  roofSquares?: number | null;
  suggestedSquares?: number | null;
}

/* ─────── PDF Generation ─────── */

export function generateJustificationPdf(data: JustificationPdfData): ArrayBuffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  const setColor = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
  const setDraw = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);

  const checkPage = (needed: number) => {
    if (y + needed > pageHeight - 60) {
      doc.addPage();
      y = 48;
    }
  };

  const fmt = (n: number) =>
    "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Header ──
  setFill(BRAND.accent);
  doc.rect(0, 0, pageWidth, 72, "F");

  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  setColor(BRAND.white);
  doc.text("4MARGIN", margin, 44);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor(BRAND.textLight);
  doc.text("Supporting Arguments Document", margin + 120, 44);

  doc.setFontSize(8);
  doc.text(data.generatedDate, pageWidth - margin, 44, { align: "right" });

  y = 90;

  // ── Title ──
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  setColor(BRAND.accent);
  doc.text("JUSTIFICATION & SUPPORT POINTS", margin, y);
  y += 6;

  setDraw(BRAND.primary);
  doc.setLineWidth(2.5);
  doc.line(margin, y, margin + 260, y);
  y += 18;

  // Instruction text
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  setColor(BRAND.textMuted);
  const instructions = "Use the following points to support your supplement when communicating with the carrier. " +
    "Personalize the language before including in your email or written correspondence.";
  const instrLines = doc.splitTextToSize(instructions, contentWidth);
  doc.text(instrLines, margin, y);
  y += instrLines.length * 10 + 12;

  // ── Claim info strip ──
  setFill(BRAND.bgLight);
  setDraw(BRAND.border);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, 38, 3, 3, "FD");

  y += 14;
  doc.setFontSize(8);
  const stripFields = [
    ["Claim #", data.claimNumber || "—"],
    ["Carrier", data.carrierName || "—"],
    ["Property", data.propertyAddress || "—"],
  ];

  const stripColW = contentWidth / 3;
  stripFields.forEach(([label, value], i) => {
    const x = margin + 12 + i * stripColW;
    doc.setFont("helvetica", "normal");
    setColor(BRAND.textMuted);
    doc.text(label as string, x, y);
    doc.setFont("helvetica", "bold");
    setColor(BRAND.text);
    const val = (value as string).length > 32 ? (value as string).substring(0, 30) + "..." : value as string;
    doc.text(val, x, y + 12);
  });

  y += 36;

  // ── Line Items with Justifications ──
  if (data.items.length > 0) {
    data.items.forEach((item, i) => {
      checkPage(80);

      // Item header with accent bar
      setFill(BRAND.primary);
      doc.rect(margin, y - 4, 3, 16, "F");

      setFill(BRAND.bgAccent);
      doc.rect(margin + 3, y - 4, contentWidth - 3, 16, "F");

      // Number + code
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      setColor(BRAND.accent);
      doc.text(`${i + 1}.`, margin + 8, y + 6);

      doc.setFontSize(8);
      setColor(BRAND.primaryDark);
      doc.text(item.xactimate_code, margin + 22, y + 6);

      // Description
      doc.setFont("helvetica", "normal");
      setColor(BRAND.text);
      const codeWidth = doc.getTextWidth(item.xactimate_code);
      doc.text(`— ${item.description}`, margin + 28 + codeWidth, y + 6);

      // Price
      doc.setFont("helvetica", "bold");
      setColor(BRAND.green);
      doc.text(fmt(item.total_price), pageWidth - margin - 4, y + 6, { align: "right" });

      y += 20;

      // Quantity line
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      setColor(BRAND.textMuted);
      doc.text(`${item.quantity} ${item.unit} @ ${fmt(item.total_price / (item.quantity || 1))}/ea`, margin + 12, y);
      y += 12;

      // Justification as bullet points
      if (item.justification) {
        doc.setFontSize(8);
        const points = splitIntoPoints(item.justification);

        points.forEach((point) => {
          checkPage(20);

          setColor(BRAND.primary);
          doc.text("▸", margin + 14, y);

          doc.setFont("helvetica", "normal");
          setColor(BRAND.text);
          const lines = doc.splitTextToSize(point.trim(), contentWidth - 34);
          doc.text(lines, margin + 26, y);
          y += lines.length * 10 + 3;
        });
      }

      // Code reference
      if (item.irc_reference) {
        checkPage(14);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        setColor(BRAND.primaryDark);
        doc.text(`Code Reference: ${item.irc_reference}`, margin + 14, y);
        y += 12;
      }

      // Photo references
      if (item.photo_references && item.photo_references.length > 0) {
        checkPage(14);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        setColor(BRAND.textMuted);
        doc.text(`Photo Evidence: See ${item.photo_references.join(", ")}`, margin + 14, y);
        y += 12;
      }

      // Divider
      y += 4;
      setDraw(BRAND.border);
      doc.setLineWidth(0.3);
      doc.line(margin + 10, y, pageWidth - margin - 10, y);
      y += 14;
    });
  }

  // ── Waste Justification (if applicable) ──
  if (data.wastePercent && data.roofSquares) {
    checkPage(80);

    y += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    setColor(BRAND.accent);
    doc.text("WASTE PERCENTAGE JUSTIFICATION", margin, y);
    y += 6;

    setDraw(BRAND.primary);
    doc.setLineWidth(1.5);
    doc.line(margin, y, margin + 230, y);
    y += 14;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    setColor(BRAND.text);

    const wasteText = `The roof measures ${data.roofSquares} squares with a calculated waste factor of ${data.wastePercent}%. ` +
      `This accounts for cuts required by the roof geometry (hips, valleys, dormers) and manufacturer specifications for the installed product.`;
    const wasteLines = doc.splitTextToSize(wasteText, contentWidth - 20);
    doc.text(wasteLines, margin + 12, y);
    y += wasteLines.length * 10 + 6;

    if (data.suggestedSquares) {
      doc.setFont("helvetica", "bold");
      setColor(BRAND.primaryDark);
      doc.text(`Adjusted total: ${data.suggestedSquares} squares including waste.`, margin + 12, y);
      y += 14;
    }
  }

  // ── Footer on every page ──
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    setFill(BRAND.bgLight);
    doc.rect(0, pageHeight - 36, pageWidth, 36, "F");

    setDraw(BRAND.border);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 36, pageWidth - margin, pageHeight - 36);

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    setColor(BRAND.primary);
    doc.text("4MARGIN", margin, pageHeight - 18);

    doc.setFont("helvetica", "normal");
    setColor(BRAND.textLight);
    doc.text(`  |  ${data.generatedDate}`, margin + 40, pageHeight - 18);

    setColor(BRAND.textMuted);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 18, { align: "right" });
  }

  return doc.output("arraybuffer");
}

/* ─────── Split text into bullet points ─────── */

function splitIntoPoints(text: string): string[] {
  const numberedPattern = /(?:^|\n)\s*\d+[\.\)]\s*/;
  if (numberedPattern.test(text)) {
    return text.split(/\n?\s*\d+[\.\)]\s*/).filter((s) => s.trim().length > 0);
  }

  if (text.includes("•") || text.includes("-  ") || text.includes("- ")) {
    return text.split(/[•\-]\s+/).filter((s) => s.trim().length > 0);
  }

  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 1) {
    return sentences.map((s) => s.trim()).filter((s) => s.length > 0);
  }

  return [text];
}
