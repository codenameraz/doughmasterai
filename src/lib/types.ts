export interface PizzaStyle {
  name: string
  description: string
  defaultHydration: number
  defaultSalt: number
  defaultOil: number | null
  fermentationTime: {
    room: { min: number; max: number }
    cold: { min: number; max: number }
  }
}

export interface CalculatorInputs {
  style: string
  ballCount: number
  ballWeight: number
  hydration: number
  salt: number
  oil: number
  environment?: string
  fermentationType: FermentationType
  customSchedule?: {
    targetDate: string  // ISO string
    preferredTemp: Temperature
  }
  yeastType: YeastType
}

export interface FlourMix {
  primaryType: string
  secondaryType?: string | null
  primaryPercentage?: number
}

export interface RecipeResults {
  flour: number
  flourMix?: {
    primary: number
    secondary: number
  }
  water: number
  salt: number
  oil: number
  yeast: number
  schedule: {
    steps: FermentationStep[]
    totalTime: number
  }
  additionalIngredients?: Array<{
    name: string
    amount: number
  }>
}

export type FermentationType = 'quick' | 'sameDay' | 'overnight' | 'longCold' | 'custom'
export type Temperature = 'room' | 'cold' | 'mixed'

export interface FermentationSchedule {
  startTime: string  // ISO string
  steps: FermentationStep[]
  totalTime: number  // in hours
}

export interface FermentationStep {
  type: 'bulk' | 'proof' | 'rest'
  temp: Temperature
  title: string
  description: string
  startTime: string
  endTime: string
  duration: number
}

export type YeastType = 'fresh' | 'active' | 'instant'

export interface YeastCalculation {
  amount: number    // in grams
  type: YeastType
  factor: number    // multiplication factor based on type
}

export interface FermentationPreset {
  name: string
  duration: { min: number; max: number }
  temp: Temperature
  steps: Array<'mix' | 'bulk' | 'ball' | 'proof' | 'cold_proof'>
}

export const FERMENTATION_PRESETS: Record<Exclude<FermentationType, 'custom'>, FermentationPreset> = {
  quick: {
    name: 'Quick (2-4 hours)',
    duration: { min: 2, max: 4 },
    temp: 'room',
    steps: ['mix', 'bulk', 'ball', 'proof']
  },
  sameDay: {
    name: 'Same Day (6-8 hours)',
    duration: { min: 6, max: 8 },
    temp: 'room',
    steps: ['mix', 'bulk', 'ball', 'proof']
  },
  overnight: {
    name: 'Overnight (12-16 hours)',
    duration: { min: 12, max: 16 },
    temp: 'mixed',
    steps: ['mix', 'bulk', 'cold_proof']
  },
  longCold: {
    name: 'Long Cold (24-72 hours)',
    duration: { min: 24, max: 72 },
    temp: 'cold',
    steps: ['mix', 'bulk', 'cold_proof']
  }
}

export const YEAST_FACTORS = {
  fresh: 3,      // Base amount
  active: 1,     // 1/3 of fresh yeast
  instant: 0.33  // 1/3 of active dry yeast
}

// Temperature ranges in Celsius
export const TEMP_RANGES = {
  cold: { min: 2, max: 4 },
  room: { min: 20, max: 25 }
}

export interface Environment {
  location?: string;
  altitude?: number;
  humidity?: number;
  temperature?: number;
  equipment?: string[];
}

export interface YeastConfig {
  type: 'fresh' | 'active dry' | 'instant';
  percentage: number;
}

export interface FermentationSchedule {
  room: {
    hours: number;
    temperature: number;
    milestones: string[];
  };
  cold: {
    hours: number;
    temperature: number;
  };
}

export interface AdditionalIngredient {
  ingredient: string;
  purpose: string;
}

export interface AdvancedOptions {
  preferment: boolean;
  autolyse: boolean;
  additionalIngredients: AdditionalIngredient[];
}

export interface RecipeAdjustment {
  hydration: number
  salt: number
  oil: number | null
  yeast: {
    type: 'fresh' | 'active dry' | 'instant'
    percentage: number
  }
  fermentationSchedule: {
    room: {
      hours: number
      temperature: number
      milestones: string[]
    }
    cold: {
      hours: number
      temperature: number
    }
  }
  flourRecommendation: string
  technicalAnalysis: string
  adjustmentRationale: string
  techniqueGuidance: string[]
  advancedOptions: {
    preferment: boolean
    autolyse: boolean
    additionalIngredients: Array<{
      ingredient: string
      purpose: string
    }>
  }
} 