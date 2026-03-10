/**
 * Evidence Appendix PDF Generator.
 *
 * Comprehensive per-item evidence document citing code authority,
 * manufacturer requirements, and jurisdiction data for each accepted
 * supplement line item. Replaces the old Justification PDF.
 */

import { jsPDF } from "jspdf";
import {
  getCodesForXactimateCode,
  ircSectionToUrl,
  type BuildingCode,
} from "@/data/building-codes";
import { getRequirementsForXactimateCode } from "@/data/manufacturers";
import type { ManufacturerRequirement } from "@/data/manufacturer-requirements";
import {
  lookupCountyByZip,
  type CountyJurisdiction,
} from "@/data/county-jurisdictions";

/* ─────── Brand Colors (match supplement PDF) ─────── */

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
  amber: [217, 119, 6] as [number, number, number],
  red: [220, 38, 38] as [number, number, number],
};

/* ─────── Types ─────── */

export interface EvidenceAppendixData {
  claimNumber: string;
  policyNumber: string;
  carrierName: string;
  propertyAddress: string;
  propertyState: string;
  propertyZip: string;
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
    confidence_score?: number;
    confidence_tier?: string;
  }>;
}

/* ─────── Helpers ─────── */

const fmt = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ICE_BARRIER_LABELS: Record<string, string> = {
  eaves_only: "Eaves only",
  eaves_valleys_penetrations: "Eaves, valleys & penetrations",
  eaves_valleys_penetrations_extended: "Eaves, valleys, penetrations (extended)",
};

const TIER_COLORS: Record<string, [number, number, number]> = {
  high: BRAND.green,
  good: BRAND.primaryDark,
  moderate: BRAND.amber,
  low: BRAND.red,
};

/* ─────── PDF Generation ─────── */

export function generateEvidenceAppendix(data: EvidenceAppendixData): ArrayBuffer {
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

  // Resolve jurisdiction data once
  const countyData = data.propertyZip ? lookupCountyByZip(data.propertyZip) : undefined;
  const propertyState = data.propertyState || countyData?.state || "MD";

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
  doc.text("Evidence Appendix", margin + 120, 44);

  doc.setFontSize(8);
  doc.text(data.generatedDate, pageWidth - margin, 44, { align: "right" });

  y = 90;

  // ── Title ──
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  setColor(BRAND.accent);
  doc.text("EVIDENCE APPENDIX", margin, y);
  y += 6;

  setDraw(BRAND.primary);
  doc.setLineWidth(2.5);
  doc.line(margin, y, margin + 200, y);
  y += 18;

  // Subtitle
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  setColor(BRAND.textMuted);
  const subtitle = "Per-item evidence citations: building code authority, manufacturer installation " +
    "requirements, and jurisdiction data supporting each supplement line item.";
  const subLines = doc.splitTextToSize(subtitle, contentWidth);
  doc.text(subLines, margin, y);
  y += subLines.length * 10 + 12;

  // ── Claim info strip ──
  setFill(BRAND.bgLight);
  setDraw(BRAND.border);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, 38, 3, 3, "FD");
  y += 14;

  doc.setFontSize(8);
  const stripFields = [
    ["Claim #", data.claimNumber || "\u2014"],
    ["Carrier", data.carrierName || "\u2014"],
    ["Property", data.propertyAddress || "\u2014"],
  ];

  const stripColW = contentWidth / 3;
  stripFields.forEach(([label, value], i) => {
    const x = margin + 12 + i * stripColW;
    doc.setFont("helvetica", "normal");
    setColor(BRAND.textMuted);
    doc.text(label, x, y);
    doc.setFont("helvetica", "bold");
    setColor(BRAND.text);
    const val = value.length > 32 ? value.substring(0, 30) + "..." : value;
    doc.text(val, x, y + 12);
  });

  y += 36;

  // ── Per-Item Evidence Sections ──
  data.items.forEach((item, idx) => {
    checkPage(100);

    // Item header bar
    setFill(BRAND.primary);
    doc.rect(margin, y - 4, 3, 16, "F");
    setFill(BRAND.bgAccent);
    doc.rect(margin + 3, y - 4, contentWidth - 3, 16, "F");

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    setColor(BRAND.accent);
    doc.text(`${idx + 1}.`, margin + 8, y + 6);

    doc.setFontSize(8);
    setColor(BRAND.primaryDark);
    doc.text(item.xactimate_code, margin + 22, y + 6);

    doc.setFont("helvetica", "normal");
    setColor(BRAND.text);
    const codeW = doc.getTextWidth(item.xactimate_code);
    const descText = `\u2014 ${item.description}`;
    const maxDescW = contentWidth - 100 - codeW;
    const truncDesc = doc.getTextWidth(descText) > maxDescW
      ? descText.substring(0, 60) + "..."
      : descText;
    doc.text(truncDesc, margin + 28 + codeW, y + 6);

    // Price + confidence tier
    doc.setFont("helvetica", "bold");
    setColor(BRAND.green);
    doc.text(fmt(item.total_price), pageWidth - margin - 4, y + 6, { align: "right" });
    y += 20;

    // Confidence badge
    if (item.confidence_tier) {
      const tier = item.confidence_tier.toUpperCase();
      const tierColor = TIER_COLORS[item.confidence_tier] || BRAND.textMuted;
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      setColor(tierColor);
      doc.text(`${tier} CONFIDENCE${item.confidence_score ? ` (${item.confidence_score}/100)` : ""}`, margin + 12, y);
      y += 10;
    }

    // ── Pillar 1: Code Authority ──
    const codes = getCodesForXactimateCode(item.xactimate_code, propertyState);
    if (codes.length > 0) {
      checkPage(60);
      drawPillarHeader(doc, margin, y, contentWidth, "\u00A7 CODE AUTHORITY");
      y += 16;

      for (const code of codes) {
        checkPage(50);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        setColor(BRAND.accent);
        doc.text(`IRC ${code.section} \u2014 ${code.title}`, margin + 16, y);
        y += 10;

        doc.setFont("helvetica", "normal");
        setColor(BRAND.text);
        const reqLines = doc.splitTextToSize(code.requirement, contentWidth - 36);
        doc.text(reqLines, margin + 16, y);
        y += reqLines.length * 9 + 4;

        // Typical objection + rebuttal
        if (code.typicalObjection) {
          checkPage(30);
          doc.setFontSize(7);
          doc.setFont("helvetica", "italic");
          setColor(BRAND.textMuted);
          doc.text(`Typical objection: "${code.typicalObjection}"`, margin + 16, y);
          y += 10;

          doc.setFont("helvetica", "bold");
          setColor(BRAND.primaryDark);
          const rebutLines = doc.splitTextToSize(`Rebuttal: ${code.rebuttal}`, contentWidth - 36);
          doc.text(rebutLines, margin + 16, y);
          y += rebutLines.length * 9 + 4;
        }

        // Link
        const ircUrl = ircSectionToUrl(code.section);
        if (ircUrl) {
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "normal");
          setColor(BRAND.primary);
          doc.textWithLink(`\u00A7 View IRC ${code.section} \u2014 ICC Digital Codes`, margin + 16, y, { url: ircUrl });
          y += 10;
        }

        y += 4;
      }
    }

    // ── Pillar 2: Manufacturer Requirements ──
    const mfrMatches = getRequirementsForXactimateCode(item.xactimate_code);
    if (mfrMatches.length > 0) {
      checkPage(60);
      drawPillarHeader(doc, margin, y, contentWidth, "\u25B8 MANUFACTURER REQUIREMENTS");
      y += 16;

      for (const { manufacturer, requirement: req } of mfrMatches) {
        checkPage(50);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        setColor(BRAND.accent);
        doc.text(`${manufacturer}: ${req.requirement}`, margin + 16, y);
        y += 10;

        doc.setFont("helvetica", "normal");
        setColor(BRAND.text);
        const descLines = doc.splitTextToSize(req.description, contentWidth - 36);
        doc.text(descLines, margin + 16, y);
        y += descLines.length * 9 + 4;

        // Warranty impact
        if (req.mandatoryForWarranty) {
          doc.setFontSize(7);
          doc.setFont("helvetica", "bold");
          setColor(BRAND.red);
          doc.text(`\u26A0 WARRANTY: ${req.warrantyImpact}`, margin + 16, y);
          y += 10;
        }

        // Objection + rebuttal
        if (req.typicalAdjusterObjection) {
          checkPage(30);
          doc.setFontSize(7);
          doc.setFont("helvetica", "italic");
          setColor(BRAND.textMuted);
          doc.text(`Typical objection: "${req.typicalAdjusterObjection}"`, margin + 16, y);
          y += 10;

          doc.setFont("helvetica", "bold");
          setColor(BRAND.primaryDark);
          const rebLines = doc.splitTextToSize(`Rebuttal: ${req.rebuttal}`, contentWidth - 36);
          doc.text(rebLines, margin + 16, y);
          y += rebLines.length * 9 + 4;
        }

        // Source link
        if (req.sourceUrl) {
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "normal");
          setColor(BRAND.primary);
          doc.textWithLink(`\u25B8 ${manufacturer} Installation Instructions`, margin + 16, y, { url: req.sourceUrl });
          y += 10;
        }

        y += 4;
      }
    }

    // ── Pillar 3: Jurisdiction ──
    if (countyData) {
      checkPage(50);
      drawPillarHeader(doc, margin, y, contentWidth, "\u2302 JURISDICTION");
      y += 16;

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      setColor(BRAND.text);

      const jurisdLines = [
        `County: ${countyData.county} County, ${countyData.state}`,
        `Climate Zone: ${countyData.climateZone}`,
        `Design Wind Speed: ${countyData.designWindSpeed} mph${countyData.highWindZone ? " (HIGH WIND ZONE)" : ""}`,
        `Ice Barrier: ${ICE_BARRIER_LABELS[countyData.iceBarrierRequirement] || countyData.iceBarrierRequirement}`,
        `Permits: ${countyData.permit.required ? "Required" : "Not required"} \u2014 ${countyData.permit.ahjName}`,
      ];

      for (const line of jurisdLines) {
        doc.text(line, margin + 16, y);
        y += 10;
      }

      if (countyData.localAmendments.length > 0) {
        y += 2;
        doc.setFontSize(7);
        doc.setFont("helvetica", "italic");
        setColor(BRAND.textMuted);
        for (const amendment of countyData.localAmendments) {
          checkPage(12);
          const amLines = doc.splitTextToSize(`\u2022 ${amendment}`, contentWidth - 36);
          doc.text(amLines, margin + 16, y);
          y += amLines.length * 9;
        }
      }

      if (countyData.permit.ahjUrl) {
        y += 4;
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");
        setColor(BRAND.primary);
        doc.textWithLink(`\u2302 ${countyData.county} County Permits & Inspections`, margin + 16, y, { url: countyData.permit.ahjUrl });
        y += 10;
      }

      y += 4;
    }

    // Item divider
    y += 6;
    setDraw(BRAND.border);
    doc.setLineWidth(0.5);
    doc.line(margin + 10, y, pageWidth - margin - 10, y);
    y += 16;
  });

  // ── Disclaimer ──
  checkPage(40);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "italic");
  setColor(BRAND.textMuted);
  const disclaimer = "This document is provided for informational and educational purposes only. " +
    "It does not constitute legal advice. All code citations reference the 2018 International Residential Code " +
    "as adopted by the applicable state jurisdiction. Verify current adoption status with local AHJ.";
  const discLines = doc.splitTextToSize(disclaimer, contentWidth);
  doc.text(discLines, margin, y);

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
    doc.text(`  |  Evidence Appendix  |  ${data.generatedDate}`, margin + 40, pageHeight - 18);

    setColor(BRAND.textMuted);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 18, { align: "right" });
  }

  return doc.output("arraybuffer");
}

/* ─────── Pillar Header Helper ─────── */

function drawPillarHeader(
  doc: jsPDF,
  margin: number,
  y: number,
  contentWidth: number,
  title: string,
) {
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin + 12, y - 3, contentWidth - 24, 14, 2, 2, "FD");
  doc.text(title, margin + 18, y + 7);
}
