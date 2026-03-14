import jsPDF from 'jspdf';
import {
  createBrandedDocument,
  addBrandedHeader,
  addBrandedFooter,
  addSectionHeader,
  ensureSpace,
} from './template';
import type { DocumentBrand } from './template';

export interface InspectionPdfData {
  brand: DocumentBrand;
  propertyAddress: string;
  propertyCity?: string;
  propertyState?: string;
  propertyZip?: string;
  inspectionDate: string;
  inspectorName: string;

  // Assessment data
  roofDetails: {
    approximate_squares: number | null;
    predominant_pitch: string;
    number_of_layers: number;
    shingle_type: string;
    structure_complexity: string;
  };
  damageObserved: {
    types: Array<{ type: string; severity: string }>;
    notes: string;
  };
  componentConditions: Record<string, string>; // key: component name, value: condition
  confidenceAnalysis: {
    level: string;
    notes: string;
  };
  generalNotes: string;

  // Photos (base64 encoded with metadata)
  photos: Array<{
    imageBase64: string;
    mimeType: string;
    category: string;
    subcategory?: string;
    caption?: string;
  }>;
}

export function generateInspectionPdf(data: InspectionPdfData): ArrayBuffer {
  const doc = createBrandedDocument(data.brand);
  const pageTitle = 'INSPECTION REPORT';
  const pageSubtitle = data.propertyAddress;

  // Page 1: Header + Property Info + Roof Details
  let y = addBrandedHeader(doc, pageTitle, pageSubtitle);

  // Property Info section
  y = addSectionHeader(doc, y, 'Property Information');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const address = [
    data.propertyAddress,
    data.propertyCity,
    data.propertyState,
    data.propertyZip,
  ]
    .filter(Boolean)
    .join(', ');
  y = addLabelValue(doc, y, 'Address', address);
  y = addLabelValue(doc, y, 'Inspection Date', data.inspectionDate);
  y = addLabelValue(doc, y, 'Inspector', data.inspectorName);
  y += 4;

  // Roof Details section
  y = ensureSpace(doc, y, 50, pageTitle, pageSubtitle);
  y = addSectionHeader(doc, y, 'Roof Details');
  y = addLabelValue(
    doc,
    y,
    'Approximate Squares',
    data.roofDetails.approximate_squares?.toString() ?? 'N/A'
  );
  y = addLabelValue(
    doc,
    y,
    'Predominant Pitch',
    data.roofDetails.predominant_pitch || 'N/A'
  );
  y = addLabelValue(
    doc,
    y,
    'Number of Layers',
    data.roofDetails.number_of_layers.toString()
  );
  y = addLabelValue(
    doc,
    y,
    'Shingle Type',
    data.roofDetails.shingle_type || 'N/A'
  );
  y = addLabelValue(
    doc,
    y,
    'Structure Complexity',
    data.roofDetails.structure_complexity || 'N/A'
  );
  y += 4;

  // Damage Assessment section
  y = ensureSpace(doc, y, 40, pageTitle, pageSubtitle);
  y = addSectionHeader(doc, y, 'Damage Assessment');

  if (data.damageObserved.types.length === 0) {
    doc.setFontSize(10);
    doc.text('No damage types recorded.', 15, y);
    y += 6;
  } else {
    for (const damage of data.damageObserved.types) {
      y = ensureSpace(doc, y, 8, pageTitle, pageSubtitle);
      const label = damage.type
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      y = addLabelValue(doc, y, label, `Severity: ${damage.severity}`);
    }
  }

  if (data.damageObserved.notes) {
    y = ensureSpace(doc, y, 15, pageTitle, pageSubtitle);
    y = addLabelValue(doc, y, 'Notes', '');
    y = addWrappedText(doc, y, data.damageObserved.notes);
    y += 2;
  }
  y += 4;

  // Component Condition Checklist (color-coded table)
  y = ensureSpace(doc, y, 80, pageTitle, pageSubtitle);
  y = addSectionHeader(doc, y, 'Component Condition');

  // Table header
  const colX = [15, 100]; // component name, condition
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Component', colX[0], y);
  doc.text('Condition', colX[1], y);
  y += 2;
  doc.setDrawColor(200, 200, 200);
  doc.line(15, y, 195, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  const conditionColors: Record<string, [number, number, number]> = {
    good: [34, 197, 94],
    fair: [234, 179, 8],
    poor: [249, 115, 22],
    needs_replacement: [239, 68, 68],
  };

  const componentLabels: Record<string, string> = {
    shingles: 'Shingles',
    ridge_cap: 'Ridge Cap',
    flashing: 'Flashing',
    pipe_boots: 'Pipe Boots',
    vents: 'Vents',
    gutters: 'Gutters',
    drip_edge: 'Drip Edge',
    skylights: 'Skylights',
    chimney: 'Chimney',
    soffit_fascia: 'Soffit & Fascia',
  };

  for (const [key, condition] of Object.entries(data.componentConditions)) {
    if (!condition) continue;
    y = ensureSpace(doc, y, 8, pageTitle, pageSubtitle);

    const label = componentLabels[key] ?? key;
    const condLabel = condition
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const color = conditionColors[condition] ?? ([100, 100, 100] as [number, number, number]);

    doc.setTextColor(15, 23, 42);
    doc.text(label, colX[0], y);

    // Color-coded condition badge
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(
      colX[1] - 1,
      y - 3.5,
      doc.getTextWidth(condLabel) + 4,
      5,
      1,
      1,
      'F'
    );
    doc.setTextColor(255, 255, 255);
    doc.text(condLabel, colX[1] + 1, y);
    doc.setTextColor(15, 23, 42);

    y += 7;
  }
  y += 4;

  // Confidence Analysis
  if (data.confidenceAnalysis.level) {
    y = ensureSpace(doc, y, 20, pageTitle, pageSubtitle);
    y = addSectionHeader(doc, y, 'Confidence Analysis');
    y = addLabelValue(
      doc,
      y,
      'Confidence Level',
      data.confidenceAnalysis.level.replace(/\b\w/g, (c) => c.toUpperCase())
    );
    if (data.confidenceAnalysis.notes) {
      y = addWrappedText(doc, y, data.confidenceAnalysis.notes);
    }
    y += 4;
  }

  // General Notes
  if (data.generalNotes) {
    y = ensureSpace(doc, y, 20, pageTitle, pageSubtitle);
    y = addSectionHeader(doc, y, 'General Notes');
    y = addWrappedText(doc, y, data.generalNotes);
    y += 4;
  }

  // Photos section (grouped by category)
  if (data.photos.length > 0) {
    const grouped = new Map<string, typeof data.photos>();
    for (const photo of data.photos) {
      const key = photo.category;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(photo);
    }

    const photoWidth = 85;
    const photoHeight = 60;

    for (const [category, categoryPhotos] of grouped) {
      y = ensureSpace(doc, y, 60, pageTitle, pageSubtitle);

      const catLabel = category
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      y = addSectionHeader(
        doc,
        y,
        `${catLabel} (${categoryPhotos.length})`
      );

      // 2 photos per row
      for (let i = 0; i < categoryPhotos.length; i += 2) {
        y = ensureSpace(doc, y, photoHeight + 15, pageTitle, pageSubtitle);

        for (let j = 0; j < 2 && i + j < categoryPhotos.length; j++) {
          const photo = categoryPhotos[i + j];
          const x = 15 + j * (photoWidth + 5);

          try {
            const format = photo.mimeType.includes('png') ? 'PNG' : 'JPEG';
            doc.addImage(photo.imageBase64, format, x, y, photoWidth, photoHeight);
          } catch {
            // Image failed to load — draw placeholder box
            doc.setDrawColor(200, 200, 200);
            doc.rect(x, y, photoWidth, photoHeight);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text('Image unavailable', x + 20, y + photoHeight / 2);
            doc.setTextColor(15, 23, 42);
          }

          // Caption below photo
          if (photo.caption) {
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(photo.caption, x, y + photoHeight + 4, {
              maxWidth: photoWidth,
            });
            doc.setTextColor(15, 23, 42);
          }
        }

        y += photoHeight + 10;
      }
    }
  }

  // Disclaimer — placed near bottom of last page
  const pageHeight = doc.internal.pageSize.getHeight();
  y = ensureSpace(doc, y, 25, pageTitle, pageSubtitle);
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  const disclaimer =
    data.brand.disclaimer ||
    'This inspection report is for educational and informational purposes only. It is not a professional engineering assessment, structural analysis, or guarantee of roof condition. Consult a licensed professional for definitive evaluations.';
  doc.text(disclaimer, 15, Math.min(y, pageHeight - 25), { maxWidth: 180 });
  doc.setTextColor(15, 23, 42);

  // Add footers to every page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addBrandedFooter(doc, i, totalPages);
  }

  return doc.output('arraybuffer');
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
  const lines = doc.splitTextToSize(text, 170);
  doc.text(lines, 15, y);
  return y + lines.length * 4.5;
}
