import jsPDF from 'jspdf';
import {
  createBrandedDocument,
  addBrandedHeader,
  addBrandedFooter,
  addSectionHeader,
  ensureSpace,
} from './template';
import type { DocumentBrand } from './template';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QuoteTier {
  label: string;
  manufacturer: string;
  product_line: string;
  subtotal: number;
  total: number;
}

export interface QuotePdfData {
  brand: DocumentBrand;
  propertyAddress: string;
  homeownerName: string;
  quoteDate: string;
  quoteNumber: string;

  tiers: {
    good: QuoteTier;
    better: QuoteTier;
    best: QuoteTier;
  };

  lineItems: string[]; // work included descriptions
  addOns: { description: string; price: number }[];
  discounts: { reason: string; amount: number }[];
}

// ---------------------------------------------------------------------------
// Currency formatter
// ---------------------------------------------------------------------------

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function formatCurrency(n: number): string {
  return usd.format(n);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addLabelValue(
  doc: jsPDF,
  y: number,
  label: string,
  value: string
): number {
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(label + ':', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(value, 60, y);
  return y + 6;
}

function addWrappedText(doc: jsPDF, y: number, text: string): number {
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const lines = doc.splitTextToSize(text, 170);
  doc.text(lines, 15, y);
  return y + lines.length * 4.5;
}

function addBulletItem(doc: jsPDF, y: number, text: string): number {
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const lines = doc.splitTextToSize(text, 163);
  doc.text('\u2022', 18, y);
  doc.text(lines, 24, y);
  return y + lines.length * 4.5 + 1;
}

// ---------------------------------------------------------------------------
// Tier renderer
// ---------------------------------------------------------------------------

function renderTier(
  doc: jsPDF,
  y: number,
  tier: QuoteTier,
  lineItems: string[],
  addOns: QuotePdfData['addOns'],
  discounts: QuotePdfData['discounts'],
  pageTitle: string,
  pageSubtitle: string
): number {
  const brand: DocumentBrand = (doc as any).__brand;
  const { primary, accent } = brand.colors;
  const pageWidth = doc.internal.pageSize.getWidth();

  // Tier header background bar
  y = ensureSpace(doc, y, 40, pageTitle, pageSubtitle);
  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.rect(15, y, pageWidth - 30, 9, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(tier.label.toUpperCase(), 19, y + 6);
  y += 13;

  // Manufacturer + product line
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`${tier.manufacturer} — ${tier.product_line}`, 15, y);
  y += 8;

  // Work Included
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Work Included:', 15, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  for (const item of lineItems) {
    y = ensureSpace(doc, y, 8, pageTitle, pageSubtitle);
    y = addBulletItem(doc, y, item);
  }
  y += 2;

  // Add-ons (if any)
  if (addOns.length > 0) {
    y = ensureSpace(doc, y, 10, pageTitle, pageSubtitle);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Additional Items:', 15, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    for (const addOn of addOns) {
      y = ensureSpace(doc, y, 6, pageTitle, pageSubtitle);
      doc.text(`\u2022 ${addOn.description}`, 18, y);
      doc.text(formatCurrency(addOn.price), pageWidth - 15, y, { align: 'right' });
      y += 5;
    }
    y += 2;
  }

  // Subtotal
  y = ensureSpace(doc, y, 10, pageTitle, pageSubtitle);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Subtotal', 15, y);
  doc.text(formatCurrency(tier.subtotal), pageWidth - 15, y, { align: 'right' });
  y += 6;

  // Discounts
  for (const discount of discounts) {
    y = ensureSpace(doc, y, 6, pageTitle, pageSubtitle);
    doc.setTextColor(34, 197, 94); // green
    doc.text(`Discount: ${discount.reason}`, 15, y);
    doc.text(`-${formatCurrency(discount.amount)}`, pageWidth - 15, y, { align: 'right' });
    y += 6;
  }

  // Total row
  y = ensureSpace(doc, y, 10, pageTitle, pageSubtitle);
  doc.setDrawColor(accent[0], accent[1], accent[2]);
  doc.setLineWidth(0.4);
  doc.line(15, y, pageWidth - 15, y);
  y += 5;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL', 15, y);
  doc.text(formatCurrency(tier.total), pageWidth - 15, y, { align: 'right' });
  y += 4;

  // Bottom border of tier section
  doc.setDrawColor(200, 210, 220);
  doc.setLineWidth(0.3);
  doc.line(15, y + 2, pageWidth - 15, y + 2);
  y += 10;

  return y;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function generateQuotePdf(data: QuotePdfData): ArrayBuffer {
  const doc = createBrandedDocument(data.brand);
  const pageTitle = 'ROOF REPLACEMENT QUOTE';
  const pageSubtitle = data.propertyAddress;

  // ── Page 1: Header + Property Info ────────────────────────────────────────
  let y = addBrandedHeader(doc, pageTitle, pageSubtitle);

  y = addSectionHeader(doc, y, 'Property Information');
  y = addLabelValue(doc, y, 'Property', data.propertyAddress);
  y = addLabelValue(doc, y, 'Homeowner', data.homeownerName || '—');
  y = addLabelValue(doc, y, 'Quote Date', data.quoteDate);
  y = addLabelValue(doc, y, 'Quote #', data.quoteNumber);
  y += 6;

  // ── Three-Tier Comparison ─────────────────────────────────────────────────
  y = ensureSpace(doc, y, 14, pageTitle, pageSubtitle);
  y = addSectionHeader(doc, y, 'Three-Tier Proposal');

  const tierOrder: Array<keyof QuotePdfData['tiers']> = ['good', 'better', 'best'];
  for (const key of tierOrder) {
    y = renderTier(
      doc,
      y,
      data.tiers[key],
      data.lineItems,
      data.addOns,
      data.discounts,
      pageTitle,
      pageSubtitle
    );
  }

  // ── Terms ─────────────────────────────────────────────────────────────────
  y = ensureSpace(doc, y, 40, pageTitle, pageSubtitle);
  y = addSectionHeader(doc, y, 'Terms & Conditions');

  const terms = [
    'Quote valid for 30 days from the date above.',
    '50% deposit required to schedule the project.',
    'Balance due upon completion.',
  ];
  for (const term of terms) {
    y = ensureSpace(doc, y, 8, pageTitle, pageSubtitle);
    y = addBulletItem(doc, y, term);
  }
  y += 4;

  // ── Disclaimer ────────────────────────────────────────────────────────────
  const pageHeight = doc.internal.pageSize.getHeight();
  y = ensureSpace(doc, y, 20, pageTitle, pageSubtitle);
  const disclaimer =
    data.brand.disclaimer ||
    'This quote is for educational and informational purposes only. Prices are estimates and subject to change upon final measurement and material confirmation. This document does not constitute a binding contract. A formal contract will be provided upon project acceptance.';
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text(disclaimer, 15, Math.min(y, pageHeight - 25), { maxWidth: 180 });
  doc.setTextColor(15, 23, 42);

  // ── Footers on every page ────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addBrandedFooter(doc, i, totalPages);
  }

  return doc.output('arraybuffer');
}
