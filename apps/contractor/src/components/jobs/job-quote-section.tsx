'use client';

import Link from 'next/link';
import { Calculator } from 'lucide-react';
import { CollapsibleSection } from '@/components/shared/collapsible-section';
import { ServiceCTA } from '@/components/shared/service-cta';
import { Badge } from '@/components/ui/badge';

interface Quote {
  id: string;
  status: string;
  created_at: string;
}

interface JobQuoteSectionProps {
  jobId: string;
  quotes: Quote[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function JobQuoteSection({ jobId, quotes }: JobQuoteSectionProps) {
  const latest = quotes[0] ?? null;

  return (
    <CollapsibleSection
      title="Quote"
      icon={<Calculator className="h-4 w-4 text-muted-foreground" />}
      badge={
        quotes.length > 0 ? (
          <Badge variant="secondary" className="text-xs">
            {quotes.length}
          </Badge>
        ) : undefined
      }
      defaultOpen={!latest}
    >
      {!latest ? (
        <ServiceCTA
          icon={<Calculator className="h-8 w-8" />}
          message="No quote generated for this job."
          actionLabel="Generate Quote"
          href={`/dashboard/quotes/new?jobId=${jobId}`}
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
            href={`/dashboard/quotes/${latest.id}`}
            className="text-sm text-primary hover:underline font-medium"
          >
            View Quote
          </Link>
        </div>
      )}
    </CollapsibleSection>
  );
}
