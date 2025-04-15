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

// Define a simple model that's definitely available on OpenRouter
const MODEL = 'anthropic/claude-3-haiku-20240307:free' // Switch to a faster model

// Initialize OpenRouter client with improved settings
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
  timeout: 20000, // Reduce timeout to prevent gateway timeouts
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

// Simplified makeCompletion with retry and timeout
const makeCompletion = async (prompt: string) => {
  const completionPromise = openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_MESSAGE },
      { role: 'user', content: prompt }
    ],
    temperature: 0.2,
    max_tokens: 1500, // Reduced for faster response
  });
  
  return await withTimeout(completionPromise, 18000); // 18 second timeout
};

// Add timeout helper
const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
};

// Export API route handler
export async function POST(request: Request) {
  try {
    // Skip rate limiting for now to reduce latency
    const data = await request.json() as RecipeInput;
    
    // Simplified cache key
    const cacheKey = `recipe-${data.style}-${data.doughBalls}-${data.weightPerBall}-${data.recipe.hydration}`;

    // Try to get from cache
    const cachedResult = await cache.get(cacheKey);
    if (cachedResult) {
      console.log('Cache hit - returning cached result');
      return NextResponse.json(cachedResult);
    }

    // Simple JSON placeholder response for testing
    const testResponse = {
      ingredients: {
        flour: {
          total: Math.round(data.doughBalls * data.weightPerBall * 0.58),
          flours: [
            { type: "Bread Flour", amount: Math.round(data.doughBalls * data.weightPerBall * 0.58) }
          ]
        },
        water: {
          amount: Math.round(data.doughBalls * data.weightPerBall * 0.58 * (data.recipe.hydration / 100))
        },
        salt: {
          amount: Math.round(data.doughBalls * data.weightPerBall * 0.58 * (data.recipe.salt / 100))
        },
        yeast: {
          type: data.recipe.yeast.type,
          amount: Math.round(data.doughBalls * data.weightPerBall * 0.58 * 0.002)
        }
      },
      processTimeline: {
        steps: [
          {
            step: "Initial Mix",
            time: "00:00",
            description: "Mix all ingredients except salt for 1 minute",
            temperature: `${data.environment.roomTemp}°${data.environment.tempUnit}`
          },
          {
            step: "Autolyse",
            time: "00:20",
            description: "Add salt and mix until incorporated",
            temperature: `${data.environment.roomTemp}°${data.environment.tempUnit}`
          },
          {
            step: "Fermentation",
            time: "4:00",
            description: "Ferment at room temperature",
            temperature: `${data.environment.roomTemp}°${data.environment.tempUnit}`
          }
        ]
      }
    };

    // Cache the test response
    await cache.set(cacheKey, testResponse, 60 * 60); // 1 hour TTL

    return NextResponse.json(testResponse);

    // TEMPORARILY COMMENTING OUT ACTUAL API CALL TO DEBUG TIMEOUTS
    /*
    // Make the API call
    const prompt = PROMPT_TEMPLATE(data);
    const completion = await makeCompletion(prompt);
    
    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No content in API response');
    }
    
    // Simplified response processing - just extract JSON
    let jsonResponse;
    try {
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}');
      
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('No JSON found in response');
      }
      
      const jsonStr = content.slice(jsonStart, jsonEnd + 1);
      jsonResponse = JSON.parse(jsonStr);
      
      // Cache the response
      await cache.set(cacheKey, jsonResponse, 60 * 60 * 24);
      
      return NextResponse.json(jsonResponse);
    } catch (error) {
      console.error('JSON parsing error:', error);
      throw new Error('Failed to parse response from AI');
    }
    */
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error?.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 