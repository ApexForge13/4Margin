'use client';

import { Briefcase } from 'lucide-react';
import { CollapsibleSection } from '@/components/shared/collapsible-section';
import type { Job } from '@/types/job';

interface JobInfoSectionProps {
  job: Job;
}

function LabelValue({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-muted-foreground w-40 shrink-0">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="pt-3 pb-1 border-t mt-3 first:border-t-0 first:pt-0 first:mt-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
    </div>
  );
}

function formatCurrency(value: number | undefined): string | null {
  if (value == null) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export function JobInfoSection({ job }: JobInfoSectionProps) {
  const ins = job.insurance_data ?? {};
  const fin = job.financials ?? {};
  const meta = job.job_metadata ?? {};

  const isInsurance = job.job_type === 'insurance' || job.job_type === 'hybrid';

  return (
    <CollapsibleSection
      title="Job Info"
      icon={<Briefcase className="h-4 w-4 text-muted-foreground" />}
      defaultOpen
    >
      <div className="space-y-1 pt-1">
        {/* Property Details */}
        <SectionDivider title="Property" />
        <LabelValue label="Address" value={job.property_address} />
        <LabelValue
          label="City / State / Zip"
          value={[job.property_city, job.property_state, job.property_zip]
            .filter(Boolean)
            .join(', ') || null}
        />

        {/* Insurance Data */}
        {isInsurance && (
          <>
            <SectionDivider title="Insurance" />
            <LabelValue label="Carrier" value={ins.carrier_id} />
            <LabelValue label="Claim Number" value={ins.claim_number} />
            <LabelValue label="Policy Number" value={ins.policy_number} />
            <LabelValue label="Date of Loss" value={ins.date_of_loss} />
            <LabelValue label="Damage Type" value={ins.damage_type} />
            <LabelValue label="Roof Type" value={ins.roof_type} />
            <LabelValue label="Adjuster Name" value={ins.adjuster_name} />
            <LabelValue label="Adjuster Email" value={ins.adjuster_email} />
            <LabelValue label="Adjuster Phone" value={ins.adjuster_phone} />
          </>
        )}

        {/* Job Metadata */}
        {(meta.gutters_nailed_through_drip_edge ||
          meta.roof_under_warranty ||
          meta.pre_existing_conditions ||
          meta.adjuster_scope_notes ||
          meta.items_believed_missing ||
          meta.prior_supplement_history ||
          meta.notes) && (
          <>
            <SectionDivider title="Intake & Notes" />
            <LabelValue
              label="Gutters through drip edge?"
              value={meta.gutters_nailed_through_drip_edge}
            />
            <LabelValue label="Roof under warranty?" value={meta.roof_under_warranty} />
            <LabelValue label="Pre-existing conditions" value={meta.pre_existing_conditions} />
            <LabelValue label="Adjuster scope notes" value={meta.adjuster_scope_notes} />
            <LabelValue label="Items believed missing" value={meta.items_believed_missing} />
            <LabelValue label="Prior supplement history" value={meta.prior_supplement_history} />
            <LabelValue label="General notes" value={meta.notes} />
          </>
        )}

        {/* Financial Summary */}
        {(fin.estimate_amount != null ||
          fin.supplement_requested != null ||
          fin.supplement_approved != null ||
          fin.deductible_amount != null ||
          fin.contract_price != null) && (
          <>
            <SectionDivider title="Financials" />
            <LabelValue label="Estimate Amount" value={formatCurrency(fin.estimate_amount)} />
            <LabelValue
              label="Supplement Requested"
              value={formatCurrency(fin.supplement_requested)}
            />
            <LabelValue
              label="Supplement Approved"
              value={formatCurrency(fin.supplement_approved)}
            />
            <LabelValue label="Deductible" value={formatCurrency(fin.deductible_amount)} />
            <LabelValue label="Contract Price" value={formatCurrency(fin.contract_price)} />
          </>
        )}
      </div>
    </CollapsibleSection>
  );
}
