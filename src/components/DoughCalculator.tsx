"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Loader2, AlertCircle, ChefHat, Percent, Scale, Droplet, 
  Utensils, Clock, ChevronDown, Wheat, CircleDot, Droplets, 
  Beaker, Thermometer, LightbulbIcon, 
  // Icons for techniques:
  Blend, Layers, Hand, CookingPot
} from "lucide-react";
import { cn, formatPrice, trackEvent } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSearchParams } from 'next/navigation';

// --- Interfaces ---
interface YeastInfo { type: "fresh" | "active dry" | "instant"; percentage: number; }
interface FermentationPhase { hours: number; temperature: number; milestones?: string[]; }
interface AdditionalIngredient { ingredient: string; purpose: string; }
interface AdvancedOptions { preferment: boolean; autolyse: boolean; additionalIngredients: AdditionalIngredient[]; }
interface PizzaioloAnalysis {
    hydration: number;
    salt: number;
    oil?: number | null;
    yeast: YeastInfo;
    technicalAnalysis: string;
    adjustmentRationale: string;
    techniqueGuidance: string[];
    advancedOptions: AdvancedOptions;
}
interface FlourMix {
    primaryType: string;
    secondaryType?: string | null;
    primaryPercentage?: number | null;
}
interface RecipeInput {
    hydration: number;
    salt: number;
    oil?: number | null;
    flourMix?: FlourMix | null;
    fermentationTime: 'quick' | 'same-day' | 'overnight' | 'cold';
    yeast?: {
        type: 'fresh' | 'active dry' | 'instant';
    };
}
interface EnvironmentInput {
    altitude?: number | null;
}
interface FermentationInput {
    schedule: FermentationType;
    temperature: {
        room: number | null;
        cold: number | null;
    };
    duration: {
        min: number;
        max: number;
    };
    description: string;
}
interface ApiPayload {
    doughBalls: number;
    weightPerBall: number;
    style: string;
    recipe: {
        hydration: number;
        salt: number;
        oil: number | null;
        flourMix: {
            primaryType: string;
            secondaryType?: string;
            primaryPercentage: number;
        } | null,
        fermentationTime: string,
        yeast: {
            type: string;
        }
    },
    fermentation: {
        schedule: string;
        temperature: {
            room: number | null;
            cold: number | null;
        };
        duration: {
            min: number;
            max: number;
        };
    },
    environment?: {
        altitude?: number;
        ovenType?: 'home' | 'outdoor';
        maxOvenTemp?: number;
        roomTemp: number; // This is tempInCelsius
        tempUnit?: 'C' | 'F'; // Added tempUnit
    },
    analysisPreferences: {
        detailedAnalysis: boolean;
        explainRationale: boolean;
        avoidGenericResponses: boolean;
        requireSpecificAnalysis: boolean;
        includeAutolyse: boolean;
        skipAutolyse: boolean;
        processSteps: {
            autolyse: boolean;
            initialMix: boolean;
            bulkFermentation: boolean;
            divideAndBall: boolean;
            finalProof: boolean;
        };
    };
}

interface Timeline {
    day: number;
    timeOfDay: string;
    title: string;
    instructions: string;
    duration: string;
    tips?: string[];
}

interface TemperatureAnalysis {
    roomTemp: number;
    rationale: string;
    recommendations?: string[];
}

interface FermentationStep {
    time: number;
    temperature: number;
    impact: string[];
}

interface FermentationAnalysis {
    totalTime: number;
    roomTemp: FermentationStep;
    coldTemp?: FermentationStep;
    enzymaticActivity: string;
    gluten: string;
        type: string;
        rationale: string;
    impact: string[];
}

interface TechniqueGuidance {
    handling: string;
    shaping: string;
    baking: string;
    mixing: string;
    folding: string;
}

interface DetailedAnalysis {
    flourAnalysis?: {
        rationale: string;
        flours: Array<{
            type: string;
            proteinContent: number;
            purpose: string;
            percentage?: number;
        }>;
        alternatives?: string[];
    };
    hydrationAnalysis?: {
        percentage: number;
        rationale: string;
        impact: string[];
    };
    saltAnalysis?: {
        percentage: number;
        rationale: string;
        impact: string[];
    };
    yeastAnalysis?: {
        type: string;
        percentage: number;
        rationale: string;
        impact: string[];
        temperatureNotes?: string[];
    };
    temperatureAnalysis?: TemperatureAnalysis;
    fermentationAnalysis?: FermentationAnalysis;
    techniqueGuidance?: TechniqueGuidance;
}

interface RecipeAnalysis {
    timeline: Timeline[];
    detailedAnalysis: DetailedAnalysis;
}

interface FermentationSchedule {
    totalTime: number;
    type: string;
    rationale: string;
    impact: string[];
    roomTemp: {
        time: number;
        temperature: number;
        impact: string[];
    };
    coldTemp?: {
        time: number;
        temperature: number;
        impact: string[];
    };
    recommendations?: string[];
}

interface EnhancedPizzaioloAnalysis extends Omit<PizzaioloAnalysis, 'fermentationSchedule' | 'flourRecommendation'> {
    timeline: Timeline[];
    detailedAnalysis: DetailedAnalysis;
    recipe?: {
        flourMix?: {
            primaryType: string;
            secondaryType?: string;
            primaryPercentage: number;
        };
    };
    hydrationRecommendation?: {
        percentage: number;
        rationale: string;
        impact: string[];
        recommendations?: string[];
    };
    saltRecommendation?: {
        percentage: number;
        rationale: string;
        impact?: string[];
        recommendations?: string[];
    };
    yeastRecommendation?: {
        type: string;
        percentage: number;
        rationale: string;
        impact?: string[];
        temperatureNotes?: string[];
        recommendations?: string[];
    };
    flourRecommendation?: {
        primaryFlour: {
            name: string;
            proteinPercentage: number;
            purpose: string;
            authenticityScore?: number; 
            authenticity?: string;
        };
        alternativeFlours: Array<{
            name: string;
            proteinPercentage: number;
            mixRatio: number;
        }>;
    };
    fermentationSchedule?: FermentationSchedule;
    techniques?: {
        mixing: string;
        folding: string;
        shaping: string;
        baking: string;
    };
    temperatureAnalysis?: {
        roomTempC: number;
        season?: string;
        rationale: string;
        impact: string[];
        recommendations: string[];
    };
}

interface FermentationScheduleConfig {
    duration: {
        min: number;
        max: number;
    };
    temperature: {
        room: number | null;
        cold: number | null;
    };
    description: string;
}

interface FlourRecommendation {
  primary: {
    name: string;
    protein: string;
    description: string;
  };
  alternatives: Array<{
    name: string;
    protein: string;
    description: string;
  }>;
}

interface ProcessTimelineStep {
  step: number;
  description: string;
  duration: string;
  temperature: string | null;
  isRefrigeration: boolean;
  tips?: string[];
}

interface ProcessTimeline {
  steps: ProcessTimelineStep[];
}

interface Recommendation {
  percentage: number;
  rationale: string;
  impact: string[];
  recommendations?: string[];
}

interface ApiResponse {
  flourRecommendation: FlourRecommendation;
  processTimeline: ProcessTimeline;
  temperatureAnalysis: TemperatureAnalysis;
  timeline: Timeline[];
  techniqueGuidance: string[];
  detailedAnalysis: DetailedAnalysis;
  recipe?: {
    flourMix?: {
      primaryType: string;
      secondaryType?: string;
      primaryPercentage: number;
    };
  };
  hydrationRecommendation?: Recommendation;
  saltRecommendation?: Recommendation;
  yeastRecommendation?: Recommendation & {
    type: string;
    temperatureNotes?: string[];
  };
  fermentationSchedule?: FermentationSchedule;
  techniques?: {
    kneading?: string[];
    shaping?: string[];
    baking?: string[];
    general?: string[];
  };
}

// Update the RecipeResult type
type RecipeResult = ApiResponse;

// --- End Interfaces ---

// --- Constants ---
const PIZZA_STYLE_OPTIONS = [
  { value: 'neapolitan', label: 'Neapolitan' },
  { value: 'new-york', label: 'New York' },
  { value: 'detroit', label: 'Detroit' },
  { value: 'sicilian', label: 'Sicilian' },
  { value: 'roman-al-taglio', label: 'Roman Al Taglio' },
  { value: 'custom', label: 'Custom' },
] as const;
type PizzaStyleValue = typeof PIZZA_STYLE_OPTIONS[number]['value'];

const FLOUR_TYPES = ['00 Flour', 'Bread Flour', 'All-Purpose', 'High Gluten', 'Whole Wheat', 'Semolina', 'Rye'] as const;
type FlourType = typeof FLOUR_TYPES[number];

const STYLE_DEFAULTS: Record<Exclude<PizzaStyleValue, 'custom'>, {
  hydration: {
    home: number;
    outdoor: number;
  };
  salt: number;
  oil: number | null;
}> = {
  'neapolitan': {
    hydration: { home: 65, outdoor: 60 },
    salt: 2.8,
    oil: 0
  },
  'new-york': {
    hydration: { home: 63, outdoor: 58 },
    salt: 2.5,
    oil: 2
  },
  'detroit': {
    hydration: { home: 70, outdoor: 68 },
    salt: 2.0,
    oil: 3
  },
  'sicilian': {
    hydration: { home: 68, outdoor: 65 },
    salt: 2.5,
    oil: 4
  },
  'roman-al-taglio': {
    hydration: { home: 75, outdoor: 72 },
    salt: 2.2,
    oil: 5
  }
};

const CUSTOM_DEFAULTS = { hydration: { home: 65, outdoor: 62 }, salt: 2.5, oil: 2 };

const FERMENTATION_OPTIONS = [
    { value: 'quick', label: 'Quick (2-4 hours)', description: 'Room temperature fermentation for same-day pizza' },
    { value: 'same-day', label: 'Same Day (8-12 hours)', description: 'Longer room temperature fermentation for better flavor' },
    { value: 'overnight', label: 'Overnight (16-20 hours)', description: 'Extended room temperature fermentation for deep flavor development' },
    { value: 'cold', label: 'Cold Ferment (24-72 hours)', description: 'Extended cold fermentation for maximum flavor development' },
    { value: 'custom', label: 'Custom Schedule', description: 'Define your own fermentation schedule' },
] as const;

type FermentationType = typeof FERMENTATION_OPTIONS[number]['value'];

// Add this near other interfaces
interface LoadingStep {
  icon: React.ReactNode;
  text: string;
}

// Add this near other constants
const LOADING_STEPS: LoadingStep[] = [
  { icon: <Wheat className="h-4 w-4" />, text: "Analyzing flour requirements..." },
  { icon: <Droplet className="h-4 w-4" />, text: "Calculating optimal hydration..." },
  { icon: <Clock className="h-4 w-4" />, text: "Determining fermentation schedule..." },
  { icon: <ChefHat className="h-4 w-4" />, text: "Finalizing expert recommendations..." }
];

// Add oven type constants
const OVEN_TYPES = {
  home: {
    label: 'Home Oven',
    description: '450-550°F',
    maxTemp: 550
  },
  outdoor: {
    label: 'Outdoor Pizza Oven',
    description: '700-950°F',
    maxTemp: 950
  }
};

type OvenType = keyof typeof OVEN_TYPES;

// Add new constants for yeast types
const YEAST_TYPES = [
  { value: 'IDY', label: 'Instant Dry Yeast (IDY)' },
  { value: 'ADY', label: 'Active Dry Yeast (ADY)' },
  { value: 'fresh', label: 'Fresh Yeast' }
] as const;

// --- End Constants ---

// Add helper functions at the top level
const formatWeight = (weight: number): number => Math.round(weight * 10) / 10;

const roundToDecimal = (value: number | undefined | null, decimals: number = 1): number => {
  if (value === undefined || value === null) {
    return 0;
  }
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
};

// Add a helper function at the top level to safely render impact lists
const renderImpactList = (impacts: string[] | undefined | null) => {
  if (!Array.isArray(impacts) || impacts.length === 0) {
    return null;
  }
  return impacts.map((impact: string, index: number) => (
    <p key={index} className="text-muted-foreground flex items-start gap-2">
      <span className="text-primary">•</span>
      {impact}
    </p>
  ));
};

// Add a helper function at the top of the file
function getFlourTypeDisplay(flour: { type: string; percentage: number; proteinContent: string; purpose: string }) {
  if (flour.type.toLowerCase() === 'not specified') {
    return {
      ...flour,
      type: 'Recommended Flour',
      purpose: flour.purpose || 'Traditional Neapolitan pizza flour with optimal protein content for proper gluten development.'
    };
  }
  return flour;
}

interface WeightCalculation {
  flourWeight: number;
  waterWeight: number;
  saltWeight: number;
  yeastWeight: number;
  oilWeight: number;
  flourMixWeights?: {
    primary: number;
    secondary: number;
  };
}

function calculateWeights(
  recipeResult: any,
  doughBalls: number,
  weightPerBall: number
): WeightCalculation {
  if (!recipeResult) {
    throw new Error("No recipe data available");
  }

  // Add detailed logging for debugging
  console.log('Recipe data for weight calculation:', {
    hydrationRecommendation: recipeResult.hydrationRecommendation,
    saltRecommendation: recipeResult.saltRecommendation,
    yeastRecommendation: recipeResult.yeastRecommendation,
    // Also log detailed analysis as fallback
    detailedHydration: recipeResult.detailedAnalysis?.hydrationAnalysis,
    detailedSalt: recipeResult.detailedAnalysis?.saltAnalysis,
    detailedYeast: recipeResult.detailedAnalysis?.yeastAnalysis,
    detailedOil: recipeResult.detailedAnalysis?.oilAnalysis
  });

  const totalWeight = doughBalls * weightPerBall;
  
  // Get percentages from API response or use defaults
  const hydrationPercent = recipeResult.hydrationRecommendation?.percentage || recipeResult.detailedAnalysis?.hydrationAnalysis?.percentage || 65;
  const saltPercent = recipeResult.saltRecommendation?.percentage || recipeResult.detailedAnalysis?.saltAnalysis?.percentage || 2.8;
  const yeastPercent = recipeResult.yeastRecommendation?.percentage || recipeResult.detailedAnalysis?.yeastAnalysis?.percentage || 0.2;
  const oilPercent = recipeResult.detailedAnalysis?.oilAnalysis?.percentage || 0; // Oil is less critical, default to 0

  const hydration = hydrationPercent / 100;
  const salt = saltPercent / 100;
  const yeast = yeastPercent / 100;
  const oil = oilPercent / 100;

  console.log('Ingredient percentages used for calculation:', {
    hydration: hydrationPercent.toFixed(1) + '%',
    salt: saltPercent.toFixed(1) + '%',
    yeast: yeastPercent.toFixed(2) + '%',
    oil: oilPercent.toFixed(1) + '%'
  });

  // Calculate flour weight as base (100%)
  const flourWeight = totalWeight / (1 + hydration + salt + yeast + oil);
  
  // Calculate other weights based on flour weight
  const waterWeight = flourWeight * hydration;
  const saltWeight = flourWeight * salt;
  const yeastWeight = flourWeight * yeast; // Use the decimal percentage directly
  const oilWeight = flourWeight * oil;

  // Calculate flour mix weights if applicable
  let flourMixWeights;
  if (recipeResult.recipe?.flourMix?.secondaryType) {
    const primaryPercentage = recipeResult.recipe.flourMix.primaryPercentage / 100;
    flourMixWeights = {
      primary: flourWeight * primaryPercentage,
      secondary: flourWeight * (1 - primaryPercentage)
    };
  }

  console.log('Calculated weights (raw):', {
    totalWeight,
    flourWeight,
    waterWeight,
    saltWeight,
    yeastWeight,
    oilWeight,
    flourMixWeights
  });

  return {
    flourWeight: Math.round(flourWeight),
    waterWeight: Math.round(waterWeight),
    saltWeight: roundToDecimal(saltWeight, 1), // Round salt to 1 decimal
    yeastWeight: roundToDecimal(yeastWeight, 1), // Round yeast to 1 decimal
    oilWeight: Math.round(oilWeight),
    flourMixWeights: flourMixWeights ? {
      primary: Math.round(flourMixWeights.primary),
      secondary: Math.round(flourMixWeights.secondary)
    } : undefined
  };
}

// Add helper function for temperature conversion and display
const formatTemperature = (temp: number | undefined, unit: 'C' | 'F'): string => {
  if (temp === undefined || temp === null) return '';
  if (unit === 'F') {
    // Convert Celsius to Fahrenheit
    return `${Math.round(temp * 9/5 + 32)}°F`;
  }
  return `${temp}°C`;
};

// Add a timeout component to handle long-running requests
function RequestTimeoutAlert({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert variant="destructive" className="mt-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Request Timeout</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          The calculation is taking longer than expected. This could be due to server load or complex recipe parameters.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try Again
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Reset Calculator
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

export function DoughCalculator() {
  // Define URL params at the very top
  const searchParams = useSearchParams();
  const initialStyleFromUrl = searchParams.get('style') as PizzaStyleValue | null;
  // Validate the style from URL
  const isValidInitialStyle = initialStyleFromUrl && 
    PIZZA_STYLE_OPTIONS.some(option => option.value === initialStyleFromUrl);
  
  // --- State ---
  const [error, setError] = useState<string | null>(null);
  const [doughBalls, setDoughBalls] = useState<string>('4');
  const [weightPerBall, setWeightPerBall] = useState<string>('250');
  const [selectedStyle, setSelectedStyle] = useState<PizzaStyleValue>(
    isValidInitialStyle ? initialStyleFromUrl : 'neapolitan'
  );
  console.log('Initial style set to:', isValidInitialStyle ? initialStyleFromUrl : 'neapolitan', 'from URL param:', initialStyleFromUrl);
  const [altitude, setAltitude] = useState('');
  const [ovenType, setOvenType] = useState<OvenType>('home');

  // Ingredient Sliders
  const [hydration, setHydration] = useState<number>(65);
  const [salt, setSalt] = useState<number>(2.8);
  const [oil, setOil] = useState<number>(0);

  // Custom Style State
  const [isCustomStyle, setIsCustomStyle] = useState(false);
  const [primaryFlourType, setPrimaryFlourType] = useState<FlourType>(FLOUR_TYPES[0]);
  const [addSecondaryFlour, setAddSecondaryFlour] = useState(false);
  const [secondaryFlourType, setSecondaryFlourType] = useState<FlourType>(FLOUR_TYPES[1]);
  const [primaryFlourPercentage, setPrimaryFlourPercentage] = useState(100);

  // API State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [recipeResult, setRecipeResult] = useState<ApiResponse | null>(null);
  const [isCalculated, setIsCalculated] = useState<boolean>(false);

  // Add default state for missing API fields
  const [defaultYeastType] = useState<'fresh' | 'active dry' | 'instant'>('instant');
  const [defaultFermentationType] = useState<'room' | 'cold' | 'custom'>('room');

  // Add to State section
  const [fermentationTime, setFermentationTime] = useState<FermentationType>('overnight');
  const [targetDate, setTargetDate] = useState<Date>();

  // Add this inside the DoughCalculator component, near other state
  const [loadingStep, setLoadingStep] = useState<number>(0);

  // Add new state for tracking changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Add a unique key state for the timeline component
  const [timelineKey, setTimelineKey] = useState<number>(0);

  // Update state section
  const [yeastType, setYeastType] = useState<'IDY' | 'ADY' | 'fresh'>('IDY');
  const [customYeastPercentage, setCustomYeastPercentage] = useState<string>('');
  const [roomTemp, setRoomTemp] = useState<string>('72'); // Default to 72°F
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('F'); // Default to Fahrenheit

  // Add a ref to track if initial URL param has been applied
  const initialUrlParamApplied = useRef(false);

  // --- Effects ---
  // Add effect to read style from URL params - we now only need this for changes after initial mount
  useEffect(() => {
    if (!initialUrlParamApplied.current) {
      initialUrlParamApplied.current = true;
      return; // Skip first run since we handle initial value in useState
    }
    
    const styleParam = searchParams.get('style');
    if (styleParam) {
      // Check if the style from URL is valid
      const isValidStyle = PIZZA_STYLE_OPTIONS.some(option => option.value === styleParam);
      if (isValidStyle && styleParam !== selectedStyle) {
        console.log('Updating style from URL param change:', styleParam);
        setSelectedStyle(styleParam as PizzaStyleValue);
      }
    }
  }, [searchParams, selectedStyle]);

  useEffect(() => {
    // Skip this effect if we're still initializing from URL params
    const isCustom = selectedStyle === 'custom';
    setIsCustomStyle(isCustom);
    setRecipeResult(null);
    setError(null);
    setTimelineKey(prev => prev + 1); // Force timeline remount

    if (!isCustom) {
      if (selectedStyle in STYLE_DEFAULTS) {
          const defaults = STYLE_DEFAULTS[selectedStyle as Exclude<PizzaStyleValue, 'custom'>];
          setHydration(defaults.hydration[ovenType]);
          setSalt(defaults.salt);
          setOil(defaults.oil ?? 0);
      } else {
          setHydration(CUSTOM_DEFAULTS.hydration[ovenType]);
          setSalt(CUSTOM_DEFAULTS.salt);
          setOil(CUSTOM_DEFAULTS.oil);
      }
      // Reset custom flour settings when switching away from custom style
      setAddSecondaryFlour(false);
      setPrimaryFlourPercentage(100);
    }
  }, [selectedStyle, ovenType]);

  // Update fermentation time effect to completely destroy and recreate state
  useEffect(() => {
    console.log("Fermentation type changed, resetting state");
    setRecipeResult(null);
    setError(null);
    setIsCalculated(false);
    setHasUnsavedChanges(false);
    setTimelineKey(prev => prev + 1); // Force timeline remount
  }, [fermentationTime]);

  useEffect(() => {
    setRecipeResult(null);
    setError(null);
  }, [doughBalls, weightPerBall, altitude, hydration, salt, oil, primaryFlourType, addSecondaryFlour, secondaryFlourType, primaryFlourPercentage]);

  // Add this inside the DoughCalculator component, near other effects
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 1500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Add this effect to track changes
  useEffect(() => {
    if (recipeResult) {
      setHasUnsavedChanges(true);
    }
  }, [
    doughBalls,
    weightPerBall,
    hydration,
    salt,
    oil,
    selectedStyle,
    fermentationTime,
    targetDate,
    altitude,
    primaryFlourType,
    secondaryFlourType,
    primaryFlourPercentage,
    addSecondaryFlour
  ]);

  // --- Memos ---
  const flourMixInput = useMemo((): FlourMix | null => {
    if (!isCustomStyle) return null;
    return {
        primaryType: primaryFlourType,
        secondaryType: addSecondaryFlour ? secondaryFlourType : null,
        primaryPercentage: addSecondaryFlour ? primaryFlourPercentage : 100,
    };
  }, [isCustomStyle, primaryFlourType, addSecondaryFlour, secondaryFlourType, primaryFlourPercentage]);
  // --- End Memos ---

  // Completely replace the resetState function with a more robust version
  const resetState = () => {
    console.log("Resetting recipe state");
    setRecipeResult(null);
    setError(null);
    setIsCalculated(false);
    setHasUnsavedChanges(false);
    setTimelineKey(prev => prev + 1); // Force timeline remount
  };

  // --- Handlers ---
  const getFermentationDetails = (schedule: FermentationType): FermentationScheduleConfig => {
    const defaultSchedules: Record<FermentationType, FermentationScheduleConfig> = {
      'quick': {
        duration: { min: 2, max: 4 },
        temperature: { room: 22, cold: null },
        description: 'Quick same-day fermentation at room temperature'
      },
      'same-day': {
        duration: { min: 8, max: 12 },
        temperature: { room: 22, cold: null },
        description: 'Extended room temperature fermentation'
      },
      'overnight': {
        duration: { min: 16, max: 20 },
        temperature: { room: 22, cold: null },
        description: 'Long room temperature fermentation for maximum flavor development'
      },
      'cold': {
        duration: { min: 24, max: 72 },
        temperature: { room: 22, cold: 4 },
        description: 'Extended cold fermentation for complex flavor development'
      },
      'custom': {
        duration: { min: 4, max: 72 },
        temperature: { room: 22, cold: null },
        description: 'Custom fermentation schedule'
      }
    };
    return defaultSchedules[schedule];
  };

  // Update the isColdFermentation helper to only return true for cold fermentation
  const isColdFermentation = (schedule: FermentationType) => {
    return schedule === 'cold';
  };

  // Update the handleCalculate function to include oven type
  const handleCalculate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Reset all state to ensure fresh calculation
    setRecipeResult(null);
    setError(null);
    setIsCalculated(false);
    setHasUnsavedChanges(false);
    setTimelineKey(prev => prev + 1);
    
    setIsLoading(true);
    setLoadingStep(0);

    // Set up loading animation
    const loadingInterval = setInterval(() => {
      setLoadingStep(step => (step + 1) % LOADING_STEPS.length);
    }, 2000);

    try {
    const numDoughBalls = parseInt(doughBalls);
    const numWeightPerBall = parseInt(weightPerBall);

    if (isNaN(numDoughBalls) || numDoughBalls <= 0 || isNaN(numWeightPerBall) || numWeightPerBall <= 0) {
        throw new Error("Please enter valid numbers for Dough Balls and Weight/Ball.");
      }

      console.log('Calculating recipe with parameters:', {
        style: selectedStyle,
        doughBalls: numDoughBalls,
        weightPerBall: numWeightPerBall,
        hydration,
        salt,
        oil,
        yeastType,
        roomTemp,
        tempUnit,
        fermentationTime,
        ovenType
      });

      const selectedOvenType = OVEN_TYPES[ovenType];
      
      // Remove temperature conversion - send temperature as-is
      const currentTemp = parseFloat(roomTemp);
      if (isNaN(currentTemp)) {
        throw new Error("Please enter a valid room temperature.");
      }

      const fermentationDetails = getFermentationDetails(fermentationTime);
      const usesColdFermentation = isColdFermentation(fermentationTime);

        const payload: ApiPayload = {
            doughBalls: numDoughBalls,
            weightPerBall: numWeightPerBall,
            style: selectedStyle,
            recipe: {
          hydration: roundToDecimal(hydration),
          salt: roundToDecimal(salt),
          oil: oil > 0 ? roundToDecimal(oil) : null,
                flourMix: isCustomStyle && addSecondaryFlour ? {
                    primaryType: primaryFlourType,
                    secondaryType: secondaryFlourType,
                    primaryPercentage: primaryFlourPercentage
                } : null,
                fermentationTime: fermentationTime,
                yeast: {
            type: yeastType
                }
            },
            fermentation: {
                schedule: fermentationTime,
          temperature: {
            room: usesColdFermentation ? currentTemp : fermentationDetails.temperature.room,
            cold: usesColdFermentation ? fermentationDetails.temperature.cold : null
          },
          duration: fermentationDetails.duration
        },
        environment: {
          ...(altitude ? { altitude: parseInt(altitude) } : {}),
          ovenType: ovenType,
          maxOvenTemp: selectedOvenType?.maxTemp,
          roomTemp: currentTemp,
          tempUnit: tempUnit
        },
            analysisPreferences: {
                detailedAnalysis: true,
                explainRationale: true,
                avoidGenericResponses: true,
                requireSpecificAnalysis: true,
          includeAutolyse: true,
          skipAutolyse: false,
          processSteps: {
            autolyse: true,
            initialMix: true,
            bulkFermentation: true,
            divideAndBall: true,
            finalProof: true
          }
        }
      };

      console.log('Sending API request with payload:', payload);

      // Set up the request timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 110000); // 110 second timeout

      const response = await fetch(`/api/recipe-adjust?t=${Date.now()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
        
        // Handle specific timeout errors from the server
        if (response.status === 504 || errorData.isTimeout) {
          throw new Error('Request timed out. The calculation is taking longer than expected.');
        }
        
        throw new Error(errorData.error || 'Internal server error');
      }

      const data = await response.json();
      console.log('API Response (Raw):', JSON.stringify(data, null, 2));

      if (!data || typeof data !== 'object') {
        console.error('Invalid API response format:', data);
        throw new Error('Invalid response format from API');
      }

      // Ensure all sections are properly populated
      const processedData = {
        ...data,
        // Copy temperature analysis directly from root or use default
        temperatureAnalysis: data.temperatureAnalysis || {
          roomTemp: parseFloat(roomTemp),
          rationale: "Temperature affects fermentation rate and dough development.",
          recommendations: ["Monitor your room temperature", "Adjust fermentation time accordingly"]
        },
        
        // Ensure all detailed analysis sections exist and have proper content
        detailedAnalysis: {
          ...data.detailedAnalysis,
          
          // Handle flour analysis
          flourAnalysis: {
            ...data.detailedAnalysis?.flourAnalysis,
            rationale: data.detailedAnalysis?.flourAnalysis?.rationale || "Select flour based on protein content appropriate for style.",
            flours: Array.isArray(data.detailedAnalysis?.flourAnalysis?.flours) 
              ? data.detailedAnalysis.flourAnalysis.flours 
              : [{
                  type: primaryFlourType || "00 Flour",
                  proteinContent: 12.5,
                  purpose: "Base flour for pizza dough"
                }]
          },
          
          // Handle hydration analysis
          hydrationAnalysis: {
            ...data.detailedAnalysis?.hydrationAnalysis,
            percentage: data.detailedAnalysis?.hydrationAnalysis?.percentage || hydration,
            rationale: data.detailedAnalysis?.hydrationAnalysis?.rationale || "Provides the right balance of extensibility and strength.",
            impact: Array.isArray(data.detailedAnalysis?.hydrationAnalysis?.impact)
              ? data.detailedAnalysis.hydrationAnalysis.impact
              : ["Affects dough extensibility", "Influences final texture", "Changes fermentation rate"]
          },
          
          // Handle salt analysis
          saltAnalysis: {
            ...data.detailedAnalysis?.saltAnalysis,
            percentage: data.detailedAnalysis?.saltAnalysis?.percentage || salt,
            rationale: data.detailedAnalysis?.saltAnalysis?.rationale || "Controls fermentation rate and enhances flavor.",
            impact: Array.isArray(data.detailedAnalysis?.saltAnalysis?.impact)
              ? data.detailedAnalysis.saltAnalysis.impact
              : ["Strengthens gluten structure", "Controls fermentation rate", "Enhances flavor"]
          },
          
          // Handle yeast analysis
          yeastAnalysis: {
            ...data.detailedAnalysis?.yeastAnalysis,
            type: data.detailedAnalysis?.yeastAnalysis?.type || yeastType,
            percentage: data.detailedAnalysis?.yeastAnalysis?.percentage || 
                      (fermentationTime === 'quick' ? 0.8 : 
                       fermentationTime === 'same-day' ? 0.3 : 0.1),
            rationale: data.detailedAnalysis?.yeastAnalysis?.rationale || 
                      `Amount adjusted for ${fermentationTime} fermentation at ${roomTemp}°${tempUnit}.`,
            impact: Array.isArray(data.detailedAnalysis?.yeastAnalysis?.impact)
              ? data.detailedAnalysis.yeastAnalysis.impact
              : ["Determines fermentation speed", "Affects flavor development", "Responds to temperature changes"],
            temperatureNotes: Array.isArray(data.detailedAnalysis?.yeastAnalysis?.temperatureNotes)
              ? data.detailedAnalysis.yeastAnalysis.temperatureNotes
              : [`At ${roomTemp}°${tempUnit}, fermentation will be ${
                  parseFloat(roomTemp) > (tempUnit === 'F' ? 75 : 24) ? 'faster' : 'slower'
                }`, "Adjust fermentation time accordingly"]
          },
          
          // Handle fermentation analysis
          fermentationAnalysis: {
            ...data.detailedAnalysis?.fermentationAnalysis,
            type: data.detailedAnalysis?.fermentationAnalysis?.type || fermentationTime,
            totalTime: data.detailedAnalysis?.fermentationAnalysis?.totalTime || 
                      (fermentationTime === 'quick' ? 4 :
                       fermentationTime === 'same-day' ? 10 :
                       fermentationTime === 'overnight' ? 18 : 36),
            rationale: data.detailedAnalysis?.fermentationAnalysis?.rationale || 
                      `${fermentationTime} fermentation develops appropriate flavor and structure.`,
            impact: Array.isArray(data.detailedAnalysis?.fermentationAnalysis?.impact)
              ? data.detailedAnalysis.fermentationAnalysis.impact
              : ["Develops complex flavors", "Improves texture", "Enhances digestibility"],
            roomTemp: {
              time: data.detailedAnalysis?.fermentationAnalysis?.roomTemp?.time || 
                    (fermentationTime === 'quick' ? 3 :
                     fermentationTime === 'same-day' ? 10 : 2),
              temperature: data.detailedAnalysis?.fermentationAnalysis?.roomTemp?.temperature || 
                          parseFloat(roomTemp),
              impact: Array.isArray(data.detailedAnalysis?.fermentationAnalysis?.roomTemp?.impact)
                ? data.detailedAnalysis.fermentationAnalysis.roomTemp.impact
                : ["Sets foundation for gluten development", "Initiates yeast activity"]
            },
            ...(fermentationTime === 'overnight' || fermentationTime === 'cold' 
              ? {
                  coldTemp: data.detailedAnalysis?.fermentationAnalysis?.coldTemp || {
                    time: fermentationTime === 'overnight' ? 14 : 36,
                    temperature: 4,
                    impact: ["Slows fermentation for flavor development", "Enhances digestibility"]
                  }
                } 
              : {}),
            enzymaticActivity: data.detailedAnalysis?.fermentationAnalysis?.enzymaticActivity || 
                              "Balanced enzymatic activity helps develop flavor and texture.",
            gluten: data.detailedAnalysis?.fermentationAnalysis?.gluten || 
                   "Progressive gluten development creates extensible yet strong dough."
          },
          
          // Handle technique guidance
          techniqueGuidance: data.detailedAnalysis?.techniqueGuidance || {
            mixing: "Mix ingredients until just combined, then rest before kneading gently.",
            folding: "Use stretch and folds during bulk fermentation to build strength.",
            shaping: "Shape gently to preserve gas, forming tight, smooth dough balls.",
            baking: `Preheat your ${ovenType === 'home' ? 'oven and stone/steel' : 'pizza oven'} thoroughly before baking.`
          }
        },
        timeline: Array.isArray(data.timeline) 
          ? data.timeline.map((step: any) => ({
              ...step,
              day: step.day || 0,
              timeOfDay: step.timeOfDay || '',
              title: step.title || '',
              instructions: step.instructions || '',
              duration: step.duration || '',
              tips: Array.isArray(step.tips) ? step.tips : []
            }))
          : [],
        techniqueGuidance: Array.isArray(data.techniqueGuidance) ? data.techniqueGuidance : []
      };

      console.log('Processed API Response:', JSON.stringify(processedData, null, 2));
      setRecipeResult(processedData);
      setIsCalculated(true);
      setLoadingStep(2);
      
      // Log analytics event
      trackEvent('calculate_recipe', {
        event_category: 'Recipe',
        event_label: selectedStyle,
        value: numDoughBalls
      });

    } catch (error) {
      console.error('Error calculating recipe:', error);
      clearInterval(loadingInterval);
      setIsLoading(false);
      
      // Check if it's an AbortError (client-side timeout) or a server timeout message
      if (
        error instanceof DOMException && error.name === 'AbortError' || 
        (error instanceof Error && error.message.includes('timeout'))
      ) {
        setError('Request timed out. Please try again with simpler recipe parameters.');
      } else {
        setError(`Error: ${error instanceof Error ? error.message : 'Failed to calculate recipe'}`);
      }
    } finally {
      clearInterval(loadingInterval);
    }
  };

  // Update the Hydration slider to use rounded values
  const handleHydrationChange = (value: number[]) => {
    setHydration(roundToDecimal(value[0]));
    resetState();
  };

  // Update the Salt slider to use rounded values
  const handleSaltChange = (value: number[]) => {
    setSalt(roundToDecimal(value[0]));
    resetState();
  };

  // Update the Oil slider to use rounded values
  const handleOilChange = (value: number[]) => {
    setOil(roundToDecimal(value[0]));
    resetState();
  };

  // Restore original handler signature (no console log)
  const handleSecondaryFlourToggle = (checked: boolean) => {
    setAddSecondaryFlour(checked);
    resetState();
    if (!checked) {
      setPrimaryFlourPercentage(100);
    }
  };

  const handleDoughBallsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
        setDoughBalls('');
        resetState();
        return;
    }
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 100) {
        setDoughBalls(value);
        resetState();
    }
  };

  const handleWeightPerBallChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
        setWeightPerBall('');
        resetState();
        return;
    }
    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
        setWeightPerBall(value);
        resetState();
    }
  };

  // --- End Handlers ---

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="relative z-50">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl sm:text-3xl">Pizza Dough Calculator</CardTitle>
            <CardDescription>Create your perfect pizza dough recipe</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCalculate} className="space-y-8">
              {/* Main Configuration */}
              <div className="space-y-8">
                {/* Style and Fermentation */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Style Selection */}
                    <div className="space-y-2">
                    <Label className="text-sm font-medium">Pizza Style</Label>
                    <Select 
                      value={selectedStyle} 
                      onValueChange={(v) => {
                        console.log('Style changed to:', v);
                        setSelectedStyle(v as PizzaStyleValue);
                        resetState();
                        trackEvent('style_selected', { style: v });
                      }}
                      required
                    >
                      <SelectTrigger className="relative bg-background h-10">
                          <SelectValue placeholder="Select pizza style" />
                        </SelectTrigger>
                      <SelectContent sideOffset={4} className="z-[60]">
                          {PIZZA_STYLE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Fermentation Selection */}
                    <div className="space-y-2">
                    <Label className="text-sm font-medium">Fermentation Schedule</Label>
                    <Select 
                      value={fermentationTime} 
                      onValueChange={(v) => {
                        setFermentationTime(v as FermentationType);
                        resetState(); // Explicitly reset state when changing fermentation type
                        trackEvent('fermentation_selected', { 
                          fermentation_time: v,
                          style: selectedStyle
                        });
                      }}
                    >
                      <SelectTrigger className="relative bg-background h-10">
                          <SelectValue placeholder="Select fermentation time" />
                        </SelectTrigger>
                      <SelectContent sideOffset={4} className="z-[60]">
                          {FERMENTATION_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                {/* Custom Schedule UI */}
                {fermentationTime === 'custom' && (
                  <Card className="bg-muted/30">
                    <CardContent className="pt-4">
                      <div className="space-y-4">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal relative bg-background",
                                !targetDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {targetDate ? (
                                format(targetDate, "PPP 'at' h:mm a")
                              ) : (
                                <span>Select target date & time</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 z-[100]" align="start">
                            <div className="p-4 space-y-4">
                              <Calendar
                                mode="single"
                                selected={targetDate}
                                onSelect={(date) => {
                                  if (date) {
                                    const newDate = new Date(date);
                                    if (targetDate) {
                                      newDate.setHours(targetDate.getHours());
                                      newDate.setMinutes(targetDate.getMinutes());
                                    } else {
                                      newDate.setHours(12);
                                      newDate.setMinutes(0);
                                    }
                                    setTargetDate(newDate);
                                  }
                                }}
                                initialFocus
                              />
                              <div className="border-t pt-4">
                                <Label>Time</Label>
                                <Input
                                  type="time"
                                  value={targetDate ? format(targetDate, "HH:mm") : "12:00"}
                                  onChange={(e) => {
                                    const [hours, minutes] = e.target.value.split(':').map(Number);
                                    const newDate = new Date(targetDate || new Date());
                                    newDate.setHours(hours);
                                    newDate.setMinutes(minutes);
                                    setTargetDate(newDate);
                                  }}
                                  className="mt-2"
                                />
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                        <p className="text-sm text-muted-foreground">
                          Select when you want your dough to be ready. We'll calculate the optimal schedule.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                  {/* Basic Measurements */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Dough Balls</Label>
                      <Input 
                        type="number" 
                        placeholder="4" 
                        min="1"
                        max="100"
                        required 
                        value={doughBalls} 
                        onChange={handleDoughBallsChange}
                      className="relative bg-background h-10"
                      />
                    </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Weight/Ball (g)</Label>
                      <Input 
                        type="number" 
                        placeholder="280" 
                        min="100"
                        max="1000"
                        required 
                        value={weightPerBall} 
                        onChange={handleWeightPerBallChange}
                      className="relative bg-background h-10"
                      />
                    </div>
                  </div>

                {/* Ingredient Controls */}
                  <div className="space-y-6">
                  {/* Custom Flour Section */}
                  {isCustomStyle && (
                    <Card className="bg-muted/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Custom Flour Mix</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Primary Flour</Label>
                          <Select value={primaryFlourType} onValueChange={(v) => {
                            setPrimaryFlourType(v as FlourType);
                            resetState();
                          }}>
                            <SelectTrigger className="relative bg-background">
                            <SelectValue placeholder="Select primary flour" />
                          </SelectTrigger>
                            <SelectContent sideOffset={4} className="z-[60]">
                            {FLOUR_TYPES.map((flour) => (
                              <SelectItem key={flour} value={flour}>{flour}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={addSecondaryFlour}
                            onCheckedChange={handleSecondaryFlourToggle}
                          />
                          <Label>Add secondary flour</Label>
                        </div>

                        {addSecondaryFlour && (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Secondary Flour</Label>
                              <Select value={secondaryFlourType} onValueChange={(v) => {
                                setSecondaryFlourType(v as FlourType);
                                resetState();
                              }}>
                                <SelectTrigger className="relative bg-background">
                                <SelectValue placeholder="Select secondary flour" />
                              </SelectTrigger>
                                <SelectContent sideOffset={4} className="z-[60]">
                                {FLOUR_TYPES.map((flour) => (
                                  <SelectItem key={flour} value={flour}>{flour}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            </div>

                            <div className="space-y-4">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium">{primaryFlourType}</span>
                                <span>{primaryFlourPercentage}%</span>
                              </div>
                              <Slider
                                value={[primaryFlourPercentage]}
                                onValueChange={(value) => {
                                  setPrimaryFlourPercentage(value[0]);
                                  resetState();
                                }}
                                min={0}
                                max={100}
                                step={5}
                                className="relative"
                              />
                              <div className="flex justify-between text-sm text-muted-foreground">
                                <span>{secondaryFlourType}</span>
                                <span>{100 - primaryFlourPercentage}%</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Oven Type Section - Moved out of advanced options */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ovenType">Oven Type</Label>
                      <span className="text-muted-foreground text-sm">
                        {OVEN_TYPES[ovenType].maxTemp}°F max
                      </span>
                      </div>
                    <Select 
                      value={ovenType}
                      onValueChange={(value: OvenType) => setOvenType(value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select oven type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="home">
                          {OVEN_TYPES.home.label} ({OVEN_TYPES.home.description})
                        </SelectItem>
                        <SelectItem value="outdoor">
                          {OVEN_TYPES.outdoor.label} ({OVEN_TYPES.outdoor.description})
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    </div>

                  {/* Core Ingredient Sliders */}
                  <div className="grid gap-6 pt-2">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Hydration</Label>
                        <span className="text-sm font-medium">{hydration}%</span>
                      </div>
                      <Slider
                        value={[hydration]}
                        onValueChange={handleHydrationChange}
                        min={50}
                        max={85}
                        step={0.5}
                        className="relative"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Salt</Label>
                        <span className="text-sm font-medium">{salt}%</span>
                      </div>
                      <Slider
                        value={[salt]}
                        onValueChange={handleSaltChange}
                        min={1.5}
                        max={3.5}
                        step={0.1}
                        className="relative"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Oil</Label>
                        <span className="text-sm font-medium">{oil}%</span>
                      </div>
                      <Slider
                        value={[oil]}
                        onValueChange={handleOilChange}
                        min={0}
                        max={8}
                        step={0.5}
                        className="relative"
                      />
                    </div>
                  </div>
                </div>

                {/* Temperature Controls */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Yeast Type</Label>
                      <Select value={yeastType} onValueChange={(value: 'IDY' | 'ADY' | 'fresh') => setYeastType(value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select yeast type" />
                        </SelectTrigger>
                        <SelectContent>
                          {YEAST_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Room Temperature</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder={tempUnit === 'F' ? "e.g., 22" : "e.g., 72"}
                          value={roomTemp}
                          onChange={(e) => {
                            const value = e.target.value;
                            setRoomTemp(value);
                            resetState();
                          }}
                          step="0.1"
                          min={tempUnit === 'C' ? "10" : "50"}
                          max={tempUnit === 'C' ? "35" : "95"}
                          className="flex-1"
                        />
                        <Select 
                          value={tempUnit} 
                          onValueChange={(value: 'C' | 'F') => {
                            const oldTemp = parseFloat(roomTemp);
                            if (!isNaN(oldTemp)) {
                              const newTemp = value === 'C' 
                                ? Math.round((oldTemp - 32) * 5 / 9 * 10) / 10
                                : Math.round((oldTemp * 9 / 5 + 32) * 10) / 10;
                              setRoomTemp(newTemp.toString());
                            }
                            setTempUnit(value);
                          }}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue placeholder="Unit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="C">°C</SelectItem>
                            <SelectItem value="F">°F</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Calculate Button */}
                <Button 
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{LOADING_STEPS[loadingStep].text}</span>
                    </div>
                  ) : (
                    <span>Calculate Recipe</span>
                  )}
                  </Button>
                </div>
              </form>
          </CardContent>
        </Card>

        {/* Results Section */}
        {error && (
          error.includes('timeout') ? (
            <RequestTimeoutAlert onRetry={() => handleCalculate(new Event('submit') as unknown as React.FormEvent<HTMLFormElement>)} />
          ) : (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )
        )}

        {isCalculated && recipeResult && (
          <div className="space-y-6 mt-6" key={timelineKey}>
              {/* Recipe Card */}
              <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <ChefHat className="h-5 w-5" />
                  Recipe for {selectedStyle.charAt(0).toUpperCase() + selectedStyle.slice(1)} Pizza Dough
                </CardTitle>
                <CardDescription>
                  {doughBalls} x {weightPerBall}g dough balls with {recipeResult?.detailedAnalysis?.hydrationAnalysis?.percentage || hydration}% hydration
                </CardDescription>
                </CardHeader>
              <CardContent className="space-y-6">
                {/* Weights */}
                    <div>
                  <h3 className="font-medium text-sm mb-3">Ingredient Weights</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(() => {
                      try {
                        const weights = calculateWeights(recipeResult, parseInt(doughBalls), parseInt(weightPerBall));
                        
                        return (
                          <>
                            <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                              <div className="flex items-center gap-2">
                                <Wheat className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Flour</span>
                              </div>
                              <p className="text-2xl font-semibold">{weights.flourWeight}g</p>
                                  </div>
                            <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                              <div className="flex items-center gap-2">
                                <Droplets className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Water</span>
                                  </div>
                              <p className="text-2xl font-semibold">{weights.waterWeight}g</p>
                                </div>
                            <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                              <div className="flex items-center gap-2">
                                <CircleDot className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Salt</span>
                            </div>
                              <p className="text-2xl font-semibold">{weights.saltWeight}g</p>
                              </div>
                            <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                              <div className="flex items-center gap-2">
                                <Beaker className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Yeast</span>
                              </div>
                              <p className="text-2xl font-semibold">{weights.yeastWeight.toFixed(1)}g</p>
                              </div>
                              {weights.oilWeight > 0 && (
                              <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                                <div className="flex items-center gap-2">
                                  <Droplet className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">Oil</span>
                                </div>
                                <p className="text-2xl font-semibold">{weights.oilWeight}g</p>
                                </div>
                              )}
                          </>
                        );
                      } catch (error) {
                        console.error("Error calculating weights:", error);
                        return (
                          <div className="col-span-4 text-sm text-muted-foreground">
                            Error calculating weights. Please try again.
                          </div>
                        );
                      }
                    })()}
                            </div>

                  {/* Custom flour mix if applicable */}
                  {recipeResult?.recipe?.flourMix && recipeResult.recipe.flourMix.secondaryType && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Flour Mix</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {(() => {
                          try {
                            const weights = calculateWeights(recipeResult, parseInt(doughBalls), parseInt(weightPerBall));
                            if (!weights.flourMixWeights) return null;
                            
                            return (
                              <>
                                <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Wheat className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">
                                      {recipeResult.recipe?.flourMix?.primaryType || 'Primary'} ({recipeResult.recipe?.flourMix?.primaryPercentage}%)
                                    </span>
                              </div>
                                  <p className="text-2xl font-semibold">{weights.flourMixWeights.primary}g</p>
                              </div>
                                <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Wheat className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">
                                      {recipeResult.recipe?.flourMix?.secondaryType || 'Secondary'} ({100 - (recipeResult.recipe?.flourMix?.primaryPercentage || 0)}%)
                                    </span>
                            </div>
                                  <p className="text-2xl font-semibold">{weights.flourMixWeights.secondary}g</p>
                          </div>
                              </>
                        );
                          } catch (error) {
                            console.error("Error calculating flour mix weights:", error);
                            return null;
                          }
                      })()}
                    </div>
                    </div>
                  )}
                  </div>
                </CardContent>
              </Card>

            {/* Timeline */}
            <Card className="mb-6">
                <CardHeader>
                <CardTitle className="text-lg font-semibold">Process Timeline</CardTitle>
                <CardDescription>Step by step guide for your dough preparation</CardDescription>
                </CardHeader>
                <CardContent>
                {recipeResult?.processTimeline?.steps?.map((step, index) => {
                  const timelineConnector = index !== recipeResult.processTimeline.steps.length - 1 ? (
                    <div className="absolute left-[11px] top-2 h-full w-[2px] bg-muted-foreground/20" />
                  ) : null;

                  return (
                    <div key={index} className="relative pl-8 pb-6 last:pb-0">
                      {timelineConnector}
                      <div className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {step.step}
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          {step.duration && (
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4" />
                              <span>{step.duration}</span>
                            </div>
                          )}
                          {step.isRefrigeration && (
                            <div className="flex items-center gap-1.5">
                              <Thermometer className="h-4 w-4 text-blue-500" />
                              <span>Refrigeration Step</span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-foreground pt-1">{step.description}</p>
                        {step.tips && step.tips.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            {step.tips.map((tip, tipIndex) => (
                              <div key={tipIndex} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <LightbulbIcon className="h-4 w-4 mt-0.5 text-yellow-500 flex-shrink-0" />
                                <span>{tip}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                </CardContent>
              </Card>

            {/* Technical Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Technical Analysis</CardTitle>
                <CardDescription>Detailed breakdown of your recipe</CardDescription>
              </CardHeader>
              <CardContent>
                {recipeResult?.detailedAnalysis ? (
                  <div className="space-y-8">
                    <Tabs defaultValue="flour" className="w-full">
                      <TabsList className="mb-4">
                        <TabsTrigger value="flour" className="text-xs flex-shrink-0">
                          <Wheat className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Flour</span>
                        </TabsTrigger>
                        <TabsTrigger value="hydration" className="text-xs flex-shrink-0">
                          <Droplets className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Hydration</span>
                        </TabsTrigger>
                        <TabsTrigger value="salt" className="text-xs flex-shrink-0">
                          <CircleDot className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Salt</span>
                        </TabsTrigger>
                        <TabsTrigger value="yeast" className="text-xs flex-shrink-0">
                          <Beaker className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Yeast</span>
                        </TabsTrigger>
                        <TabsTrigger value="temperature" className="text-xs flex-shrink-0">
                          <Thermometer className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Temperature</span>
                        </TabsTrigger>
                        <TabsTrigger value="fermentation" className="text-xs flex-shrink-0">
                          <Clock className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Fermentation</span>
                        </TabsTrigger>
                        <TabsTrigger value="technique" className="text-xs flex-shrink-0">
                          <Utensils className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Technique</span>
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="flour" className="space-y-4">
                        {recipeResult.flourRecommendation?.primary && (
                          <div className="p-4 bg-muted/30 rounded-lg">
                            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                              <Wheat className="h-5 w-5" />
                              Recommended Flour
                            </h3>
                            <div className="space-y-2">
                              <p className="font-semibold">{recipeResult.flourRecommendation.primary.name}</p>
                              <Badge variant="outline">{recipeResult.flourRecommendation.primary.protein}</Badge>
                              <p className="text-muted-foreground mt-1">{recipeResult.flourRecommendation.primary.description}</p>
                            </div>
                          </div>
                        )}

                        {recipeResult.flourRecommendation?.alternatives && recipeResult.flourRecommendation.alternatives.length > 0 && (
                          <div className="p-4 bg-muted/30 rounded-lg">
                            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                              <Wheat className="h-5 w-5" />
                              Alternative Flours
                            </h3>
                            {recipeResult.flourRecommendation.alternatives.map((flour, index) => (
                              <div key={index} className="mt-2 space-y-1">
                                <p className="font-semibold">{flour.name}</p>
                                <Badge variant="outline">{flour.protein}</Badge>
                                <p className="text-muted-foreground mt-1">{flour.description}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {recipeResult.detailedAnalysis?.flourAnalysis?.rationale && (
                          <div className="p-4 bg-muted/30 rounded-lg">
                            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                              <LightbulbIcon className="h-5 w-5" />
                              Flour Analysis
                            </h3>
                            <p className="text-muted-foreground leading-relaxed">{recipeResult.detailedAnalysis.flourAnalysis.rationale}</p>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="hydration" className="space-y-4">
                        <div className="space-y-4">
                          <div className="p-4 bg-muted/30 rounded-lg">
                            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                              <Droplet className="h-5 w-5" />
                              Recommended Hydration
                            </h3>
                            <p className="text-2xl font-bold mb-2">
                              {recipeResult.detailedAnalysis?.hydrationAnalysis?.percentage || hydration}%
                            </p>
                          </div>
                          
                          {recipeResult.detailedAnalysis?.hydrationAnalysis?.rationale && (
                            <div className="p-4 bg-muted/30 rounded-lg">
                              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                                <LightbulbIcon className="h-5 w-5" />
                                Hydration Analysis
                              </h3>
                              <p className="text-muted-foreground leading-relaxed">{recipeResult.detailedAnalysis.hydrationAnalysis.rationale}</p>
                            </div>
                          )}

                          {recipeResult.detailedAnalysis?.hydrationAnalysis?.impact && recipeResult.detailedAnalysis.hydrationAnalysis.impact.length > 0 && (
                            <div className="p-4 bg-muted/30 rounded-lg">
                              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                                <ChefHat className="h-5 w-5" />
                                Impact on Dough
                              </h3>
                              <div className="space-y-2">
                                {recipeResult.detailedAnalysis.hydrationAnalysis.impact.map((impact, index) => (
                                  <div key={index} className="flex items-start gap-2 text-muted-foreground">
                                    <span className="text-primary">•</span>
                                    <span>{impact}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="salt" className="space-y-4">
                        <div className="space-y-4">
                          <div className="p-4 bg-muted/30 rounded-lg">
                            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                              <CircleDot className="h-5 w-5" />
                              Recommended Salt
                            </h3>
                            <p className="text-2xl font-bold mb-2">
                              {recipeResult.detailedAnalysis?.saltAnalysis?.percentage || salt}%
                            </p>
                          </div>
                          
                          {recipeResult.detailedAnalysis?.saltAnalysis?.rationale && (
                            <div className="p-4 bg-muted/30 rounded-lg">
                              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                                <LightbulbIcon className="h-5 w-5" />
                                Salt Analysis
                              </h3>
                              <p className="text-muted-foreground leading-relaxed">{recipeResult.detailedAnalysis.saltAnalysis.rationale}</p>
                            </div>
                          )}

                          {recipeResult.detailedAnalysis?.saltAnalysis?.impact && recipeResult.detailedAnalysis.saltAnalysis.impact.length > 0 && (
                            <div className="p-4 bg-muted/30 rounded-lg">
                              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                                <ChefHat className="h-5 w-5" />
                                Impact on Dough
                              </h3>
                              <div className="space-y-2">
                                {recipeResult.detailedAnalysis.saltAnalysis.impact.map((impact, index) => (
                                  <div key={index} className="flex items-start gap-2 text-muted-foreground">
                                    <span className="text-primary">•</span>
                                    <span>{impact}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="yeast" className="space-y-4">
                        <div className="space-y-4">
                          <div className="p-4 bg-muted/30 rounded-lg">
                            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                              <Beaker className="h-5 w-5" />
                              Recommended Yeast
                            </h3>
                            <p className="text-2xl font-bold mb-2">
                              {recipeResult.detailedAnalysis?.yeastAnalysis?.percentage || 0.2}%
                            </p>
                            <Badge variant="outline">
                              {recipeResult.detailedAnalysis?.yeastAnalysis?.type || yeastType}
                            </Badge>
                          </div>
                          
                          {recipeResult.detailedAnalysis?.yeastAnalysis?.rationale && (
                            <div className="p-4 bg-muted/30 rounded-lg">
                              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                                <LightbulbIcon className="h-5 w-5" />
                                Yeast Analysis
                              </h3>
                              <p className="text-muted-foreground leading-relaxed">{recipeResult.detailedAnalysis.yeastAnalysis.rationale}</p>
                            </div>
                          )}

                          {recipeResult.detailedAnalysis?.yeastAnalysis?.impact && recipeResult.detailedAnalysis.yeastAnalysis.impact.length > 0 && (
                            <div className="p-4 bg-muted/30 rounded-lg">
                              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                                <ChefHat className="h-5 w-5" />
                                Impact on Dough
                              </h3>
                              <div className="space-y-2">
                                {recipeResult.detailedAnalysis.yeastAnalysis.impact.map((impact, index) => (
                                  <div key={index} className="flex items-start gap-2 text-muted-foreground">
                                    <span className="text-primary">•</span>
                                    <span>{impact}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {recipeResult.detailedAnalysis?.yeastAnalysis?.temperatureNotes && recipeResult.detailedAnalysis.yeastAnalysis.temperatureNotes.length > 0 && (
                            <div className="p-4 bg-muted/30 rounded-lg">
                              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                                <Thermometer className="h-5 w-5" />
                                Temperature Notes
                              </h3>
                              <div className="space-y-2">
                                {recipeResult.detailedAnalysis.yeastAnalysis.temperatureNotes.map((note, index) => (
                                  <div key={index} className="flex items-start gap-2 text-muted-foreground">
                                    <span className="text-primary">•</span>
                                    <span>{note}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="temperature" className="space-y-4">
                        <div className="space-y-4">
                          <div className="p-4 bg-muted/30 rounded-lg">
                            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                              <Thermometer className="h-5 w-5" />
                              Recommended Temperature
                            </h3>
                            <p className="text-2xl font-bold mb-2">
                              {roomTemp}°{tempUnit}
                            </p>
                          </div>
                          
                          {recipeResult.temperatureAnalysis?.rationale && (
                            <div className="p-4 bg-muted/30 rounded-lg">
                              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                                <LightbulbIcon className="h-5 w-5" />
                                Temperature Analysis
                              </h3>
                              <p className="text-muted-foreground leading-relaxed">{recipeResult.temperatureAnalysis.rationale}</p>
                            </div>
                          )}

                          {recipeResult.temperatureAnalysis?.recommendations && recipeResult.temperatureAnalysis.recommendations.length > 0 && (
                            <div className="p-4 bg-muted/30 rounded-lg">
                              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                                <ChefHat className="h-5 w-5" />
                                Temperature Tips
                              </h3>
                              <div className="space-y-2">
                                {recipeResult.temperatureAnalysis.recommendations.map((recommendation, index) => (
                                  <div key={index} className="flex items-start gap-2 text-muted-foreground">
                                    <span className="text-primary">•</span>
                                    <span>{recommendation}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="fermentation" className="space-y-4">
                        <div className="space-y-4">
                          <div className="p-4 bg-muted/30 rounded-lg">
                            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                              <Clock className="h-5 w-5" />
                              Fermentation Schedule
                            </h3>
                            <Badge className="mb-2" variant="outline">
                              {recipeResult.detailedAnalysis?.fermentationAnalysis?.type || fermentationTime}
                            </Badge>
                            <p className="text-2xl font-bold">
                              {recipeResult.detailedAnalysis?.fermentationAnalysis?.totalTime || getFermentationDetails(fermentationTime).duration.min} hours
                            </p>
                          </div>
                          
                          {recipeResult.detailedAnalysis?.fermentationAnalysis?.rationale && (
                            <div className="p-4 bg-muted/30 rounded-lg">
                              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                                <LightbulbIcon className="h-5 w-5" />
                                Fermentation Analysis
                              </h3>
                              <p className="text-muted-foreground leading-relaxed">{recipeResult.detailedAnalysis.fermentationAnalysis.rationale}</p>
                            </div>
                          )}

                          {recipeResult.detailedAnalysis?.fermentationAnalysis?.impact && recipeResult.detailedAnalysis.fermentationAnalysis.impact.length > 0 && (
                            <div className="p-4 bg-muted/30 rounded-lg">
                              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                                <ChefHat className="h-5 w-5" />
                                Impact on Dough
                              </h3>
                              <div className="space-y-2">
                                {recipeResult.detailedAnalysis.fermentationAnalysis.impact.map((impact, index) => (
                                  <div key={index} className="flex items-start gap-2 text-muted-foreground">
                                    <span className="text-primary">•</span>
                                    <span>{impact}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="technique" className="space-y-4">
                        <div className="space-y-4">
                          {recipeResult.detailedAnalysis?.techniqueGuidance?.mixing && (
                            <div className="p-4 bg-muted/30 rounded-lg">
                              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                                <Blend className="h-5 w-5" />
                                Mixing
                              </h3>
                              <p className="text-muted-foreground leading-relaxed">{recipeResult.detailedAnalysis.techniqueGuidance.mixing}</p>
                            </div>
                          )}
                          
                          {recipeResult.detailedAnalysis?.techniqueGuidance?.folding && (
                            <div className="p-4 bg-muted/30 rounded-lg">
                              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                                <Layers className="h-5 w-5" />
                                Folding
                              </h3>
                              <p className="text-muted-foreground leading-relaxed">{recipeResult.detailedAnalysis.techniqueGuidance.folding}</p>
                            </div>
                          )}
                          
                          {recipeResult.detailedAnalysis?.techniqueGuidance?.shaping && (
                            <div className="p-4 bg-muted/30 rounded-lg">
                              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                                <Hand className="h-5 w-5" />
                                Shaping
                              </h3>
                              <p className="text-muted-foreground leading-relaxed">{recipeResult.detailedAnalysis.techniqueGuidance.shaping}</p>
                            </div>
                          )}
                          
                          {recipeResult.detailedAnalysis?.techniqueGuidance?.baking && (
                            <div className="p-4 bg-muted/30 rounded-lg">
                              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                                <CookingPot className="h-5 w-5" />
                                Baking
                              </h3>
                              <p className="text-muted-foreground leading-relaxed">{recipeResult.detailedAnalysis.techniqueGuidance.baking}</p>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}