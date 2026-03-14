import type { TierConfig } from './quote';

export interface CompanyPricing {
  id: string;
  company_id: string;
  good_tier: TierConfig;
  better_tier: TierConfig;
  best_tier: TierConfig;
  default_line_items: { description: string }[];
  addon_templates: { description: string; default_price: number }[];
  created_at: string;
  updated_at: string;
}

export const DEFAULT_LINE_ITEMS: { description: string }[] = [
  { description: 'Tear-off existing roofing system' },
  { description: 'Install synthetic underlayment' },
  { description: 'Install starter strip at eaves and rakes' },
  { description: 'Install shingles per manufacturer specifications' },
  { description: 'Install ridge cap ventilation' },
  { description: 'Install ice & water shield per local building code' },
  { description: 'Install drip edge at eaves and rakes' },
  { description: 'Replace pipe boots and penetration flashings' },
  { description: 'Replace step and counter flashing as needed' },
  { description: 'Final cleanup and debris haul-off' },
];
