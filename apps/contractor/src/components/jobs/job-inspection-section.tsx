'use client';

import Link from 'next/link';
import { ClipboardCheck } from 'lucide-react';
import { CollapsibleSection } from '@/components/shared/collapsible-section';
import { ServiceCTA } from '@/components/shared/service-cta';
import { Badge } from '@/components/ui/badge';
import type { JobType } from '@/types/job';

interface Inspection {
  id: string;
  status: string;
  created_at: string;
}

interface JobInspectionSectionProps {
  jobId: string;
  jobType: JobType;
  inspections: Inspection[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function JobInspectionSection({ jobId, jobType, inspections }: JobInspectionSectionProps) {
  const latest = inspections[0] ?? null;

  return (
    <CollapsibleSection
      title="Inspection"
      icon={<ClipboardCheck className="h-4 w-4 text-muted-foreground" />}
      badge={
        inspections.length > 0 ? (
          <Badge variant="secondary" className="text-xs">
            {inspections.length}
          </Badge>
        ) : undefined
      }
      defaultOpen={!latest}
    >
      {!latest ? (
        <ServiceCTA
          icon={<ClipboardCheck className="h-8 w-8" />}
          message="No inspection recorded for this job."
          actionLabel="Start Inspection"
          href={`/dashboard/inspections/new?jobId=${jobId}`}
        />
      ) : (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{formatDate(latest.created_at)}</span>
            <Badge variant="outline" className="capitalize">
              {latest.status.replace(/_/g, ' ')}
            </Badge>
          </div>
          <Link
            href={`/dashboard/inspections/${latest.id}`}
            className="text-sm text-primary hover:underline font-medium"
          >
            View Inspection
          </Link>
        </div>
      )}
    </CollapsibleSection>
  );
}
