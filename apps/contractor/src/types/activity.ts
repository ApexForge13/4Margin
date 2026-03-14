export type ActivityAction =
  | 'job_created'
  | 'inspection_completed'
  | 'policy_decoded'
  | 'supplement_generated'
  | 'supplement_status_changed'
  | 'quote_generated'
  | 'quote_sent'
  | 'status_changed'
  | 'data_updated'
  | 'document_uploaded';

export interface ActivityLogEntry {
  id: string;
  job_id: string;
  company_id: string;
  user_id: string | null;
  action: ActivityAction;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}
