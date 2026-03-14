export { generateDecoderPdf } from "./decoder-pdf";
export type { DecoderPdfData } from "./decoder-pdf";

export { generateHomeownerDecodePdf } from "./homeowner-decode-pdf";
export type { HomeownerDecodePdfData } from "./homeowner-decode-pdf";

export { generateContractorDecodePdf } from "./contractor-decode-pdf";
export type { ContractorDecodePdfData, PolicyAnalysis } from "./contractor-decode-pdf";

export { extractBrandColors, brandColorsToHex, DEFAULT_BRAND } from "./brand-colors";
export type { BrandColors } from "./brand-colors";

export {
  createBrandedDocument,
  addBrandedHeader,
  addBrandedFooter,
  addSectionHeader,
  addBrandedPage,
  ensureSpace,
  FALLBACK_BRAND,
} from "./template";
export type { DocumentBrand } from "./template";

export { generateInspectionPdf } from "./inspection-pdf";
export type { InspectionPdfData } from "./inspection-pdf";
