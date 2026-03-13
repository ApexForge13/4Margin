import { SupabaseClient } from '@supabase/supabase-js';

interface MatchCriteria {
  companyId: string;
  propertyAddress?: string;
  propertyCity?: string;
  propertyState?: string;
  propertyZip?: string;
  claimNumber?: string;
  homeownerName?: string;
}

interface MatchResult {
  matched: boolean;
  jobId: string | null;
  confidence: 'exact' | 'fuzzy' | null;
  matchType: 'address' | 'claim_number' | 'homeowner' | null;
}

/**
 * Attempts to match incoming data to an existing Job.
 * Priority: claim number > exact address > fuzzy homeowner + address
 */
export async function findMatchingJob(
  supabase: SupabaseClient,
  criteria: MatchCriteria
): Promise<MatchResult> {
  const noMatch: MatchResult = { matched: false, jobId: null, confidence: null, matchType: null };

  // 1. Claim number match (most specific)
  if (criteria.claimNumber?.trim()) {
    const { data } = await supabase
      .from('jobs')
      .select('id')
      .eq('company_id', criteria.companyId)
      .contains('insurance_data', { claim_number: criteria.claimNumber.trim() })
      .is('archived_at', null)
      .limit(1)
      .single();

    if (data) {
      return { matched: true, jobId: data.id, confidence: 'exact', matchType: 'claim_number' };
    }
  }

  // 2. Exact address match
  if (criteria.propertyAddress?.trim()) {
    const normalized = normalizeAddress(criteria.propertyAddress);
    const { data } = await supabase
      .from('jobs')
      .select('id')
      .eq('company_id', criteria.companyId)
      .eq('property_address', normalized)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      return { matched: true, jobId: data.id, confidence: 'exact', matchType: 'address' };
    }
  }

  return noMatch;
}

/**
 * Normalize address for matching. Basic normalization:
 * trim, lowercase, collapse whitespace, standardize abbreviations.
 */
export function normalizeAddress(address: string): string {
  return address
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\bstreet\b/g, 'st')
    .replace(/\bavenue\b/g, 'ave')
    .replace(/\bdrive\b/g, 'dr')
    .replace(/\broad\b/g, 'rd')
    .replace(/\bboulevard\b/g, 'blvd')
    .replace(/\blane\b/g, 'ln')
    .replace(/\bcourt\b/g, 'ct')
    .replace(/\bplace\b/g, 'pl')
    .replace(/\bapartment\b/g, 'apt')
    .replace(/\bsuite\b/g, 'ste')
    .replace(/\bnorth\b/g, 'n')
    .replace(/\bsouth\b/g, 's')
    .replace(/\beast\b/g, 'e')
    .replace(/\bwest\b/g, 'w');
}
