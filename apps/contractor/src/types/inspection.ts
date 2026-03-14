export type InspectionStatus = 'draft' | 'processing' | 'complete';

export interface RoofDetails {
  approximate_squares: number | null;
  predominant_pitch: string;
  number_of_layers: number;
  shingle_type: string;
  structure_complexity: 'Simple' | 'Normal' | 'Complex' | '';
}

export interface DamageEntry {
  type: 'hail' | 'wind' | 'mechanical' | 'wear_tear' | 'tree' | 'animal' | 'other';
  severity: 'minor' | 'moderate' | 'severe';
}

export type ComponentCondition = 'good' | 'fair' | 'poor' | 'needs_replacement';

export interface AssessmentData {
  roof_details: RoofDetails;
  damage_observed: {
    types: DamageEntry[];
    notes: string;
  };
  component_conditions: {
    shingles: ComponentCondition | '';
    ridge_cap: ComponentCondition | '';
    flashing: ComponentCondition | '';
    pipe_boots: ComponentCondition | '';
    vents: ComponentCondition | '';
    gutters: ComponentCondition | '';
    drip_edge: ComponentCondition | '';
    skylights: ComponentCondition | '';
    chimney: ComponentCondition | '';
    soffit_fascia: ComponentCondition | '';
  };
  confidence_analysis: {
    level: 'high' | 'moderate' | 'low' | 'uncertain' | '';
    notes: string;
  };
  general_notes: string;
}

export interface Inspection {
  id: string;
  company_id: string;
  job_id: string | null;
  created_by: string;
  status: InspectionStatus;
  assessment_data: AssessmentData;
  report_pdf_url: string | null;
  inspected_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PhotoCategory =
  | 'elevation'
  | 'roof_overview'
  | 'damage'
  | 'component'
  | 'interior_damage'
  | 'install'
  | 'other';

export interface InspectionPhoto {
  id: string;
  inspection_id: string;
  company_id: string;
  storage_path: string;
  original_filename: string;
  file_size: number | null;
  mime_type: string | null;
  ai_category: PhotoCategory;
  ai_subcategory: string | null;
  ai_confidence: number | null;
  contractor_category: PhotoCategory | null;
  contractor_subcategory: string | null;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

export const EMPTY_ASSESSMENT: AssessmentData = {
  roof_details: {
    approximate_squares: null,
    predominant_pitch: '',
    number_of_layers: 1,
    shingle_type: '',
    structure_complexity: '',
  },
  damage_observed: {
    types: [],
    notes: '',
  },
  component_conditions: {
    shingles: '',
    ridge_cap: '',
    flashing: '',
    pipe_boots: '',
    vents: '',
    gutters: '',
    drip_edge: '',
    skylights: '',
    chimney: '',
    soffit_fascia: '',
  },
  confidence_analysis: {
    level: '',
    notes: '',
  },
  general_notes: '',
};
