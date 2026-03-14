'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { InlineEditField } from '@/components/shared/inline-edit-field';
import { StageProgressTracker } from '@/components/jobs/stage-progress-tracker';
import type { Job, JobStatus, JobType, LeadSource } from '@/types/job';
import { JOB_STATUS_LABELS, JOB_STATUS_TRANSITIONS } from '@/types/job';

interface ServiceStatus {
  inspection: string | null;
  policyDecode: string | null;
  supplement: string | null;
  quote: string | null;
}

interface JobHeaderProps {
  job: Job;
  serviceStatus: ServiceStatus;
  onJobUpdate: (updates: Partial<Job>) => void;
}

const JOB_TYPE_BADGE: Record<JobType, { label: string; className: string }> = {
  insurance: { label: 'Insurance', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  retail: { label: 'Retail', className: 'bg-green-100 text-green-800 border-green-200' },
  hybrid: { label: 'Hybrid', className: 'bg-purple-100 text-purple-800 border-purple-200' },
  repair: { label: 'Repair', className: 'bg-orange-100 text-orange-800 border-orange-200' },
};

const SOURCE_LABELS: Record<LeadSource, string> = {
  door_knock: 'Door Knock',
  referral: 'Referral',
  inbound_call: 'Inbound Call',
  website: 'Website',
  dc_lead: 'DC Lead',
  other: 'Other',
};

export function JobHeader({ job, serviceStatus, onJobUpdate }: JobHeaderProps) {
  const [status, setStatus] = useState<JobStatus>(job.job_status);
  const [saving, setSaving] = useState(false);

  const typeBadge = JOB_TYPE_BADGE[job.job_type];
  const availableTransitions = JOB_STATUS_TRANSITIONS[status];
  const statusOptions: JobStatus[] = [status, ...availableTransitions];

  const handleStatusChange = async (newStatus: JobStatus) => {
    if (newStatus === status) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_status: newStatus }),
      });
      if (res.ok) {
        setStatus(newStatus);
        onJobUpdate({ job_status: newStatus });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFieldSave = async (field: keyof Job, value: string) => {
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) {
      onJobUpdate({ [field]: value } as Partial<Job>);
    }
  };

  return (
    <div className="sticky top-0 z-10 bg-background border-b shadow-sm px-6 py-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        {/* Left: address + badges */}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{job.property_address}</h1>
          {job.homeowner_name && (
            <p className="text-sm text-muted-foreground mt-0.5">{job.homeowner_name}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge className={typeBadge.className} variant="outline">
              {typeBadge.label}
            </Badge>
            {job.source && (
              <Badge variant="outline" className="text-xs">
                {SOURCE_LABELS[job.source]}
              </Badge>
            )}
          </div>
        </div>

        {/* Right: status dropdown + stage tracker */}
        <div className="flex flex-col items-end gap-3">
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value as JobStatus)}
            disabled={saving}
            className="text-sm border rounded-md px-3 py-1.5 bg-background hover:bg-accent transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {JOB_STATUS_LABELS[s]}
              </option>
            ))}
          </select>

          <StageProgressTracker
            jobId={job.id}
            jobType={job.job_type}
            serviceStatus={serviceStatus}
          />
        </div>
      </div>

      {/* Homeowner info row */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t text-sm flex-wrap">
        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Homeowner
        </span>
        <InlineEditField
          value={job.homeowner_name ?? ''}
          placeholder="Name"
          onSave={(v) => handleFieldSave('homeowner_name', v)}
          className="text-sm"
        />
        <span className="text-muted-foreground/40">|</span>
        <InlineEditField
          value={job.homeowner_phone ?? ''}
          placeholder="Phone"
          onSave={(v) => handleFieldSave('homeowner_phone', v)}
          className="text-sm"
        />
        <span className="text-muted-foreground/40">|</span>
        <InlineEditField
          value={job.homeowner_email ?? ''}
          placeholder="Email"
          onSave={(v) => handleFieldSave('homeowner_email', v)}
          className="text-sm"
        />
      </div>
    </div>
  );
}
