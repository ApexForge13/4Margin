'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  FileText,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import type { AssessmentData } from '@/types/inspection';

interface StepGenerateProps {
  inspectionId: string;
  assessmentData: AssessmentData;
  photoCount: number;
  onComplete: () => void;
  onBack: () => void;
}

const DAMAGE_SEVERITY_COLORS: Record<string, string> = {
  minor: 'bg-yellow-50 border-yellow-300 text-yellow-700',
  moderate: 'bg-orange-50 border-orange-300 text-orange-700',
  severe: 'bg-red-50 border-red-300 text-red-700',
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'text-green-700 bg-green-50 border-green-300',
  moderate: 'text-yellow-700 bg-yellow-50 border-yellow-300',
  low: 'text-orange-700 bg-orange-50 border-orange-300',
  uncertain: 'text-red-700 bg-red-50 border-red-300',
};

const DAMAGE_LABELS: Record<string, string> = {
  hail: 'Hail',
  wind: 'Wind',
  mechanical: 'Mechanical',
  wear_tear: 'Wear & Tear',
  tree: 'Tree',
  animal: 'Animal',
  other: 'Other',
};

const COMPONENT_LABELS: Record<string, string> = {
  shingles: 'Shingles',
  ridge_cap: 'Ridge Cap',
  flashing: 'Flashing',
  pipe_boots: 'Pipe Boots',
  vents: 'Vents',
  gutters: 'Gutters',
  drip_edge: 'Drip Edge',
  skylights: 'Skylights',
  chimney: 'Chimney',
  soffit_fascia: 'Soffit & Fascia',
};

export function StepGenerate({
  inspectionId,
  assessmentData,
  photoCount,
  onComplete,
  onBack,
}: StepGenerateProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/inspections/${inspectionId}/generate`, {
        method: 'POST',
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? 'Failed to generate report');
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const { roof_details, damage_observed, component_conditions, confidence_analysis, general_notes } =
    assessmentData;

  const needsReplacementItems = Object.entries(component_conditions).filter(
    ([, val]) => val === 'needs_replacement'
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Review Before Generating</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Confirm all information is correct. You can go back and edit if needed.
        </p>
      </div>

      {/* Roof Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Roof Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Approximate Squares</dt>
              <dd className="font-medium">
                {roof_details.approximate_squares ?? <span className="text-muted-foreground italic">Not provided</span>}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Predominant Pitch</dt>
              <dd className="font-medium">
                {roof_details.predominant_pitch || <span className="text-muted-foreground italic">Not provided</span>}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Layers</dt>
              <dd className="font-medium">{roof_details.number_of_layers}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Complexity</dt>
              <dd className="font-medium">
                {roof_details.structure_complexity || <span className="text-muted-foreground italic">Not provided</span>}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-muted-foreground">Shingle Type</dt>
              <dd className="font-medium">
                {roof_details.shingle_type || <span className="text-muted-foreground italic">Not provided</span>}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Damage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Damage Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {damage_observed.types.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No damage types recorded.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {damage_observed.types.map((entry) => (
                <Badge
                  key={entry.type}
                  variant="outline"
                  className={cn('capitalize', DAMAGE_SEVERITY_COLORS[entry.severity])}
                >
                  {DAMAGE_LABELS[entry.type]} — {entry.severity}
                </Badge>
              ))}
            </div>
          )}
          {damage_observed.notes && (
            <p className="text-sm text-gray-700">{damage_observed.notes}</p>
          )}
        </CardContent>
      </Card>

      {/* Component Conditions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Component Conditions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(component_conditions).map(([key, val]) => {
              const isNR = val === 'needs_replacement';
              return (
                <div
                  key={key}
                  className={cn(
                    'flex items-center justify-between py-1.5 px-2 rounded',
                    isNR ? 'bg-red-50' : 'bg-gray-50'
                  )}
                >
                  <span className={cn('font-medium', isNR ? 'text-red-700' : 'text-gray-700')}>
                    {COMPONENT_LABELS[key] ?? key}
                  </span>
                  <span
                    className={cn(
                      'text-xs capitalize',
                      isNR ? 'text-red-600 font-semibold' : 'text-muted-foreground'
                    )}
                  >
                    {val ? val.replace('_', ' ') : '—'}
                  </span>
                </div>
              );
            })}
          </div>

          {needsReplacementItems.length > 0 && (
            <div className="mt-3 flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>{needsReplacementItems.length} component{needsReplacementItems.length > 1 ? 's' : ''}</strong>{' '}
                flagged as Needs Replacement:{' '}
                {needsReplacementItems.map(([k]) => COMPONENT_LABELS[k] ?? k).join(', ')}.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photos + Confidence */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Photos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{photoCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {photoCount === 0 ? 'No photos uploaded' : 'photos uploaded & classified'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            {confidence_analysis.level ? (
              <Badge
                variant="outline"
                className={cn(
                  'capitalize text-sm',
                  CONFIDENCE_COLORS[confidence_analysis.level]
                )}
              >
                {confidence_analysis.level}
              </Badge>
            ) : (
              <span className="text-sm text-muted-foreground italic">Not set</span>
            )}
            {confidence_analysis.notes && (
              <p className="text-xs text-muted-foreground mt-2">{confidence_analysis.notes}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* General Notes */}
      {general_notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              General Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{general_notes}</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={loading} className="gap-2">
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
        <Button onClick={handleGenerate} disabled={loading} size="lg" className="gap-2">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              Generate Inspection Report
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
