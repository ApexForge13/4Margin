'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Download,
  Mail,
  FileSearch,
  FileText,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

interface StepFinalizedProps {
  inspectionId: string;
  jobId: string;
  jobType: string;
  homeownerEmail: string | null;
}

export function StepFinalized({
  inspectionId,
  jobId,
  jobType,
  homeownerEmail,
}: StepFinalizedProps) {
  const [finalizing, setFinalizing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`/api/inspections/${inspectionId}/finalize`, {
          method: 'POST',
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error ?? 'Failed to finalize inspection');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Finalization failed');
      } finally {
        setFinalizing(false);
      }
    };

    run();
  }, [inspectionId]);

  const handleEmailHomeowner = async () => {
    if (!homeownerEmail) return;
    setEmailSending(true);
    setEmailError(null);

    try {
      const res = await fetch(`/api/inspections/${inspectionId}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: homeownerEmail }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? 'Failed to send email');
      }

      setEmailSent(true);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Email failed');
    } finally {
      setEmailSending(false);
    }
  };

  if (finalizing) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Finalizing your inspection report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <AlertTriangle className="w-12 h-12 text-destructive" />
        <div>
          <p className="font-semibold text-gray-900">Finalization Failed</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Success State */}
      <div className="flex flex-col items-center text-center py-8 gap-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Inspection Report Finalized</h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            The report has been saved to this job&apos;s document library.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 justify-center mt-2">
          {/* Download PDF — disabled, coming in Task 13 */}
          <div className="relative group">
            <Button variant="outline" disabled className="gap-2 cursor-not-allowed opacity-60">
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
            <div
              className={cn(
                'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap',
                'opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none'
              )}
            >
              Coming soon
            </div>
          </div>

          {/* Email Homeowner */}
          <div className="relative group">
            <Button
              variant="outline"
              disabled={!homeownerEmail || emailSending || emailSent}
              onClick={handleEmailHomeowner}
              className={cn(
                'gap-2',
                (!homeownerEmail || emailSent) && 'cursor-not-allowed opacity-60'
              )}
            >
              {emailSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              {emailSent ? 'Email Sent' : 'Email to Homeowner'}
            </Button>
            {!homeownerEmail && (
              <div
                className={cn(
                  'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap',
                  'opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none'
                )}
              >
                No homeowner email on file
              </div>
            )}
          </div>
        </div>

        {emailError && (
          <p className="text-xs text-destructive">{emailError}</p>
        )}
        {emailSent && (
          <p className="text-xs text-green-600">Report emailed to {homeownerEmail}</p>
        )}

        <p className="text-xs text-muted-foreground mt-1">
          Report saved to job documents
        </p>
      </div>

      {/* Next Steps Prompt */}
      <div className="max-w-sm mx-auto">
        {jobType === 'retail' ? (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="pt-5 pb-5 flex flex-col items-center gap-4 text-center">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <p className="font-semibold text-gray-900">Generate a quote for this job?</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Turn this inspection into a formal estimate for the homeowner.
                </p>
              </div>
              <Button asChild className="gap-2 w-full">
                <Link href={`/dashboard/quotes/new?jobId=${jobId}`}>
                  Create Quote
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-purple-200 bg-purple-50/50">
            <CardContent className="pt-5 pb-5 flex flex-col items-center gap-4 text-center">
              <FileSearch className="w-8 h-8 text-purple-600" />
              <div>
                <p className="font-semibold text-gray-900">Decode the homeowner&apos;s policy?</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload their insurance policy to identify coverage, exclusions, and opportunities.
                </p>
              </div>
              <Button asChild className="gap-2 w-full" variant="outline">
                <Link href={`/dashboard/policies/new?jobId=${jobId}`}>
                  Start Policy Decode
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* View Job Link */}
      <div className="text-center">
        <Link
          href={`/dashboard/jobs/${jobId}`}
          className="text-sm text-primary underline underline-offset-2 hover:text-primary/80"
        >
          View job details
        </Link>
      </div>
    </div>
  );
}
