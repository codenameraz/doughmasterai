import { OpenAI } from 'openai'
import { NextResponse } from 'next/server'
import { PIZZA_STYLES } from '@/lib/openai/config'
import { cache } from '@/lib/cache'
import { rateLimiter } from '@/lib/rateLimiter'

// Enable edge runtime and set timeout
export const runtime = 'edge';
export const maxDuration = 60;

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
const MODEL = 'mistralai/mistral-7b-instruct:free'

// Initialize OpenRouter client with error logging
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
  timeout: 45000, // 45 second timeout
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

interface ApiRequest {
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
1. All values as numbers without units (no %, °C, °F)
2. All temperatures in Celsius
3. Percentages as plain numbers (65 not "65%")
4. Use single values, not ranges
5. Ensure valid JSON structure throughout
6. Focus on practical, scientifically accurate advice based on established baking science`;

const PROMPT_TEMPLATE = (style: string, recipe: any, fermentation: any, environment: any) => {
  // Style-specific reference values
  const styleReferences = {
    'Neapolitan': {
      hydrationRange: [55, 60],
      saltRange: [2, 2.5],
      yeastRange: [0.1, 0.3],
      proteinRange: [11, 12],
      roomFermentTime: [6, 8],
      coldFermentTime: [24, 48],
      idealFlours: ["Caputo 00 Chef's Flour", "Caputo 00 Pizzeria"],
      idealTechnique: "High temperature (425°C+), short bake time (60-90 seconds)",
      flourCharacteristics: "Traditional Neapolitan pizza requires finely-milled 00 flour with moderate protein content (11-12%), offering extensibility and resistance to high heat.",
      traditionalFlourOrigin: ["Italy", "Naples", "Pizza Napoletana"],
      flourTextureProfile: "Fine, silky powder with exceptional extensibility",
    },
    'New York': {
      hydrationRange: [62, 68],
      saltRange: [2, 2.8],
      yeastRange: [0.3, 0.6],
      proteinRange: [12, 14],
      roomFermentTime: [2, 4],
      coldFermentTime: [24, 72],
      idealFlours: ["King Arthur Bread Flour", "All Trumps High Gluten"],
      idealTechnique: "Medium-high temperature (290-320°C), 5-7 minute bake",
      flourCharacteristics: "New York style requires high-protein, strong bread flour (12-14%) for its chewy, foldable texture that maintains structure.",
      traditionalFlourOrigin: "American",
      flourTextureProfile: "Strong gluten development with good elasticity and strength",
    },
    'Detroit': {
      hydrationRange: [65, 75],
      saltRange: [2, 2.5],
      yeastRange: [0.4, 0.8],
      proteinRange: [12, 14.5],
      roomFermentTime: [2, 4],
      coldFermentTime: [18, 48],
      idealFlours: ["King Arthur Bread Flour", "All Trumps High Gluten"],
      idealTechnique: "Medium temperature (230-260°C), 12-15 minute bake in steel pan",
      flourCharacteristics: "Detroit style often uses bread flour similar to NY, needing strength for the thick crust.",
      traditionalFlourOrigin: "American",
      flourTextureProfile: "Chewy but airy interior, crispy bottom.",
    },
    'Sicilian': {
      hydrationRange: [70, 80],
      saltRange: [2, 2.5],
      yeastRange: [0.4, 0.8],
      proteinRange: [12, 13.5],
      roomFermentTime: [3, 5],
      coldFermentTime: [24, 72],
      idealFlours: ["King Arthur Bread Flour", "Caputo 00 Chef's Flour"],
      idealTechnique: "Medium temperature (220-250°C), 15-20 minute bake in oiled pan",
      flourCharacteristics: "Can use bread flour or a blend; needs structure for high hydration and thick form.",
      traditionalFlourOrigin: "Italy/American Sicilian",
      flourTextureProfile: "Light, airy, open crumb with a crispy base.",
    }
  };

  // Get reference data for the style (default to NY if style not found)
  const styleData = styleReferences[style as keyof typeof styleReferences] || styleReferences['New York'];
  
  // Format original temperature with unit for display in prompt
  const originalRoomTempDisplay = environment.tempUnit === 'F' 
    ? `${Math.round(environment.roomTemp * 9/5 + 32)}°F` 
    : `${environment.roomTemp}°C`;

  return `
Analyze this ${style} pizza dough recipe:

## Input Recipe
- Hydration: ${recipe.hydration}%
- Salt: ${recipe.salt}%
- Oil: ${recipe.oil !== null ? recipe.oil + '%' : 'none'}
- Yeast: ${recipe.yeast.type}
- Total Dough: ${recipe.doughBalls} x ${recipe.weightPerBall}g

## Input Fermentation Schedule
- Type: ${fermentation.schedule}
- Duration: ${fermentation.duration.min}-${fermentation.duration.max} hours
- Room Temp: ${fermentation.temperature.room}°C
- Cold Temp: ${fermentation.temperature.cold !== null ? fermentation.temperature.cold + '°C' : 'N/A'}

## Environment
- Room Temp: ${originalRoomTempDisplay} (Internal calc uses ${environment.roomTemp}°C)
- Altitude: ${environment.altitude ? environment.altitude + 'm' : 'sea level'}
- Oven: ${environment.ovenType}, ${environment.maxOvenTemp}°F max

## Style Reference (${style})
- Typical hydration: ${styleData.hydrationRange[0]}-${styleData.hydrationRange[1]}%
- Typical salt: ${styleData.saltRange[0]}-${styleData.saltRange[1]}%
- Typical yeast: ${styleData.yeastRange[0]}-${styleData.yeastRange[1]}%
- Protein content: ${styleData.proteinRange[0]}-${styleData.proteinRange[1]}%
- Room fermentation: ${styleData.roomFermentTime[0]}-${styleData.roomFermentTime[1]} hours
- Cold fermentation: ${styleData.coldFermentTime[0]}-${styleData.coldFermentTime[1]} hours
- Recommended flours: ${styleData.idealFlours.join(", ")}
- Baking technique: ${styleData.idealTechnique}

## Flour Authenticity for ${style} Style
- Traditional origin: ${styleData.traditionalFlourOrigin}
- Required characteristics: ${styleData.flourCharacteristics}
- Texture profile: ${styleData.flourTextureProfile}
- Protein range: ${styleData.proteinRange[0]}-${styleData.proteinRange[1]}%

## CRITICAL STYLE REQUIREMENTS FOR ${style.toUpperCase()} PIZZA
${style === 'Neapolitan' ? 
  '- AUTHENTIC NEAPOLITAN PIZZA REQUIRES ITALIAN 00 FLOUR (e.g., Caputo). American bread flours like King Arthur are NOT appropriate for authentic Neapolitan.':
  style === 'New York' ?
  '- AUTHENTIC NEW YORK STYLE REQUIRES HIGH-PROTEIN BREAD FLOUR (e.g., King Arthur, All Trumps). Lower protein flours will not provide the necessary strength. Low-protein Italian 00 flours are NOT appropriate.':
  ''}
- The flour recommendation MUST prioritize authentic ${style} tradition over other considerations.
- The protein percentage MUST be within ${styleData.proteinRange[0]}-${styleData.proteinRange[1]}%.
- The flour's texture profile MUST match: ${styleData.flourTextureProfile}

## CRITICAL AUTHENTICITY ALERT
- For Neapolitan style pizza, ONLY recommend Italian 00 flour (e.g., Caputo) with 11-12% protein.
- NEVER recommend King Arthur Bread Flour or All Trumps for Neapolitan style - these American bread flours are completely inauthentic for Neapolitan. DO NOT suggest them even as alternatives.
- For New York style, DO recommend King Arthur Bread Flour or All Trumps. NEVER suggest Italian 00 flour, even as an alternative.
- **DO NOT RECOMMEND ANY ALTERNATIVE FLOURS THAT DO NOT MEET THE AUTHENTICITY REQUIREMENTS (origin, protein, characteristics) FOR THE SPECIFIED ${style.toUpperCase()} STYLE.** If no authentic alternatives exist, provide an empty \`alternativeFlours\` array. DO NOT COMPROMISE ON AUTHENTICITY, EVEN FOR ALTERNATIVES.

Analyze for ${style} style focusing on protein network, enzymes, temperature effects, and hydration balance.

Provide analysis in this simplified JSON structure:
{
  "hydrationRecommendation": {
    "percentage": number,
    "rationale": "string explaining scientific reasoning for THIS percentage based on ${style} style and input parameters",
    "impact": ["string describing texture/handling effects of THIS percentage"]
  },
  "saltRecommendation": {
    "percentage": number,
    "rationale": "string explaining fermentation control/flavor impact of THIS percentage for ${style} style",
    "impact": ["string describing effects of THIS salt percentage on gluten/fermentation"]
  },
  "yeastRecommendation": {
    "type": "string (fresh, active dry, or instant)",
    "percentage": number (MUST calculate based on fermentation time/temp/type...),
    "rationale": "string explaining why THIS calculated amount/type is appropriate for ${style} style, THIS fermentation schedule, and input temperature",
    "impact": ["string describing effect of THIS yeast amount/type on fermentation speed/flavor"],
    "temperatureNotes": ["string noting specific temperature considerations for THIS yeast type/amount"]
  },
  "flourRecommendation": {
    "primaryFlour": {
      "name": "string specifying exact flour brand/type from the AUTHENTIC options for ${style} style (e.g., '${styleData.idealFlours[0]}' for ${style})",
      "proteinPercentage": number,
      "purpose": "string explaining why THIS RECOMMENDED flour works well for ${style} style",
      "authenticityScore": number (0-10, where 10 means perfectly authentic for ${style} style), // Keep score internally but don't show in UI
      "authenticity": "string explaining why this flour is authentic for ${style} style"
    },
    "alternativeFlours": [
      {
        "name": "string (MUST BE AUTHENTIC FOR ${style.toUpperCase()} STYLE)",
        "proteinPercentage": number (MUST BE WITHIN ${styleData.proteinRange[0]}-${styleData.proteinRange[1]}%),
        "mixRatio": number (0-100 representing percentage of total flour, only if applicable)
      }
    ]
  },
  "fermentationSchedule": {
    "totalHours": number,
    "room": {
      "hours": number,
      "tempC": number,
      "indicators": ["observable cues that indicate progress at room temp"]
    },
    "cold": {
      "hours": number,
      "tempC": number | null,
      "indicators": ["observable cues that indicate progress during cold ferment"]
    },
    "rationale": "string explaining enzymatic activity and flavor development based on THIS specific schedule (hours, temps)",
    "impact": ["string describing overall impact of THIS schedule on final dough characteristics"],
    "recommendations": ["string with practical recommendations based on THIS schedule (e.g., adjustments for environment)"]
  },
  "techniques": {
    "mixing": "string with specific mixing instructions suitable for THIS ${style} style recipe",
    "folding": "string describing if/when/how to fold for THIS ${style} style recipe",
    "shaping": "string with detailed shaping guidance for THIS ${style} style recipe",
    "baking": "string with temp/time recommendations for THIS ${style} style recipe, considering oven type"
  },
  "timeline": [
    {
      "day": number (which day: 1, 2, etc., starting from calculation day),
      "timeOfDay": "string (e.g., '9:00 AM', '6:00 PM', or 'Morning', 'Evening')",
      "title": "string (clear action title like 'Mix the dough' or 'Shape and bake')",
      "instructions": "string (detailed, friendly instructions written in imperative form)",
      "duration": "string (how long this step takes, e.g., '10 minutes')",
      "tips": ["string (helpful tips)"]
    }
  ],
  "temperatureAnalysis": {
      "roomTempC": number (reflecting input room temp in Celsius),
      "season": "string describing perceived season/environment if relevant (e.g., Warm Kitchen, Cool Basement)",
      "rationale": "string explaining **IN DETAIL HOW** the input roomTemp (${originalRoomTempDisplay}) affects THIS specific recipe's fermentation speed, yeast activity, and gluten development, referencing the Celsius value (${environment.roomTemp}°C) for scientific explanation. Be specific about the impact of THIS temperature. Avoid generic statements.",
      "impact": ["string describing specific effects of THIS temperature on yeast activity, gluten development, etc."],
      "recommendations": ["string with specific advice based on THIS temperature (e.g., adjust water temp, change fermentation location)"]
  }
}

IMPORTANT INSTRUCTIONS:
1. Flour Analysis Focus: Your analysis in flourRecommendation.primaryFlour.purpose must explain why the specific flour *you are recommending* in primaryFlour.name is suitable for the ${style} style. DO NOT analyze or mention the user's input flour here.
2. Timeline Generation: The timeline should be user-friendly and easy to follow, like a recipe. Each step should have clear instructions that a home baker can easily understand. Use day numbers (Day 1 = calculation day). Use specific times (e.g., '9:00 AM', '6:00 PM') based on the fermentation schedule where possible, or fallback to 'Morning', 'Afternoon', 'Evening'. Ensure timings logically follow the fermentation schedule. IMPORTANT: For cold fermentation, EXPLICITLY include a refrigeration step in the timeline with clear instructions on when to place the dough in the refrigerator and when to remove it. This should be a distinct timeline step with its own title like "Refrigerate the dough" and detailed instructions. Example refrigeration step format: { "day": 1, "timeOfDay": "Evening", "title": "Refrigerate the dough", "instructions": "Transfer the dough to a container and place in the refrigerator at 4°C", "duration": "5 minutes", "tips": ["Use an airtight container", "Ensure your refrigerator is at 3-5°C"] }. Similarly, include a removal step when it's time to take the dough out of the refrigerator.
3. JSON Validity: Ensure the entire output is a single, valid JSON object conforming to the structure above. Pay attention to commas, quotes, and types. All percentages must be numbers (e.g., 65, not "65%"). All temperatures in Celsius.
4. **Strictest Flour Authenticity**: For Neapolitan style, you MUST recommend Italian 00 flour (like Caputo) AND ABSOLUTELY NO American bread flour alternatives. For New York style, you MUST recommend American high-protein bread flour AND ABSOLUTELY NO Italian 00 flour alternatives. For ALL styles, ONLY recommend alternative flours that meet the authentic criteria (origin, protein, characteristics). If no authentic alternatives exist, provide an empty \`alternativeFlours\` array. DO NOT COMPROMISE ON AUTHENTICITY, EVEN FOR ALTERNATIVES.
5. **Detailed Temperature Rationale**: In the \`temperatureAnalysis.rationale\`, specifically mention the original user-provided room temperature (${originalRoomTempDisplay}) AND **provide a detailed scientific explanation of HOW this temperature impacts** the fermentation speed, yeast activity, and gluten development for THIS recipe, referencing the Celsius value (${environment.roomTemp}°C). Avoid generic statements like 'Affects fermentation rate and dough development'. Explain *how* it affects it.

Verify these accuracy markers AFTER generating your recommendation:
- Hydration for ${style} style should generally be between ${styleData.hydrationRange[0]}-${styleData.hydrationRange[1]}%
- Salt percentage should generally be between ${styleData.saltRange[0]}-${styleData.saltRange[1]}%
- Room temperature fermentation rate approximately doubles every 10°C increase
- Protein content recommendations align with ${style} style requirements
- Fermentation times are appropriate for yeast percentage (lower yeast = longer time)
- Yeast percentage should align with fermentation time and temperature (0.1-0.2% for long, 0.2-0.3% for medium, 0.4-0.5% for short fermentations when using instant yeast)
- Active dry yeast should be ~25% more than instant, fresh yeast ~3x more than instant
- Flour recommendations (including alternatives) must align with the traditional style origins (${styleData.traditionalFlourOrigin}) and characteristics for ${style} pizza
- The protein content of recommended flour (including alternatives) must fall within ${styleData.proteinRange[0]}-${styleData.proteinRange[1]}%
- Ensure flour recommendations preserve the authentic texture profile: ${styleData.flourTextureProfile}
- For cold fermentation schedules, verify that the timeline includes explicit refrigeration and removal steps with clear temperatures and timing

Focus on practical advice backed by fermentation science and traditional ${style} techniques. Include specific observable indicators. Ensure valid JSON.`;
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

function cleanResponse(content: string): string {
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
    
    // Remove any trailing content after the last closing brace
    jsonStr = jsonStr.replace(/}[^}]*$/, '}');
    
    console.log('Extracted JSON string:', jsonStr);

    // First try to parse as is
    try {
      const parsed = JSON.parse(jsonStr);
      console.log('JSON parsed successfully on first try');
      return JSON.stringify(sanitizeResponse(parsed));
    } catch (parseError) {
      console.error('Initial JSON parse error:', parseError);
      
      // Enhanced error logging
      if (parseError instanceof SyntaxError) {
        const match = parseError.message.match(/position (\d+)/);
        if (match) {
          const errorPos = parseInt(match[1]);
          const context = jsonStr.substring(Math.max(0, errorPos - 50), errorPos + 50);
          console.error(`JSON error context (${errorPos}):\n${context}`);
          console.error('Character at error position:', jsonStr[errorPos]);
        }
      }
      
      console.log('Attempting to fix JSON structure...');
      
      // 1. Basic JSON cleanup (excluding comma specifics initially)
      jsonStr = jsonStr
        // Fix incorrectly formatted numbers
        .replace(/:\s*(\d+)\s*,\s*(\d+)([,}\]])/g, ': $1$2$3')
        .replace(/"(?:percentage|proteinPercentage|totalHours|hours|tempC)"\s*:\s*(\d+)\s*,\s*(\d+)/g, '"$1": $1$2')
        // Fix temperature formatting
        .replace(/(\d+)\s*,\s*(\d+)°[CF]/g, '$1$2°$3')
        // Fix array and object formatting
        .replace(/\](\s*)\[/g, '], [')
        .replace(/}(\s*)\{/g, '}, {')
        .replace(/}(\s*)\[/g, '}, [')
        .replace(/\](\s*)\{/g, '], {')
        // Fix string formatting
        .replace(/"(\s*)\[/g, '", [')
        .replace(/\](\s*)"/g, '], "')
        .replace(/"(\s*)\{/g, '", {')
        .replace(/}(\s*)"/g, '}, "')
        // Fix missing commas between elements
        .replace(/("(?:[^"\\]|\\.)*")(\s*)("(?:[^"\\]|\\.)*")/g, '$1, $3')
        .replace(/(\d+)(\s*)("(?:[^"\\]|\\.)*")/g, '$1, $3')
        .replace(/("(?:[^"\\]|\\.)*")(\s*)(\d+)/g, '$1, $3');

      // 2. Validate and repair JSON structure (brackets/braces)
      jsonStr = validateAndRepairJsonStructure(jsonStr);
      
      // 3. Apply comma-specific cleanup AFTER structural repairs
      jsonStr = jsonStr
        // Fix specific issue: array element followed by closing brace without comma
        .replace(/("|\]|\d+)\s*}/g, (match, p1) => {
          // Only add comma if it's not already followed by one (or start of object)
          // This is tricky, maybe a simpler replace is better initially
          return `${p1}, }`; // Tentative fix: assumes it's an object property
        })
        .replace(/,\s*,/g, ','  ) // Clean up multiple commas
        .replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas before closing brackets

      // 4. Remove any remaining trailing content (redundant check, but safe)
      jsonStr = jsonStr.replace(/}[^}]*$/, '}');

      console.log('Attempting to parse fixed JSON:', jsonStr);
      
      try {
        const fixedParsed = JSON.parse(jsonStr);
        console.log('Fixed JSON parsed successfully');
        return JSON.stringify(sanitizeResponse(fixedParsed));
      } catch (error: any) {
        console.error('Error parsing fixed JSON:', error);
        const errorMatch = error.message.match(/position (\d+)/);
        if (errorMatch) {
          const errorPos = parseInt(errorMatch[1]);
          const context = jsonStr.slice(Math.max(0, errorPos - 50), errorPos + 50);
          console.error(`Error context around position ${errorPos}:`, context);
          console.error('Character at error position:', jsonStr[errorPos]);
        }
        throw error;
      }
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

// Update sanitizeResponse to use validateArrayStructure
function sanitizeResponse(parsed: any): any {
  const validated = validateArrayStructure(parsed);
  // Ensure all required properties exist
  const result = {
    ...validated,
    timeline: Array.isArray(validated.timeline) ? validated.timeline.map((step: any) => ({
      day: typeof step.day === 'number' ? step.day : 1, // Default to Day 1
      timeOfDay: typeof step.timeOfDay === 'string' ? step.timeOfDay : 'N/A', // Default time
      title: typeof step.title === 'string' ? step.title : 'Untitled Step',
      instructions: typeof step.instructions === 'string' ? step.instructions : '',
      duration: typeof step.duration === 'string' ? step.duration : '',
      tips: Array.isArray(step.tips) ? step.tips : []
    })) : [],
    techniqueGuidance: Array.isArray(validated.techniqueGuidance) ? validated.techniqueGuidance : []
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
  
  // Initialize temperatureAnalysis
  if (!da.temperatureAnalysis) {
    da.temperatureAnalysis = { roomTemp: 22, season: "Standard", impact: [], recommendations: [], rationale: "" };
  } else {
    da.temperatureAnalysis.impact = Array.isArray(da.temperatureAnalysis.impact) ? da.temperatureAnalysis.impact : [];
    da.temperatureAnalysis.recommendations = Array.isArray(da.temperatureAnalysis.recommendations) ? da.temperatureAnalysis.recommendations : [];
    da.temperatureAnalysis.rationale = da.temperatureAnalysis.rationale || "";
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
function validateResponse(result: any): boolean {
  if (!result || typeof result !== 'object') return false;
  
  // Validate timeline
  if (!Array.isArray(result.timeline)) return false;
  
  // Validate detailedAnalysis
  if (!result.detailedAnalysis || typeof result.detailedAnalysis !== 'object') return false;
  
  // Ensure fermentationAnalysis is properly structured
  const fa = result.detailedAnalysis.fermentationAnalysis;
  if (!fa || typeof fa !== 'object') return false;
  if (typeof fa.totalTime !== 'number') return false;
  
  // Validate roomTemp structure
  if (fa.roomTemp && typeof fa.roomTemp === 'object') {
    if (typeof fa.roomTemp.time !== 'number') return false;
    if (typeof fa.roomTemp.temperature !== 'number') return false;
    if (!Array.isArray(fa.roomTemp.impact)) return false;
  }
  
  // Validate coldTemp structure if present
  if (fa.coldTemp && typeof fa.coldTemp === 'object') {
    if (typeof fa.coldTemp.time !== 'number') return false;
    if (typeof fa.coldTemp.temperature !== 'number') return false;
    if (!Array.isArray(fa.coldTemp.impact)) return false;
  }
  
  // Validate yeastAnalysis
  const ya = result.detailedAnalysis.yeastAnalysis;
  if (!ya || typeof ya !== 'object') return false;
  if (typeof ya.percentage !== 'number') return false;
  if (!Array.isArray(ya.impact)) return false;
  if (ya.temperatureNotes && !Array.isArray(ya.temperatureNotes)) return false;
  
  return true;
}

// Export API route handler
export async function POST(request: Request) {
  try {
    const data: ApiRequest = await request.json();
    console.log('API request payload:', JSON.stringify(data, null, 2));
    
    // Rate limiting check
    if (!await rateLimiter.checkRateLimit()) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check cache first
    const cacheKey = JSON.stringify(data);
    const cachedResult = await cache.get(cacheKey);
    if (cachedResult) {
      console.log('Cache hit - returning cached result');
      return new Response(cachedResult, {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prepare the prompt with the recipe data
    const prompt = PROMPT_TEMPLATE(
      data.style,
      {
        doughBalls: data.doughBalls,
        weightPerBall: data.weightPerBall,
        hydration: data.recipe.hydration,
        salt: data.recipe.salt,
        oil: data.recipe.oil,
        yeast: data.recipe.yeast
      },
      data.fermentation,
      data.environment
    );

    console.log('Sending prompt to API:', prompt);

    // Make API call with retry logic
    const completion = await withRetry(async () => {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_MESSAGE },
          { role: 'user', content: prompt }
        ],
        temperature: 0.25,
        max_tokens: 3072,
      });
      
      return response;
    });

    if (!completion.choices?.[0]?.message?.content) {
      throw new Error('Invalid API response format');
    }

    console.log('Received response from API');

    // Clean and validate the response
    const cleanedResponse = cleanResponse(completion.choices[0].message.content);
    console.log('Cleaned response:', cleanedResponse);
    
    const result = JSON.parse(cleanedResponse);

    if (!validateResponse(result)) {
      console.error('Response validation failed:', JSON.stringify(result, null, 2));
      throw new Error('Invalid response structure');
    }

      // Cache the result
    await cache.set(cacheKey, cleanedResponse);
    console.log('Response cached with key:', cacheKey);

    return new Response(cleanedResponse, {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing recipe:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to process recipe'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 