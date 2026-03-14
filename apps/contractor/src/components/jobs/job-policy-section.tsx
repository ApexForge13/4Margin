'use client';

import Link from 'next/link';
import { Shield } from 'lucide-react';
import { CollapsibleSection } from '@/components/shared/collapsible-section';
import { ServiceCTA } from '@/components/shared/service-cta';
import { Badge } from '@/components/ui/badge';
import type { JobType } from '@/types/job';

interface PolicyDecoding {
  id: string;
  created_at: string;
  overall_rating: string | null;
}

interface JobPolicySectionProps {
  jobId: string;
  jobType: JobType;
  policyDecodings: PolicyDecoding[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const RATING_STYLES: Record<string, string> = {
  favorable: 'bg-green-100 text-green-800 border-green-200',
  neutral: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  unfavorable: 'bg-red-100 text-red-800 border-red-200',
};

export function JobPolicySection({ jobId, jobType, policyDecodings }: JobPolicySectionProps) {
  const isRetail = jobType === 'retail';
  const latest = policyDecodings[0] ?? null;

  return (
    <CollapsibleSection
      title="Policy Decode"
      icon={<Shield className="h-4 w-4 text-muted-foreground" />}
      badge={
        policyDecodings.length > 0 ? (
          <Badge variant="secondary" className="text-xs">
            {policyDecodings.length}
          </Badge>
        ) : undefined
      }
      defaultOpen={!latest && !isRetail}
    >
      {isRetail ? (
        <ServiceCTA
          icon={<Shield className="h-8 w-8" />}
          message="Policy decode not applicable for retail jobs."
          actionLabel="Start Policy Decode"
          href={`/dashboard/policies/new?jobId=${jobId}`}
          greyedOut
        />
      ) : !latest ? (
        <ServiceCTA
          icon={<Shield className="h-8 w-8" />}
          message="No policy decoded for this job."
          actionLabel="Start Policy Decode"
          href={`/dashboard/policies/new?jobId=${jobId}`}
        />
      ) : (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{formatDate(latest.created_at)}</span>
            {latest.overall_rating && (
              <Badge
                variant="outline"
                className={`capitalize ${RATING_STYLES[latest.overall_rating] ?? ''}`}
              >
                {latest.overall_rating}
              </Badge>
            )}
          </div>
          <Link
            href={`/dashboard/policies/${latest.id}`}
            className="text-sm text-primary hover:underline font-medium"
          >
            View Decode
          </Link>
        </div>
      )}
    </CollapsibleSection>
  );
}
