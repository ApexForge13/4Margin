/**
 * Advocacy Script PDF Generator — Homeowner-Facing Guide.
 *
 * Produces a branded PDF from the hoSections of an AdvocacyScript.
 * Designed for the homeowner to read — professional, plain-English,
 * no industry jargon.
 */

import { jsPDF } from "jspdf";
import type { AdvocacyScript } from "@/lib/ai/advocacy-prompt";

/* ─────── Colors ─────── */

const BRAND = {
  accent: [15, 23, 42] as [number, number, number],
  primary: [14, 165, 233] as [number, number, number],
  primaryDark: [2, 132, 199] as [number, number, number],
  text: [15, 23, 42] as [number, number, number],
  textMuted: [100, 116, 139] as [number, number, number],
  textLight: [148, 163, 184] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  bgLight: [248, 250, 252] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

/* ─────── Types ─────── */

export interface AdvocacyPdfData {
  script: AdvocacyScript;
  companyName: string;
  companyPhone: string;
  propertyAddress: string;
  carrierName: string;
  claimNumber: string;
  generatedDate: string;
}

/* ─────── PDF Generation ─────── */

export function generateAdvocacyPdf(data: AdvocacyPdfData): ArrayBuffer {
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

  const title = data.script.scenario === "pre_inspection"
    ? "YOUR UPCOMING INSPECTION"
    : "YOUR CLAIM RIGHTS";

  const subtitle = data.script.scenario === "pre_inspection"
    ? "A guide to help you prepare for your insurance inspection"
    : "Understanding your options after a claim decision";

  // ── Header ──
  setFill(BRAND.accent);
  doc.rect(0, 0, pageWidth, 72, "F");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  setColor(BRAND.white);
  doc.text("Prepared by Your Roofing Professional", margin, 30);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(BRAND.textLight);
  doc.text(data.companyName || "", margin, 44);
  doc.text(data.generatedDate, pageWidth - margin, 44, { align: "right" });

  y = 90;

  // ── Title ──
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  setColor(BRAND.accent);
  doc.text(title, margin, y);
  y += 8;

  setDraw(BRAND.primary);
  doc.setLineWidth(2.5);
  doc.line(margin, y, margin + 260, y);
  y += 18;

  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  setColor(BRAND.textMuted);
  const subLines = doc.splitTextToSize(subtitle, contentWidth);
  doc.text(subLines, margin, y);
  y += subLines.length * 11 + 12;

  // ── Claim info strip ──
  setFill(BRAND.bgLight);
  setDraw(BRAND.border);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, 32, 3, 3, "FD");
  y += 12;

  doc.setFontSize(8);
  const fields = [
    ["Carrier", data.carrierName || "\u2014"],
    ["Claim #", data.claimNumber || "\u2014"],
    ["Property", data.propertyAddress || "\u2014"],
  ];
  const colW = contentWidth / 3;
  fields.forEach(([label, value], i) => {
    const x = margin + 12 + i * colW;
    doc.setFont("helvetica", "normal");
    setColor(BRAND.textMuted);
    doc.text(label, x, y);
    doc.setFont("helvetica", "bold");
    setColor(BRAND.text);
    const val = value.length > 28 ? value.substring(0, 26) + "..." : value;
    doc.text(val, x, y + 10);
  });

  y += 32;

  // ── Content Sections ──
  for (const section of data.script.hoSections) {
    checkPage(60);

    // Section title
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    setColor(BRAND.primaryDark);
    doc.text(section.title, margin, y);
    y += 6;

    setDraw(BRAND.primary);
    doc.setLineWidth(1);
    doc.line(margin, y, margin + Math.min(doc.getTextWidth(section.title) * 1.4, 200), y);
    y += 14;

    // Section content
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    setColor(BRAND.text);
    const lines = doc.splitTextToSize(section.content, contentWidth);

    for (let i = 0; i < lines.length; i++) {
      checkPage(12);
      doc.text(lines[i], margin, y);
      y += 12;
    }

    y += 12;
  }

  // ── Disclaimer ──
  checkPage(50);
  y += 8;
  setFill(BRAND.bgLight);
  setDraw(BRAND.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 44, 3, 3, "FD");
  y += 14;

  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  setColor(BRAND.textMuted);
  const disclaimer = "IMPORTANT: This document is provided for informational and educational purposes only. " +
    "It does not constitute legal advice or create an attorney-client relationship. Insurance policies vary " +
    "and you should consult with a licensed public adjuster or attorney for advice specific to your situation.";
  const discLines = doc.splitTextToSize(disclaimer, contentWidth - 20);
  doc.text(discLines, margin + 10, y);

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
    doc.setFont("helvetica", "normal");
    setColor(BRAND.textLight);
    doc.text(`Prepared by ${data.companyName || "Your Contractor"}  |  ${data.generatedDate}`, margin, pageHeight - 18);

    setColor(BRAND.textMuted);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 18, { align: "right" });
  }

  return doc.output("arraybuffer");
}
