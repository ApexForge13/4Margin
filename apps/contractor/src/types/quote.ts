export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined';

export interface TierConfig {
  label: string;
  manufacturer: string;
  product_line: string;
  price_per_square: number;
}

export interface TierCalculated extends TierConfig {
  subtotal: number;
  total: number;
}

export interface QuoteAddOn {
  description: string;
  price: number;
}

export interface QuoteDiscount {
  type: '$' | '%';
  amount: number;
  reason: string;
}

export interface Quote {
  id: string;
  company_id: string;
  job_id: string | null;
  created_by: string;
  status: QuoteStatus;
  total_squares: number | null;
  good_tier: TierCalculated;
  better_tier: TierCalculated;
  best_tier: TierCalculated;
  add_ons: QuoteAddOn[];
  discounts: QuoteDiscount[];
  line_items: { description: string }[];
  selected_tier: 'good' | 'better' | 'best' | null;
  quote_pdf_url: string | null;
  homeowner_name: string | null;
  created_at: string;
  updated_at: string;
}

export const EMPTY_TIER: TierCalculated = {
  label: '',
  manufacturer: '',
  product_line: '',
  price_per_square: 0,
  subtotal: 0,
  total: 0,
};
