'use client';

import { useState } from 'react';
import { JobHeader } from '@/components/jobs/job-header';
import { JobInfoSection } from '@/components/jobs/job-info-section';
import { JobInspectionSection } from '@/components/jobs/job-inspection-section';
import { JobPolicySection } from '@/components/jobs/job-policy-section';
import { JobSupplementSection } from '@/components/jobs/job-supplement-section';
import { JobQuoteSection } from '@/components/jobs/job-quote-section';
import { JobDocumentsSection } from '@/components/jobs/job-documents-section';
import { JobActivityLog } from '@/components/jobs/job-activity-log';
import type { Job } from '@/types/job';

interface Inspection {
  id: string;
  status: string;
  created_at: string;
}

interface PolicyDecoding {
  id: string;
  created_at: string;
  overall_rating: string | null;
}

interface Supplement {
  id: string;
  status: string;
  supplement_total: number | null;
  created_at: string;
}

interface Quote {
  id: string;
  status: string;
  created_at: string;
}

interface Document {
  id: string;
  name: string;
  file_name: string;
  file_size: number | null;
  created_at: string;
}

interface ActivityEntry {
  id: string;
  action: string;
  description: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

interface JobDetailClientProps {
  job: Job;
  inspections: Inspection[];
  policyDecodings: PolicyDecoding[];
  supplements: Supplement[];
  quotes: Quote[];
  activities: ActivityEntry[];
  documents: Document[];
}

export function JobDetailClient({
  job: initialJob,
  inspections,
  policyDecodings,
  supplements,
  quotes,
  activities,
  documents,
}: JobDetailClientProps) {
  const [job, setJob] = useState<Job>(initialJob);

  function handleJobUpdate(updates: Partial<Job>) {
    setJob((prev) => ({ ...prev, ...updates }));
  }

  // Derive service status IDs for the stage progress tracker
  const serviceStatus = {
    inspection: inspections[0]?.id ?? null,
    policyDecode: policyDecodings[0]?.id ?? null,
    supplement: supplements[0]?.id ?? null,
    quote: quotes[0]?.id ?? null,
  };

  return (
    <div className="min-h-screen bg-background">
      <JobHeader
        job={job}
        serviceStatus={serviceStatus}
        onJobUpdate={handleJobUpdate}
      />

      <div className="px-6 py-6 max-w-4xl mx-auto space-y-4">
        <JobInfoSection job={job} />

        <JobInspectionSection
          jobId={job.id}
          jobType={job.job_type}
          inspections={inspections}
        />

        <JobPolicySection
          jobId={job.id}
          jobType={job.job_type}
          policyDecodings={policyDecodings}
        />

        <JobSupplementSection
          jobId={job.id}
          jobType={job.job_type}
          supplements={supplements}
        />

        <JobQuoteSection jobId={job.id} quotes={quotes} />

        <JobDocumentsSection documents={documents} />

        <JobActivityLog activities={activities} />
      </div>
    </div>
  );
}
