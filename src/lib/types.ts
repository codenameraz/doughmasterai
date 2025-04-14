export interface TemperatureAnalysis {
  roomTemp: number;
  rationale: string;
  recommendations?: string[];
}

export interface FlourRecommendation {
  name: string;
  protein: string;
  description: string;
  isAuthentic: boolean;
}

export interface ProcessTimelineStep {
  step: number;
  description: string;
  duration: string;
  temperature?: string;
  isRefrigeration: boolean;
  tips?: string[];
}

export interface ProcessTimeline {
  steps: ProcessTimelineStep[];
}

export interface DetailedAnalysis {
  flourAnalysis: {
    primaryFlour?: FlourRecommendation;
    alternativeFlours?: FlourRecommendation[];
    rationale: string;
  };
  temperatureAnalysis: TemperatureAnalysis;
  timeline: {
    step: string;
    duration: string;
    isRefrigeration?: boolean;
  }[];
  techniques: {
    kneading: string[];
    shaping: string[];
    baking: string[];
    general: string[];
  };
}

export interface ApiResponse {
  detailedAnalysis: DetailedAnalysis;
  processTimeline: ProcessTimeline;
} 