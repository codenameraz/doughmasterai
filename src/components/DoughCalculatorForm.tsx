'use client'; // Needed for hooks like useState

import React, { useState } from 'react';
// Import the new display component
import RecipeAnalysisDisplay from './RecipeAnalysisDisplay'; 

// --- Interfaces for AI Response (mirroring route.ts) ---
// It might be better to move these to a shared types file later
interface YeastInfo { type: "fresh" | "active dry" | "instant"; percentage: number; }
interface FermentationPhase { hours: number; temperature: number; milestones?: string[]; }
interface FermentationSchedule { room: FermentationPhase; cold: FermentationPhase; }
interface AdditionalIngredient { ingredient: string; purpose: string; }
interface AdvancedOptions { preferment: boolean; autolyse: boolean; additionalIngredients: AdditionalIngredient[]; }
interface PizzaioloAnalysis {
    hydration: number; salt: number; oil?: number | null; yeast: YeastInfo;
    fermentationSchedule: FermentationSchedule; flourRecommendation: string;
    technicalAnalysis: string; adjustmentRationale: string; techniqueGuidance: string[];
    advancedOptions: AdvancedOptions;
}
// --- End Interfaces ---

// Define the available pizza styles
const pizzaStyles = [
  'Neapolitan',
  'New York',
  'Detroit',
  'Sicilian',
  'Roman',
  'Custom'
];

// Define temperature options
const tempOptions = [
  { label: 'Cool (<20°C)', value: 'Cool' },
  { label: 'Average (20-23°C)', value: 'Average' },
  { label: 'Warm (>23°C)', value: 'Warm' },
];

// Added Altitude Options
const altitudeOptions = [
    { label: 'Sea Level (<3k ft)', value: 'Sea Level'},
    { label: 'Moderate (3k-6k ft)', value: 'Moderate' },
    { label: 'High (>6k ft)', value: 'High' },
];

// Added Humidity Options
const humidityOptions = [
    { label: 'Low (<40%)', value: 'Low' },
    { label: 'Average (40-60%)', value: 'Average' },
    { label: 'High (>60%)', value: 'High' },
];

export default function DoughCalculatorForm() {
  // Input states
  const [doughBalls, setDoughBalls] = useState('4');
  const [weightPerBall, setWeightPerBall] = useState('280');
  const [selectedStyle, setSelectedStyle] = useState<string | null>('New York');
  const [selectedTemperature, setSelectedTemperature] = useState<string>('Average');
  const [selectedAltitude, setSelectedAltitude] = useState<string | null>(null);
  const [selectedHumidity, setSelectedHumidity] = useState<string | null>(null);

  // Calculation/API states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipeResult, setRecipeResult] = useState<PizzaioloAnalysis | null>(null);

  const handleStyleSelect = (style: string) => {
    setSelectedStyle(style);
    setRecipeResult(null);
    setError(null);
  };

  const handleTempSelect = (temp: string) => {
    setSelectedTemperature(temp);
    setRecipeResult(null);
    setError(null);
  };

  const handleAltitudeSelect = (alt: string | null) => {
    setSelectedAltitude(alt);
    setRecipeResult(null);
    setError(null);
  };

  const handleHumiditySelect = (hum: string | null) => {
    setSelectedHumidity(hum);
    setRecipeResult(null);
    setError(null);
  };

  // Basic validation check for enabling the calculate button
  // Added simple check for positive numbers
  const isFormValid =
    selectedStyle &&
    parseInt(doughBalls) > 0 &&
    parseInt(weightPerBall) > 0;

  // --- Form Submission Handler ---
  const handleCalculate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevent default browser submission
    if (!isFormValid) return; // Double-check validity

    setIsLoading(true);
    setError(null);
    setRecipeResult(null); // Clear previous results

    const payload = {
      doughBalls: parseInt(doughBalls),
      weightPerBall: parseInt(weightPerBall),
      style: selectedStyle, // Already a string or null, validation ensures it's string here
      temperature: selectedTemperature as 'Cool' | 'Average' | 'Warm', // Assert type
      altitude: selectedAltitude || null,
      humidity: selectedHumidity || null,
    };

    try {
      console.log("Sending payload to /api/calculate:", payload);

      // *** Actual fetch call ***
      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log("API Response Status:", response.status);

      if (!response.ok) {
        let errorMsg = `API Error: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg; // Use specific message if provided
        } catch (e) {
          // Ignore if response wasn't JSON
        }
        throw new Error(errorMsg);
      }

      // *** Expecting PizzaioloAnalysis result ***
      const result: PizzaioloAnalysis = await response.json();
      console.log("Received analysis result:", result);
      setRecipeResult(result);

    } catch (err: any) {
      console.error("Calculation error:", err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  // --- End Form Submission Handler ---

  return (
    // Changed div to form and added onSubmit
    <form onSubmit={handleCalculate} className="w-full max-w-lg p-6 sm:p-8 space-y-6 bg-white shadow-xl rounded-xl border border-gray-100">
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">DoughMaster Analysis</h2>

      {/* --- Input Sections --- */}
      {/* Quantity & Size Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="doughBalls" className="block text-sm font-medium text-gray-700">Dough Balls</label>
          <input
            type="number"
            id="doughBalls"
            value={doughBalls}
            onChange={(e) => { setDoughBalls(e.target.value); setRecipeResult(null); setError(null); }}
            placeholder="e.g., 4"
            min="1" // Basic HTML validation
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
            required
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="weightPerBall" className="block text-sm font-medium text-gray-700">Weight/Ball (g)</label>
          <input
            type="number"
            id="weightPerBall"
            value={weightPerBall}
            onChange={(e) => { setWeightPerBall(e.target.value); setRecipeResult(null); setError(null); }}
            placeholder="e.g., 280"
            min="1" // Basic HTML validation
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
            required
          />
        </div>
      </div>
      {/* Pizza Style Section */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Pizza Style</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {pizzaStyles.map((style) => (
            <button
              key={style} type="button" onClick={() => handleStyleSelect(style)}
              className={`px-3 py-2 border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all duration-150 ease-in-out ${selectedStyle === style ? 'bg-blue-600 text-white border-blue-700 ring-blue-300' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100 hover:border-gray-400 ring-transparent'}`}
            >{style}</button>
          ))}
        </div>
        <button type="button" className="mt-2 text-sm text-blue-600 hover:underline focus:outline-none">
          🍕 Help Me Choose Style {/* TODO: Implement later */}
        </button>
      </div>
      {/* Environmental Factors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Temperature</label>
          <div className="flex border border-gray-300 rounded-md overflow-hidden shadow-sm">
            {tempOptions.map((option, index) => (
              <button
                key={option.value} type="button" onClick={() => handleTempSelect(option.value)}
                className={`flex-1 px-2 py-2 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-indigo-400 transition-colors duration-150 ease-in-out ${index > 0 ? 'border-l border-gray-300' : ''} ${selectedTemperature === option.value ? 'bg-indigo-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >{option.label}</button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor="altitude" className="block text-sm font-medium text-gray-700">Altitude <span className="text-xs text-gray-500">(Optional)</span></label>
          <select id="altitude" value={selectedAltitude ?? ''}
            onChange={(e) => handleAltitudeSelect(e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          >
            <option value="">Select Altitude...</option>
            {altitudeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="humidity" className="block text-sm font-medium text-gray-700">Humidity <span className="text-xs text-gray-500">(Optional)</span></label>
          <select id="humidity" value={selectedHumidity ?? ''}
            onChange={(e) => handleHumiditySelect(e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          >
            <option value="">Select Humidity...</option>
            {humidityOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
      </div>
      {/* --- End Input Sections --- */}

      {/* --- Calculate Button --- */}
      <div className="pt-4">
        <button
          type="submit"
          className={`w-full px-4 py-3 font-semibold text-white rounded-lg shadow-md transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isLoading ? 'bg-gray-500 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'} ${!isFormValid && !isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
          disabled={!isFormValid || isLoading}
        >
          {isLoading ? 'Analyzing...' : 'Get Pizzaiolo Analysis'}
        </button>
      </div>
      {/* --- End Calculate Button --- */}

       {/* --- Error Display --- */}
       {error && (
        <div className="mt-4 p-3 text-center text-sm text-red-800 bg-red-100 border border-red-300 rounded-lg shadow-sm">
          <strong>Error:</strong> {error}
        </div>
      )}
      {/* --- End Error Display --- */}

      {/* --- Result Display Placeholder --- */}
      {recipeResult && !isLoading && (
        <div className="mt-6 p-5 border border-green-300 bg-green-50 rounded-lg shadow-sm animate-fade-in">
          <h3 className="text-xl font-semibold text-green-800 mb-3">Pizzaiolo Analysis Result:</h3>
          <RecipeAnalysisDisplay 
            analysis={recipeResult} 
            doughBalls={parseInt(doughBalls) || 0} // Pass parsed number, default 0 if parsing fails
            weightPerBall={parseInt(weightPerBall) || 0} // Pass parsed number, default 0 if parsing fails
          />
        </div>
      )}
      {/* --- End Result Display Placeholder --- */}

    </form>
  );
} 