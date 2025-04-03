"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
import { Loader2, AlertCircle, ChefHat, Percent, Scale, Droplet, Utensils, Clock, ChevronDown, Wheat, CircleDot, Droplets } from "lucide-react";
import { cn, formatPrice, trackEvent } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { NewsletterSubscribe } from "@/components/NewsletterSubscribe";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// --- Interfaces ---
interface YeastInfo { type: "fresh" | "active dry" | "instant"; percentage: number; }
interface FermentationPhase { hours: number; temperature: number; milestones?: string[]; }
interface FermentationSchedule { room: FermentationPhase; cold: FermentationPhase; }
interface AdditionalIngredient { ingredient: string; purpose: string; }
interface AdvancedOptions { preferment: boolean; autolyse: boolean; additionalIngredients: AdditionalIngredient[]; }
interface PizzaioloAnalysis {
    hydration: number;
    salt: number;
    oil?: number | null;
    yeast: YeastInfo;
    fermentationSchedule: FermentationSchedule;
    flourRecommendation: string;
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
        } | null;
        fermentationTime: string;
        yeast: {
            type: string;
        };
    };
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
    };
    environment?: {
        altitude?: number;
        ovenType?: 'home' | 'outdoor';
        maxOvenTemp?: number;
    };
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
    step: string;
    time: string;
    description: string;
    temperature?: number;
    tips?: string[];
}

interface DetailedAnalysis {
    flourAnalysis: {
        type: string;
        proteinContent: string;
        rationale: string;
        flours: Array<{
            type: string;
            percentage: number;
            proteinContent: string;
            purpose: string;
        }>;
        alternatives?: string[];
    };
    hydrationAnalysis: {
        percentage: number;
        rationale: string;
        impact: string[];
    };
    saltAnalysis: {
        percentage: number;
        rationale: string;
        impact: string[];
    };
    oilAnalysis?: {
        percentage: number;
        rationale: string;
        impact: string[];
    };
    fermentationAnalysis: {
        totalTime: number;
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
        enzymaticActivity: string;
        gluten: string;
    };
    ovenAnalysis?: {
        ovenType: string;
        maxTemp: number;
        recommendations: string[];
        impact: string[];
    };
}

interface EnhancedPizzaioloAnalysis extends PizzaioloAnalysis {
    timeline: Timeline[];
    detailedAnalysis: DetailedAnalysis;
    recipe?: {
        flourMix?: {
            primaryType: string;
            secondaryType?: string;
            primaryPercentage: number;
        };
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

const STYLE_DEFAULTS: Record<Exclude<PizzaStyleValue, 'custom'>, { hydration: number; salt: number; oil: number | null }> = {
  'neapolitan': { hydration: 65, salt: 2.8, oil: 0 },
  'new-york': { hydration: 62, salt: 2.5, oil: 2 },
  'detroit': { hydration: 70, salt: 2.0, oil: 3 },
  'sicilian': { hydration: 68, salt: 2.5, oil: 4 },
  'roman-al-taglio': { hydration: 75, salt: 2.2, oil: 5 },
};
const CUSTOM_DEFAULTS = { hydration: 65, salt: 2.5, oil: 2 };

const FERMENTATION_OPTIONS = [
    { value: 'quick', label: 'Quick (2-4 hours)' },
    { value: 'same-day', label: 'Same Day (8-12 hours)' },
    { value: 'overnight', label: 'Overnight (16-20 hours)' },
    { value: 'cold', label: 'Cold Ferment (24-72 hours)' },
    { value: 'custom', label: 'Custom Schedule' },
] as const;

type FermentationType = typeof FERMENTATION_OPTIONS[number]['value'];

// Add this near other interfaces
interface LoadingStep {
  icon: React.ReactNode;
  text: string;
}

// Add this near other constants
const LOADING_STEPS: LoadingStep[] = [
  { icon: <Wheat className="h-4 w-4" />, text: "Measuring flour..." },
  { icon: <Droplet className="h-4 w-4" />, text: "Adding water..." },
  { icon: <CircleDot className="h-4 w-4" />, text: "Sprinkling salt..." },
  { icon: <ChefHat className="h-4 w-4" />, text: "Mixing ingredients..." },
  { icon: <Scale className="h-4 w-4" />, text: "Calculating ratios..." },
  { icon: <Clock className="h-4 w-4" />, text: "Planning schedule..." },
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

// Add type for Timeline step
interface TimelineStep {
  step: string;
  time: string;
  description: string;
  temperature?: number;
  tips?: string[];
}

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

// Update the calculateTimeGap function to handle API response time formats
const calculateTimeGap = (currentTime: string, nextTime: string): string | null => {
  if (!currentTime || !nextTime) return null;
  if (currentTime === 'Start') return null;
  
  // Convert time strings to minutes for comparison
  const getMinutes = (timeStr: string): number => {
    const hoursMatch = timeStr.match(/(\d+)\s*hours?/);
    const minutesMatch = timeStr.match(/(\d+)\s*minutes?/);
    
    let total = 0;
    if (hoursMatch) total += parseInt(hoursMatch[1]) * 60;
    if (minutesMatch) total += parseInt(minutesMatch[1]);
    return total;
  };

  const currentMinutes = getMinutes(currentTime);
  const nextMinutes = getMinutes(nextTime);
  
  if (currentMinutes === 0 || nextMinutes === 0) return null;
  
  const diffMinutes = nextMinutes - currentMinutes;
  if (diffMinutes <= 0) return null;

  if (diffMinutes < 60) {
    return `${diffMinutes} minutes`;
  }
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (minutes === 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minutes`;
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

export function DoughCalculator() {
  // --- State ---
  const [doughBalls, setDoughBalls] = useState<string>('4');
  const [weightPerBall, setWeightPerBall] = useState<string>('250');
  const [selectedStyle, setSelectedStyle] = useState<PizzaStyleValue>('neapolitan');
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
  const [error, setError] = useState<string | null>(null);
  const [recipeResult, setRecipeResult] = useState<EnhancedPizzaioloAnalysis | null>(null);
  const [isCalculated, setIsCalculated] = useState<boolean>(false);

  // Add default state for missing API fields
  const [defaultYeastType] = useState<'fresh' | 'active dry' | 'instant'>('instant');
  const [defaultFermentationType] = useState<'room' | 'cold' | 'custom'>('room');

  // Add to State section
  const [fermentationTime, setFermentationTime] = useState<FermentationType>('same-day');
  const [targetDate, setTargetDate] = useState<Date>();

  // Add this inside the DoughCalculator component, near other state
  const [loadingStep, setLoadingStep] = useState<number>(0);

  // Add new state for tracking changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Add a unique key state for the timeline component
  const [timelineKey, setTimelineKey] = useState<number>(0);

  // --- Effects ---
  useEffect(() => {
    const isCustom = selectedStyle === 'custom';
    setIsCustomStyle(isCustom);
    setRecipeResult(null);
    setError(null);
    setTimelineKey(prev => prev + 1); // Force timeline remount

    if (!isCustom) {
      if (selectedStyle in STYLE_DEFAULTS) {
          const defaults = STYLE_DEFAULTS[selectedStyle as Exclude<PizzaStyleValue, 'custom'>];
          setHydration(defaults.hydration);
          setSalt(defaults.salt);
          setOil(defaults.oil ?? 0);
      } else {
          setHydration(CUSTOM_DEFAULTS.hydration);
          setSalt(CUSTOM_DEFAULTS.salt);
          setOil(CUSTOM_DEFAULTS.oil);
      }
      // Reset custom flour settings when switching away from custom style
        setAddSecondaryFlour(false);
      setPrimaryFlourPercentage(100);
    }
  }, [selectedStyle]);

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

  // Add weight calculations
  const calculateWeights = (analysis: EnhancedPizzaioloAnalysis, doughBalls: number, weightPerBall: number) => {
    const totalDoughWeight = doughBalls * weightPerBall;
    const denominator = 1 + (analysis.hydration / 100) + (analysis.salt / 100) + (analysis.yeast.percentage / 100) + (analysis.oil ? analysis.oil / 100 : 0);
    const flourWeight = totalDoughWeight / denominator;
    const waterWeight = flourWeight * (analysis.hydration / 100);
    const saltWeight = flourWeight * (analysis.salt / 100);
    const yeastWeight = flourWeight * (analysis.yeast.percentage / 100);
    const oilWeight = analysis.oil ? flourWeight * (analysis.oil / 100) : 0;

    // Calculate flour mix weights if applicable
    const flourMixWeights = analysis.recipe?.flourMix && 
      analysis.recipe.flourMix.secondaryType && 
      typeof analysis.recipe.flourMix.primaryPercentage === 'number' ? {
        primary: formatWeight(flourWeight * analysis.recipe.flourMix.primaryPercentage / 100),
        secondary: formatWeight(flourWeight * (100 - analysis.recipe.flourMix.primaryPercentage) / 100)
      } : null;

    return {
      flourWeight: formatWeight(flourWeight),
      waterWeight: formatWeight(waterWeight),
      saltWeight: formatWeight(saltWeight),
      yeastWeight: formatWeight(yeastWeight),
      oilWeight: formatWeight(oilWeight),
      flourMixWeights
    };
  };

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
        temperature: { room: 75, cold: null },
        description: 'Quick same-day fermentation'
      },
      'same-day': {
        duration: { min: 8, max: 12 },
        temperature: { room: 75, cold: null },
        description: 'Same-day fermentation'
      },
      'overnight': {
        duration: { min: 16, max: 20 },
        temperature: { room: 72, cold: 38 },
        description: 'Overnight fermentation'
      },
      'cold': {
        duration: { min: 24, max: 72 },
        temperature: { room: null, cold: 38 },
        description: 'Cold fermentation'
      },
      'custom': {
        duration: { min: 4, max: 72 },
        temperature: { room: 75, cold: 38 },
        description: 'Custom schedule'
      }
    };
    return defaultSchedules[schedule];
  };

  // Update the handleCalculate function to include oven type
  const handleCalculate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Reset all state to ensure fresh calculation
    setRecipeResult(null); // Explicitly null out the result
    setError(null);
    setIsCalculated(false);
    setHasUnsavedChanges(false);
    setTimelineKey(prev => prev + 1); // Force timeline remount
    
    setIsLoading(true);
    setLoadingStep(0);

    try {
      const numDoughBalls = parseInt(doughBalls);
      const numWeightPerBall = parseInt(weightPerBall);

      if (isNaN(numDoughBalls) || numDoughBalls <= 0 || isNaN(numWeightPerBall) || numWeightPerBall <= 0) {
        throw new Error("Please enter valid numbers for Dough Balls and Weight/Ball.");
      }

      console.log(`Calculating recipe for ${fermentationTime} fermentation with ${ovenType} oven`);

      const selectedOvenType = OVEN_TYPES[ovenType];
      
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
            type: 'active dry'
          }
        },
        fermentation: {
          schedule: fermentationTime,
          temperature: getFermentationDetails(fermentationTime).temperature,
          duration: getFermentationDetails(fermentationTime).duration
        },
        environment: {
          ...(altitude ? { altitude: parseInt(altitude) } : {}),
          ovenType: ovenType,
          maxOvenTemp: selectedOvenType?.maxTemp
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

      // Add a timestamp to prevent browser caching
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/recipe-adjust?t=${timestamp}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format from server');
      }

      // Handle both possible response formats
      const analysis = data.analysis || data;
      
      if (!analysis || typeof analysis !== 'object') {
        throw new Error('Missing analysis data in server response');
      }

      setRecipeResult(analysis);
      setIsCalculated(true);
      
      // Track successful calculation in Google Analytics
      trackEvent('recipe_calculated', {
        style: selectedStyle,
        fermentation_time: fermentationTime,
        oven_type: ovenType,
        dough_balls: numDoughBalls,
        hydration: roundToDecimal(hydration),
        has_secondary_flour: isCustomStyle && addSecondaryFlour
      });
    } catch (err) {
      console.error('Calculation error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
      
      // Track error in Google Analytics
      trackEvent('recipe_calculation_error', {
        error_message: err instanceof Error ? err.message : 'Unknown error',
        style: selectedStyle,
        fermentation_time: fermentationTime
      });
    } finally {
      setIsLoading(false);
      setLoadingStep(0);
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
              </div>

              {/* Calculate Button */}
              <Button 
                type="submit" 
                size="lg" 
                className={cn(
                  "w-full relative overflow-hidden",
                  hasUnsavedChanges 
                    ? "bg-primary/90 hover:bg-primary" 
                    : recipeResult 
                      ? "bg-primary/60 hover:bg-primary/70"
                      : "bg-primary hover:bg-primary/90",
                  isLoading && "cursor-not-allowed"
                )}
                disabled={isLoading}
              >
                {isLoading ? (
                  <motion.div 
                    className="flex items-center justify-center gap-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.div
                      className="flex items-center gap-2"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      key={loadingStep}
                      transition={{ duration: 0.3 }}
                    >
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        {LOADING_STEPS[loadingStep].icon}
                      </motion.div>
                      <span>{LOADING_STEPS[loadingStep].text}</span>
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div 
                    className="flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <ChefHat className="h-5 w-5" />
                    <span>
                      {hasUnsavedChanges 
                        ? "Recalculate Recipe" 
                        : recipeResult 
                          ? "Recipe Calculated"
                          : "Calculate Recipe"}
                    </span>
                  </motion.div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Result Display */}
        {recipeResult && !isLoading && (
          <div className="mt-8 space-y-6">
            {/* Recipe and Timeline Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Recipe Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Recipe</CardTitle>
                  <CardDescription>Your calculated pizza dough recipe</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Ingredients */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Ingredients</h3>
                      {(() => {
                        const weights = calculateWeights(recipeResult, parseInt(doughBalls), parseInt(weightPerBall));
                        return (
                          <div className="space-y-4">
                            {/* Flour Section */}
                            <div className="space-y-2">
                              <div className="flex justify-between items-center py-2 border-b">
                                <span className="font-medium">Total Flour</span>
                                <span className="font-semibold">{weights.flourWeight}g</span>
                              </div>
                              {weights.flourMixWeights && recipeResult.recipe?.flourMix && (
                                <div className="pl-4 space-y-2 border-l-2">
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">
                                      {recipeResult.recipe.flourMix.primaryType} ({recipeResult.recipe.flourMix.primaryPercentage}%)
                                    </span>
                                    <span>{weights.flourMixWeights.primary}g</span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">
                                      {recipeResult.recipe.flourMix.secondaryType} ({100 - recipeResult.recipe.flourMix.primaryPercentage}%)
                                    </span>
                                    <span>{weights.flourMixWeights.secondary}g</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Other Ingredients */}
                            <div className="space-y-2">
                              <div className="flex justify-between items-center py-2 border-b">
                                <span className="font-medium">Water</span>
                                <span className="font-semibold">{weights.waterWeight}g</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b">
                                <span className="font-medium">Salt</span>
                                <span className="font-semibold">{weights.saltWeight}g</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b">
                                <span className="font-medium">Yeast ({recipeResult.yeast.type})</span>
                                <span className="font-semibold">{weights.yeastWeight}g</span>
                              </div>
                              {weights.oilWeight > 0 && (
                                <div className="flex justify-between items-center py-2 border-b">
                                  <span className="font-medium">Oil</span>
                                  <span className="font-semibold">{weights.oilWeight}g</span>
                                </div>
                              )}
                            </div>

                            {/* Key Information */}
                            <div className="grid grid-cols-2 gap-4 pt-4">
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">Total Time</p>
                                <p className="font-semibold">{recipeResult.detailedAnalysis.fermentationAnalysis.totalTime} hours</p>
                              </div>
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">Hydration</p>
                                <p className="font-semibold">{recipeResult.hydration}%</p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline Card */}
              <Card className="flex flex-col" key={`timeline-card-${timelineKey}-${fermentationTime}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        Process Timeline
                      </CardTitle>
                      <CardDescription className="text-base">
                        Total time: {recipeResult.detailedAnalysis.fermentationAnalysis.totalTime} hours
                        {(fermentationTime === 'cold' || fermentationTime === 'overnight') && 
                         recipeResult.detailedAnalysis.fermentationAnalysis.roomTemp && 
                         recipeResult.detailedAnalysis.fermentationAnalysis.coldTemp && (
                          <span className="text-sm text-muted-foreground ml-1">
                            (Includes {recipeResult.detailedAnalysis.fermentationAnalysis.roomTemp.time} hours room temp,{' '}
                            {recipeResult.detailedAnalysis.fermentationAnalysis.coldTemp.time} hours cold)
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs bg-primary/5">
                      {fermentationTime}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="overflow-y-auto max-h-[800px] flex-grow pb-6">
                  <div className="relative space-y-6 pb-4">
                    {recipeResult?.timeline && (
                      <div className="relative space-y-6">
                        {recipeResult.timeline.map((step, index, filteredSteps) => {
                          const nextStep = filteredSteps[index + 1];
                          const timeGap = nextStep ? calculateTimeGap(step.time, nextStep.time) : null;
                          const showTemp = step.temperature && 
                            !step.step.toLowerCase().includes('mix') && 
                            !step.step.toLowerCase().includes('knead');
                          
                          return (
                            <div key={index} className="relative">
                              {/* Timeline connector line */}
                              {index < filteredSteps.length - 1 && (
                                <div className="absolute left-[11px] top-[30px] w-0.5 h-[calc(100%+24px)] bg-border" />
                              )}
                              
                              <div className="flex gap-4">
                                {/* Timeline marker */}
                                <div className="relative flex-shrink-0">
                                  <div className="w-6 h-6 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-primary" />
                                  </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 space-y-3">
                                  {/* Header */}
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className="font-semibold text-lg leading-none pt-1">
                                      {step.step}
                                    </h4>
                                    <span className="text-sm font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md whitespace-nowrap">
                                      {step.time}
                                    </span>
                                  </div>

                                  {/* Description */}
                                  <p className="text-muted-foreground">
                                    {step.description}
                                  </p>

                                  {/* Temperature */}
                                  {showTemp && step.temperature && (
                                    <div className="flex items-center gap-2 text-sm text-primary">
                                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                      <span>{step.temperature}°F</span>
                                    </div>
                                  )}

                                  {/* Tips */}
                                  {step.tips && step.tips.length > 0 && (
                                    <div className="space-y-2 pl-4 border-l-2 border-muted mt-2">
                                      {step.tips.map((tip, tipIndex) => (
                                        <p key={tipIndex} className="text-sm text-muted-foreground">
                                          {tip}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Time gap indicator */}
                              {timeGap && (
                                <div className="ml-10 mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>Wait {timeGap}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Technical Analysis Card - Always show it */}
            <Card>
              <CardHeader className="pb-4 border-b">
                <CardTitle className="flex items-center gap-2">
                  <ChefHat className="h-5 w-5 text-primary" />
                  Technical Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-4 bg-primary/5">
                  <p className="leading-relaxed text-base">{recipeResult.technicalAnalysis}</p>
                </div>
                <DetailedAnalysis analysis={recipeResult.detailedAnalysis} />
              </CardContent>
            </Card>
          </div>
        )}

        {recipeResult && (
          <div className="mt-12 pt-8 border-t border-border">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-semibold mb-2">Save Your Recipe & Get More Tips</h3>
              <p className="text-muted-foreground">
                Subscribe to receive your recipe by email and get weekly pizza making tips.
              </p>
            </div>
            <NewsletterSubscribe />
          </div>
        )}
      </div>
    </div>
  );
}

export function DetailedAnalysis({ analysis }: { analysis: DetailedAnalysis }) {
  return (
    <Tabs defaultValue="flour" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="flour" className="flex items-center gap-2">
          <Wheat className="h-4 w-4" />
          <span className="hidden sm:inline">Flour</span>
        </TabsTrigger>
        <TabsTrigger value="hydration" className="flex items-center gap-2">
          <Droplets className="h-4 w-4" />
          <span className="hidden sm:inline">Hydration</span>
        </TabsTrigger>
        <TabsTrigger value="salt" className="flex items-center gap-2">
          <CircleDot className="h-4 w-4" />
          <span className="hidden sm:inline">Salt</span>
        </TabsTrigger>
        <TabsTrigger value="fermentation" className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span className="hidden sm:inline">Fermentation</span>
        </TabsTrigger>
        <TabsTrigger value="oven" className="flex items-center gap-2">
          <Utensils className="h-4 w-4" />
          <span className="hidden sm:inline">Oven</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="flour" className="mt-4 space-y-4">
        <div className="space-y-6">
          {/* Main Flour Section */}
          <div className="rounded-lg border bg-card p-4">
            <h3 className="text-lg font-semibold mb-3">Recommended Flour Mix</h3>
            {/* General Flour Recommendation */}
            <div className="mb-4 rounded-md bg-muted/50 p-3">
              <div className="flex items-start gap-2">
                <Wheat className="h-4 w-4 mt-0.5 text-primary" />
                <p className="text-sm text-muted-foreground">{analysis.flourAnalysis.rationale}</p>
              </div>
            </div>
            
            {/* Primary Flour */}
            {analysis.flourAnalysis.flours.filter(f => f.percentage >= 50).map((flour, index) => {
              const displayFlour = getFlourTypeDisplay(flour);
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary text-primary-foreground">Primary</Badge>
                      <h4 className="font-medium">{displayFlour.type}</h4>
                    </div>
                    <Badge variant="outline" className="bg-background">
                      {displayFlour.percentage}%
                    </Badge>
                  </div>
                  {displayFlour.proteinContent && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Protein Content:</span>
                      <span className="text-sm text-muted-foreground">{displayFlour.proteinContent}</span>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">{displayFlour.purpose}</p>
                </div>
              );
            })}

            {/* Secondary Flours */}
            {analysis.flourAnalysis.flours.filter(f => f.percentage < 50).length > 0 && (
              <div className="mt-6 space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">Additional Flours</h4>
                <div className="grid gap-3">
                  {analysis.flourAnalysis.flours.filter(f => f.percentage < 50).map((flour, index) => {
                    const displayFlour = getFlourTypeDisplay(flour);
                    return (
                      <div key={index} className="rounded-lg bg-muted/50 p-3">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium">{displayFlour.type}</h4>
                          <Badge variant="outline" className="bg-background">
                            {displayFlour.percentage}%
                          </Badge>
                        </div>
                        {displayFlour.proteinContent && (
                          <div className="mb-1">
                            <span className="text-sm text-muted-foreground">
                              Protein Content: <span className="text-foreground">{displayFlour.proteinContent}</span>
                            </span>
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground">{displayFlour.purpose}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Alternative Options */}
          {analysis.flourAnalysis.alternatives && analysis.flourAnalysis.alternatives.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-lg font-semibold mb-3">Alternative Options</h3>
              <p className="text-sm text-muted-foreground mb-3">
                If you can't find the recommended flours, these alternatives will work well:
              </p>
              <div className="space-y-2">
                {analysis.flourAnalysis.alternatives.map((alt, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                    <span className="text-muted-foreground">{alt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="hydration" className="mt-4 space-y-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-lg px-4 py-1">
              {analysis.hydrationAnalysis.percentage}%
            </Badge>
            <span className="text-sm text-muted-foreground">hydration level</span>
          </div>
          
          <p className="text-muted-foreground">{analysis.hydrationAnalysis.rationale}</p>
          
          <div className="rounded-lg border bg-card/50 p-3">
            <h4 className="font-medium mb-2">Impact on Dough</h4>
            <ul className="space-y-2">
              {analysis.hydrationAnalysis.impact.map((impact, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-primary mt-1" />
                  <span className="text-muted-foreground">{impact}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="salt" className="mt-4 space-y-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-lg px-4 py-1">
              {analysis.saltAnalysis.percentage}%
            </Badge>
            <span className="text-sm text-muted-foreground">salt level</span>
          </div>
          
          <p className="text-muted-foreground">{analysis.saltAnalysis.rationale}</p>
          
          <div className="rounded-lg border bg-card/50 p-3">
            <h4 className="font-medium mb-2">Impact on Development</h4>
            <ul className="space-y-2">
              {analysis.saltAnalysis.impact.map((impact, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-primary mt-1" />
                  <span className="text-muted-foreground">{impact}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="fermentation" className="mt-4 space-y-4">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Room Temperature Phase */}
            <div className="rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Room Temperature</h4>
                <Badge variant="outline" className="bg-background">
                  {analysis.fermentationAnalysis.roomTemp.temperature}°F
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{analysis.fermentationAnalysis.roomTemp.time} hours</span>
                </div>
                <ul className="space-y-1">
                  {analysis.fermentationAnalysis.roomTemp.impact.map((impact, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      {impact}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Cold Fermentation Phase */}
            {analysis.fermentationAnalysis.coldTemp && (
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Cold Fermentation</h4>
                  <Badge variant="outline" className="bg-background">
                    {analysis.fermentationAnalysis.coldTemp.temperature}°F
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{analysis.fermentationAnalysis.coldTemp.time} hours</span>
                  </div>
                  <ul className="space-y-1">
                    {analysis.fermentationAnalysis.coldTemp.impact.map((impact, index) => (
                      <li key={index} className="text-sm text-muted-foreground">
                        {impact}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-card/50 p-3">
              <h4 className="font-medium mb-1">Enzymatic Activity</h4>
              <p className="text-sm text-muted-foreground">
                {analysis.fermentationAnalysis.enzymaticActivity}
              </p>
            </div>
            <div className="rounded-lg border bg-card/50 p-3">
              <h4 className="font-medium mb-1">Gluten Development</h4>
              <p className="text-sm text-muted-foreground">
                {analysis.fermentationAnalysis.gluten}
              </p>
            </div>
          </div>
        </div>
      </TabsContent>

      {analysis.ovenAnalysis && (
        <TabsContent value="oven" className="mt-4 space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-lg px-4 py-1">
                {analysis.ovenAnalysis?.maxTemp}°F
              </Badge>
              <span className="text-muted-foreground">{analysis.ovenAnalysis?.ovenType}</span>
            </div>

            <div className="grid gap-3">
              <div className="rounded-lg border bg-card/50 p-3">
                <h4 className="font-medium mb-2">Baking Recommendations</h4>
                <ul className="space-y-2">
                  {analysis.ovenAnalysis?.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="h-2 w-2 rounded-full bg-primary mt-1" />
                      <span className="text-muted-foreground">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border bg-card/50 p-3">
                <h4 className="font-medium mb-2">Impact on Dough</h4>
                <ul className="space-y-2">
                  {analysis.ovenAnalysis?.impact.map((impact, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="h-2 w-2 rounded-full bg-primary mt-1" />
                      <span className="text-muted-foreground">{impact}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </TabsContent>
      )}
    </Tabs>
  );
}