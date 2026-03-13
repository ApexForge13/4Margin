export { generateDecoderPdf } from "./decoder-pdf";
export type { DecoderPdfData } from "./decoder-pdf";

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
