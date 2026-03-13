// apps/contractor/src/types/job.ts

export type JobType = 'insurance' | 'retail' | 'hybrid' | 'repair';

export type JobStatus =
  | 'lead'
  | 'qualified'
  | 'inspected'
  | 'claim_filed'
  | 'adjuster_scheduled'
  | 'estimate_received'
  | 'supplement_sent'
  | 'revised_estimate'
  | 'approved'
  | 'sold'
  | 'materials_ordered'
  | 'work_scheduled'
  | 'in_progress'
  | 'install_complete'
  | 'depreciation_collected'
  | 'closed_won'
  | 'closed_lost';

export type LeadSource =
  | 'door_knock'
  | 'referral'
  | 'inbound_call'
  | 'website'
  | 'dc_lead'
  | 'other';

export interface InsuranceData {
  carrier_id?: string;
  claim_number?: string;
  policy_number?: string;
  date_of_loss?: string;
  adjuster_name?: string;
  adjuster_email?: string;
  adjuster_phone?: string;
  damage_type?: string;
  roof_type?: string;
}

export interface JobFinancials {
  estimate_amount?: number;
  supplement_requested?: number;
  supplement_approved?: number;
  approved_amount?: number;
  depreciation_total?: number;
  depreciation_recoverable?: number;
  depreciation_collected?: number;
  deductible_amount?: number;
  contract_price?: number;
  material_cost?: number;
  labor_cost?: number;
}

export interface JobMetadata {
  gutters_nailed_through_drip_edge?: string;
  roof_under_warranty?: string;
  pre_existing_conditions?: string;
  description?: string;
  adjuster_scope_notes?: string;
  items_believed_missing?: string;
  prior_supplement_history?: string;
  notes?: string;
}

export interface Job {
  id: string;
  company_id: string;
  created_by: string | null;
  assigned_to: string | null;

  // Core
  job_type: JobType;
  job_status: JobStatus;
  source: LeadSource | null;

  // Property
  property_address: string;
  property_city: string | null;
  property_state: string | null;
  property_zip: string | null;

  // Homeowner
  homeowner_name: string | null;
  homeowner_phone: string | null;
  homeowner_email: string | null;

  // JSONB buckets
  insurance_data: InsuranceData;
  financials: JobFinancials;
  job_metadata: JobMetadata;

  // Measurements (typed columns from EV migrations)
  waste_percent: number | null;
  suggested_squares: number | null;
  ft_ridges: number | null;
  ft_hips: number | null;
  ft_valleys: number | null;
  ft_rakes: number | null;
  ft_eaves: number | null;
  ft_drip_edge: number | null;
  ft_flashing: number | null;
  ft_step_flashing: number | null;
  steep_squares: number | null;
  high_story_squares: number | null;
  pitch_breakdown: unknown | null;
  structure_complexity: string | null;
  total_roof_area: number | null;
  accessories: string | null;

  // Timestamps
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

// Status transitions — defines which statuses can move to which
export const JOB_STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  lead: ['qualified', 'inspected', 'claim_filed', 'closed_lost'],
  qualified: ['inspected', 'claim_filed', 'closed_lost'],
  inspected: ['claim_filed', 'sold', 'closed_lost'],
  claim_filed: ['adjuster_scheduled', 'estimate_received', 'closed_lost'],
  adjuster_scheduled: ['estimate_received', 'closed_lost'],
  estimate_received: ['supplement_sent', 'approved', 'closed_lost'],
  supplement_sent: ['revised_estimate', 'approved', 'closed_lost'],
  revised_estimate: ['supplement_sent', 'approved', 'closed_lost'],
  approved: ['sold', 'closed_lost'],
  sold: ['materials_ordered', 'work_scheduled', 'closed_lost'],
  materials_ordered: ['work_scheduled', 'in_progress'],
  work_scheduled: ['in_progress'],
  in_progress: ['install_complete'],
  install_complete: ['depreciation_collected', 'closed_won'],
  depreciation_collected: ['closed_won'],
  closed_won: [],
  closed_lost: [],
};

// Pipeline stage labels for display
export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  inspected: 'Inspected',
  claim_filed: 'Claim Filed',
  adjuster_scheduled: 'Adjuster Scheduled',
  estimate_received: 'Estimate Received',
  supplement_sent: 'Supplement Sent',
  revised_estimate: 'Revised Estimate',
  approved: 'Approved',
  sold: 'Sold',
  materials_ordered: 'Materials Ordered',
  work_scheduled: 'Work Scheduled',
  in_progress: 'In Progress',
  install_complete: 'Install Complete',
  depreciation_collected: 'Depreciation Collected',
  closed_won: 'Closed (Won)',
  closed_lost: 'Closed (Lost)',
};

// Insurance pipeline stages (in order)
export const INSURANCE_PIPELINE: JobStatus[] = [
  'lead', 'inspected', 'claim_filed', 'adjuster_scheduled',
  'estimate_received', 'supplement_sent', 'revised_estimate',
  'approved', 'sold', 'materials_ordered', 'work_scheduled',
  'in_progress', 'install_complete', 'depreciation_collected', 'closed_won',
];

// Retail pipeline stages (in order)
export const RETAIL_PIPELINE: JobStatus[] = [
  'lead', 'inspected', 'sold', 'materials_ordered',
  'work_scheduled', 'in_progress', 'install_complete', 'closed_won',
];
