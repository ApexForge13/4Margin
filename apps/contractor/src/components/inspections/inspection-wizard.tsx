'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import type { Job } from '@/types/job';
import type { AssessmentData, InspectionPhoto } from '@/types/inspection';
import { EMPTY_ASSESSMENT } from '@/types/inspection';
import { StepJobInfo } from './step-job-info';
import { StepAssessment } from './step-assessment';
import { StepPhotos } from './step-photos';
import { StepGenerate } from './step-generate';
import { StepReview } from './step-review';
import { StepFinalized } from './step-finalized';

type WizardStep = 'job_info' | 'assessment' | 'photos' | 'generate' | 'review' | 'finalized';

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'job_info', label: 'Job Info' },
  { key: 'assessment', label: 'Assessment' },
  { key: 'photos', label: 'Photos' },
  { key: 'generate', label: 'Generate' },
  { key: 'review', label: 'Review' },
  { key: 'finalized', label: 'Finalized' },
];

interface InspectionWizardProps {
  initialJob: Job | null;
}

export function InspectionWizard({ initialJob }: InspectionWizardProps) {
  const [step, setStep] = useState<WizardStep>('job_info');
  const [inspectionId, setInspectionId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(initialJob?.id ?? null);
  const [assessmentData, setAssessmentData] = useState<AssessmentData>(EMPTY_ASSESSMENT);
  const [photos, setPhotos] = useState<InspectionPhoto[]>([]);
  const [companyId, setCompanyId] = useState<string>('');
  const [jobType, setJobType] = useState<string>(initialJob?.job_type ?? 'insurance');
  const [homeownerEmail, setHomeownerEmail] = useState<string | null>(
    initialJob?.homeowner_email ?? null
  );

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Inspection</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Complete each step to generate your inspection report.
        </p>
      </div>

      {/* Step Indicator */}
      <nav aria-label="Inspection wizard steps">
        <ol className="flex items-center gap-0">
          {STEPS.map((s, index) => {
            const isCompleted = index < currentStepIndex;
            const isActive = index === currentStepIndex;

            return (
              <li key={s.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs font-semibold transition-colors',
                      isCompleted &&
                        'bg-primary border-primary text-primary-foreground',
                      isActive &&
                        'bg-white border-primary text-primary',
                      !isCompleted &&
                        !isActive &&
                        'bg-white border-gray-300 text-gray-400'
                    )}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                  </div>
                  <span
                    className={cn(
                      'text-xs font-medium whitespace-nowrap',
                      isActive && 'text-primary',
                      isCompleted && 'text-gray-600',
                      !isCompleted && !isActive && 'text-gray-400'
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 mx-2 mb-5 transition-colors',
                      index < currentStepIndex ? 'bg-primary' : 'bg-gray-200'
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step Content */}
      <div>
        {step === 'job_info' && (
          <StepJobInfo
            initialJob={initialJob}
            onComplete={(newInspectionId, newJobId, cid, jType, hwEmail) => {
              setInspectionId(newInspectionId);
              setJobId(newJobId);
              setCompanyId(cid);
              setJobType(jType);
              setHomeownerEmail(hwEmail);
              setStep('assessment');
            }}
          />
        )}
        {step === 'assessment' && inspectionId && (
          <StepAssessment
            inspectionId={inspectionId}
            initialData={assessmentData}
            onComplete={(data) => {
              setAssessmentData(data);
              setStep('photos');
            }}
            onBack={() => setStep('job_info')}
          />
        )}
        {step === 'photos' && inspectionId && (
          <StepPhotos
            inspectionId={inspectionId}
            companyId={companyId}
            onComplete={(uploadedPhotos) => {
              setPhotos(uploadedPhotos);
              setStep('generate');
            }}
            onBack={() => setStep('assessment')}
          />
        )}
        {step === 'generate' && inspectionId && (
          <StepGenerate
            inspectionId={inspectionId}
            assessmentData={assessmentData}
            photoCount={photos.length}
            onComplete={() => setStep('review')}
            onBack={() => setStep('photos')}
          />
        )}
        {step === 'review' && inspectionId && (
          <StepReview
            inspectionId={inspectionId}
            assessmentData={assessmentData}
            onEditAssessment={() => setStep('assessment')}
            onEditPhotos={() => setStep('photos')}
            onFinalize={() => setStep('finalized')}
            onBack={() => setStep('generate')}
          />
        )}
        {step === 'finalized' && inspectionId && jobId && (
          <StepFinalized
            inspectionId={inspectionId}
            jobId={jobId}
            jobType={jobType}
            homeownerEmail={homeownerEmail}
          />
        )}
      </div>
    </div>
  );
}
