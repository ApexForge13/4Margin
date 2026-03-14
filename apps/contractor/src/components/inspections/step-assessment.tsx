'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AssessmentData, DamageEntry, ComponentCondition } from '@/types/inspection';

interface StepAssessmentProps {
  inspectionId: string;
  initialData: AssessmentData;
  onComplete: (data: AssessmentData) => void;
  onBack: () => void;
}

type DamageType = DamageEntry['type'];

const DAMAGE_TYPES: { value: DamageType; label: string }[] = [
  { value: 'hail', label: 'Hail' },
  { value: 'wind', label: 'Wind' },
  { value: 'mechanical', label: 'Mechanical' },
  { value: 'wear_tear', label: 'Wear & Tear' },
  { value: 'tree', label: 'Tree' },
  { value: 'animal', label: 'Animal' },
  { value: 'other', label: 'Other' },
];

const PITCH_OPTIONS = [
  'Flat', '2/12', '3/12', '4/12', '5/12', '6/12', '7/12', '8/12',
  '9/12', '10/12', '11/12', '12/12', '13/12', '14/12', '15/12', '16/12',
];

const COMPONENT_ROWS: { key: keyof AssessmentData['component_conditions']; label: string }[] = [
  { key: 'shingles', label: 'Shingles' },
  { key: 'ridge_cap', label: 'Ridge Cap' },
  { key: 'flashing', label: 'Flashing' },
  { key: 'pipe_boots', label: 'Pipe Boots' },
  { key: 'vents', label: 'Vents' },
  { key: 'gutters', label: 'Gutters' },
  { key: 'drip_edge', label: 'Drip Edge' },
  { key: 'skylights', label: 'Skylights' },
  { key: 'chimney', label: 'Chimney' },
  { key: 'soffit_fascia', label: 'Soffit & Fascia' },
];

const CONDITION_OPTIONS: { value: ComponentCondition; label: string }[] = [
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'needs_replacement', label: 'Needs Replacement' },
];

export function StepAssessment({
  inspectionId,
  initialData,
  onComplete,
  onBack,
}: StepAssessmentProps) {
  const [data, setData] = useState<AssessmentData>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ----- Helpers -----

  const updateRoofDetails = (patch: Partial<AssessmentData['roof_details']>) => {
    setData((d) => ({ ...d, roof_details: { ...d.roof_details, ...patch } }));
  };

  const updateComponentCondition = (
    key: keyof AssessmentData['component_conditions'],
    value: ComponentCondition
  ) => {
    setData((d) => ({
      ...d,
      component_conditions: { ...d.component_conditions, [key]: value },
    }));
  };

  const isDamageTypeChecked = (type: DamageType) =>
    data.damage_observed.types.some((d) => d.type === type);

  const getDamageSeverity = (type: DamageType): DamageEntry['severity'] | '' => {
    const entry = data.damage_observed.types.find((d) => d.type === type);
    return entry?.severity ?? '';
  };

  const toggleDamageType = (type: DamageType) => {
    setData((d) => {
      const exists = d.damage_observed.types.some((e) => e.type === type);
      const types = exists
        ? d.damage_observed.types.filter((e) => e.type !== type)
        : [...d.damage_observed.types, { type, severity: 'moderate' as const }];
      return { ...d, damage_observed: { ...d.damage_observed, types } };
    });
  };

  const setDamageSeverity = (type: DamageType, severity: DamageEntry['severity']) => {
    setData((d) => ({
      ...d,
      damage_observed: {
        ...d.damage_observed,
        types: d.damage_observed.types.map((e) =>
          e.type === type ? { ...e, severity } : e
        ),
      },
    }));
  };

  // ----- Submit -----

  const handleContinue = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/inspections/${inspectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessment_data: data }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? 'Failed to save assessment');
      }

      onComplete(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Roof Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roof Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="squares">Approximate Squares</Label>
              <Input
                id="squares"
                type="number"
                min={0}
                step={0.5}
                placeholder="28"
                value={data.roof_details.approximate_squares ?? ''}
                onChange={(e) =>
                  updateRoofDetails({
                    approximate_squares: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>Predominant Pitch</Label>
              <Select
                value={data.roof_details.predominant_pitch}
                onValueChange={(v) => updateRoofDetails({ predominant_pitch: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select pitch" />
                </SelectTrigger>
                <SelectContent>
                  {PITCH_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Number of Layers</Label>
            <div className="flex gap-3">
              {(['1', '2', '3+'] as const).map((val) => {
                const numVal = val === '3+' ? 3 : parseInt(val);
                const isSelected =
                  val === '3+'
                    ? data.roof_details.number_of_layers >= 3
                    : data.roof_details.number_of_layers === numVal;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => updateRoofDetails({ number_of_layers: numVal })}
                    className={cn(
                      'flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    )}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="shingle-type">Shingle Type / Manufacturer</Label>
            <Input
              id="shingle-type"
              placeholder="e.g. GAF Timberline HDZ, CertainTeed Landmark"
              value={data.roof_details.shingle_type}
              onChange={(e) => updateRoofDetails({ shingle_type: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Structure Complexity</Label>
            <div className="flex gap-3">
              {(['Simple', 'Normal', 'Complex'] as const).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => updateRoofDetails({ structure_complexity: val })}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors',
                    data.roof_details.structure_complexity === val
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  )}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Damage Observed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Damage Observed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3">
            {DAMAGE_TYPES.map(({ value, label }) => {
              const checked = isDamageTypeChecked(value);
              const severity = getDamageSeverity(value);

              return (
                <div key={value} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id={`damage-${value}`}
                      checked={checked}
                      onChange={() => toggleDamageType(value)}
                      className="w-4 h-4 accent-primary rounded"
                    />
                    <label
                      htmlFor={`damage-${value}`}
                      className="text-sm font-medium cursor-pointer select-none"
                    >
                      {label}
                    </label>
                  </div>

                  {checked && (
                    <div className="ml-7 flex gap-2">
                      {(['minor', 'moderate', 'severe'] as const).map((sev) => (
                        <button
                          key={sev}
                          type="button"
                          onClick={() => setDamageSeverity(value, sev)}
                          className={cn(
                            'py-1 px-3 rounded-md border text-xs font-medium capitalize transition-colors',
                            severity === sev
                              ? sev === 'severe'
                                ? 'border-red-500 bg-red-50 text-red-700'
                                : sev === 'moderate'
                                ? 'border-orange-400 bg-orange-50 text-orange-700'
                                : 'border-yellow-400 bg-yellow-50 text-yellow-700'
                              : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          )}
                        >
                          {sev}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="damage-notes">Damage Notes</Label>
            <Textarea
              id="damage-notes"
              rows={3}
              placeholder="Describe damage observed..."
              value={data.damage_observed.notes}
              onChange={(e) =>
                setData((d) => ({
                  ...d,
                  damage_observed: { ...d.damage_observed, notes: e.target.value },
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Component Condition Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Component Condition Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground w-40">
                    Component
                  </th>
                  {CONDITION_OPTIONS.map((opt) => (
                    <th
                      key={opt.value}
                      className="text-center py-2 px-2 font-medium text-muted-foreground"
                    >
                      {opt.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPONENT_ROWS.map(({ key, label }) => {
                  const current = data.component_conditions[key];
                  const isNeedsReplacement = current === 'needs_replacement';

                  return (
                    <tr
                      key={key}
                      className={cn(
                        'border-b last:border-0',
                        isNeedsReplacement && 'bg-red-50/60'
                      )}
                    >
                      <td
                        className={cn(
                          'py-2.5 pr-4 font-medium',
                          isNeedsReplacement ? 'text-red-700' : 'text-gray-700'
                        )}
                      >
                        {label}
                      </td>
                      {CONDITION_OPTIONS.map((opt) => (
                        <td key={opt.value} className="text-center py-2.5 px-2">
                          <input
                            type="radio"
                            name={`condition-${key}`}
                            value={opt.value}
                            checked={current === opt.value}
                            onChange={() => updateComponentCondition(key, opt.value)}
                            className={cn(
                              'w-4 h-4 cursor-pointer',
                              opt.value === 'needs_replacement'
                                ? 'accent-red-500'
                                : 'accent-primary'
                            )}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Confidence Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Confidence Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Confidence Level</Label>
            <Select
              value={data.confidence_analysis.level}
              onValueChange={(v) =>
                setData((d) => ({
                  ...d,
                  confidence_analysis: {
                    ...d.confidence_analysis,
                    level: v as AssessmentData['confidence_analysis']['level'],
                  },
                }))
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="uncertain">Uncertain</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confidence-notes">Notes</Label>
            <Textarea
              id="confidence-notes"
              rows={2}
              placeholder="Any factors affecting confidence..."
              value={data.confidence_analysis.notes}
              onChange={(e) =>
                setData((d) => ({
                  ...d,
                  confidence_analysis: { ...d.confidence_analysis, notes: e.target.value },
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* General Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">General Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            placeholder="Any additional observations, site conditions, or notes..."
            value={data.general_notes}
            onChange={(e) => setData((d) => ({ ...d, general_notes: e.target.value }))}
          />
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
        <Button onClick={handleContinue} disabled={loading} className="gap-2">
          {loading ? 'Saving...' : 'Continue'}
          {!loading && <ChevronRight className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
