"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { WizardState, WizardAction, ClaimDetails, MeasurementData } from "@/types/wizard";

// --- Initial state ---
const emptyClaimDetails: ClaimDetails = {
  claimNumber: "",
  claimDescription: "",
  policyNumber: "",
  carrierName: "",
  propertyAddress: "",
  propertyCity: "",
  propertyState: "",
  propertyZip: "",
  dateOfLoss: "",
  adjusterName: "",
  adjusterEmail: "",
  adjusterPhone: "",
  adjusterScopeNotes: "",
  itemsBelievedMissing: "",
  priorSupplementHistory: "",
};

const emptyMeasurementData: MeasurementData = {
  measuredSquares: "",
  wastePercent: "",
  suggestedSquares: "",
  totalRoofArea: "",
  totalRoofAreaLessPenetrations: "",
  ftRidges: "",
  ftHips: "",
  ftValleys: "",
  ftRakes: "",
  ftEaves: "",
  ftDripEdge: "",
  ftParapet: "",
  ftFlashing: "",
  ftStepFlashing: "",
  numRidges: "",
  numHips: "",
  numValleys: "",
  numRakes: "",
  numEaves: "",
  numFlashingLengths: "",
  numStepFlashingLengths: "",
  totalPenetrationsArea: "",
  totalPenetrationsPerimeter: "",
  predominantPitch: "",
  pitchBreakdown: [],
  structureComplexity: "",
  accessories: "",
  damageTypes: [],
  confirmed: false,
};

const initialState: WizardState = {
  currentStep: 1,
  estimateFiles: [],
  policyFiles: [],
  claimDetails: emptyClaimDetails,
  estimateParsingStatus: "idle",
  photos: [],
  measurementFiles: [],
  measurementData: emptyMeasurementData,
  measurementParsingStatus: "idle",
  claimName: "",
  isSubmitting: false,
  uploadProgress: { current: 0, total: 0 },
};

// --- Reducer ---
function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, currentStep: action.step };

    // Step 1 — files
    case "ADD_ESTIMATE_FILES":
      return { ...state, estimateFiles: [...state.estimateFiles, ...action.files] };
    case "REMOVE_ESTIMATE_FILE":
      return {
        ...state,
        estimateFiles: state.estimateFiles.filter((_, i) => i !== action.index),
      };
    case "ADD_POLICY_FILES":
      return { ...state, policyFiles: [...state.policyFiles, ...action.files] };
    case "REMOVE_POLICY_FILE":
      return {
        ...state,
        policyFiles: state.policyFiles.filter((_, i) => i !== action.index),
      };

    // Step 1 — claim details
    case "UPDATE_CLAIM_DETAILS":
      return {
        ...state,
        claimDetails: { ...state.claimDetails, ...action.details },
      };
    case "SET_ESTIMATE_PARSING":
      return { ...state, estimateParsingStatus: action.status };

    // Step 2 — photos
    case "ADD_PHOTOS":
      return { ...state, photos: [...state.photos, ...action.photos] };
    case "REMOVE_PHOTO": {
      const photo = state.photos[action.index];
      if (photo) {
        URL.revokeObjectURL(photo.previewUrl);
      }
      return {
        ...state,
        photos: state.photos.filter((_, i) => i !== action.index),
      };
    }
    case "UPDATE_PHOTO_NOTE":
      return {
        ...state,
        photos: state.photos.map((p, i) =>
          i === action.index ? { ...p, note: action.note } : p
        ),
      };

    // Step 3 — measurements
    case "ADD_MEASUREMENT_FILES":
      return {
        ...state,
        measurementFiles: [...state.measurementFiles, ...action.files],
      };
    case "REMOVE_MEASUREMENT_FILE":
      return {
        ...state,
        measurementFiles: state.measurementFiles.filter(
          (_, i) => i !== action.index
        ),
      };
    case "UPDATE_MEASUREMENT_DATA":
      return {
        ...state,
        measurementData: { ...state.measurementData, ...action.data },
      };
    case "TOGGLE_DAMAGE_TYPE": {
      const current = state.measurementData.damageTypes;
      const toggled = current.includes(action.damageType)
        ? current.filter((t) => t !== action.damageType)
        : [...current, action.damageType];
      return {
        ...state,
        measurementData: { ...state.measurementData, damageTypes: toggled },
      };
    }
    case "CONFIRM_MEASUREMENTS":
      return {
        ...state,
        measurementData: { ...state.measurementData, confirmed: true },
      };
    case "UNCONFIRM_MEASUREMENTS":
      return {
        ...state,
        measurementData: { ...state.measurementData, confirmed: false },
      };
    case "SET_MEASUREMENT_PARSING":
      return { ...state, measurementParsingStatus: action.status };

    // Step 4
    case "SET_CLAIM_NAME":
      return { ...state, claimName: action.name };

    // Submission
    case "SET_SUBMITTING":
      return { ...state, isSubmitting: action.isSubmitting };
    case "SET_UPLOAD_PROGRESS":
      return {
        ...state,
        uploadProgress: { current: action.current, total: action.total },
      };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

// --- Context ---
interface WizardContextValue {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  canProceed: () => boolean;
}

const WizardContext = createContext<WizardContextValue | null>(null);

// --- localStorage persistence ---
// Files/photos can't be serialized — we persist only text fields.
const STORAGE_KEY = "4margin-wizard-draft";

interface PersistedState {
  currentStep: number;
  claimDetails: ClaimDetails;
  measurementData: MeasurementData;
  claimName: string;
  photoNotes: string[]; // just the notes, not the files
}

function saveToStorage(state: WizardState) {
  try {
    const data: PersistedState = {
      currentStep: state.currentStep,
      claimDetails: state.claimDetails,
      measurementData: state.measurementData,
      claimName: state.claimName,
      photoNotes: state.photos.map((p) => p.note),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

function loadFromStorage(): Partial<WizardState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data: PersistedState = JSON.parse(raw);
    return {
      currentStep: data.currentStep,
      claimDetails: { ...emptyClaimDetails, ...data.claimDetails },
      measurementData: { ...emptyMeasurementData, ...data.measurementData },
      claimName: data.claimName ?? "",
    };
  } catch {
    return null;
  }
}

export function clearWizardStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// --- Provider ---
export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wizardReducer, initialState);
  const [hydrated, setHydrated] = useState(false);

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = loadFromStorage();
    if (saved) {
      if (saved.claimDetails) {
        dispatch({ type: "UPDATE_CLAIM_DETAILS", details: saved.claimDetails });
      }
      if (saved.measurementData) {
        dispatch({ type: "UPDATE_MEASUREMENT_DATA", data: saved.measurementData });
      }
      if (saved.claimName) {
        dispatch({ type: "SET_CLAIM_NAME", name: saved.claimName });
      }
      // Go back to step 1 so user can re-add files (files can't be persisted)
      dispatch({ type: "SET_STEP", step: 1 });
    }
    setHydrated(true);
  }, []);

  // Save to localStorage on every meaningful state change
  useEffect(() => {
    if (hydrated) {
      saveToStorage(state);
    }
  }, [
    hydrated,
    state.currentStep,
    state.claimDetails,
    state.measurementData,
    state.claimName,
    state,
  ]);

  const nextStep = useCallback(() => {
    dispatch({ type: "SET_STEP", step: Math.min(state.currentStep + 1, 4) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [state.currentStep]);

  const prevStep = useCallback(() => {
    dispatch({ type: "SET_STEP", step: Math.max(state.currentStep - 1, 1) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [state.currentStep]);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= 4) {
      dispatch({ type: "SET_STEP", step });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const canProceed = useCallback((): boolean => {
    switch (state.currentStep) {
      case 1:
        return (
          state.estimateFiles.length > 0 &&
          state.claimDetails.claimNumber.trim() !== "" &&
          state.claimDetails.propertyAddress.trim() !== "" &&
          state.claimDetails.claimDescription.trim() !== ""
        );
      case 2:
        return true; // photos are optional
      case 3:
        return true; // measurements are optional
      case 4:
        return state.claimName.trim() !== "";
      default:
        return false;
    }
  }, [state]);

  // Cleanup photo preview URLs on unmount
  useEffect(() => {
    return () => {
      state.photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <WizardContext.Provider
      value={{ state, dispatch, nextStep, prevStep, goToStep, canProceed }}
    >
      {children}
    </WizardContext.Provider>
  );
}

// --- Hook ---
export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) {
    throw new Error("useWizard must be used within a WizardProvider");
  }
  return ctx;
}
