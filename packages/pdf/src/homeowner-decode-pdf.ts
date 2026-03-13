/**
 * Homeowner-facing policy decode PDF.
 *
 * Friendly, plain-English coverage summary. Designed to inform, not overwhelm.
 * No risk levels, no landmines, no strategy notes, no policy language.
 * Audience: homeowner receiving a copy from their roofing contractor.
 *
 * Sections:
 *   1. Branded header
 *   2. Your Coverage at a Glance (plain-English intro paragraph)
 *   3. What's Covered (green accents, checkmarks)
 *   4. What's Not Covered (soft gray, friendly language)
 *   5. Your Deductible (info box)
 *   6. What Happens Next (numbered steps)
 *   7. Disclaimer
 *   8. Footer on every page
 */

import { jsPDF } from "jspdf";

/* ─────── Color palette ─────── */

const C = {
  text: [15, 23, 42] as [number, number, number],       // Slate-900
  textMuted: [71, 85, 105] as [number, number, number], // Slate-600
  textLight: [148, 163, 184] as [number, number, number], // Slate-400
  border: [226, 232, 240] as [number, number, number],  // Slate-200
  bgLight: [248, 250, 252] as [number, number, number], // Slate-50
  bgGreen: [240, 253, 244] as [number, number, number], // Green-50
  bgGray: [249, 250, 251] as [number, number, number],  // Gray-50
  bgBlue: [239, 246, 255] as [number, number, number],  // Blue-50
  green: [22, 163, 74] as [number, number, number],     // Green-600
  greenBar: [134, 239, 172] as [number, number, number], // Green-300
  gray: [107, 114, 128] as [number, number, number],    // Gray-500
  grayBar: [209, 213, 219] as [number, number, number], // Gray-300
  blue: [37, 99, 235] as [number, number, number],      // Blue-600
  white: [255, 255, 255] as [number, number, number],
};

/* ─────── Types ─────── */

// Minimal local interface — only fields actually rendered in this PDF.
interface PolicyAnalysis {
  carrier?: string | null;
  policyNumber?: string | null;
  namedInsured?: string | null;
  propertyAddress?: string | null;
  coverages?: Array<{
    section?: string | null;
    label: string;
    limit?: string | null;
    description: string;
  }> | null;
  deductibles?: Array<{
    type: string;
    amount: string;
    dollarAmount?: number | null;
    appliesTo?: string | null;
  }> | null;
  depreciationMethod?: "RCV" | "ACV" | "MODIFIED_ACV" | "UNKNOWN" | null;
  depreciationNotes?: string | null;
  exclusions?: Array<{
    name: string;
    description: string;
    severity?: "critical" | "warning" | "info" | null;
    impact?: string | null;
  }> | null;
  favorableProvisions?: Array<{
    name: string;
    impact: string;
  }> | null;
  summaryForContractor?: string | null;
  confidence?: number | null;
}

export interface HomeownerDecodePdfData {
  analysis: PolicyAnalysis;
  brand?: {
    companyName: string;
    logoImageBase64?: string;
    colors?: {
      primary: [number, number, number];
      secondary: [number, number, number];
      accent: [number, number, number];
    };
    disclaimer?: string;
  };
  contractorPhone?: string;
  contractorEmail?: string;
  generatedAt?: string;
}

/* ─────── Main export ─────── */

export function generateHomeownerDecodePdf(
  data: HomeownerDecodePdfData
): ArrayBuffer {
  const { analysis } = data;
  const companyName = data.brand?.companyName || "4Margin";
  const primaryColor: [number, number, number] =
    data.brand?.colors?.primary || [30, 58, 138];
  const accentColor: [number, number, number] =
    data.brand?.colors?.accent || [59, 130, 246];

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  /* Helpers */
  const setColor = (c: [number, number, number]) =>
    doc.setTextColor(c[0], c[1], c[2]);
  const setFill = (c: [number, number, number]) =>
    doc.setFillColor(c[0], c[1], c[2]);
  const setDraw = (c: [number, number, number]) =>
    doc.setDrawColor(c[0], c[1], c[2]);

  const checkPage = (needed: number) => {
    if (y + needed > pageHeight - 52) {
      doc.addPage();
      // Repeat header bar on continuation pages (thinner)
      setFill(primaryColor);
      doc.rect(0, 0, pageWidth, 10, "F");
      y = 28;
    }
  };

  const hRule = (yPos: number, color: [number, number, number] = C.border) => {
    setDraw(color);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, margin + contentWidth, yPos);
  };

  /* Date string */
  const generatedAt =
    data.generatedAt ||
    new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  /* Safe getters */
  const carrier = analysis.carrier || "Your Insurance Company";
  const namedInsured = analysis.namedInsured || "";
  const propertyAddress = analysis.propertyAddress || "";
  const coverages = analysis.coverages?.filter(Boolean) || [];
  const deductibles = analysis.deductibles?.filter(Boolean) || [];
  const exclusions = analysis.exclusions?.filter(Boolean) || [];
  const depMethod = analysis.depreciationMethod || "UNKNOWN";

  // ════════════════════════════════════════════
  // 1. HEADER
  // ════════════════════════════════════════════
  setFill(primaryColor);
  doc.rect(0, 0, pageWidth, 60, "F");

  // Accent stripe at bottom of header
  setFill(accentColor);
  doc.rect(0, 57, pageWidth, 3, "F");

  // Logo (if provided)
  let logoEndX = margin;
  if (data.brand?.logoImageBase64) {
    try {
      doc.addImage(data.brand.logoImageBase64, "PNG", margin, 12, 36, 36);
      logoEndX = margin + 46;
    } catch {
      // Logo failed — continue without it
    }
  }

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  setColor(C.white);
  doc.text("YOUR COVERAGE SUMMARY", logoEndX, 32);

  // Subtitle (named insured)
  if (namedInsured) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    setColor(C.textLight);
    doc.text(namedInsured, logoEndX, 46);
  }

  // Company name (right-aligned)
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(C.textLight);
  doc.text(companyName, pageWidth - margin, 32, { align: "right" });
  doc.text(generatedAt, pageWidth - margin, 46, { align: "right" });

  y = 78;

  // ════════════════════════════════════════════
  // 2. COVERAGE AT A GLANCE (intro box)
  // ════════════════════════════════════════════
  checkPage(90);

  // Build friendly intro sentences
  const depLabel =
    depMethod === "RCV"
      ? "replacement cost value (RCV)"
      : depMethod === "ACV"
        ? "actual cash value (ACV)"
        : depMethod === "MODIFIED_ACV"
          ? "modified actual cash value"
          : "coverage";

  const primaryDeductible = deductibles[0] || null;
  let deductibleSentence = "";
  if (primaryDeductible) {
    let amt = primaryDeductible.amount || "";
    if (
      primaryDeductible.dollarAmount &&
      amt.includes("%")
    ) {
      amt += ` (approximately $${primaryDeductible.dollarAmount.toLocaleString()})`;
    }
    deductibleSentence = amt
      ? `Your deductible is ${amt}.`
      : "";
  }

  const addressLine = propertyAddress
    ? ` for your property at ${propertyAddress}`
    : "";

  const glanceParagraph = [
    `Your ${carrier} policy provides ${depLabel} coverage${addressLine}.`,
    deductibleSentence,
    depMethod === "RCV"
      ? "This means your insurance covers the full cost to replace damaged property, not just its current value."
      : depMethod === "ACV"
        ? "This means your insurance pays the current (depreciated) value of damaged property. You may be responsible for the difference between that amount and the actual repair cost."
        : "",
  ]
    .filter(Boolean)
    .join(" ");

  setFill(C.bgBlue);
  setDraw(accentColor);
  doc.setLineWidth(1);

  const glanceLines = doc.splitTextToSize(glanceParagraph, contentWidth - 30);
  const glanceBoxH = glanceLines.length * 14 + 28;
  doc.roundedRect(margin, y, contentWidth, glanceBoxH, 4, 4, "FD");

  // Left accent bar on box
  setFill(accentColor);
  doc.rect(margin, y, 4, glanceBoxH, "F");

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  setColor(C.text);
  doc.text(glanceLines, margin + 16, y + 20);
  y += glanceBoxH + 18;

  // ════════════════════════════════════════════
  // 3. WHAT'S COVERED
  // ════════════════════════════════════════════
  if (coverages.length > 0) {
    checkPage(50);
    y = friendlySectionHeader(
      doc,
      "What's Covered",
      margin,
      y,
      contentWidth,
      C.green
    );

    coverages.forEach((cov) => {
      if (!cov) return;
      const labelText = cov.label || "";
      const limitText = cov.limit ? `  —  ${cov.limit}` : "";
      const descText = cov.description || "";

      checkPage(36);

      // Green left bar
      setFill(C.greenBar);
      doc.rect(margin, y - 4, 3, descText ? 26 : 16, "F");

      // Checkmark + label
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      setColor(C.green);
      doc.text("\u2713", margin + 9, y + 5);

      setColor(C.text);
      doc.text(labelText, margin + 22, y + 5);

      if (limitText) {
        setColor(C.textMuted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(limitText, margin + 22 + doc.getTextWidth(labelText) + 2, y + 5);
      }

      y += 14;

      if (descText) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        setColor(C.textMuted);
        const descLines = doc.splitTextToSize(descText, contentWidth - 34);
        doc.text(descLines, margin + 22, y);
        y += descLines.length * 13 + 4;
      }

      y += 5;
    });

    y += 6;
  }

  // ════════════════════════════════════════════
  // 4. WHAT'S NOT COVERED
  // ════════════════════════════════════════════
  if (exclusions.length > 0) {
    checkPage(50);
    y = friendlySectionHeader(
      doc,
      "What's Not Covered",
      margin,
      y,
      contentWidth,
      C.gray
    );

    // Intro line (soft framing)
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    setColor(C.textMuted);
    doc.text(
      "All insurance policies have limitations. Here is what your policy does not cover:",
      margin,
      y
    );
    y += 18;

    exclusions.forEach((ex) => {
      if (!ex) return;
      const name = ex.name || "";
      // Translate severity into friendly language — never show "CRITICAL" to homeowner
      const friendlyImpact = buildFriendlyImpact(ex.description, ex.impact);

      checkPage(40);

      // Soft gray bar
      setFill(C.grayBar);
      doc.rect(margin, y - 4, 3, friendlyImpact ? 26 : 14, "F");

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      setColor(C.text);
      doc.text(name, margin + 12, y + 4);
      y += 16;

      if (friendlyImpact) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        setColor(C.textMuted);
        const impLines = doc.splitTextToSize(friendlyImpact, contentWidth - 24);
        doc.text(impLines, margin + 12, y);
        y += impLines.length * 13 + 4;
      }

      y += 5;
    });

    y += 6;
  }

  // ════════════════════════════════════════════
  // 5. YOUR DEDUCTIBLE
  // ════════════════════════════════════════════
  if (deductibles.length > 0) {
    checkPage(90);
    y = friendlySectionHeader(
      doc,
      "Your Deductible",
      margin,
      y,
      contentWidth,
      accentColor
    );

    deductibles.forEach((ded) => {
      if (!ded) return;
      checkPage(70);

      let amountDisplay = ded.amount || "";
      if (ded.dollarAmount && ded.amount && ded.amount.includes("%")) {
        amountDisplay += ` (approximately $${ded.dollarAmount.toLocaleString()})`;
      }

      const dedType = ded.type || "";
      const appliesTo = ded.appliesTo || "";

      // Info box
      setFill(C.bgLight);
      setDraw(C.border);
      doc.setLineWidth(0.5);

      const dedExplanation = buildDeductibleExplanation(
        ded.amount,
        ded.dollarAmount
      );
      const explLines = doc.splitTextToSize(dedExplanation, contentWidth - 40);
      const dedBoxH = 52 + explLines.length * 13;
      doc.roundedRect(margin, y, contentWidth, dedBoxH, 4, 4, "FD");

      // Amount (large)
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      setColor(C.blue);
      doc.text(amountDisplay, margin + 16, y + 26);

      if (dedType) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        setColor(C.textMuted);
        doc.text(dedType, margin + 16, y + 38);
      }

      if (appliesTo) {
        doc.setFontSize(9);
        setColor(C.textMuted);
        doc.text(`Applies to: ${appliesTo}`, margin + 16, y + 49);
      }

      // Explanation text
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      setColor(C.textMuted);
      doc.text(explLines, margin + 16, y + dedBoxH - explLines.length * 13 - 6);

      y += dedBoxH + 14;
    });

    y += 4;
  }

  // ════════════════════════════════════════════
  // 6. WHAT HAPPENS NEXT
  // ════════════════════════════════════════════
  checkPage(160);
  y = friendlySectionHeader(
    doc,
    "What Happens Next",
    margin,
    y,
    contentWidth,
    accentColor
  );

  const steps = [
    {
      n: "1",
      title: "We inspect your property",
      detail:
        "A trained inspector visits your home to document all storm or weather-related damage.",
    },
    {
      n: "2",
      title: "We work with your insurance company",
      detail:
        "We prepare a detailed report and submit it to your carrier on your behalf.",
    },
    {
      n: "3",
      title: "Your insurance company sends an adjuster",
      detail:
        "An adjuster reviews the damage and determines your claim payout based on your policy.",
    },
    {
      n: "4",
      title: "If approved, repairs begin",
      detail:
        "Once your claim is approved, we schedule your repairs at a time that works for you.",
    },
    {
      n: "5",
      title: "We handle everything",
      detail:
        "You just enjoy your new roof. We manage the paperwork, materials, and installation.",
    },
  ];

  steps.forEach((step) => {
    checkPage(52);

    // Circle step number
    setFill(accentColor);
    doc.circle(margin + 12, y + 8, 9, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    setColor(C.white);
    doc.text(step.n, margin + 12, y + 12, { align: "center" });

    // Step title
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    setColor(C.text);
    doc.text(step.title, margin + 28, y + 10);

    // Detail text
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    setColor(C.textMuted);
    const detailLines = doc.splitTextToSize(step.detail, contentWidth - 32);
    doc.text(detailLines, margin + 28, y + 22);

    y += 22 + detailLines.length * 13 + 6;
  });

  y += 10;

  // ════════════════════════════════════════════
  // 7. DISCLAIMER
  // ════════════════════════════════════════════
  checkPage(80);

  hRule(y, C.border);
  y += 14;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  setColor(C.textLight);
  doc.text("DISCLAIMER", margin, y);
  y += 12;

  const disclaimerText =
    data.brand?.disclaimer ||
    "This summary is for educational purposes only and does not constitute legal or insurance advice. " +
      "Coverage details are based on the policy documents provided and may not reflect all policy provisions. " +
      "Please consult your insurance agent or a licensed professional for specific coverage questions. " +
      (companyName !== "4Margin"
        ? `Prepared by ${companyName}. Powered by 4Margin.`
        : "Powered by 4Margin.");

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(C.textMuted);
  const disclaimerLines = doc.splitTextToSize(disclaimerText, contentWidth);
  doc.text(disclaimerLines, margin, y);
  y += disclaimerLines.length * 10 + 8;

  // Contact info (if provided)
  if (data.contractorPhone || data.contractorEmail) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    setColor(C.textMuted);
    const contactParts: string[] = [];
    if (data.contractorPhone) contactParts.push(data.contractorPhone);
    if (data.contractorEmail) contactParts.push(data.contractorEmail);
    doc.text(
      `Questions? Reach us: ${contactParts.join("  |  ")}`,
      margin,
      y
    );
  }

  // ════════════════════════════════════════════
  // 8. FOOTER on every page
  // ════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Thin accent line above footer
    setFill(primaryColor);
    doc.rect(0, pageHeight - 28, pageWidth, 28, "F");

    setFill(accentColor);
    doc.rect(0, pageHeight - 28, pageWidth, 2, "F");

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    setColor(C.textLight);

    const footerLeft =
      companyName !== "4Margin"
        ? `${companyName}  |  Powered by 4Margin`
        : "4Margin";

    doc.text(footerLeft, margin, pageHeight - 10);
    doc.text(
      `Page ${p} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 10,
      { align: "right" }
    );

    // Phone/email in footer center if provided
    if (data.contractorPhone || data.contractorEmail) {
      const contactParts: string[] = [];
      if (data.contractorPhone) contactParts.push(data.contractorPhone);
      if (data.contractorEmail) contactParts.push(data.contractorEmail);
      doc.text(
        contactParts.join("  |  "),
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    }
  }

  return doc.output("arraybuffer");
}

/* ─────── Internal helpers ─────── */

/**
 * Renders a friendly section header with colored left accent bar and separator.
 * Returns updated Y position.
 */
function friendlySectionHeader(
  doc: jsPDF,
  title: string,
  margin: number,
  y: number,
  contentWidth: number,
  color: [number, number, number]
): number {
  const setFill = (c: [number, number, number]) =>
    doc.setFillColor(c[0], c[1], c[2]);
  const setDraw = (c: [number, number, number]) =>
    doc.setDrawColor(c[0], c[1], c[2]);
  const setColor = (c: [number, number, number]) =>
    doc.setTextColor(c[0], c[1], c[2]);

  // Horizontal rule
  setDraw(C.border);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + contentWidth, y);
  y += 10;

  // Left accent bar
  setFill(color);
  doc.rect(margin, y, 4, 18, "F");

  // Title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  setColor(C.text);
  doc.text(title, margin + 14, y + 13);
  y += 28;

  return y;
}

/**
 * Converts raw exclusion fields into a plain-English homeowner-friendly sentence.
 * Avoids showing the raw "impact" field which often contains technical/legal language.
 */
function buildFriendlyImpact(
  description?: string | null,
  impact?: string | null
): string {
  // Prefer description (usually more explanatory) over raw impact
  const base = description || impact || "";
  if (!base) return "";

  // Strip any uppercase severity words that sneak in
  return base
    .replace(/\b(CRITICAL|WARNING|INFO)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Builds a plain-English explanation of what the deductible means.
 */
function buildDeductibleExplanation(
  amount?: string | null,
  dollarAmount?: number | null
): string {
  if (!amount) {
    return "This is the amount you pay out of pocket before your insurance covers the rest of an approved claim.";
  }

  const isPercent = amount.includes("%");

  if (isPercent && dollarAmount) {
    return (
      `Your deductible is a percentage of your home's insured value. ` +
      `Based on your policy, this works out to approximately $${dollarAmount.toLocaleString()}. ` +
      `This is the amount you pay before insurance covers the rest.`
    );
  }

  if (isPercent) {
    return (
      `Your deductible is a percentage of your home's insured value. ` +
      `This is the amount you pay before insurance covers the rest.`
    );
  }

  return (
    `Your deductible is ${amount}. ` +
    `This is the amount you pay out of pocket before your insurance covers the rest of an approved claim.`
  );
}
