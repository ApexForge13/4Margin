/**
 * Contractor-facing policy decode PDF — dense technical report for internal use.
 *
 * Sections:
 *   1. Branded header
 *   2. Go/No-Go signal
 *   3. Coverage summary box
 *   4. Exclusions & landmines
 *   5. Favorable provisions
 *   6. O&P indicators
 *   7. Depreciation details
 *   8. Carrier battle card
 *   9. Key dates
 *  10. Full coverage detail table
 *  11. All endorsements
 *  12. Disclaimer + branded footer
 */

import { jsPDF } from "jspdf";
import {
  createBrandedDocument,
  addBrandedHeader,
  addBrandedFooter,
  addSectionHeader,
  addBrandedPage,
  ensureSpace,
  FALLBACK_BRAND,
} from "./template";
import type { DocumentBrand } from "./template";

/* ─────── Local PolicyAnalysis interface ─────── */
// Mirrors the shape from @4margin/policy-engine without a cross-package import.

interface PolicyCoverage {
  section?: string;
  label: string;
  limit: string | null;
  description: string;
}

interface PolicyDeductible {
  type: string;
  amount: string;
  dollarAmount?: number | null;
  appliesTo: string;
  needsVerification?: boolean;
}

interface PolicyExclusion {
  name: string;
  description: string;
  policyLanguage?: string;
  severity: string;
  impact: string;
}

interface PolicyEndorsement {
  name: string;
  number?: string | null;
  effectiveDate?: string | null;
  description: string;
  impact: string;
  severity: string;
}

interface DetectedLandmine {
  ruleId?: string;
  name: string;
  severity: string;
  category?: string;
  policyLanguage?: string;
  impact: string;
  actionItem: string;
}

interface DetectedFavorable {
  provisionId?: string;
  name: string;
  policyLanguage?: string;
  impact: string;
  supplementRelevance: string;
}

export interface PolicyAnalysis {
  policyType: string;
  carrier: string;
  policyNumber: string;
  effectiveDate: string | null;
  expirationDate: string | null;
  namedInsured: string;
  propertyAddress: string;
  coverages: PolicyCoverage[];
  deductibles: PolicyDeductible[];
  depreciationMethod: "RCV" | "ACV" | "MODIFIED_ACV" | "UNKNOWN";
  depreciationNotes: string;
  exclusions: PolicyExclusion[];
  endorsements: PolicyEndorsement[];
  landmines: DetectedLandmine[];
  favorableProvisions: DetectedFavorable[];
  summaryForContractor: string;
  riskLevel: "low" | "medium" | "high";
  confidence: number;
  parseNotes?: string;
}

/* ─────── Public interface ─────── */

export interface ContractorDecodePdfData {
  analysis: PolicyAnalysis;
  brand?: DocumentBrand;
  generatedAt?: string; // ISO date string
}

/* ─────── Colors ─────── */

const C = {
  text: [15, 23, 42] as [number, number, number],       // Slate-900
  textMuted: [100, 116, 139] as [number, number, number], // Slate-500
  textLight: [148, 163, 184] as [number, number, number], // Slate-400
  border: [226, 232, 240] as [number, number, number],  // Slate-200
  bgLight: [248, 250, 252] as [number, number, number], // Slate-50
  bgGray: [241, 245, 249] as [number, number, number],  // Slate-100
  red: [220, 38, 38] as [number, number, number],       // Red-600
  amber: [245, 158, 11] as [number, number, number],    // Amber-400
  green: [16, 185, 129] as [number, number, number],    // Emerald-500
  gray: [148, 163, 184] as [number, number, number],    // Slate-400
  white: [255, 255, 255] as [number, number, number],
  goGreen: [21, 128, 61] as [number, number, number],   // Green-700 (filled box bg)
  goGreenBg: [220, 252, 231] as [number, number, number], // Green-100
  cautionBg: [254, 243, 199] as [number, number, number], // Amber-100
  cautionFg: [146, 64, 14] as [number, number, number],   // Amber-900
  noGoBg: [254, 226, 226] as [number, number, number],    // Red-100
  noGoFg: [153, 27, 27] as [number, number, number],      // Red-800
};

/* ─────── PDF Generation ─────── */

export function generateContractorDecodePdf(
  data: ContractorDecodePdfData
): ArrayBuffer {
  const { analysis } = data;
  const brand = data.brand || FALLBACK_BRAND;

  const doc = createBrandedDocument(brand);
  const pageWidth = doc.internal.pageSize.getWidth(); // mm (letter = 215.9mm)
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  const subtitle = [analysis.carrier, analysis.policyNumber]
    .filter(Boolean)
    .join("  |  ");

  let y = addBrandedHeader(doc, "POLICY DECODE — CONTRACTOR REPORT", subtitle);

  const docTitle = "POLICY DECODE — CONTRACTOR REPORT";

  /* ── helpers ── */
  const setColor = (c: [number, number, number]) =>
    doc.setTextColor(c[0], c[1], c[2]);
  const setFill = (c: [number, number, number]) =>
    doc.setFillColor(c[0], c[1], c[2]);
  const setDraw = (c: [number, number, number]) =>
    doc.setDrawColor(c[0], c[1], c[2]);

  const multiLine = (
    text: string,
    x: number,
    startY: number,
    maxWidth: number,
    fontSize = 9,
    fontStyle: "normal" | "bold" = "normal",
    color: [number, number, number] = C.text
  ): number => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", fontStyle);
    setColor(color);
    const lines = doc.splitTextToSize(text || "", maxWidth);
    doc.text(lines, x, startY);
    return startY + lines.length * (fontSize * 0.45);
  };

  const severityColor = (sev: string): [number, number, number] => {
    switch (sev?.toLowerCase()) {
      case "critical":
        return C.red;
      case "warning":
      case "warn":
        return C.amber;
      default:
        return C.gray;
    }
  };

  const formatDate = (raw: string | null | undefined): string => {
    if (!raw) return "—";
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return raw;
      return d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return raw;
    }
  };

  const formatUsd = (n: number | null | undefined): string => {
    if (n == null) return "—";
    return `$${n.toLocaleString("en-US")}`;
  };

  /* ═══════════════════════════════════════════════════════
     1. GO / NO-GO SIGNAL
  ═══════════════════════════════════════════════════════ */
  y = ensureSpace(doc, y, 28, docTitle, subtitle);

  const hasCriticalExclusion = (analysis.exclusions || []).some(
    (e) => e.severity === "critical"
  );
  const isAcv = analysis.depreciationMethod === "ACV";
  const isHigh = analysis.riskLevel === "high";
  const isMedium = analysis.riskLevel === "medium";

  let signal: "GO" | "CAUTION" | "NO-GO";
  let signalReason: string;
  let signalBg: [number, number, number];
  let signalFg: [number, number, number];
  let signalBarColor: [number, number, number];

  if (isHigh && isAcv && hasCriticalExclusion) {
    signal = "NO-GO";
    signalReason =
      "High risk policy: ACV depreciation + critical exclusions detected. Supplement viability is low without significant documentation.";
    signalBg = C.noGoBg;
    signalFg = C.noGoFg;
    signalBarColor = C.red;
  } else if (
    isMedium ||
    isAcv ||
    hasCriticalExclusion
  ) {
    signal = "CAUTION";
    signalReason =
      isAcv
        ? "ACV policy — recoverable depreciation not guaranteed. Document thoroughly and verify holdback release terms."
        : hasCriticalExclusion
          ? "Critical exclusion(s) detected that may limit recoverable scope."
          : "Medium risk profile — review landmines and exclusions before submitting supplement.";
    signalBg = C.cautionBg;
    signalFg = C.cautionFg;
    signalBarColor = C.amber;
  } else {
    signal = "GO";
    signalReason =
      "RCV policy, low risk profile, no critical exclusions. Standard supplement approach should apply.";
    signalBg = C.goGreenBg;
    signalFg = C.goGreen;
    signalBarColor = C.green;
  }

  // Signal box
  setFill(signalBg);
  setDraw(signalBarColor);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 20, 2, 2, "FD");

  // Left accent bar inside box
  setFill(signalBarColor);
  doc.rect(margin, y, 4, 20, "F");

  // Signal label
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  setColor(signalFg);
  doc.text(signal, margin + 10, y + 13);

  // Reasoning text
  const labelWidth = doc.getTextWidth(signal) + 6;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(signalFg);
  const reasonLines = doc.splitTextToSize(
    signalReason,
    contentWidth - labelWidth - 14
  );
  doc.text(reasonLines, margin + 10 + labelWidth, y + 8);

  y += 26;

  /* ═══════════════════════════════════════════════════════
     2. COVERAGE SUMMARY BOX
  ═══════════════════════════════════════════════════════ */
  y = ensureSpace(doc, y, 36, docTitle, subtitle);

  const dwellingCoverage = (analysis.coverages || []).find(
    (cv) =>
      cv.section?.toLowerCase().includes("dwelling") ||
      cv.section?.toLowerCase().includes("coverage a") ||
      cv.label?.toLowerCase().includes("dwelling") ||
      cv.label?.toLowerCase().includes("coverage a")
  );

  const primaryDeductible = (analysis.deductibles || []).find(
    (d) =>
      d.type?.toLowerCase().includes("all peril") ||
      d.type?.toLowerCase().includes("wind") ||
      d.type?.toLowerCase().includes("hail") ||
      d.type?.toLowerCase().includes("hurricane")
  ) || (analysis.deductibles || [])[0];

  const depLabel =
    analysis.depreciationMethod === "RCV"
      ? "RCV (Replacement Cost Value)"
      : analysis.depreciationMethod === "ACV"
        ? "ACV (Actual Cash Value)"
        : analysis.depreciationMethod === "MODIFIED_ACV"
          ? "Modified ACV"
          : analysis.depreciationMethod || "Unknown";

  setFill(C.bgGray);
  setDraw(C.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 30, 2, 2, "FD");

  const boxY = y + 7;
  const colW = contentWidth / 4;

  const summaryFields: Array<[string, string]> = [
    ["Depreciation", depLabel],
    [
      "Deductible",
      primaryDeductible
        ? `${primaryDeductible.amount}${primaryDeductible.dollarAmount ? ` (${formatUsd(primaryDeductible.dollarAmount)})` : ""}`
        : "—",
    ],
    ["Dwelling Limit", dwellingCoverage?.limit || "—"],
    ["Named Insured", analysis.namedInsured || "—"],
  ];

  summaryFields.forEach(([label, value], i) => {
    const x = margin + 4 + i * colW;
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    setColor(C.textMuted);
    doc.text(label.toUpperCase(), x, boxY);

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    setColor(C.text);
    const truncated = value.length > 24 ? value.slice(0, 22) + "…" : value;
    doc.text(truncated, x, boxY + 8);
  });

  // Property address below the four columns
  if (analysis.propertyAddress) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    setColor(C.textMuted);
    doc.text(
      `Property: ${analysis.propertyAddress}`,
      margin + 4,
      boxY + 20
    );
  }

  y += 36;

  /* ═══════════════════════════════════════════════════════
     3. EXCLUSIONS & LANDMINES
  ═══════════════════════════════════════════════════════ */
  const landmines = analysis.landmines || [];
  const exclusions = analysis.exclusions || [];

  if (landmines.length > 0 || exclusions.length > 0) {
    y = ensureSpace(doc, y, 18, docTitle, subtitle);
    y = addSectionHeader(
      doc,
      y,
      `LANDMINES & EXCLUSIONS  (${landmines.length} landmine${landmines.length !== 1 ? "s" : ""}, ${exclusions.length} exclusion${exclusions.length !== 1 ? "s" : ""})`,
      C.red
    );

    // Landmines first (action items make them highest priority)
    for (const lm of landmines) {
      const barColor = severityColor(lm.severity);
      const lineEstimate = 6 + (lm.impact ? 2 : 0) + (lm.actionItem ? 2 : 0);
      y = ensureSpace(doc, y, lineEstimate * 5 + 10, docTitle, subtitle);

      setFill(barColor);
      doc.rect(margin, y - 2, 2.5, lineEstimate * 5 + 4, "F");

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      setColor(C.text);
      doc.text(lm.name || "Unnamed Landmine", margin + 6, y + 4);

      // Severity badge inline
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      setColor(barColor);
      const nameW = doc.getTextWidth(lm.name || "Unnamed Landmine");
      // switch back to correct font size first
      doc.setFontSize(8.5);
      const badgeX = margin + 6 + nameW + 3;
      doc.setFontSize(6.5);
      doc.text((lm.severity || "info").toUpperCase(), badgeX, y + 4);

      y += 8;

      if (lm.impact) {
        y = multiLine(lm.impact, margin + 6, y, contentWidth - 8, 7.5, "normal", C.textMuted);
        y += 3;
      }

      if (lm.actionItem) {
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        setColor(C.text);
        doc.text("Action: ", margin + 6, y);
        const actionLabelW = doc.getTextWidth("Action: ");
        doc.setFont("helvetica", "normal");
        setColor(C.textMuted);
        const actionLines = doc.splitTextToSize(
          lm.actionItem,
          contentWidth - 8 - actionLabelW
        );
        doc.text(actionLines, margin + 6 + actionLabelW, y);
        y += actionLines.length * 4 + 3;
      }

      y += 5;
    }

    // Exclusions
    for (const ex of exclusions) {
      const barColor = severityColor(ex.severity);
      const lineEstimate = 4 + (ex.description ? 2 : 0) + (ex.impact ? 1 : 0);
      y = ensureSpace(doc, y, lineEstimate * 5 + 10, docTitle, subtitle);

      setFill(barColor);
      doc.rect(margin, y - 2, 2.5, lineEstimate * 5 + 4, "F");

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      setColor(C.text);
      doc.text(ex.name || "Unnamed Exclusion", margin + 6, y + 4);

      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      setColor(barColor);
      const exNameW = doc.getTextWidth(ex.name || "Unnamed Exclusion");
      doc.setFontSize(8.5); // reset
      doc.setFontSize(6.5);
      doc.text((ex.severity || "info").toUpperCase(), margin + 6 + exNameW + 3, y + 4);

      y += 8;

      if (ex.description) {
        y = multiLine(ex.description, margin + 6, y, contentWidth - 8, 7.5, "normal", C.textMuted);
        y += 2;
      }

      if (ex.impact) {
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        setColor(C.red);
        const impLines = doc.splitTextToSize(`Impact: ${ex.impact}`, contentWidth - 8);
        doc.text(impLines, margin + 6, y);
        y += impLines.length * 3.5 + 3;
      }

      y += 5;
    }
  }

  /* ═══════════════════════════════════════════════════════
     4. FAVORABLE PROVISIONS
  ═══════════════════════════════════════════════════════ */
  const favorable = analysis.favorableProvisions || [];
  if (favorable.length > 0) {
    y = ensureSpace(doc, y, 18, docTitle, subtitle);
    y = addSectionHeader(
      doc,
      y,
      `FAVORABLE PROVISIONS  (${favorable.length})`,
      C.green
    );

    for (const fp of favorable) {
      const lineEstimate = 4 + (fp.impact ? 2 : 0) + (fp.supplementRelevance ? 2 : 0);
      y = ensureSpace(doc, y, lineEstimate * 5 + 10, docTitle, subtitle);

      setFill(C.green);
      doc.rect(margin, y - 2, 2.5, lineEstimate * 5 + 4, "F");

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      setColor(C.text);
      doc.text(fp.name || "Unnamed Provision", margin + 6, y + 4);
      y += 8;

      if (fp.impact) {
        y = multiLine(fp.impact, margin + 6, y, contentWidth - 8, 7.5, "normal", C.textMuted);
        y += 2;
      }

      if (fp.supplementRelevance) {
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        setColor(C.green);
        doc.text("Leverage: ", margin + 6, y);
        const leverageLabelW = doc.getTextWidth("Leverage: ");
        doc.setFont("helvetica", "normal");
        setColor(C.textMuted);
        const levLines = doc.splitTextToSize(
          fp.supplementRelevance,
          contentWidth - 8 - leverageLabelW
        );
        doc.text(levLines, margin + 6 + leverageLabelW, y);
        y += levLines.length * 4 + 3;
      }

      y += 5;
    }
  }

  /* ═══════════════════════════════════════════════════════
     5. O&P INDICATORS
  ═══════════════════════════════════════════════════════ */
  y = ensureSpace(doc, y, 18, docTitle, subtitle);
  y = addSectionHeader(doc, y, "O&P INDICATORS", C.amber);

  const opFavorable = favorable.filter(
    (fp) =>
      /o&p|overhead|profit|general contractor|gc|general conditions/i.test(
        fp.name + " " + fp.impact + " " + fp.supplementRelevance
      )
  );
  const opExclusion = exclusions.filter((ex) =>
    /o&p|overhead|profit/i.test(ex.name + " " + ex.description + " " + ex.impact)
  );

  y = ensureSpace(doc, y, 20, docTitle, subtitle);

  if (opFavorable.length > 0) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    setColor(C.green);
    doc.text("O&P-Supportive Language Found:", margin, y);
    y += 6;
    for (const fp of opFavorable) {
      y = ensureSpace(doc, y, 10, docTitle, subtitle);
      setFill(C.green);
      doc.rect(margin, y - 1, 2, 6, "F");
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      setColor(C.textMuted);
      const line = doc.splitTextToSize(`${fp.name}: ${fp.supplementRelevance}`, contentWidth - 6);
      doc.text(line, margin + 5, y + 4);
      y += line.length * 4 + 4;
    }
  }

  if (opExclusion.length > 0) {
    y = ensureSpace(doc, y, 10, docTitle, subtitle);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    setColor(C.red);
    doc.text("Anti-O&P Language Detected:", margin, y);
    y += 6;
    for (const ex of opExclusion) {
      y = ensureSpace(doc, y, 10, docTitle, subtitle);
      setFill(C.red);
      doc.rect(margin, y - 1, 2, 6, "F");
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      setColor(C.textMuted);
      const line = doc.splitTextToSize(`${ex.name}: ${ex.impact}`, contentWidth - 6);
      doc.text(line, margin + 5, y + 4);
      y += line.length * 4 + 4;
    }
  }

  if (opFavorable.length === 0 && opExclusion.length === 0) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    setColor(C.textMuted);
    doc.text(
      "No explicit O&P provisions detected. Standard industry position (general contractor coordination) applies.",
      margin,
      y
    );
    y += 6;
  }

  y += 4;

  /* ═══════════════════════════════════════════════════════
     6. DEPRECIATION DETAILS
  ═══════════════════════════════════════════════════════ */
  y = ensureSpace(doc, y, 18, docTitle, subtitle);
  y = addSectionHeader(doc, y, "DEPRECIATION DETAILS");

  const depMethodColor =
    analysis.depreciationMethod === "RCV"
      ? C.green
      : analysis.depreciationMethod === "ACV"
        ? C.red
        : C.amber;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  setColor(depMethodColor);
  doc.text(depLabel, margin, y);
  y += 7;

  if (analysis.depreciationNotes) {
    y = ensureSpace(doc, y, 14, docTitle, subtitle);
    y = multiLine(analysis.depreciationNotes, margin, y, contentWidth, 8, "normal", C.textMuted);
    y += 4;
  }

  // Show recoverable deductibles
  const recoverable = (analysis.deductibles || []).filter(
    (d) =>
      d.type?.toLowerCase().includes("recoverable") ||
      d.needsVerification
  );
  if (recoverable.length > 0) {
    y = ensureSpace(doc, y, 10, docTitle, subtitle);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    setColor(C.text);
    doc.text("Recoverable / Needs Verification:", margin, y);
    y += 5;
    for (const rd of recoverable) {
      doc.setFont("helvetica", "normal");
      setColor(C.textMuted);
      doc.text(
        `• ${rd.type} — ${rd.amount}${rd.dollarAmount ? ` (${formatUsd(rd.dollarAmount)})` : ""}  |  ${rd.appliesTo}`,
        margin + 3,
        y
      );
      y += 5;
    }
  }

  y += 4;

  /* ═══════════════════════════════════════════════════════
     7. CARRIER BATTLE CARD
  ═══════════════════════════════════════════════════════ */
  y = ensureSpace(doc, y, 36, docTitle, subtitle);
  y = addSectionHeader(doc, y, "CARRIER BATTLE CARD");

  setFill(C.bgGray);
  setDraw(C.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 32, 2, 2, "FD");

  // Left accent using brand primary
  const brand2 = (doc as any).__brand || FALLBACK_BRAND;
  setFill(brand2.colors.primary);
  doc.rect(margin, y, 4, 32, "F");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  setColor(C.text);
  doc.text(analysis.carrier || "Unknown Carrier", margin + 8, y + 10);

  // Risk level badge
  const riskBadgeColor =
    isHigh ? C.red : isMedium ? C.amber : C.green;
  setFill(riskBadgeColor);
  doc.roundedRect(margin + 8, y + 14, 36, 8, 1, 1, "F");
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  setColor(C.white);
  doc.text(
    `${(analysis.riskLevel || "").toUpperCase()} RISK`,
    margin + 8 + 18,
    y + 19.5,
    { align: "center" }
  );

  // Confidence
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  setColor(C.textMuted);
  doc.text(
    `Confidence: ${Math.round((analysis.confidence || 0) * 100)}%`,
    margin + 50,
    y + 20
  );

  // Note about persistent carrier notes
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  setColor(C.textMuted);
  doc.text(
    "Add your notes in the app — they persist across all jobs with this carrier.",
    margin + 8,
    y + 28
  );

  y += 38;

  /* ═══════════════════════════════════════════════════════
     8. KEY DATES
  ═══════════════════════════════════════════════════════ */
  y = ensureSpace(doc, y, 18, docTitle, subtitle);
  y = addSectionHeader(doc, y, "KEY DATES");

  const dateFields: Array<[string, string]> = [
    ["Policy Effective", formatDate(analysis.effectiveDate)],
    ["Policy Expiration", formatDate(analysis.expirationDate)],
    [
      "Report Generated",
      data.generatedAt
        ? formatDate(data.generatedAt)
        : new Date().toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
    ],
  ];

  // Filing deadline note
  if (analysis.expirationDate) {
    const expDate = new Date(analysis.expirationDate);
    if (!isNaN(expDate.getTime())) {
      const today = new Date();
      const diffDays = Math.ceil(
        (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays > 0 && diffDays <= 365) {
        dateFields.push([
          "Days Until Expiration",
          `${diffDays} days — verify supplemental filing deadlines with carrier`,
        ]);
      } else if (diffDays <= 0) {
        dateFields.push(["Expiration Status", "POLICY EXPIRED — verify claim filing window"]);
      }
    }
  }

  for (const [label, value] of dateFields) {
    y = ensureSpace(doc, y, 8, docTitle, subtitle);
    const isExpiredRow = label === "Expiration Status";
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    setColor(isExpiredRow ? C.red : C.text);
    doc.text(`${label}: `, margin, y);
    const labelW = doc.getTextWidth(`${label}: `);
    doc.setFont("helvetica", "normal");
    setColor(isExpiredRow ? C.red : C.textMuted);
    doc.text(value, margin + labelW, y);
    y += 6;
  }

  y += 4;

  /* ═══════════════════════════════════════════════════════
     9. FULL COVERAGE DETAIL
  ═══════════════════════════════════════════════════════ */
  const coverages = analysis.coverages || [];
  if (coverages.length > 0) {
    y = ensureSpace(doc, y, 20, docTitle, subtitle);
    y = addSectionHeader(doc, y, `FULL COVERAGE DETAIL  (${coverages.length} sections)`);

    // Table header
    y = ensureSpace(doc, y, 10, docTitle, subtitle);
    setFill(C.bgGray);
    doc.rect(margin, y - 1, contentWidth, 7, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    setColor(C.textMuted);
    doc.text("COVERAGE", margin + 2, y + 4);
    doc.text("LIMIT", margin + contentWidth * 0.55, y + 4);
    doc.text("DESCRIPTION", margin + contentWidth * 0.72, y + 4);
    y += 9;

    for (const cv of coverages) {
      const descLines = doc.splitTextToSize(
        cv.description || "—",
        contentWidth * 0.27
      );
      const rowHeight = Math.max(6, descLines.length * 4 + 3);
      y = ensureSpace(doc, y, rowHeight + 2, docTitle, subtitle);

      // Row divider
      setDraw(C.border);
      doc.setLineWidth(0.2);
      doc.line(margin, y - 1, margin + contentWidth, y - 1);

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      setColor(C.text);
      const labelLines = doc.splitTextToSize(cv.label || "—", contentWidth * 0.52);
      doc.text(labelLines, margin + 2, y + 3);

      if (cv.limit) {
        doc.setFont("helvetica", "bold");
        setColor(C.green);
        doc.text(cv.limit, margin + contentWidth * 0.55, y + 3);
      }

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      setColor(C.textMuted);
      doc.text(descLines, margin + contentWidth * 0.72, y + 3);

      y += Math.max(labelLines.length * 4 + 2, rowHeight) + 1;
    }
  }

  y += 4;

  /* ═══════════════════════════════════════════════════════
     10. ALL ENDORSEMENTS
  ═══════════════════════════════════════════════════════ */
  const endorsements = analysis.endorsements || [];
  if (endorsements.length > 0) {
    y = ensureSpace(doc, y, 18, docTitle, subtitle);
    y = addSectionHeader(
      doc,
      y,
      `ENDORSEMENTS  (${endorsements.length})`
    );

    for (const en of endorsements) {
      const barColor = severityColor(en.severity);
      const lineEstimate = 4 + (en.description ? 2 : 0) + (en.impact ? 1 : 0);
      y = ensureSpace(doc, y, lineEstimate * 5 + 10, docTitle, subtitle);

      setFill(barColor);
      doc.rect(margin, y - 2, 2.5, lineEstimate * 5 + 4, "F");

      let endorseLabel = en.name || "Unnamed Endorsement";
      if (en.number) endorseLabel += ` (${en.number})`;

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      setColor(C.text);
      doc.text(endorseLabel, margin + 6, y + 4);

      doc.setFontSize(6.5);
      setColor(barColor);
      const enLabelW = doc.getTextWidth(endorseLabel);
      doc.text((en.severity || "info").toUpperCase(), margin + 6 + enLabelW + 3, y + 4);

      y += 8;

      if (en.description) {
        y = multiLine(en.description, margin + 6, y, contentWidth - 8, 7.5, "normal", C.textMuted);
        y += 2;
      }

      if (en.impact) {
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        setColor(C.text);
        const impLines = doc.splitTextToSize(`Impact: ${en.impact}`, contentWidth - 8);
        doc.text(impLines, margin + 6, y);
        y += impLines.length * 3.5 + 3;
      }

      if (en.effectiveDate) {
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        setColor(C.textMuted);
        doc.text(`Effective: ${formatDate(en.effectiveDate)}`, margin + 6, y);
        y += 4;
      }

      y += 5;
    }
  }

  /* ═══════════════════════════════════════════════════════
     11. DISCLAIMER
  ═══════════════════════════════════════════════════════ */
  y = ensureSpace(doc, y, 30, docTitle, subtitle);

  setDraw(C.border);
  doc.setLineWidth(0.4);
  doc.line(margin, y, margin + contentWidth, y);
  y += 7;

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  setColor(C.textMuted);
  doc.text("DISCLAIMER", margin, y);
  y += 5;

  const disclaimerText =
    "This report is generated by 4Margin for professional reference only. It does not constitute " +
    "legal or insurance advice. Always verify policy provisions with the carrier and consult licensed " +
    "professionals for binding interpretations. Policy analysis may not reflect all provisions, " +
    "especially if only a declarations page was provided. This document is intended for contractor " +
    "internal use only and should not be shared with homeowners or carriers.";

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  setColor(C.textLight);
  const disclaimerLines = doc.splitTextToSize(disclaimerText, contentWidth);
  doc.text(disclaimerLines, margin, y);

  /* ═══════════════════════════════════════════════════════
     FOOTERS — applied to every page after all content is done
  ═══════════════════════════════════════════════════════ */
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    addBrandedFooter(doc, p, totalPages);
  }

  return doc.output("arraybuffer");
}
