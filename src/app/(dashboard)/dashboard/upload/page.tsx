"use client";

import { WizardProvider, useWizard } from "@/components/wizard/wizard-context";
import { StepIndicator } from "@/components/wizard/step-indicator";
import { StepEstimate } from "@/components/wizard/step-estimate";
import { StepPhotos } from "@/components/wizard/step-photos";
import { StepMeasurements } from "@/components/wizard/step-measurements";
import { StepReview } from "@/components/wizard/step-review";

function WizardContent() {
  const { state } = useWizard();

  return (
    <div className="space-y-8">
      <StepIndicator currentStep={state.currentStep} />

      {state.currentStep === 1 && <StepEstimate />}
      {state.currentStep === 2 && <StepPhotos />}
      {state.currentStep === 3 && <StepMeasurements />}
      {state.currentStep === 4 && <StepReview />}
    </div>
  );
}

export default function UploadPage() {
  return (
    <WizardProvider>
      <WizardContent />
    </WizardProvider>
  );
}
