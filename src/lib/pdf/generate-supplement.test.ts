import { describe, it, expect } from "vitest";
import { generateSupplementPdf, type SupplementPdfData } from "./generate-supplement";

const basePdfData: SupplementPdfData = {
  companyName: "Acme Roofing LLC",
  companyPhone: "(555) 123-4567",
  companyAddress: "100 Main St, Dallas, TX 75201",
  companyLicense: "TX-12345",
  claimName: "Smith Residence — Hail Damage",
  claimNumber: "CLM-2024-0042",
  policyNumber: "POL-889900",
  carrierName: "State Farm",
  propertyAddress: "456 Oak Ave, Plano, TX 75024",
  dateOfLoss: "January 15, 2024",
  adjusterName: "Mike Johnson",
  adjusterTotal: 8500,
  supplementTotal: 4250,
  measuredSquares: 32,
  wastePercent: 15,
  suggestedSquares: 37,
  pitch: "6/12",
  items: [
    {
      xactimate_code: "RFG LAMI",
      description: "Laminated shingle roofing - 30 yr",
      category: "Roofing",
      quantity: 5,
      unit: "SQ",
      unit_price: 425,
      total_price: 2125,
      justification: "Adjuster underscoped the amount of shingle squares required per EagleView measurements.",
      irc_reference: "IRC R905.2",
    },
    {
      xactimate_code: "RFG FELT",
      description: "Felt underlayment - 15 lb",
      category: "Roofing",
      quantity: 5,
      unit: "SQ",
      unit_price: 85,
      total_price: 425,
      justification: "Underlayment required per manufacturer specifications.",
      irc_reference: "IRC R905.1.1",
    },
    {
      xactimate_code: "RFG ICE",
      description: "Ice & water shield",
      category: "Roofing",
      quantity: 3,
      unit: "SQ",
      unit_price: 175,
      total_price: 525,
      justification: "Ice and water shield required at eaves in cold climates per IRC.",
      irc_reference: "IRC R905.1.2",
    },
    {
      xactimate_code: "DRY CLN",
      description: "Drywall - remove & replace",
      category: "Interior",
      quantity: 50,
      unit: "SF",
      unit_price: 23.5,
      total_price: 1175,
      justification: "Interior water damage from roof leak.",
      irc_reference: "",
    },
  ],
  generatedDate: "February 23, 2026",
};

describe("generateSupplementPdf", () => {
  it("generates a valid PDF ArrayBuffer", () => {
    const result = generateSupplementPdf(basePdfData);
    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(result.byteLength).toBeGreaterThan(0);
  });

  it("produces a PDF that starts with the PDF magic bytes", () => {
    const result = generateSupplementPdf(basePdfData);
    const bytes = new Uint8Array(result);
    // PDF files start with %PDF
    const header = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    expect(header).toBe("%PDF");
  });

  it("handles empty items array", () => {
    const data = { ...basePdfData, items: [] };
    const result = generateSupplementPdf(data);
    expect(result.byteLength).toBeGreaterThan(0);
  });

  it("handles null adjuster total", () => {
    const data = { ...basePdfData, adjusterTotal: null };
    const result = generateSupplementPdf(data);
    expect(result.byteLength).toBeGreaterThan(0);
  });

  it("handles empty company info", () => {
    const data = {
      ...basePdfData,
      companyName: "",
      companyPhone: "",
      companyAddress: "",
      companyLicense: "",
    };
    const result = generateSupplementPdf(data);
    expect(result.byteLength).toBeGreaterThan(0);
  });

  it("generates larger PDFs for more items", () => {
    const manyItems = Array.from({ length: 20 }, (_, i) => ({
      xactimate_code: `CODE-${i}`,
      description: `Line item description ${i}`,
      category: i < 10 ? "Roofing" : "Interior",
      quantity: 5 + i,
      unit: "SQ",
      unit_price: 100 + i * 10,
      total_price: (5 + i) * (100 + i * 10),
      justification: `Detailed justification for line item ${i} based on measurements.`,
      irc_reference: `IRC R${900 + i}`,
    }));

    const smallResult = generateSupplementPdf(basePdfData);
    const largeResult = generateSupplementPdf({
      ...basePdfData,
      items: manyItems,
    });

    expect(largeResult.byteLength).toBeGreaterThan(smallResult.byteLength);
  });
});
