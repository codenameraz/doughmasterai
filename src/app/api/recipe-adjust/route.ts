import { OpenAI } from 'openai'
import { NextResponse } from 'next/server'
import { PIZZA_STYLES } from '@/lib/openai/config'
import { cache } from '@/lib/cache'
import { rateLimiter } from '@/lib/rateLimiter'

// Enable edge runtime and set timeout
export const runtime = 'edge';
export const maxDuration = 60;

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
} as const;

// Add retry logic helper
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i))); // Exponential backoff
      }
    }
  }
  
  throw lastError;
}

// Better retry logic with exponential backoff and timeout
async function withRetryAndTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = 15000,
  maxRetries: number = 1
): Promise<T> {
  // Create a promise that rejects after timeoutMs
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  
  let lastError: any;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      // Race between the function and the timeout
      return await Promise.race([fn(), timeoutPromise]);
    } catch (error) {
      console.warn(`API call attempt ${i+1}/${maxRetries+1} failed:`, error);
      lastError = error;
      
      if (i < maxRetries) {
        // Wait with exponential backoff before retrying (but keep total time reasonable)
        const backoffTime = Math.min(300 * Math.pow(2, i), 1000);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
  }
  
  throw lastError;
}

// Define a simple model that's definitely available on OpenRouter
const MODEL = 'google/gemma-3-12b-it:free' // Using the original model as requested

// Initialize OpenRouter client with optimized settings
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
  timeout: 20000, // Lower timeout to ensure we get a response before gateway timeout
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXTAUTH_URL || 'https://doughmasterai.com',
    'X-Title': 'Pizza Dough Calculator'
  }
});

// Essential interfaces for type checking
interface Timeline {
    step: string;
    time: string;
    description: string;
    temperature?: number;
    tips?: string[];
}

interface TemperatureAnalysis {
  roomTemp: number;
  season: string;
  impact: string[];
  recommendations: string[];
  rationale?: string;
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

interface FlourInfo {
  type: string;
  proteinContent: number;
  purpose: string;
}

interface DetailedAnalysis {
  flourAnalysis?: {
    rationale: string;
    flours: FlourInfo[];
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
  oilAnalysis?: {
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
  techniqueGuidance?: {
    handling?: string;
    shaping?: string;
    baking?: string;
  };
}

interface FermentationType {
  schedule: string;
  temperature: {
    room: number | null;
    cold: number | null;
  };
  duration: {
    min: number;
    max: number;
  };
}

interface RecipeInput {
  style: string;
  doughBalls: number;
  weightPerBall: number;
  recipe: {
    hydration: number;
    salt: number;
    oil: number | null;
        flourMix?: {
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
  environment: {
    altitude?: number;
    ovenType?: 'home' | 'outdoor';
    maxOvenTemp?: number;
    roomTemp: number;
    tempUnit: 'C' | 'F';
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

// --- START NEW CODE ---
const FLOUR_AUTHENTICITY_MAP = {
  'Neapolitan': {
    'authentic': ['Caputo 00', 'Mulino Caputo 00', 'Antimo Caputo 00', 'Le 5 Stagioni 00', 'Molino Grassi 00'],
    'inauthentic': ['King Arthur', 'All Trumps', 'Gold Medal', 'Pillsbury']
  },
  'New York': {
    'authentic': ['King Arthur Bread Flour', 'All Trumps', 'Gold Medal Better for Bread'],
    'inauthentic': ['Caputo 00', 'Italian 00 flour']
  }
  // Add other styles as needed
};
// --- END NEW CODE ---

const SYSTEM_MESSAGE = `You are a master pizzaiolo with scientific expertise in dough fermentation and gluten development. Provide pizza dough analysis in valid JSON format with these requirements:
1. All values as numbers without units (no %, °C, °F) except for temperature values which must be used exactly as provided
2. Use temperature values EXACTLY as provided without any conversion
3. Percentages as plain numbers (65 not "65%")
4. Use single values, not ranges
5. Ensure valid JSON structure throughout
6. Focus on practical, scientifically accurate advice based on established baking science`;

const PROMPT_TEMPLATE = (data: RecipeInput) => {
  // Use the exact room temperature without any conversion
  const roomTemp = data.environment.roomTemp;
  const tempUnit = data.environment.tempUnit;
  
  type FermentationScheduleType = 'quick' | 'same-day' | 'overnight' | 'cold';
  
  // Define fermentation schedules without temperature calculations
  const fermentationSchedules: Record<FermentationScheduleType, {
    room: { duration: string };
    cold?: { duration: string };
    description: string;
  }> = {
    'quick': {
      room: { duration: '2-4 hours' },
      description: 'Short room temperature fermentation only'
    },
    'same-day': {
      room: { duration: '8-12 hours' },
      description: 'Extended room temperature fermentation'
    },
    'overnight': {
      room: { duration: '2-3 hours' },
      cold: { duration: '12-16 hours' },
      description: 'Initial room temperature rise followed by overnight cold fermentation'
    },
    'cold': {
      room: { duration: '2-3 hours' },
      cold: { duration: '24-72 hours' },
      description: 'Initial room temperature rise followed by extended cold fermentation'
    }
  };

  const schedule = fermentationSchedules[data.fermentation.schedule as FermentationScheduleType] || fermentationSchedules['same-day'];
  const usesColdFermentation = data.fermentation.schedule === 'cold' || data.fermentation.schedule === 'overnight';

  // Generate refrigeration temperature text based on user's unit preference
  const refrigTempText = tempUnit === 'F' ? '39°F' : '4°C';

  return `You are a master pizza chef and dough expert. Based on the provided recipe details, analyze and provide recommendations in the following JSON format.

CRITICAL TEMPERATURE INSTRUCTIONS:
- The room temperature is EXACTLY ${roomTemp}°${tempUnit}
- You MUST use ${roomTemp}°${tempUnit} for ALL room temperature steps
- DO NOT convert ${roomTemp}°${tempUnit} to any other temperature or unit
- DO NOT calculate or change the temperature value
- The temperature field in steps must be EXACTLY "${roomTemp}°${tempUnit}"

{
  "flourRecommendation": {
    "primary": {
      "name": string,
      "protein": string,
      "description": string
    },
    "alternatives": [
      {
        "name": string,
        "protein": string,
        "description": string
      }
    ]
  },
  "processTimeline": {
    "steps": [
      {
        "step": number,
        "description": string,
        "duration": string,
        "temperature": "${roomTemp}°${tempUnit}" (COPY THIS EXACT VALUE - DO NOT MODIFY),
        "isRefrigeration": boolean,
        "tips": [string]
      }
    ]
  },
  "temperatureAnalysis": {
    "roomTemp": ${roomTemp} (COPY THIS EXACT NUMBER - DO NOT MODIFY),
    "rationale": string,
    "recommendations": [string]
  },
  "detailedAnalysis": {
    "flourAnalysis": {
      "rationale": string,
      "recommendations": [string],
      "flours": [
        {
          "type": string,
          "proteinContent": number,
          "purpose": string
        }
      ]
    },
    "hydrationAnalysis": {
      "percentage": number,
      "rationale": string,
      "impact": [string]
    },
    "saltAnalysis": {
      "percentage": number,
      "rationale": string,
      "impact": [string]
    },
    "oilAnalysis": {
      "percentage": number,
      "rationale": string,
      "impact": [string]
    },
    "yeastAnalysis": {
      "type": string,
      "percentage": number,
      "rationale": string,
      "impact": [string],
      "temperatureNotes": [string]
    },
    "fermentationAnalysis": {
      "type": string,
      "totalTime": number,
      "rationale": string,
      "impact": [string]
    },
    "techniqueGuidance": {
      "mixing": string,
      "folding": string,
      "shaping": string,
      "baking": string
    }
  }
}

Instructions:
1. For the flour recommendation:
   - Consider the pizza style (${data.style}), fermentation type, and desired texture
   - For Neapolitan style, ONLY recommend authentic Italian 00 flours
   - For New York style, prioritize high-protein bread flours
   - Include protein content ranges and brief descriptions

2. For the process timeline:
   - Create steps based on fermentation type: ${data.fermentation.schedule}
   - IMPORTANT: For ALL non-refrigeration steps, the temperature MUST be "${roomTemp}°${tempUnit}"
   - For refrigeration steps, use "${refrigTempText}"
   - DO NOT CONVERT OR MODIFY THE TEMPERATURE VALUES
   - ALWAYS include oven preheating step based on oven type:
     * For home oven (${OVEN_TYPES.home.maxTemp}°F max):
       - Start preheating 1 hour before baking
       - Place pizza stone/steel in oven during preheat
       - Preheat to maximum temperature (${OVEN_TYPES.home.maxTemp}°F)
     * For outdoor pizza oven (${OVEN_TYPES.outdoor.maxTemp}°F max):
       - Start preheating 30 minutes before baking
       - Heat until floor temperature reaches 750-800°F
       - Maintain consistent flame while baking

   - For same-day fermentation (8-12 hours total):
     - Step 1: Initial Mix (5-10 minutes) at ${roomTemp}°${tempUnit}
     - Step 2: Bulk Fermentation (8-12 hours) at ${roomTemp}°${tempUnit}
     - Step 3: Divide and Ball (5-10 minutes) at ${roomTemp}°${tempUnit}
     - Step 4: Final Proof (30-60 minutes) at ${roomTemp}°${tempUnit}
     - Step 5: Begin Oven Preheat (see oven-specific instructions above)
     - Step 6: Shape and Bake
   
   - For quick fermentation (2-4 hours total):
     - Step 1: Initial Mix (5-10 minutes) at ${roomTemp}°${tempUnit}
     - Step 2: Bulk Fermentation (1-2 hours) at ${roomTemp}°${tempUnit}
     - Step 3: Divide and Ball (5-10 minutes) at ${roomTemp}°${tempUnit}
     - Step 4: Final Proof (30-60 minutes) at ${roomTemp}°${tempUnit}
     - Step 5: Begin Oven Preheat (see oven-specific instructions above)
     - Step 6: Shape and Bake
   
   - For overnight/cold fermentation:
     * For overnight (16-20 hours at room temperature):
       - Step 1: Initial Mix (5-10 minutes) at ${roomTemp}°${tempUnit}
       - Step 2: Bulk Fermentation (16-20 hours) at ${roomTemp}°${tempUnit}
       - Step 3: Divide and Ball (5-10 minutes) at ${roomTemp}°${tempUnit}
       - Step 4: Final Proof (30-60 minutes) at ${roomTemp}°${tempUnit}
       - Step 5: Begin Oven Preheat (see oven-specific instructions above)
       - Step 6: Shape and Bake

     * For cold fermentation (24-72 hours with refrigeration):
       - Step 1: Initial Mix (5-10 minutes) at ${roomTemp}°${tempUnit}
       - Step 2: Room Temp Rise (1-2 hours) at ${roomTemp}°${tempUnit}
       - Step 3: Refrigeration (24-72 hours) at ${refrigTempText}
       - Step 4: Remove from Refrigerator (let rest at ${roomTemp}°${tempUnit})
       - Step 5: Divide and Ball (5-10 minutes) at ${roomTemp}°${tempUnit}
       - Step 6: Final Proof (1-2 hours) at ${roomTemp}°${tempUnit}
       - Step 7: Begin Oven Preheat (see oven-specific instructions above)
       - Step 8: Shape and Bake

3. For temperature analysis:
   - Room temperature is EXACTLY: ${roomTemp}°${tempUnit} 
   - The "roomTemp" field MUST be ${roomTemp} (just the number)
   - Explain how ${roomTemp}°${tempUnit} affects fermentation rate
   - NEVER convert ${roomTemp}°${tempUnit} to any other unit or value

4. For each detailed analysis section:
   - flourAnalysis: 
     * Explain why certain flours work best for this style
     * Include specific protein content ranges
     * Always include the "flours" array with at least one flour type
     * For Neapolitan, only recommend authentic Italian flours
     
   - hydrationAnalysis:
     * Explain why ${data.recipe.hydration}% hydration is appropriate (or suggest adjustments)
     * Include at least 3 specific impacts on dough characteristics
     * Recommend adjustments based on flour type if needed
     
   - saltAnalysis:
     * Explain why ${data.recipe.salt}% salt is appropriate (or suggest adjustments)
     * Include at least 3 specific impacts on flavor and fermentation
     * Provide tips on salt incorporation
     
   - oilAnalysis:
     * Explain why ${data.recipe.oil}% oil is appropriate (or suggest adjustments)
     * Include at least 3 specific impacts on dough characteristics
     * Provide tips on oil incorporation
     
   - yeastAnalysis:
     * Recommend specific percentage based on fermentation time and temperature
     * Explain how ${data.recipe.yeast.type} works at ${roomTemp}°${tempUnit}
     * Include temperature considerations
     
   - fermentationAnalysis:
     * Explain the benefits of ${data.fermentation.schedule} fermentation
     * Describe how fermentation develops flavor and texture
     * Include total time recommendation
     
   - techniqueGuidance:
     * Provide specific mixing instructions
     * Include folding/shaping techniques
     * Give baking tips appropriate for ${data.environment?.ovenType} oven:
       - For home oven:
         * Place stone/steel on middle rack
         * Preheat thoroughly for 1 hour minimum
         * Use broiler method if available
         * Consider turning method between bakes
       - For outdoor pizza oven:
         * Manage flame size and position
         * Rotate pizza frequently
         * Monitor floor temperature
         * Adjust flame between bakes

5. Consider these specific parameters:
   - Dough balls: ${data.doughBalls} x ${data.weightPerBall}g
   - Hydration: ${data.recipe.hydration}%
   - Salt: ${data.recipe.salt}%
   - Oil: ${data.recipe.oil !== null ? data.recipe.oil + '%' : 'none'}
   - Yeast type: ${data.recipe.yeast.type}
   - Flour mix: ${data.recipe.flourMix ? JSON.stringify(data.recipe.flourMix) : 'single flour'}

6. Adjust yeast percentage based on:
   - Fermentation type: ${data.fermentation.schedule}
   - Room temperature: ${roomTemp}°${tempUnit}
   - Total fermentation time: ${usesColdFermentation 
       ? Number(schedule.room.duration.split('-')[0]) + Number(schedule.cold?.duration.split('-')[0])
       : Number(schedule.room.duration.split('-')[0])} hours minimum
   - For quick fermentation: use higher yeast percentage (0.5% - 1%)
   - For same-day: moderate yeast (0.2% - 0.5%)
   - For overnight/cold: very low yeast (0.05% - 0.1%)

7. IMPORTANT: 
   - NEVER CONVERT ${roomTemp}°${tempUnit} to any other temperature - use exactly as provided
   - All analysis sections MUST have complete content
   - Keep descriptions informative but concise

Recipe details to analyze: ${JSON.stringify(data)}`;
};

// Add interface for raw timeline step
interface RawTimelineStep {
  time?: string;
  action?: string;
  step?: string;
  why?: string;
  description?: string;
  temperature?: number | string;
  tips?: string[];
}

// Add new helper function to validate and repair JSON structure
function validateAndRepairJsonStructure(jsonStr: string): string {
  // Track opening and closing brackets
  const stack: { char: string; pos: number }[] = [];
  const repairs: { pos: number; fix: string }[] = [];
  
  // First pass: find mismatched brackets and track positions
  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    if (char === '{' || char === '[') {
      stack.push({ char, pos: i });
    } else if (char === '}' || char === ']') {
      if (stack.length === 0) {
        // Found closing bracket without matching opening
        repairs.push({ pos: i, fix: char === '}' ? '{' : '[' });
      } else {
        const last = stack[stack.length - 1];
        if ((char === '}' && last.char === '[') || (char === ']' && last.char === '{')) {
          // Mismatched bracket types
          repairs.push({ pos: i, fix: last.char === '[' ? ']' : '}' });
        }
        stack.pop();
      }
    }
  }

  // Add missing closing brackets
  while (stack.length > 0) {
    const last = stack.pop()!;
    repairs.push({ pos: jsonStr.length, fix: last.char === '{' ? '}' : ']' });
  }

  // Apply repairs from end to start to maintain positions
  let repairedJson = jsonStr;
  repairs.sort((a, b) => b.pos - a.pos).forEach(repair => {
    repairedJson = repairedJson.slice(0, repair.pos) + repair.fix + repairedJson.slice(repair.pos);
  });

  return repairedJson;
}

function cleanResponse(content: string, data: RecipeInput): string {
  console.log('Raw response from LLM:', content);
  try {
    // Find the outermost JSON object
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
      console.error('No JSON object found in response');
      throw new Error('No JSON object found');
    }
    
    // Extract just the JSON part and trim any whitespace
    let jsonStr = content.slice(jsonStart, jsonEnd + 1).trim();

    // --- START JSON STRUCTURE CLEANUP ---
    const roomTemp = data.environment.roomTemp;
    const tempUnit = data.environment.tempUnit;
    const refrigTempText = tempUnit === 'F' ? '39°F' : '4°C';

    // 1. Fix temperature values first
    jsonStr = jsonStr
      // Fix double temperature units
      .replace(/(\d+\.?\d*)\s*°[CF]"?°[CF]"?/g, `$1°${tempUnit}`)
      // Fix temperature with extra quotes and commas
      .replace(/"temperature"\s*:\s*["']?\s*,?\s*(\d+\.?\d*)\s*°?[CF]?"?\s*["']?/g, 
        (match, temp) => {
          const numTemp = parseFloat(temp);
          // If the temperature is around 22.2 (converted from 72F), use original room temp
          if (Math.abs(numTemp - 22.2) < 0.1) {
            return `"temperature": "${roomTemp}°${tempUnit}"`;
          }
          return `"temperature": "${numTemp}°${tempUnit}"`;
        })
      // Fix any remaining incorrect temperatures
      .replace(/22\.2°[CF]/g, `${roomTemp}°${tempUnit}`);

    // 2. Fix general JSON structure issues
      jsonStr = jsonStr
      // Remove extra commas before values
      .replace(/:\s*,\s*"([^"]+)"/g, ': "$1"')
      .replace(/:\s*,\s*(\d+)/g, ': $1')
      // Fix multiple quotes
      .replace(/"{2,}/g, '"')
      // Fix multiple commas
      .replace(/,{2,}/g, ',')
      // Remove trailing commas before closing brackets
        .replace(/,(\s*[}\]])/g, '$1')
      // Fix missing commas between array elements
      .replace(/](\s*)\[/g, '], [')
      .replace(/}(\s*)\{/g, '}, {')
      // Remove any stray temperature units
      .replace(/,\s*"?°[CF]"?/g, '');

    // 3. Ensure correct temperature values in analysis sections
    jsonStr = jsonStr
      .replace(/"roomTemp"\s*:\s*22\.2/g, `"roomTemp": ${roomTemp}`)
      .replace(/22\.2°[CF]/g, `${roomTemp}°${tempUnit}`);

    console.log('Pre-processed JSON string:', jsonStr);

    // First try to parse as is
    try {
      let parsed = JSON.parse(jsonStr);
      
      // --- START FINAL TEMPERATURE VALIDATION ---
      // Force correct temperature format in process timeline
      if (parsed.processTimeline?.steps) {
        parsed.processTimeline.steps = parsed.processTimeline.steps.map((step: any) => ({
          ...step,
          temperature: step.isRefrigeration === true 
            ? refrigTempText 
            : `${roomTemp}°${tempUnit}`
        }));
      }

      // Force correct temperature in temperatureAnalysis
      if (parsed.temperatureAnalysis) {
        parsed.temperatureAnalysis = {
          ...parsed.temperatureAnalysis,
          roomTemp: roomTemp
        };
      }
      // --- END FINAL TEMPERATURE VALIDATION ---

      return JSON.stringify(sanitizeResponse(parsed, data));
    } catch (parseError) {
      console.error('Initial JSON parse error:', parseError);
      throw parseError;
    }
  } catch (error) {
    console.error('Error cleaning response:', error);
    throw error;
  }
}

// Add a helper function to validate array structures
function validateArrayStructure(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => validateArrayStructure(item)).filter(item => item !== undefined);
  } else if (typeof obj === 'object' && obj !== null) {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[key] = validateArrayStructure(value);
      }
    }
    return result;
  }
  return obj;
}

// Update sanitizeResponse to accept data parameter and enforce temperature format
function sanitizeResponse(parsed: any, data: RecipeInput): any {
  const validated = validateArrayStructure(parsed);
  
  // Get temperature values from input data
  const roomTemp = data.environment.roomTemp;
  const tempUnit = data.environment.tempUnit;
  const refrigTempText = tempUnit === 'F' ? '39°F' : '4°C';

  // FORCE correct temperature values throughout the entire response
  function forceCorrectTemperature(obj: any): any {
    if (!obj) return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => forceCorrectTemperature(item));
    }
    
    if (typeof obj === 'object') {
      const newObj: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (key === 'temperature') {
          // For any temperature field, force the correct value
          newObj[key] = obj.isRefrigeration === true ? refrigTempText : `${roomTemp}°${tempUnit}`;
        } else if (key === 'roomTemp' && typeof value === 'number') {
          // For any roomTemp field that's a number, force the correct value
          newObj[key] = roomTemp;
        } else if (key === 'rationale' && typeof value === 'string') {
          // Replace any converted temperatures in rationale text
          newObj[key] = value.replace(/22\.2°[CF]/g, `${roomTemp}°${tempUnit}`);
        } else {
          // Recursively process nested objects and arrays
          newObj[key] = forceCorrectTemperature(value);
        }
      }
      return newObj;
    }
    
    return obj;
  }

  // Force correct temperatures throughout the entire response
  const correctedResponse = forceCorrectTemperature(validated);

  // Ensure all required properties exist with correct temperatures
  const result = {
    ...correctedResponse,
    processTimeline: {
      steps: Array.isArray(correctedResponse.processTimeline?.steps) 
        ? correctedResponse.processTimeline.steps.map((step: any) => ({
            ...step,
            temperature: step.isRefrigeration === true ? refrigTempText : `${roomTemp}°${tempUnit}`
          }))
        : []
    },
    temperatureAnalysis: {
      ...(correctedResponse.temperatureAnalysis || {}),
      roomTemp: roomTemp,
      season: correctedResponse.temperatureAnalysis?.season || "Standard",
      impact: Array.isArray(correctedResponse.temperatureAnalysis?.impact) 
        ? correctedResponse.temperatureAnalysis.impact 
        : [],
      recommendations: Array.isArray(correctedResponse.temperatureAnalysis?.recommendations)
        ? correctedResponse.temperatureAnalysis.recommendations.map((rec: string) => 
            rec.replace(/22\.2°[CF]/g, `${roomTemp}°${tempUnit}`)
          )
        : [],
      rationale: (correctedResponse.temperatureAnalysis?.rationale || "").replace(/22\.2°[CF]/g, `${roomTemp}°${tempUnit}`)
    }
  };
  
  // Ensure detailedAnalysis exists
  if (!result.detailedAnalysis) {
    result.detailedAnalysis = {};
  }
  
  // Initialize nested objects
  const da = result.detailedAnalysis;
  
  // Initialize flourAnalysis
  if (!da.flourAnalysis) {
    da.flourAnalysis = { rationale: "", flours: [], alternatives: [] };
  } else {
    da.flourAnalysis.flours = Array.isArray(da.flourAnalysis.flours) ? da.flourAnalysis.flours : [];
    da.flourAnalysis.alternatives = Array.isArray(da.flourAnalysis.alternatives) ? da.flourAnalysis.alternatives : [];
    da.flourAnalysis.rationale = da.flourAnalysis.rationale || "";
  }
  
  // Initialize hydrationAnalysis
  if (!da.hydrationAnalysis) {
    da.hydrationAnalysis = { percentage: 65, rationale: "", impact: [] };
  } else {
    da.hydrationAnalysis.impact = Array.isArray(da.hydrationAnalysis.impact) ? da.hydrationAnalysis.impact : [];
    da.hydrationAnalysis.rationale = da.hydrationAnalysis.rationale || "";
  }
  
  // Initialize saltAnalysis
  if (!da.saltAnalysis) {
    da.saltAnalysis = { percentage: 2.8, rationale: "", impact: [] };
  } else {
    da.saltAnalysis.impact = Array.isArray(da.saltAnalysis.impact) ? da.saltAnalysis.impact : [];
    da.saltAnalysis.rationale = da.saltAnalysis.rationale || "";
  }
  
  // Initialize oilAnalysis
  if (!da.oilAnalysis) {
    da.oilAnalysis = { percentage: 0, rationale: "", impact: [] };
  } else {
    da.oilAnalysis.impact = Array.isArray(da.oilAnalysis.impact) ? da.oilAnalysis.impact : [];
    da.oilAnalysis.rationale = da.oilAnalysis.rationale || "";
  }
  
  // Initialize yeastAnalysis
  if (!da.yeastAnalysis) {
    da.yeastAnalysis = { type: "instant", percentage: 0.2, rationale: "", impact: [], temperatureNotes: [] };
  } else {
    da.yeastAnalysis.impact = Array.isArray(da.yeastAnalysis.impact) ? da.yeastAnalysis.impact : [];
    da.yeastAnalysis.temperatureNotes = Array.isArray(da.yeastAnalysis.temperatureNotes) ? da.yeastAnalysis.temperatureNotes : [];
    da.yeastAnalysis.rationale = da.yeastAnalysis.rationale || "";
  }
  
  // Initialize fermentationAnalysis
  if (!da.fermentationAnalysis) {
    da.fermentationAnalysis = {
      totalTime: 12,
      type: "same-day",
      rationale: "",
      impact: [],
      roomTemp: { time: 8, temperature: 22, impact: [] },
      enzymaticActivity: "",
      gluten: ""
    };
  } else {
    da.fermentationAnalysis.impact = Array.isArray(da.fermentationAnalysis.impact) ? da.fermentationAnalysis.impact : [];
    
    // Initialize roomTemp
    if (!da.fermentationAnalysis.roomTemp) {
      da.fermentationAnalysis.roomTemp = { time: 8, temperature: 22, impact: [] };
    } else {
      da.fermentationAnalysis.roomTemp.impact = Array.isArray(da.fermentationAnalysis.roomTemp.impact) ? 
        da.fermentationAnalysis.roomTemp.impact : [];
    }
    
    // Initialize coldTemp if it exists
    if (da.fermentationAnalysis.coldTemp) {
      da.fermentationAnalysis.coldTemp.impact = Array.isArray(da.fermentationAnalysis.coldTemp.impact) ?
        da.fermentationAnalysis.coldTemp.impact : [];
    }
    
    da.fermentationAnalysis.rationale = da.fermentationAnalysis.rationale || "";
    da.fermentationAnalysis.enzymaticActivity = da.fermentationAnalysis.enzymaticActivity || "";
    da.fermentationAnalysis.gluten = da.fermentationAnalysis.gluten || "";
  }
  
  // Initialize techniqueGuidance
  if (!da.techniqueGuidance) {
    da.techniqueGuidance = { handling: "", shaping: "", baking: "" };
  }
  
  return result;
}

// Update validation function for more robustness
function validateResponse(response: any, fermentation: FermentationType): boolean {
  if (!response || typeof response !== 'object') return false;

  // Check timeline
  if (!Array.isArray(response.timeline)) return false;
  if (response.timeline.length === 0) return false;
  
  // Validate timeline items
  for (const step of response.timeline) {
    if (!step.instructions || !step.duration || !Array.isArray(step.tips)) {
      return false;
    }
  }

  // For cold fermentation, ensure refrigeration steps are included
  if (fermentation.schedule === 'cold') {
    const timelineText = JSON.stringify(response.timeline).toLowerCase();
    if (!timelineText.includes('refrigerat') || 
        !timelineText.includes('cold') || 
        !timelineText.includes('fridge')) {
      return false;
    }
  }

  // Check detailed analysis
  if (!response.detailedAnalysis || typeof response.detailedAnalysis !== 'object') return false;
  
  // Check flour analysis
  if (!response.detailedAnalysis.flourAnalysis || 
      !response.detailedAnalysis.flourAnalysis.recommendation ||
      !response.detailedAnalysis.flourAnalysis.rationale) {
    return false;
  }

  // Check temperature analysis
  if (!response.detailedAnalysis.temperatureAnalysis ||
      !response.detailedAnalysis.temperatureAnalysis.rationale) {
    return false;
  }

  // Check technique guidance
  if (!Array.isArray(response.techniqueGuidance) || response.techniqueGuidance.length === 0) {
    return false;
  }
  
  return true;
}

// Fallback response generator for when API times out
function generateFallbackResponse(data: RecipeInput): any {
  console.log('Generating fallback response');
  const roomTemp = data.environment.roomTemp;
  const tempUnit = data.environment.tempUnit;
  const refrigTempText = tempUnit === 'F' ? '39°F' : '4°C';
  
  // Calculate basic flour amount (58% of total dough weight)
  const totalDoughWeight = data.doughBalls * data.weightPerBall;
  const flourAmount = Math.round(totalDoughWeight * 0.58);
  const waterAmount = Math.round(flourAmount * (data.recipe.hydration / 100));
  const saltAmount = Math.round(flourAmount * (data.recipe.salt / 100));
  const yeastAmount = Math.round(flourAmount * (data.recipe.yeast.type === 'instant' ? 0.005 : 0.015));
  
  // Determine flour type based on style
  let flourType = "Bread Flour";
  let proteinContent = 12.7;
  
  if (data.style.toLowerCase().includes('neapolitan')) {
    flourType = "Caputo 00";
    proteinContent = 12.5;
  }
  
  // Generate timeline steps based on fermentation schedule
  const timelineSteps = [];
  
  if (data.fermentation.schedule === 'quick') {
    timelineSteps.push(
      {
        step: "Initial Mix",
        time: "00:00",
        description: "Mix all ingredients except salt for 1 minute, then add salt and mix until combined",
        temperature: `${roomTemp}°${tempUnit}`,
        isRefrigeration: false,
        tips: ["Mix until just combined, avoid overmixing"]
      },
      {
        step: "Bulk Fermentation",
        time: "00:30",
        description: "Let dough rest at room temperature",
        temperature: `${roomTemp}°${tempUnit}`,
        isRefrigeration: false,
        tips: ["Cover with plastic wrap to prevent drying"]
      },
      {
        step: "Divide and Ball",
        time: "02:30",
        description: "Divide dough and form into balls",
        temperature: `${roomTemp}°${tempUnit}`,
        isRefrigeration: false,
        tips: ["Dust work surface lightly with flour"]
      },
      {
        step: "Final Proof",
        time: "03:30",
        description: "Let dough balls rest before shaping",
        temperature: `${roomTemp}°${tempUnit}`,
        isRefrigeration: false,
        tips: ["Cover to prevent drying"]
      }
    );
  } else if (data.fermentation.schedule === 'overnight' || data.fermentation.schedule === 'cold') {
    timelineSteps.push(
      {
        step: "Initial Mix",
        time: "00:00",
        description: "Mix all ingredients except salt for 1 minute, then add salt and mix until combined",
        temperature: `${roomTemp}°${tempUnit}`,
        isRefrigeration: false,
        tips: ["Mix until just combined, avoid overmixing"]
      },
      {
        step: "Room Temperature Rest",
        time: "00:30",
        description: "Let dough rest at room temperature",
        temperature: `${roomTemp}°${tempUnit}`,
        isRefrigeration: false,
        tips: ["Cover with plastic wrap to prevent drying"]
      },
      {
        step: "Refrigeration",
        time: "02:00",
        description: "Place dough in refrigerator for cold fermentation",
        temperature: refrigTempText,
        isRefrigeration: true,
        tips: ["Store in airtight container", "Keep away from strong odors"]
      },
      {
        step: "Remove from Refrigerator",
        time: "24:00",
        description: "Let dough warm up to room temperature",
        temperature: `${roomTemp}°${tempUnit}`,
        isRefrigeration: false,
        tips: ["Allow 1-2 hours to warm up before dividing"]
      },
      {
        step: "Divide and Ball",
        time: "25:00",
        description: "Divide dough and form into balls",
        temperature: `${roomTemp}°${tempUnit}`,
        isRefrigeration: false,
        tips: ["Handle gently to preserve gas bubbles"]
      },
      {
        step: "Final Proof",
        time: "26:00",
        description: "Let dough balls rest before shaping",
        temperature: `${roomTemp}°${tempUnit}`,
        isRefrigeration: false,
        tips: ["Cover to prevent drying"]
      }
    );
  } else {
    // Same-day fermentation (default)
    timelineSteps.push(
      {
        step: "Initial Mix",
        time: "00:00",
        description: "Mix all ingredients except salt for 1 minute, then add salt and mix until combined",
        temperature: `${roomTemp}°${tempUnit}`,
        isRefrigeration: false,
        tips: ["Mix until just combined, avoid overmixing"]
      },
      {
        step: "Bulk Fermentation",
        time: "00:30",
        description: "Let dough rest at room temperature",
        temperature: `${roomTemp}°${tempUnit}`,
        isRefrigeration: false,
        tips: ["Cover with plastic wrap to prevent drying", "Perform 1-2 stretch and folds during this time"]
      },
      {
        step: "Divide and Ball",
        time: "06:00",
        description: "Divide dough and form into balls",
        temperature: `${roomTemp}°${tempUnit}`,
        isRefrigeration: false,
        tips: ["Dust work surface lightly with flour"]
      },
      {
        step: "Final Proof",
        time: "07:00",
        description: "Let dough balls rest before shaping",
        temperature: `${roomTemp}°${tempUnit}`,
        isRefrigeration: false,
        tips: ["Cover to prevent drying"]
      }
    );
  }
  
  return {
    ingredients: {
      flour: {
        total: flourAmount,
        flours: [
          { type: flourType, amount: flourAmount }
        ]
      },
      water: {
        amount: waterAmount
      },
      salt: {
        amount: saltAmount
      },
      yeast: {
        type: data.recipe.yeast.type,
        amount: yeastAmount
      }
    },
    processTimeline: {
      steps: timelineSteps
    },
    flourRecommendation: {
      primary: {
        name: flourType,
        protein: `${proteinContent}%`,
        description: data.style.toLowerCase().includes('neapolitan') 
          ? "Traditional Italian flour ideal for Neapolitan pizzas" 
          : "High protein flour perfect for chewy, foldable crust"
      },
      alternatives: [
        {
          name: data.style.toLowerCase().includes('neapolitan') ? "King Arthur 00" : "All Trumps",
          protein: data.style.toLowerCase().includes('neapolitan') ? "11.8%" : "14.2%",
          description: data.style.toLowerCase().includes('neapolitan') 
            ? "American alternative to Italian 00" 
            : "Very high protein flour for extra chew"
        }
      ]
    },
    temperatureAnalysis: {
      roomTemp: roomTemp,
      rationale: `At ${roomTemp}°${tempUnit}, fermentation will proceed at a moderate rate. Adjust fermentation time accordingly.`,
      recommendations: [
        `For ${roomTemp}°${tempUnit}, the given timeframes should work well.`,
        `If your kitchen is warmer than ${roomTemp}°${tempUnit}, reduce fermentation time slightly.`,
        `If your kitchen is cooler than ${roomTemp}°${tempUnit}, extend fermentation time slightly.`
      ]
    },
    detailedAnalysis: {
      flourAnalysis: {
        rationale: `${flourType} works well for ${data.style} pizzas because of its protein content and gluten quality.`,
        recommendations: [
          `Use ${flourType} for authentic ${data.style} results`,
          "Freshness matters - check expiration dates",
          "Store flour in airtight container"
        ],
        flours: [
          {
            type: flourType,
            proteinContent: proteinContent,
            purpose: "Primary flour for dough structure"
          }
        ]
      },
      hydrationAnalysis: {
        percentage: data.recipe.hydration,
        rationale: `${data.recipe.hydration}% hydration provides a good balance of workability and texture for ${data.style} style.`,
        impact: [
          `${data.recipe.hydration}% hydration creates a moderately open crumb structure`,
          "Higher hydration requires more skill to handle",
          "Lower hydration creates a denser, less airy crust"
        ]
      },
      saltAnalysis: {
        percentage: data.recipe.salt,
        rationale: `${data.recipe.salt}% salt helps control fermentation and enhances flavor.`,
        impact: [
          "Salt strengthens gluten structure",
          "Salt regulates yeast activity",
          "Salt enhances overall flavor"
        ]
      },
      oilAnalysis: {
        percentage: data.recipe.oil || 0,
        rationale: `${data.recipe.oil}% oil provides a good balance of workability and flavor for ${data.style} style.`,
        impact: [
          `${data.recipe.oil}% oil creates a moderately open crumb structure`,
          "Higher oil content requires more skill to handle",
          "Lower oil content creates a denser, less airy crust"
        ]
      },
      yeastAnalysis: {
        type: data.recipe.yeast.type,
        percentage: 0.5,
        rationale: `${data.recipe.yeast.type} yeast works well with the ${data.fermentation.schedule} fermentation schedule.`,
        impact: [
          "Controls rise rate during fermentation",
          "Contributes subtle flavor compounds",
          "Interacts with flour enzymes during fermentation"
        ],
        temperatureNotes: [
          `At ${roomTemp}°${tempUnit}, yeast activity is moderate`,
          `Below 65°F/18°C, yeast activity slows significantly`,
          `Above 85°F/29°C, yeast becomes very active and may create off-flavors`
        ]
      },
      fermentationAnalysis: {
        type: data.fermentation.schedule,
        totalTime: data.fermentation.schedule === 'quick' ? 4 : 
                   data.fermentation.schedule === 'overnight' || data.fermentation.schedule === 'cold' ? 26 : 8,
        rationale: `${data.fermentation.schedule} fermentation develops flavor and texture appropriate for ${data.style} style.`,
        impact: [
          "Develops complex flavors",
          "Improves digestibility",
          "Creates dough extensibility"
        ],
        enzymaticActivity: "Amylase breaks down starches into sugars for yeast consumption and Maillard browning",
        gluten: "Gluten network develops gradually during fermentation"
      },
      techniqueGuidance: {
        mixing: "Mix until ingredients are just incorporated to avoid oxidation",
        folding: "Use gentle stretch and folds to build strength without degassing",
        shaping: "Handle gently to preserve gas bubbles, using minimal flour on work surface",
        baking: data.environment?.ovenType === 'home' 
          ? "Preheat stone/steel for at least 1 hour at maximum temperature" 
          : "Preheat thoroughly, maintain consistent flame, and rotate pizza frequently"
      }
    }
  };
}

// Optimized makeCompletion with retry, timeout, and fallback
const makeCompletion = async (prompt: string, data: RecipeInput) => {
  try {
    return await withRetryAndTimeout(
      () => openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_MESSAGE },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 1500,
      }),
      15000, // 15 second timeout
      1      // 1 retry (2 attempts total)
    );
  } catch (error) {
    console.error('API call failed after retries:', error);
    console.log('Falling back to pre-generated response');
    
    // Return a mock response that mimics the OpenAI response structure
    return {
      choices: [
        {
          message: {
            content: JSON.stringify(generateFallbackResponse(data))
          }
        }
      ]
    };
  }
};

// Export API route handler
export async function POST(request: Request) {
  try {
    const data = await request.json() as RecipeInput;
    
    // Simplified cache key that still captures essential parameters
    const cacheKey = `recipe-${data.style}-${Math.round(data.doughBalls)}-${Math.round(data.weightPerBall/10)*10}-${Math.round(data.recipe.hydration)}`;

    // Try to get from cache
    const cachedResult = await cache.get(cacheKey);
    if (cachedResult) {
      console.log('Cache hit - returning cached result');
      return NextResponse.json(cachedResult);
    }
    
    console.log('Cache miss - requesting from API');

    // Make the API call with simplified prompt
    const prompt = PROMPT_TEMPLATE(data);
    console.time('api-call');
    const completion = await makeCompletion(prompt, data);
    console.timeEnd('api-call');
    
    console.log('Response received (API or fallback)');
    
    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No content in response');
    }
    
    // Process the response
    try {
      console.time('json-processing');
      
      let jsonResponse;
      
      // First try to directly parse - our fallback is already valid JSON
      try {
        jsonResponse = JSON.parse(content);
      } catch (e) {
        // If that fails, try to extract JSON from AI response
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}');
        
        if (jsonStart === -1 || jsonEnd === -1) {
          throw new Error('No JSON found in response');
        }
        
        // Extract and perform minimal fixes
        const jsonStr = content.slice(jsonStart, jsonEnd + 1);
        const fixedJsonStr = jsonStr
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']')
          .trim();
        
        jsonResponse = JSON.parse(fixedJsonStr);
      }
      
      console.timeEnd('json-processing');
      
      // Fix temperature values
      if (jsonResponse.processTimeline?.steps) {
        const roomTemp = data.environment.roomTemp;
        const tempUnit = data.environment.tempUnit;
        
        jsonResponse.processTimeline.steps = jsonResponse.processTimeline.steps.map((step: any) => ({
          ...step,
          temperature: step.isRefrigeration ? 
            `${tempUnit === 'F' ? 39 : 4}°${tempUnit}` : 
            `${roomTemp}°${tempUnit}`
        }));
      }
      
      // Cache the successful response
      await cache.set(cacheKey, jsonResponse, 60 * 60 * 24);
      console.log('Response cached successfully');
      
      return NextResponse.json(jsonResponse);
    } catch (error) {
      console.error('JSON processing error:', error);
      
      // If all else fails, return the fallback response directly
      const fallback = generateFallbackResponse(data);
      await cache.set(cacheKey, fallback, 60 * 60 * 24);
      
      return NextResponse.json(fallback);
    }
  } catch (error: any) {
    console.error('API Error:', error);
    
    // Last resort error handling - return a basic fallback
    try {
      const data = await request.json() as RecipeInput;
      const fallback = generateFallbackResponse(data);
      return NextResponse.json(fallback);
    } catch (e) {
      // If we can't even parse the request, return a generic error
      return NextResponse.json(
        { 
          error: 'Could not generate recipe due to an unexpected error'
        },
        { status: 500 }
      );
    }
  }
} 