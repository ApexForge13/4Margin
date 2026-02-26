"use client";

import { useEffect, useState } from "react";
import { WizardProvider, useWizard, clearWizardStorage } from "@/components/wizard/wizard-context";
import { StepIndicator } from "@/components/wizard/step-indicator";
import { StepEstimate } from "@/components/wizard/step-estimate";
import { StepPhotos } from "@/components/wizard/step-photos";
import { StepMeasurements } from "@/components/wizard/step-measurements";
import { StepReview } from "@/components/wizard/step-review";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STORAGE_KEY = "4margin-wizard-draft";

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
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [ready, setReady] = useState(false);
  const [wizardKey, setWizardKey] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        // Check if there's meaningful draft data (claim number, description, or carrier)
        const hasData =
          data.claimDetails?.claimNumber?.trim() ||
          data.claimDetails?.claimDescription?.trim() ||
          data.claimDetails?.carrierName?.trim() ||
          data.claimDetails?.propertyAddress?.trim();
        if (hasData) {
          setShowDraftDialog(true);
          return;
        }
      }
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  const handleContinueDraft = () => {
    setShowDraftDialog(false);
    setReady(true);
  };

  const handleStartNew = () => {
    clearWizardStorage();
    setShowDraftDialog(false);
    setWizardKey((k) => k + 1); // force remount of WizardProvider
    setReady(true);
  };

  return (
    <>
      <Dialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Continue existing claim?</DialogTitle>
            <DialogDescription>
              You have a saved draft from a previous session. Would you like to
              continue where you left off, or start a new claim?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleStartNew}>
              Start New
            </Button>
            <Button onClick={handleContinueDraft}>Continue Draft</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {ready && (
        <WizardProvider key={wizardKey}>
          <WizardContent />
        </WizardProvider>
      )}
    </>
  );
}
