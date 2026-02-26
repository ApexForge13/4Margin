/**
 * Unbranded policy decoder PDF — clean professional summary.
 *
 * Generates a PDF with:
 * - Policy overview (type, carrier, effective dates)
 * - Risk assessment with landmines & favorable provisions
 * - Coverage limits
 * - Deductibles (with calculated percentage amounts)
 * - Depreciation method
 * - Exclusions with severity & impact
 * - Endorsements with severity & impact
 * - Disclaimer
 */

import { jsPDF } from "jspdf";

/* ─────── Colors (unbranded — neutral slate/gray) ─────── */

const C = {
  text: [15, 23, 42] as [number, number, number], // Slate-900
  textMuted: [100, 116, 139] as [number, number, number], // Slate-500
  textLight: [148, 163, 184] as [number, number, number], // Slate-400
  border: [226, 232, 240] as [number, number, number], // Slate-200
  bgLight: [248, 250, 252] as [number, number, number], // Slate-50
  accent: [59, 130, 246] as [number, number, number], // Blue-500
  green: [22, 163, 74] as [number, number, number], // Green-600
  red: [220, 38, 38] as [number, number, number], // Red-600
  amber: [217, 119, 6] as [number, number, number], // Amber-600
  white: [255, 255, 255] as [number, number, number],
  black: [0, 0, 0] as [number, number, number],
};

/* ─────── Types ─────── */

export interface DecoderPdfData {
  // Policy meta
  policyType: string;
  carrier: string;
  policyNumber: string;
  effectiveDate: string | null;
  expirationDate: string | null;
  namedInsured: string;
  propertyAddress: string;

  // Assessment
  riskLevel: string;
  confidence: number;
  summaryForContractor: string;
  documentType: string;
  scanQuality: string;

  // Coverage
  coverages: Array<{
    label: string;
    limit: string | null;
    description: string;
  }>;

  // Deductibles
  deductibles: Array<{
    type: string;
    amount: string;
    dollarAmount: number | null;
    appliesTo: string;
  }>;

  // Depreciation
  depreciationMethod: string;
  depreciationNotes: string;

  // Exclusions
  exclusions: Array<{
    name: string;
    severity: string;
    description: string;
    impact: string;
  }>;

  // Endorsements
  endorsements: Array<{
    name: string;
    number: string | null;
    severity: string;
    description: string;
    impact: string;
  }>;

  // Landmines
  landmines: Array<{
    name: string;
    severity: string;
    impact: string;
    actionItem: string;
  }>;

  // Favorable
  favorableProvisions: Array<{
    name: string;
    impact: string;
  }>;

  // Generated date
  generatedDate: string;
}

/* ─────── PDF Generation ─────── */

export function generateDecoderPdf(data: DecoderPdfData): ArrayBuffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  const checkPage = (needed: number) => {
    if (y + needed > pageHeight - 60) {
      doc.addPage();
      y = 48;
    }
  };

  const setColor = (c: [number, number, number]) =>
    doc.setTextColor(c[0], c[1], c[2]);
  const setFill = (c: [number, number, number]) =>
    doc.setFillColor(c[0], c[1], c[2]);
  const setDraw = (c: [number, number, number]) =>
    doc.setDrawColor(c[0], c[1], c[2]);

  // ══════════════════════════════════════════════
  // HEADER
  // ══════════════════════════════════════════════
  setFill(C.text);
  doc.rect(0, 0, pageWidth, 56, "F");

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  setColor(C.white);
  doc.text("POLICY ANALYSIS REPORT", margin, 36);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(C.textLight);
  doc.text(data.generatedDate, pageWidth - margin, 36, { align: "right" });

  y = 72;

  // ══════════════════════════════════════════════
  // RISK ASSESSMENT
  // ══════════════════════════════════════════════
  const riskColor =
    data.riskLevel === "high"
      ? C.red
      : data.riskLevel === "medium"
        ? C.amber
        : C.green;

  setFill(C.bgLight);
  setDraw(C.border);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, 48, 3, 3, "FD");

  // Risk badge
  setFill(riskColor);
  doc.roundedRect(margin + 14, y + 14, 80, 20, 3, 3, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  setColor(C.white);
  doc.text(
    `${data.riskLevel.toUpperCase()} RISK`,
    margin + 54,
    y + 27,
    { align: "center" }
  );

  // Confidence
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(C.textMuted);
  doc.text(
    `Confidence: ${Math.round(data.confidence * 100)}%`,
    margin + 110,
    y + 27
  );

  // Doc type
  if (data.documentType) {
    doc.text(
      `Document: ${data.documentType.replace(/_/g, " ")}`,
      margin + 220,
      y + 27
    );
  }

  y += 60;

  // ══════════════════════════════════════════════
  // POLICY INFORMATION
  // ══════════════════════════════════════════════
  y = sectionHeader(doc, "POLICY INFORMATION", margin, y, contentWidth);

  const policyFields = [
    ["Policy Type", data.policyType],
    ["Carrier", data.carrier],
    ["Policy #", data.policyNumber],
    ["Named Insured", data.namedInsured],
    ["Property", data.propertyAddress],
    ["Effective", data.effectiveDate || "—"],
    ["Expiration", data.expirationDate || "—"],
  ].filter(([, v]) => v && v !== "—");

  doc.setFontSize(8);
  const halfW = (contentWidth - 14) / 2;

  policyFields.forEach(([label, value], i) => {
    checkPage(16);
    const col = i % 2;
    const xBase = margin + col * halfW;

    doc.setFont("helvetica", "normal");
    setColor(C.textMuted);
    doc.text(label as string, xBase, y);

    doc.setFont("helvetica", "bold");
    setColor(C.text);
    const valStr = value as string;
    const truncated =
      valStr.length > 42 ? valStr.substring(0, 40) + "..." : valStr;
    doc.text(truncated, xBase + 80, y);

    if (col === 1 || i === policyFields.length - 1) y += 13;
  });

  y += 8;

  // Summary
  if (data.summaryForContractor) {
    checkPage(50);
    setFill(C.bgLight);
    const summaryLines = doc.splitTextToSize(data.summaryForContractor, contentWidth - 24);
    const summaryHeight = summaryLines.length * 10 + 20;
    doc.roundedRect(margin, y, contentWidth, summaryHeight, 3, 3, "F");

    y += 14;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    setColor(C.text);
    doc.text("Summary", margin + 12, y);
    y += 10;

    doc.setFont("helvetica", "normal");
    setColor(C.textMuted);
    doc.text(summaryLines, margin + 12, y);
    y += summaryLines.length * 10 + 8;
  }

  y += 4;

  // ══════════════════════════════════════════════
  // LANDMINES
  // ══════════════════════════════════════════════
  if (data.landmines.length > 0) {
    y = sectionHeader(
      doc,
      `POLICY LANDMINES (${data.landmines.length})`,
      margin,
      y,
      contentWidth
    );

    data.landmines.forEach((l) => {
      checkPage(40);
      const isCritical = l.severity === "critical";
      const barColor = isCritical ? C.red : C.amber;

      // Left accent bar
      setFill(barColor);
      doc.rect(margin, y - 6, 3, 24, "F");

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      setColor(C.text);
      doc.text(l.name, margin + 10, y);

      // Severity label
      setColor(barColor);
      doc.setFontSize(7);
      doc.text(
        l.severity.toUpperCase(),
        margin + 10 + doc.getTextWidth(l.name) + 8,
        y
      );

      y += 10;
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      setColor(C.textMuted);
      const impactLines = doc.splitTextToSize(l.impact, contentWidth - 20);
      doc.text(impactLines, margin + 10, y);
      y += impactLines.length * 9;

      if (l.actionItem) {
        doc.setFont("helvetica", "bold");
        setColor(C.text);
        doc.text("Action: ", margin + 10, y);
        doc.setFont("helvetica", "normal");
        const actionX = margin + 10 + doc.getTextWidth("Action: ");
        const actionLines = doc.splitTextToSize(
          l.actionItem,
          contentWidth - 20 - doc.getTextWidth("Action: ")
        );
        doc.text(actionLines, actionX, y);
        y += actionLines.length * 9;
      }

      y += 8;
    });
  }

  // ══════════════════════════════════════════════
  // FAVORABLE PROVISIONS
  // ══════════════════════════════════════════════
  if (data.favorableProvisions.length > 0) {
    y = sectionHeader(
      doc,
      `FAVORABLE PROVISIONS (${data.favorableProvisions.length})`,
      margin,
      y,
      contentWidth
    );

    data.favorableProvisions.forEach((p) => {
      checkPage(30);

      // Green left bar
      setFill(C.green);
      doc.rect(margin, y - 6, 3, 20, "F");

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      setColor(C.text);
      doc.text(p.name, margin + 10, y);
      y += 10;

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      setColor(C.textMuted);
      const lines = doc.splitTextToSize(p.impact, contentWidth - 20);
      doc.text(lines, margin + 10, y);
      y += lines.length * 9 + 8;
    });
  }

  // ══════════════════════════════════════════════
  // COVERAGES
  // ══════════════════════════════════════════════
  if (data.coverages.length > 0) {
    checkPage(40);
    y = sectionHeader(doc, "COVERAGE SECTIONS", margin, y, contentWidth);

    data.coverages.forEach((c) => {
      checkPage(20);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      setColor(C.text);
      doc.text(c.label, margin, y);

      if (c.limit) {
        doc.setFont("helvetica", "bold");
        setColor(C.green);
        doc.text(c.limit, pageWidth - margin, y, { align: "right" });
      }

      y += 10;
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      setColor(C.textMuted);
      const descLines = doc.splitTextToSize(c.description, contentWidth - 80);
      doc.text(descLines, margin, y);
      y += descLines.length * 9 + 4;
    });
  }

  // ══════════════════════════════════════════════
  // DEDUCTIBLES
  // ══════════════════════════════════════════════
  if (data.deductibles.length > 0) {
    checkPage(40);
    y = sectionHeader(doc, "DEDUCTIBLES", margin, y, contentWidth);

    data.deductibles.forEach((d) => {
      checkPage(20);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      setColor(C.text);

      let amountText = d.amount;
      if (d.dollarAmount && d.amount.includes("%")) {
        amountText += ` ($${d.dollarAmount.toLocaleString()})`;
      }
      doc.text(amountText, margin, y);

      doc.setFont("helvetica", "normal");
      setColor(C.textMuted);
      doc.text(`(${d.type})`, margin + doc.getTextWidth(amountText) + 6, y);
      y += 10;

      doc.setFontSize(7.5);
      doc.text(`Applies to: ${d.appliesTo}`, margin, y);
      y += 12;
    });
  }

  // ══════════════════════════════════════════════
  // DEPRECIATION
  // ══════════════════════════════════════════════
  checkPage(40);
  y = sectionHeader(doc, "DEPRECIATION METHOD", margin, y, contentWidth);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const depColor =
    data.depreciationMethod === "RCV"
      ? C.green
      : data.depreciationMethod === "ACV"
        ? C.red
        : C.text;
  setColor(depColor);
  doc.text(data.depreciationMethod || "Unknown", margin, y);
  y += 12;

  if (data.depreciationNotes) {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    setColor(C.textMuted);
    const notesLines = doc.splitTextToSize(data.depreciationNotes, contentWidth);
    doc.text(notesLines, margin, y);
    y += notesLines.length * 9 + 4;
  }

  y += 4;

  // ══════════════════════════════════════════════
  // EXCLUSIONS
  // ══════════════════════════════════════════════
  if (data.exclusions.length > 0) {
    checkPage(40);
    y = sectionHeader(
      doc,
      `EXCLUSIONS (${data.exclusions.length})`,
      margin,
      y,
      contentWidth
    );

    data.exclusions.forEach((ex) => {
      checkPage(36);
      const sevColor =
        ex.severity === "critical"
          ? C.red
          : ex.severity === "warning"
            ? C.amber
            : C.accent;

      setFill(sevColor);
      doc.rect(margin, y - 6, 3, 28, "F");

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      setColor(C.text);
      doc.text(ex.name, margin + 10, y);

      setColor(sevColor);
      doc.setFontSize(7);
      doc.text(
        ex.severity.toUpperCase(),
        margin + 10 + doc.getTextWidth(ex.name) + 8,
        y
      );

      y += 10;
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      setColor(C.textMuted);
      const descLines = doc.splitTextToSize(ex.description, contentWidth - 20);
      doc.text(descLines, margin + 10, y);
      y += descLines.length * 9;

      setColor(C.red);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      const impactLines = doc.splitTextToSize(
        `Impact: ${ex.impact}`,
        contentWidth - 20
      );
      doc.text(impactLines, margin + 10, y);
      y += impactLines.length * 9 + 8;
    });
  }

  // ══════════════════════════════════════════════
  // ENDORSEMENTS
  // ══════════════════════════════════════════════
  if (data.endorsements.length > 0) {
    checkPage(40);
    y = sectionHeader(
      doc,
      `ENDORSEMENTS (${data.endorsements.length})`,
      margin,
      y,
      contentWidth
    );

    data.endorsements.forEach((en) => {
      checkPage(36);
      const sevColor =
        en.severity === "critical"
          ? C.red
          : en.severity === "warning"
            ? C.amber
            : C.accent;

      setFill(sevColor);
      doc.rect(margin, y - 6, 3, 24, "F");

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      setColor(C.text);
      let endorseLabel = en.name;
      if (en.number) endorseLabel += ` (${en.number})`;
      doc.text(endorseLabel, margin + 10, y);

      setColor(sevColor);
      doc.setFontSize(7);
      doc.text(
        en.severity.toUpperCase(),
        margin + 10 + doc.getTextWidth(endorseLabel) + 8,
        y
      );

      y += 10;
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      setColor(C.textMuted);
      const descLines = doc.splitTextToSize(en.description, contentWidth - 20);
      doc.text(descLines, margin + 10, y);
      y += descLines.length * 9;

      if (en.impact) {
        doc.setFont("helvetica", "bold");
        setColor(C.text);
        doc.setFontSize(7);
        const impactLines = doc.splitTextToSize(en.impact, contentWidth - 20);
        doc.text(impactLines, margin + 10, y);
        y += impactLines.length * 9;
      }

      y += 8;
    });
  }

  // ══════════════════════════════════════════════
  // DISCLAIMER
  // ══════════════════════════════════════════════
  checkPage(60);
  y += 8;
  setDraw(C.border);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 14;

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  setColor(C.textMuted);
  doc.text("DISCLAIMER", margin, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  const disclaimer =
    "This analysis is generated by AI for educational and informational purposes only. " +
    "It does not constitute legal, insurance, or professional advice. Always consult with " +
    "a licensed insurance professional for policy interpretation. Results may not reflect " +
    "all policy provisions, especially if only a declarations page was provided.";
  const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth);
  doc.text(disclaimerLines, margin, y);

  // ══════════════════════════════════════════════
  // FOOTER on every page
  // ══════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    setFill(C.bgLight);
    doc.rect(0, pageHeight - 30, pageWidth, 30, "F");

    setDraw(C.border);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 30, pageWidth - margin, pageHeight - 30);

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    setColor(C.textLight);
    doc.text(
      `Policy Analysis Report  |  ${data.generatedDate}`,
      margin,
      pageHeight - 14
    );
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 14, {
      align: "right",
    });
  }

  return doc.output("arraybuffer");
}

/* ─────── Helper: Section header ─────── */

function sectionHeader(
  doc: jsPDF,
  title: string,
  margin: number,
  y: number,
  contentWidth: number
): number {
  const setColor = (c: [number, number, number]) =>
    doc.setTextColor(c[0], c[1], c[2]);
  const setDraw = (c: [number, number, number]) =>
    doc.setDrawColor(c[0], c[1], c[2]);

  setDraw(C.border);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + contentWidth, y);
  y += 14;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  setColor(C.text);
  doc.text(title, margin, y);
  y += 4;

  setDraw(C.accent);
  doc.setLineWidth(2);
  doc.line(margin, y, margin + 100, y);
  y += 14;

  return y;
}
