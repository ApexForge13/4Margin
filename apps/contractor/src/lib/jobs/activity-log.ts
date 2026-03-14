import { SupabaseClient } from '@supabase/supabase-js';
import type { ActivityAction } from '@/types/activity';

interface LogActivityInput {
  jobId: string;
  companyId: string;
  userId?: string;
  action: ActivityAction;
  description: string;
  metadata?: Record<string, unknown>;
}

export async function logActivity(
  supabase: SupabaseClient,
  input: LogActivityInput
): Promise<void> {
  const { error } = await supabase.from('job_activity_log').insert({
    job_id: input.jobId,
    company_id: input.companyId,
    user_id: input.userId || null,
    action: input.action,
    description: input.description,
    metadata: input.metadata || {},
  });
  if (error) {
    console.error('Failed to log activity:', error);
    // Non-blocking — don't throw, just log
  }
}

export async function getActivityLog(
  supabase: SupabaseClient,
  jobId: string,
  limit = 50
) {
  const { data, error } = await supabase
    .from('job_activity_log')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
