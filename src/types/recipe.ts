export interface FlourAnalysis {
  rationale: string;
  flours: Array<{
    type: string;
    proteinContent: number;
    purpose: string;
  }>;
  alternatives?: string[];
}

export interface HydrationAnalysis {
  percentage: number;
  rationale: string;
  impact: string[];
}

export interface SaltAnalysis {
  percentage: number;
  rationale: string;
  impact: string[];
}

export interface YeastAnalysis {
  type: string;
  percentage: number;
  rationale: string;
  impact: string[];
  temperatureNotes?: string[];
}

export interface TemperatureAnalysis {
  roomTemp: number;
  season: string;
  impact: string[];
  recommendations: string[];
  rationale: string;
}

export interface FermentationStep {
  time: number;
  temperature: number;
  impact: string[];
}

export interface FermentationAnalysis {
  totalTime: number;
  roomTemp: FermentationStep;
  coldTemp?: FermentationStep;
  enzymaticActivity: string;
  gluten: string;
  type: string;
  rationale: string;
  impact: string[];
}

export interface TechniqueGuidance {
  handling: string;
  shaping: string;
  baking: string;
}

export interface Timeline {
  step: string;
  time: string;
  description: string;
  temperature?: number;
  tips?: string[];
}

export interface DetailedAnalysis {
  flourAnalysis?: FlourAnalysis;
  hydrationAnalysis?: HydrationAnalysis;
  saltAnalysis?: SaltAnalysis;
  oilAnalysis?: {
    percentage: number;
    rationale: string;
    impact: string[];
  };
  yeastAnalysis?: YeastAnalysis;
  temperatureAnalysis?: TemperatureAnalysis;
  fermentationAnalysis?: FermentationAnalysis;
  techniqueGuidance?: TechniqueGuidance;
}

export interface RecipeAnalysis {
  timeline: Timeline[];
  detailedAnalysis: DetailedAnalysis;
} 