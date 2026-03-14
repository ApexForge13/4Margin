'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';
import { CollapsibleSection } from '@/components/shared/collapsible-section';
import { ServiceCTA } from '@/components/shared/service-cta';
import { Badge } from '@/components/ui/badge';
import type { JobType } from '@/types/job';

interface Supplement {
  id: string;
  status: string;
  supplement_total: number | null;
  created_at: string;
}

interface JobSupplementSectionProps {
  jobId: string;
  jobType: JobType;
  supplements: Supplement[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  generating: 'bg-blue-100 text-blue-700',
  complete: 'bg-green-100 text-green-700',
  approved: 'bg-green-100 text-green-800',
  denied: 'bg-red-100 text-red-700',
};

export function JobSupplementSection({ jobId, jobType, supplements }: JobSupplementSectionProps) {
  const isRetail = jobType === 'retail';
  const latest = supplements[0] ?? null;

  return (
    <CollapsibleSection
      title="Supplement"
      icon={<FileText className="h-4 w-4 text-muted-foreground" />}
      badge={
        supplements.length > 0 ? (
          <Badge variant="secondary" className="text-xs">
            {supplements.length}
          </Badge>
        ) : undefined
      }
      defaultOpen={!latest && !isRetail}
    >
      {isRetail ? (
        <ServiceCTA
          icon={<FileText className="h-8 w-8" />}
          message="Supplements not applicable for retail jobs."
          actionLabel="Start Supplement"
          href={`/dashboard/supplements/new?jobId=${jobId}`}
          greyedOut
        />
      ) : !latest ? (
        <ServiceCTA
          icon={<FileText className="h-8 w-8" />}
          message="No supplement generated for this job."
          actionLabel="Start Supplement"
          href={`/dashboard/supplements/new?jobId=${jobId}`}
        />
      ) : (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{formatDate(latest.created_at)}</span>
            <div className="flex items-center gap-2">
              {latest.supplement_total != null && (
                <span className="font-semibold text-green-700">
                  {formatCurrency(latest.supplement_total)}
                </span>
              )}
              <Badge
                variant="outline"
                className={`capitalize ${STATUS_STYLES[latest.status] ?? ''}`}
              >
                {latest.status.replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>
          <Link
            href={`/dashboard/supplements/${latest.id}`}
            className="text-sm text-primary hover:underline font-medium"
          >
            View Supplement
          </Link>
        </div>
      )}
    </CollapsibleSection>
  );
}
