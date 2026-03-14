'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ExternalLink, ChevronRight } from 'lucide-react';
import type { Job, JobType } from '@/types/job';

interface StepJobInfoProps {
  initialJob: Job | null;
  onComplete: (
    inspectionId: string,
    jobId: string,
    companyId: string,
    jobType: string,
    homeownerEmail: string | null
  ) => void;
}

export function StepJobInfo({ initialJob, onComplete }: StepJobInfoProps) {
  const [address, setAddress] = useState(initialJob?.property_address ?? '');
  const [city, setCity] = useState(initialJob?.property_city ?? '');
  const [state, setState] = useState(initialJob?.property_state ?? '');
  const [zip, setZip] = useState(initialJob?.property_zip ?? '');
  const [jobType, setJobType] = useState<JobType>(initialJob?.job_type ?? 'insurance');
  const [homeownerName, setHomeownerName] = useState(initialJob?.homeowner_name ?? '');
  const [homeownerPhone, setHomeownerPhone] = useState(initialJob?.homeowner_phone ?? '');
  const [homeownerEmail, setHomeownerEmail] = useState(initialJob?.homeowner_email ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!address.trim()) {
      setError('Property address is required.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const body: Record<string, unknown> = {
        property_address: address.trim(),
        property_city: city.trim() || null,
        property_state: state.trim() || null,
        property_zip: zip.trim() || null,
        job_type: jobType,
        homeowner_name: homeownerName.trim() || null,
        homeowner_phone: homeownerPhone.trim() || null,
        homeowner_email: homeownerEmail.trim() || null,
      };

      if (initialJob?.id) {
        body.job_id = initialJob.id;
      }

      const res = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? 'Failed to create inspection');
      }

      const json = await res.json();
      onComplete(
        json.id,
        json.job_id,
        json.company_id,
        jobType,
        homeownerEmail.trim() || null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* EagleView Banner */}
      <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        <ExternalLink className="w-4 h-4 shrink-0" />
        <span>
          Order EagleView measurements for this property before the inspection.{' '}
          <a
            href="https://eagleview.com/order"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-2 hover:text-blue-600"
          >
            Order now
          </a>
        </span>
      </div>

      {/* Property Address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Property Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="address">
              Street Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="address"
              placeholder="123 Main St"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1 space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="Annapolis"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                placeholder="MD"
                maxLength={2}
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zip">ZIP</Label>
              <Input
                id="zip"
                placeholder="21401"
                maxLength={10}
                value={zip}
                onChange={(e) => setZip(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {(['insurance', 'retail'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setJobType(type)}
                className={cn(
                  'flex-1 py-3 px-4 rounded-lg border-2 text-sm font-semibold capitalize transition-colors',
                  jobType === type
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                )}
              >
                {type === 'insurance' ? 'Insurance' : 'Retail / Cash'}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Homeowner Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Homeowner Info{' '}
            <span className="text-xs font-normal text-muted-foreground">(optional)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="homeowner-name">Name</Label>
            <Input
              id="homeowner-name"
              placeholder="John Smith"
              value={homeownerName}
              onChange={(e) => setHomeownerName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="homeowner-phone">Phone</Label>
              <Input
                id="homeowner-phone"
                type="tel"
                placeholder="(410) 555-0100"
                value={homeownerPhone}
                onChange={(e) => setHomeownerPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="homeowner-email">Email</Label>
              <Input
                id="homeowner-email"
                type="email"
                placeholder="john@example.com"
                value={homeownerEmail}
                onChange={(e) => setHomeownerEmail(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex justify-end">
        <Button onClick={handleContinue} disabled={loading} className="gap-2">
          {loading ? 'Creating...' : 'Continue'}
          {!loading && <ChevronRight className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
