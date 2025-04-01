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
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { NewsletterSubscribe } from "@/components/NewsletterSubscribe";
// cn import removed as it's no longer needed after removing conditional styling test

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
    style: PizzaStyleValue;
    recipe: {
        hydration: number;
        salt: number;
        oil: number | null;
        flourMix: FlourMix | null;
        fermentationTime: FermentationType;
        yeast: {
            type: 'fresh' | 'active dry' | 'instant';
        };
    };
    fermentation: {
        schedule: FermentationType;
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
    };
    analysisPreferences: {
        detailedAnalysis: boolean;
        explainRationale: boolean;
        avoidGenericResponses: boolean;
        requireSpecificAnalysis: boolean;
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

const FERMENTATION_SCHEDULES: Record<FermentationType, FermentationScheduleConfig> = {
    'quick': {
        duration: { min: 2, max: 4 },
        temperature: { room: 75, cold: null },
        description: 'Room temperature fermentation only'
    },
    'same-day': {
        duration: { min: 8, max: 12 },
        temperature: { room: 75, cold: null },
        description: 'Room temperature fermentation only'
    },
    'overnight': {
        duration: { min: 16, max: 20 },
        temperature: { room: 72, cold: 38 },
        description: 'Mixed room and cold fermentation'
    },
    'cold': {
        duration: { min: 24, max: 72 },
        temperature: { room: null, cold: 38 },
        description: 'Cold fermentation only'
    },
    'custom': {
        duration: { min: 4, max: 72 },
        temperature: { room: 75, cold: 38 },
        description: 'Custom schedule based on target date'
    }
};

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
    return <p className="text-muted-foreground flex items-start gap-2">Analysis pending</p>;
  }
  return impacts.map((impact: string, index: number) => (
    <p key={index} className="text-muted-foreground flex items-start gap-2">
      <span className="text-primary">•</span>
      {impact}
    </p>
  ));
};

export function DoughCalculator() {
  // --- State ---
  const [doughBalls, setDoughBalls] = useState('4');
  const [weightPerBall, setWeightPerBall] = useState('280');
  const [selectedStyle, setSelectedStyle] = useState<PizzaStyleValue>('new-york');
  const [altitude, setAltitude] = useState('');

  // Ingredient Sliders
  const [hydration, setHydration] = useState(STYLE_DEFAULTS['new-york'].hydration);
  const [salt, setSalt] = useState(STYLE_DEFAULTS['new-york'].salt);
  const [oil, setOil] = useState(STYLE_DEFAULTS['new-york'].oil ?? 0);

  // Custom Style State
  const [isCustomStyle, setIsCustomStyle] = useState(false);
  const [primaryFlourType, setPrimaryFlourType] = useState<FlourType>(FLOUR_TYPES[0]);
  const [addSecondaryFlour, setAddSecondaryFlour] = useState(false);
  const [secondaryFlourType, setSecondaryFlourType] = useState<FlourType>(FLOUR_TYPES[1]);
  const [primaryFlourPercentage, setPrimaryFlourPercentage] = useState(100);

  // API State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipeResult, setRecipeResult] = useState<EnhancedPizzaioloAnalysis | null>(null);

  // Add default state for missing API fields
  const [defaultYeastType] = useState<'fresh' | 'active dry' | 'instant'>('instant');
  const [defaultFermentationType] = useState<'room' | 'cold' | 'custom'>('room');

  // Add to State section
  const [fermentationTime, setFermentationTime] = useState<FermentationType>('same-day');
  const [targetDate, setTargetDate] = useState<Date>();

  // Add state for technical analysis visibility
  const [showTechnicalAnalysis, setShowTechnicalAnalysis] = useState(false);

  // --- End State ---

  // --- Effects ---
  useEffect(() => {
    const isCustom = selectedStyle === 'custom';
    setIsCustomStyle(isCustom);
    setRecipeResult(null);
    setError(null);

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

  useEffect(() => {
    setRecipeResult(null);
    setError(null);
  }, [doughBalls, weightPerBall, altitude, hydration, salt, oil, primaryFlourType, addSecondaryFlour, secondaryFlourType, primaryFlourPercentage]);
  // --- End Effects ---

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

  // --- Handlers ---
  const getFermentationDetails = (schedule: FermentationType): FermentationScheduleConfig => {
    return FERMENTATION_SCHEDULES[schedule];
  };

  const handleCalculate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const numDoughBalls = parseInt(doughBalls);
    const numWeightPerBall = parseInt(weightPerBall);

    if (isNaN(numDoughBalls) || numDoughBalls <= 0 || isNaN(numWeightPerBall) || numWeightPerBall <= 0) {
      setError("Please enter valid numbers for Dough Balls and Weight/Ball.");
      return;
    }

    if (fermentationTime === 'custom' && !targetDate) {
        setError("Please select a target date for custom schedule.");
        return;
    }

    setIsLoading(true);
    setError(null);
    setRecipeResult(null);

    // Round values to ensure consistency
    const roundedHydration = roundToDecimal(hydration);
    const roundedSalt = roundToDecimal(salt);
    const roundedOil = oil > 0 ? roundToDecimal(oil) : null;

    const fermentationDetails = getFermentationDetails(fermentationTime);
    
    // Calculate fermentation schedule based on target date for custom schedules
    if (fermentationTime === 'custom' && targetDate) {
        const now = new Date();
        const totalHours = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60));
        
        if (totalHours < 4) {
            setError("Custom schedule requires at least 4 hours of fermentation time.");
            setIsLoading(false);
            return;
        }

        // Determine if we should use cold fermentation based on total time
        const useColdFerment = totalHours > 12;
        const roomTempHours = useColdFerment ? 2 : totalHours; // Always use 2 hours room temp for cold ferment
        const coldHours = useColdFerment ? totalHours - 2 : 0; // Remaining time goes to cold ferment

        fermentationDetails.duration = {
            min: totalHours,
            max: totalHours
        };

        fermentationDetails.temperature = {
            room: useColdFerment ? 75 : 72, // Slightly lower temp for longer room ferments
            cold: useColdFerment ? 38 : null
        };

        // Update the payload's fermentation details
        const payload: ApiPayload = {
            doughBalls: numDoughBalls,
            weightPerBall: numWeightPerBall,
            style: selectedStyle,
            recipe: {
                hydration: roundedHydration,
                salt: roundedSalt,
                oil: roundedOil,
                flourMix: isCustomStyle && addSecondaryFlour ? {
                    primaryType: primaryFlourType,
                    secondaryType: secondaryFlourType,
                    primaryPercentage: primaryFlourPercentage
                } : null,
                fermentationTime: fermentationTime,
                yeast: {
                    type: defaultYeastType
                }
            },
            fermentation: {
                schedule: fermentationTime,
                temperature: fermentationDetails.temperature,
                duration: {
                    min: roomTempHours,
                    max: totalHours
                }
            },
            ...(altitude ? { environment: { altitude: parseInt(altitude) } } : {}),
            analysisPreferences: {
                detailedAnalysis: true,
                explainRationale: true,
                avoidGenericResponses: true,
                requireSpecificAnalysis: true,
            }
        };

        try {
            console.log('Sending request to API with payload:', JSON.stringify(payload, null, 2));
            
            const response = await fetch('/api/recipe-adjust', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                console.error(`API Error: ${response.status} ${response.statusText}`);
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || `API Error: ${response.status}`);
            }

            const result = await response.json();
            console.log('API response received:', result);
            
            if (typeof result.hydration === 'number') {
                setHydration(roundToDecimal(result.hydration));
            }
            
            if (typeof result.salt === 'number') {
                setSalt(roundToDecimal(result.salt));
            }
            
            if (typeof result.oil === 'number') {
                setOil(roundToDecimal(result.oil));
            } else if (result.oil === null) {
                setOil(0);
            }
            
            setRecipeResult(result);

        } catch (err: any) {
            console.error("Calculation error:", err);
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
        return;
    }

    const payload: ApiPayload = {
      doughBalls: numDoughBalls,
      weightPerBall: numWeightPerBall,
      style: selectedStyle,
      recipe: {
        hydration: roundedHydration,
        salt: roundedSalt,
        oil: roundedOil,
        flourMix: isCustomStyle && addSecondaryFlour ? {
          primaryType: primaryFlourType,
          secondaryType: secondaryFlourType,
          primaryPercentage: primaryFlourPercentage
        } : null,
        fermentationTime: fermentationTime,
        yeast: {
          type: defaultYeastType
        }
      },
      fermentation: {
        schedule: fermentationTime,
        temperature: fermentationDetails.temperature,
        duration: fermentationDetails.duration
      },
      ...(altitude ? { environment: { altitude: parseInt(altitude) } } : {}),
      analysisPreferences: {
        detailedAnalysis: true,
        explainRationale: true,
        avoidGenericResponses: true,
        requireSpecificAnalysis: true,
      }
    };

    try {
        console.log('Sending request to API with payload:', JSON.stringify(payload, null, 2));
        
      const response = await fetch('/api/recipe-adjust', {
        method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
      });

      if (!response.ok) {
            console.error(`API Error: ${response.status} ${response.statusText}`);
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || `API Error: ${response.status}`);
        }

        const result = await response.json();
        console.log('API response received:', result);
        
        if (typeof result.hydration === 'number') {
            setHydration(roundToDecimal(result.hydration));
        }
        
        if (typeof result.salt === 'number') {
            setSalt(roundToDecimal(result.salt));
        }
        
        if (typeof result.oil === 'number') {
            setOil(roundToDecimal(result.oil));
        } else if (result.oil === null) {
            setOil(0);
        }
        
      setRecipeResult(result);

    } catch (err: any) {
      console.error("Calculation error:", err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // Update the Hydration slider to use rounded values
  const handleHydrationChange = (value: number[]) => {
    setHydration(roundToDecimal(value[0]));
  };

  // Update the Salt slider to use rounded values
  const handleSaltChange = (value: number[]) => {
    setSalt(roundToDecimal(value[0]));
  };

  // Update the Oil slider to use rounded values
  const handleOilChange = (value: number[]) => {
    setOil(roundToDecimal(value[0]));
  };

  // Restore original handler signature (no console log)
  const handleSecondaryFlourToggle = (checked: boolean) => {
    console.log('Toggle clicked:', checked); // Debug log
    setAddSecondaryFlour(checked);
    if (!checked) {
      setPrimaryFlourPercentage(100);
    }
  };

  const handleDoughBallsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
        setDoughBalls('');
        return;
    }
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 100) {
        setDoughBalls(value);
    }
  };

  const handleWeightPerBallChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
        setWeightPerBall('');
        return;
    }
    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
        setWeightPerBall(value);
    }
  };
  // --- End Handlers ---

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl sm:text-3xl">Pizza Dough Calculator</CardTitle>
            <CardDescription>Create your perfect pizza dough recipe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <form onSubmit={handleCalculate} className="space-y-6">
                {/* Main Configuration Grid */}
                <div className="space-y-6">
                  {/* Top Row - Style and Measurements */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Style Selection */}
                    <div className="space-y-2">
                      <Label>Pizza Style</Label>
                      <Select value={selectedStyle} onValueChange={(v) => setSelectedStyle(v as PizzaStyleValue)} required>
                        <SelectTrigger className="bg-background relative z-20">
                          <SelectValue placeholder="Select pizza style" />
                        </SelectTrigger>
                        <SelectContent>
                          {PIZZA_STYLE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Fermentation Selection */}
                    <div className="space-y-2">
                      <Label>Fermentation Schedule</Label>
                      <Select value={fermentationTime} onValueChange={(v) => setFermentationTime(v as FermentationType)}>
                        <SelectTrigger className="bg-background relative z-20">
                          <SelectValue placeholder="Select fermentation time" />
                        </SelectTrigger>
                        <SelectContent>
                          {FERMENTATION_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Basic Measurements */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2 col-span-1">
                      <Label htmlFor="doughBalls">Dough Balls</Label>
                      <Input 
                        id="doughBalls" 
                        type="number" 
                        placeholder="4" 
                        min="1"
                        max="100"
                        required 
                        value={doughBalls} 
                        onChange={handleDoughBallsChange}
                        className="bg-background relative z-20"
                      />
                    </div>
                    <div className="space-y-2 col-span-1">
                      <Label htmlFor="weightPerBall">Weight/Ball (g)</Label>
                      <Input 
                        id="weightPerBall" 
                        type="number" 
                        placeholder="280" 
                        min="100"
                        max="1000"
                        required 
                        value={weightPerBall} 
                        onChange={handleWeightPerBallChange}
                        className="bg-background relative z-20"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="altitude">Altitude (ft) <span className="text-xs text-muted-foreground">(Optional)</span></Label>
                      <Input 
                        id="altitude" 
                        type="number" 
                        placeholder="e.g., 5280" 
                        min="0" 
                        value={altitude} 
                        onChange={(e) => setAltitude(e.target.value)}
                        className="bg-background relative z-20"
                      />
                    </div>
                  </div>

                  {/* Ingredient Percentages - Full Width */}
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="flex items-center">
                          <Droplet className="h-4 w-4 mr-1.5" />
                          <span>Hydration</span>
                        </Label>
                        <span className="text-sm font-medium">{hydration.toFixed(1)}%</span>
                      </div>
                      <Slider 
                        value={[hydration]} 
                        onValueChange={handleHydrationChange} 
                        min={50} 
                        max={100} 
                        step={0.5}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="flex items-center">
                          <Percent className="h-4 w-4 mr-1.5" />
                          <span>Salt</span>
                        </Label>
                        <span className="text-sm font-medium">{salt.toFixed(1)}%</span>
                      </div>
                      <Slider 
                        value={[salt]} 
                        onValueChange={handleSaltChange} 
                        min={0} 
                        max={5} 
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="flex items-center">
                          <Utensils className="h-4 w-4 mr-1.5" />
                          <span>Oil</span>
                        </Label>
                        <span className="text-sm font-medium">{oil > 0 ? `${oil.toFixed(1)}%` : 'None'}</span>
                      </div>
                      <Slider 
                        value={[oil]} 
                        onValueChange={handleOilChange} 
                        min={0} 
                        max={15} 
                        step={0.5}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Custom Flour Section - Only show if custom style selected */}
                  {isCustomStyle && (
                    <div className="bg-muted/30 rounded-lg overflow-hidden relative z-20">
                      <div className="px-6 py-3 border-b bg-muted/50">
                        <h3 className="text-sm font-medium">Custom Flour Mix</h3>
                      </div>
                      <div className="p-6 space-y-4">
                        <Select value={primaryFlourType} onValueChange={(v) => setPrimaryFlourType(v as FlourType)}>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select primary flour" />
                          </SelectTrigger>
                          <SelectContent>
                            {FLOUR_TYPES.map((flour) => (
                              <SelectItem key={flour} value={flour}>{flour}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={addSecondaryFlour}
                            onCheckedChange={handleSecondaryFlourToggle}
                          />
                          <Label>Add secondary flour</Label>
                        </div>

                        {addSecondaryFlour && (
                          <div className="space-y-4">
                            <Select value={secondaryFlourType} onValueChange={(v) => setSecondaryFlourType(v as FlourType)}>
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Select secondary flour" />
                              </SelectTrigger>
                              <SelectContent>
                                {FLOUR_TYPES.map((flour) => (
                                  <SelectItem key={flour} value={flour}>{flour}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>{primaryFlourType}</span>
                                <span>{primaryFlourPercentage}%</span>
                              </div>
                              <Slider
                                value={[primaryFlourPercentage]}
                                onValueChange={(value) => setPrimaryFlourPercentage(value[0])}
                                min={0}
                                max={100}
                                step={5}
                                className="relative z-20"
                              />
                              <div className="flex justify-between text-sm text-muted-foreground">
                                <span>{secondaryFlourType}</span>
                                <span>{100 - primaryFlourPercentage}%</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Calculate Button */}
                <div className="relative z-30">
                  <Button type="submit" size="lg" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isLoading ? 'Analyzing Recipe...' : 'Calculate Recipe'}
                  </Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
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
              <Card>
                <CardHeader>
                  <CardTitle>Process Timeline</CardTitle>
                  <CardDescription>Step-by-step instructions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recipeResult.timeline.map((step, index) => (
                      <div key={index} className="relative pl-6 pb-4 border-l-2 border-muted last:border-l-0">
                        <div className="absolute left-0 top-0 -translate-x-1/2 w-3 h-3 rounded-full bg-primary"></div>
                        <h4 className="font-medium">{step.step}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                        {step.temperature && (
                          <p className="text-sm text-muted-foreground mt-1">Temperature: {step.temperature}°F</p>
                        )}
                        {step.tips && step.tips.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {step.tips.map((tip, tipIndex) => (
                              <p key={tipIndex} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-primary">•</span>
                                {tip}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Technical Analysis Card - Full Width */}
            <Card>
              <CardHeader>
                <CardTitle>Technical Analysis</CardTitle>
                <CardDescription>{recipeResult.technicalAnalysis}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Left Column */}
                  <div className="space-y-6">
                    {/* Flour Analysis */}
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <Wheat className="h-4 w-4" />
                        Flour Analysis
                      </h4>
                      <div className="text-sm space-y-2">
                        <p>{recipeResult.detailedAnalysis.flourAnalysis.type}</p>
                        <p className="text-muted-foreground">{recipeResult.detailedAnalysis.flourAnalysis.proteinContent}</p>
                        <p className="text-muted-foreground">{recipeResult.detailedAnalysis.flourAnalysis.rationale}</p>
                      </div>
                    </div>

                    {/* Hydration Analysis */}
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <Droplet className="h-4 w-4" />
                        Hydration Analysis
                      </h4>
                      <div className="text-sm space-y-2">
                        <p className="text-muted-foreground">{recipeResult.detailedAnalysis.hydrationAnalysis.rationale}</p>
                        <div className="space-y-1">
                          {renderImpactList(recipeResult.detailedAnalysis.hydrationAnalysis.impact)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Salt Analysis */}
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <CircleDot className="h-4 w-4" />
                        Salt Analysis
                      </h4>
                      <div className="text-sm space-y-2">
                        <p className="text-muted-foreground">{recipeResult.detailedAnalysis.saltAnalysis.rationale}</p>
                        <div className="space-y-1">
                          {renderImpactList(recipeResult.detailedAnalysis.saltAnalysis.impact)}
                        </div>
                      </div>
                    </div>

                    {/* Oil Analysis */}
                    {recipeResult.detailedAnalysis.oilAnalysis && (
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          <Droplets className="h-4 w-4" />
                          Oil Analysis
                        </h4>
                        <div className="text-sm space-y-2">
                          <p className="text-muted-foreground">{recipeResult.detailedAnalysis.oilAnalysis.rationale}</p>
                          <div className="space-y-1">
                            {renderImpactList(recipeResult.detailedAnalysis.oilAnalysis.impact)}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Fermentation Analysis */}
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Fermentation Analysis
                      </h4>
                      <div className="text-sm space-y-2">
                        <p className="text-muted-foreground">{recipeResult.detailedAnalysis.fermentationAnalysis.enzymaticActivity}</p>
                        <p className="text-muted-foreground">{recipeResult.detailedAnalysis.fermentationAnalysis.gluten}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Technique Guidance Card - Full Width */}
            <Card>
              <CardHeader>
                <CardTitle>Technique Guidance</CardTitle>
                <CardDescription>{recipeResult.adjustmentRationale}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recipeResult.techniqueGuidance.map((guidance, index) => (
                    <p key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {guidance}
                    </p>
                  ))}
                </div>
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