import jsPDF from 'jspdf';
import type { BrandColors } from './brand-colors';
import { DEFAULT_BRAND } from './brand-colors';

export interface DocumentBrand {
  companyName: string;
  logoImageBase64?: string; // PNG/JPG as base64
  colors: BrandColors;
  disclaimer?: string;
}

export const FALLBACK_BRAND: DocumentBrand = {
  companyName: '4Margin',
  colors: DEFAULT_BRAND,
};

/**
 * Creates a branded jsPDF document with standard header and footer.
 * All 4Margin PDFs use this as their base.
 */
export function createBrandedDocument(
  brand: DocumentBrand = FALLBACK_BRAND,
  options?: { orientation?: 'portrait' | 'landscape' }
): jsPDF {
  const doc = new jsPDF({
    orientation: options?.orientation || 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  // Store brand data for use by addHeader/addFooter
  (doc as any).__brand = brand;

  return doc;
}

/**
 * Add branded header to current page.
 * Call this at the top of each new page.
 * Returns the Y position below the header.
 */
export function addBrandedHeader(
  doc: jsPDF,
  title: string,
  subtitle?: string
): number {
  const brand: DocumentBrand = (doc as any).__brand || FALLBACK_BRAND;
  const pageWidth = doc.internal.pageSize.getWidth();
  const { primary } = brand.colors;

  // Header background bar
  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.rect(0, 0, pageWidth, 22, 'F');

  // Logo (if available)
  let textStartX = 15;
  if (brand.logoImageBase64) {
    try {
      doc.addImage(brand.logoImageBase64, 'PNG', 10, 3, 16, 16);
      textStartX = 30;
    } catch {
      // Logo failed to load, skip
    }
  }

  // Title text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), textStartX, 10);

  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, textStartX, 16);
  }

  // Company name (right-aligned)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(brand.companyName, pageWidth - 15, 10, { align: 'right' });

  // Reset text color
  doc.setTextColor(15, 23, 42);

  // Return Y position after header
  return 28;
}

/**
 * Add branded footer to current page.
 * Call this at the bottom of each page.
 */
export function addBrandedFooter(
  doc: jsPDF,
  pageNumber: number,
  totalPages?: number
): void {
  const brand: DocumentBrand = (doc as any).__brand || FALLBACK_BRAND;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const { accent } = brand.colors;

  // Thin accent line
  doc.setDrawColor(accent[0], accent[1], accent[2]);
  doc.setLineWidth(0.5);
  doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);

  // Footer text
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.setFont('helvetica', 'normal');

  const footerLeft = brand.companyName === '4Margin'
    ? '4Margin'
    : `${brand.companyName}  |  Powered by 4Margin`;
  doc.text(footerLeft, 15, pageHeight - 10);

  const pageText = totalPages
    ? `Page ${pageNumber} of ${totalPages}`
    : `Page ${pageNumber}`;
  doc.text(pageText, pageWidth - 15, pageHeight - 10, { align: 'right' });

  // Reset
  doc.setTextColor(15, 23, 42);
}

/**
 * Add a section header with accent-colored left bar.
 * Returns the Y position below the section header.
 */
export function addSectionHeader(
  doc: jsPDF,
  y: number,
  title: string,
  color?: [number, number, number]
): number {
  const brand: DocumentBrand = (doc as any).__brand || FALLBACK_BRAND;
  const barColor = color || brand.colors.accent;

  // Accent bar
  doc.setFillColor(barColor[0], barColor[1], barColor[2]);
  doc.rect(15, y, 3, 7, 'F');

  // Title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(title, 22, y + 5);

  return y + 12;
}

/**
 * Add a new page with branded header.
 * Returns the Y position below the header.
 */
export function addBrandedPage(
  doc: jsPDF,
  title: string,
  subtitle?: string
): number {
  doc.addPage();
  return addBrandedHeader(doc, title, subtitle);
}

/**
 * Check if we need a new page and add one if so.
 * Returns the current Y (unchanged if no new page needed, or post-header Y if new page added).
 */
export function ensureSpace(
  doc: jsPDF,
  y: number,
  needed: number,
  title: string,
  subtitle?: string
): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomMargin = 20; // footer space
  if (y + needed > pageHeight - bottomMargin) {
    return addBrandedPage(doc, title, subtitle);
  }
  return y;
}
