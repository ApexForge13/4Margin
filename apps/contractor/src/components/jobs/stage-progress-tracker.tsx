'use client';

import Link from 'next/link';
import { Check, Minus, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JobType } from '@/types/job';

interface ServiceStatus {
  inspection: string | null;
  policyDecode: string | null;
  supplement: string | null;
  quote: string | null;
}

interface StageConfig {
  key: keyof ServiceStatus;
  label: string;
  newPath: string;
  detailPath: string;
  retailNA?: boolean;
}

const stages: StageConfig[] = [
  {
    key: 'inspection',
    label: 'Inspection',
    newPath: '/dashboard/inspections/new',
    detailPath: '/dashboard/inspections/',
  },
  {
    key: 'policyDecode',
    label: 'Policy Decode',
    newPath: '/dashboard/policies/new',
    detailPath: '/dashboard/policies/',
    retailNA: true,
  },
  {
    key: 'supplement',
    label: 'Supplement',
    newPath: '/dashboard/supplements/new',
    detailPath: '/dashboard/supplements/',
    retailNA: true,
  },
  {
    key: 'quote',
    label: 'Quote',
    newPath: '/dashboard/quotes/new',
    detailPath: '/dashboard/quotes/',
  },
];

interface StageProgressTrackerProps {
  jobId: string;
  jobType: JobType;
  serviceStatus: ServiceStatus;
}

export function StageProgressTracker({ jobId, jobType, serviceStatus }: StageProgressTrackerProps) {
  const isRetail = jobType === 'retail';

  return (
    <div className="flex items-center gap-1">
      {stages.map((stage, index) => {
        const statusValue = serviceStatus[stage.key];
        const isNA = isRetail && stage.retailNA;
        const isComplete = !!statusValue;

        return (
          <div key={stage.key} className="flex items-center">
            {index > 0 && (
              <div className={cn('w-6 h-px mx-1', isNA ? 'bg-muted' : 'bg-border')} />
            )}
            <div className="flex flex-col items-center gap-1">
              {isNA ? (
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted">
                  <Minus className="h-3 w-3 text-muted-foreground" />
                </div>
              ) : isComplete ? (
                <Link
                  href={`${stage.detailPath}${statusValue}`}
                  className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 hover:bg-green-200 transition-colors"
                  title={`View ${stage.label}`}
                >
                  <Check className="h-3 w-3 text-green-700" />
                </Link>
              ) : (
                <Link
                  href={`${stage.newPath}?jobId=${jobId}`}
                  className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-muted-foreground/30 hover:border-primary hover:bg-primary/5 transition-colors"
                  title={`Start ${stage.label}`}
                >
                  <Circle className="h-2 w-2 text-muted-foreground/30" />
                </Link>
              )}
              <span className={cn('text-[10px] leading-tight whitespace-nowrap', isNA ? 'text-muted-foreground/50' : isComplete ? 'text-green-700 font-medium' : 'text-muted-foreground')}>
                {stage.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
