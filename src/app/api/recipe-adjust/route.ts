import { OpenAI } from 'openai'
import { NextResponse } from 'next/server'
import { PIZZA_STYLES } from '@/lib/openai/config'
import { cache } from '@/lib/cache'
import { rateLimiter } from '@/lib/rateLimiter'

// Define a simple model that's definitely available on OpenRouter
const MODEL = 'mistralai/mistral-7b-instruct'

// Initialize OpenRouter client with error logging
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
})

interface FermentationScheduleType {
  duration: { min: number; max: number };
  temperature: {
    room: number | null;
    cold: number | null;
  };
}

// Update the FERMENTATION_SCHEDULES type
const FERMENTATION_SCHEDULES: Record<string, FermentationScheduleType> = {
  'quick': {
    duration: { min: 2, max: 4 },
    temperature: { room: 75, cold: null },
  },
  'same-day': {
    duration: { min: 8, max: 12 },
    temperature: { room: 75, cold: null },
  },
  'overnight': {
    duration: { min: 16, max: 20 },
    temperature: { room: 72, cold: 38 },
  },
  'cold': {
    duration: { min: 24, max: 72 },
    temperature: { room: null, cold: 38 },
  }
};

interface YeastInfo {
    type: "fresh" | "active dry" | "instant";
    percentage: number;
}

interface FermentationPhase {
    hours: number;
    temperature: number;
    milestones?: string[];
}

interface FermentationSchedule {
    room: FermentationPhase;
    cold: FermentationPhase;
}

interface AdditionalIngredient {
    ingredient: string;
    purpose: string;
}

interface AdvancedOptions {
    preferment: boolean;
    autolyse: boolean;
    additionalIngredients: AdditionalIngredient[];
}

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

interface ApiRequest {
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

export async function POST(request: Request) {
  try {
    // Check request size
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10000) {
      return NextResponse.json(
        { error: 'Request too large' },
        { status: 413 }
      );
    }

    // Handle CORS
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    console.log('Starting recipe-adjust API request processing');
    
    // Parse request body
    const body = await request.json() as ApiRequest;
    const { style, recipe, fermentation } = body;
    
    console.log('Request payload:', JSON.stringify(body, null, 2));

    if (!style || !PIZZA_STYLES[style]) {
      return NextResponse.json(
        { error: 'Invalid pizza style' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!recipe || !fermentation) {
      return NextResponse.json(
        { error: 'Missing required fields: recipe or fermentation' },
        { status: 400 }
      );
    }

    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    try {
      await rateLimiter.checkRateLimit(clientIp);
    } catch (error) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const pizzaStyle = PIZZA_STYLES[style];

    // Check for no-cache flag in URL
    const url = new URL(request.url);
    const noCache = url.searchParams.has('t') || url.searchParams.has('nocache');

    // Get oven type details
    const ovenType = body.environment?.ovenType || 'home';
    const maxOvenTemp = body.environment?.maxOvenTemp || (ovenType === 'outdoor' ? 950 : 550);
    const ovenDescription = ovenType === 'outdoor' ? 
      'Outdoor Pizza Oven (700-950°F)' : 
      'Home Oven (450-550°F)';

    // Get fermentation schedule details
    let fermentationSchedule;
    let totalFermentationHours;

    if (recipe.fermentationTime === 'custom' && fermentation.duration) {
      // For custom schedules, use the provided duration
      totalFermentationHours = fermentation.duration.max;
      
      // Calculate room temp and cold fermentation split
      // For longer fermentations (>12 hours), use cold fermentation
      const isLongFermentation = totalFermentationHours > 12;
      const roomTempHours = isLongFermentation ? 2 : Math.min(totalFermentationHours, 4);
      const coldHours = isLongFermentation ? totalFermentationHours - roomTempHours : 0;

      fermentationSchedule = {
        duration: {
          min: roomTempHours,
          max: totalFermentationHours
        },
        temperature: {
          room: fermentation.temperature.room || 75,
          cold: coldHours > 0 ? (fermentation.temperature.cold || 38) : null
        }
      };
    } else {
      // For predefined schedules, use the default values
      fermentationSchedule = FERMENTATION_SCHEDULES[recipe.fermentationTime as keyof typeof FERMENTATION_SCHEDULES || 'same-day'];
      totalFermentationHours = fermentationSchedule.duration.max;
    }

    // Calculate yeast percentage based on fermentation time
    const calculateYeastPercentage = (fermentationTime: string, totalHours: number): number => {
      switch (fermentationTime) {
        case 'quick':
          return 0.4;
        case 'same-day':
          return 0.3;
        case 'overnight':
          return 0.2;
        case 'cold':
          return 0.15;
        case 'custom':
          if (totalHours <= 4) return 0.4;
          if (totalHours <= 12) return 0.3;
          if (totalHours <= 24) return 0.2;
          return 0.15;
        default:
          return 0.2;
      }
    };

    const yeastPercentage = calculateYeastPercentage(recipe.fermentationTime || 'same-day', totalFermentationHours);

    // Generate cache key based on input parameters
    const timestamp = url.searchParams.get('t') || new Date().getTime().toString();
    const cacheKey = `recipe-${style}-${JSON.stringify(recipe)}-${JSON.stringify(fermentation)}-${timestamp}`;
    
    // Only check cache if not using no-cache mode
    if (!noCache) {
      const cachedResult = await cache.get(cacheKey);
      if (cachedResult) {
        console.log('Returning cached result');
        return NextResponse.json(JSON.parse(cachedResult), {
          headers: {
            'Cache-Control': 'no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
      }
    }

    if (!process.env.OPENROUTER_API_KEY) {
      console.error('OpenRouter API key is not set');
      return NextResponse.json(
        { error: 'API configuration error - Please check environment variables' },
        { status: 500 }
      );
    }

    // Validate OpenRouter API key format
    if (!process.env.OPENROUTER_API_KEY.startsWith('sk-')) {
      console.error('Invalid OpenRouter API key format');
      return NextResponse.json(
        { error: 'Invalid API configuration - Please check API key format' },
        { status: 500 }
      );
    }

    console.log('Sending request to API with payload:', JSON.stringify(body, null, 2));

    // Extract autolyse preference
    const skipAutolyse = body.analysisPreferences?.skipAutolyse ?? !body.analysisPreferences?.includeAutolyse;
    const processSteps = body.analysisPreferences?.processSteps ?? {
        autolyse: !skipAutolyse,
        initialMix: true,
        bulkFermentation: true,
        divideAndBall: true,
        finalProof: true
    };

    // Update the system message to include autolyse preference
    const systemMessage = `You are an expert pizza dough calculator. 
    ${skipAutolyse ? 'The user has opted to skip the autolyse step.' : 'Include an autolyse step in the process.'}
    Analyze the following pizza dough specifications and provide detailed recommendations...`;

    // Update the prompt to include oven type information
    const prompt = `As an expert pizzaiolo, analyze and provide detailed recommendations for a ${pizzaStyle.name} style pizza dough with the following specifications:

Dough Parameters:
${recipe.flourMix ? `- Flour Mix:
  - Primary Flour: ${recipe.flourMix.primaryType} (${recipe.flourMix.primaryPercentage}%)
  - Secondary Flour: ${recipe.flourMix.secondaryType} (${100 - (recipe.flourMix.primaryPercentage || 0)}%)` : '- Flour: Standard bread flour (100%)'}
- Hydration: ${recipe.hydration || pizzaStyle.defaultHydration}%
- Salt: ${recipe.salt || pizzaStyle.defaultSaltPercentage}%
- Oil: ${recipe.oil ?? pizzaStyle.defaultOilPercentage}%
- Yeast Type: ${recipe.yeast?.type || 'instant'}
- Yeast Percentage: ${yeastPercentage}%
- Fermentation Type: ${recipe.fermentationTime || 'same-day'}
- Total Fermentation Hours: ${totalFermentationHours}
- Room Temperature: ${fermentationSchedule.temperature.room || 75}°F
- Cold Temperature: ${fermentationSchedule.temperature.cold || 38}°F
- Oven Type: ${ovenDescription}
- Max Oven Temperature: ${maxOvenTemp}°F

Your response must be a valid JSON object with EXACTLY this structure:
{
  "flourRecommendation": "string describing flour recommendation",
  "technicalAnalysis": "${recipe.flourMix ? 
    `Analyze the characteristics and interaction of ${recipe.flourMix.primaryType} (${recipe.flourMix.primaryPercentage}%) and ${recipe.flourMix.secondaryType} (${100 - (recipe.flourMix.primaryPercentage || 0)}%). Include protein content for each flour, how they complement each other, and how this mix affects dough characteristics. DO NOT use predefined values - analyze the specific flours selected.` : 
    'string with technical analysis'}",
  "adjustmentRationale": "string explaining adjustments",
  "techniqueGuidance": ["array of technique guidance strings"],
  "timeline": [
    {
      "step": "string name of step",
      "time": "string time for step",
      "description": "string description of step",
      "temperature": number,
      "tips": ["array of tip strings"]
    }
  ],
  "detailedAnalysis": {
    "flourAnalysis": {
      "type": "${recipe.flourMix ? `Custom mix of ${recipe.flourMix.primaryType} and ${recipe.flourMix.secondaryType}` : 'string describing flour type'}",
      "proteinContent": "detailed protein content analysis",
      "rationale": "${recipe.flourMix ? 
        `Analyze how ${recipe.flourMix.primaryType} (${recipe.flourMix.primaryPercentage}%) and ${recipe.flourMix.secondaryType} (${100 - (recipe.flourMix.primaryPercentage || 0)}%) work together. Discuss protein content, gluten development, and overall dough characteristics of this mix. DO NOT use predefined values - analyze the specific flours selected.` : 
        'string explaining flour choice rationale'}",
      "flours": ${recipe.flourMix ? `[
        {
          "type": "${recipe.flourMix.primaryType}",
          "percentage": ${recipe.flourMix.primaryPercentage},
          "proteinContent": "analyze and explain the specific protein content for ${recipe.flourMix.primaryType}",
          "purpose": "explain specific role and contribution of ${recipe.flourMix.primaryType} in this mix"
        },
        {
          "type": "${recipe.flourMix.secondaryType}",
          "percentage": ${100 - (recipe.flourMix.primaryPercentage || 0)},
          "proteinContent": "analyze and explain the specific protein content for ${recipe.flourMix.secondaryType}",
          "purpose": "explain specific role and contribution of ${recipe.flourMix.secondaryType} in this mix"
        }
      ]` : '[{"type": "standard flour", "percentage": 100, "proteinContent": "protein content", "purpose": "purpose explanation"}]'}
    },
    "hydrationAnalysis": {
      "percentage": ${recipe.hydration || pizzaStyle.defaultHydration},
      "rationale": "string explaining hydration choice",
      "impact": ["array of hydration impact strings"]
    },
    "saltAnalysis": {
      "percentage": ${recipe.salt || pizzaStyle.defaultSaltPercentage},
      "rationale": "string explaining salt percentage choice",
      "impact": ["array of salt impact strings"]
    },
    "oilAnalysis": {
      "percentage": ${recipe.oil ?? pizzaStyle.defaultOilPercentage},
      "rationale": "string explaining oil percentage choice",
      "impact": ["array of oil impact strings"]
    },
    "fermentationAnalysis": {
      "totalTime": ${totalFermentationHours},
      "roomTemp": {
        "time": ${fermentationSchedule.duration.min},
        "temperature": ${fermentationSchedule.temperature.room || 75},
        "impact": ["array of room temp fermentation impact strings"]
      },
      "enzymaticActivity": "string describing enzyme activity",
      "gluten": "string describing gluten development"
    },
    "ovenAnalysis": {
      "ovenType": "${ovenDescription}",
      "maxTemp": ${maxOvenTemp},
      "recommendations": ["array of oven technique recommendations"],
      "impact": ["array of how oven type impacts dough formulation"]
    }
  }
}

Important Analysis Guidelines:
1. For flour analysis:
   ${recipe.flourMix ? 
     `- Analyze both flours: ${recipe.flourMix.primaryType} (${recipe.flourMix.primaryPercentage}%) and ${recipe.flourMix.secondaryType} (${100 - (recipe.flourMix.primaryPercentage || 0)}%)
   - Explain how they complement each other
   - Describe the protein content and purpose of each flour
   - Provide specific benefits of this mix ratio` 
     : 
     '- Analyze the single flour type and its characteristics'
   }
2. Consider how the flour mix affects:
   - Gluten development
   - Fermentation rate
   - Final texture
   - Handling characteristics

3. For oven analysis:
   - ${ovenType === 'outdoor' ? 
      `Analyze how high-temperature wood/gas fired ovens (${maxOvenTemp}°F) impact dough formula
   - Provide specific recommendations for outdoor pizza ovens
   - Consider browning, cooking time, and hydration needs for high heat` 
      : 
      `Analyze how standard home ovens (${maxOvenTemp}°F) impact dough formula
   - Provide specific recommendations for baking in home ovens
   - Consider par-baking needs, longer cooking times, and browning characteristics`
   }
   - Explain how this oven type should influence the dough formula

Important Timeline Guidelines:
1. For ${recipe.fermentationTime} fermentation (${totalFermentationHours} hours total):
   - The timeline MUST include ALL steps in sequence:
     1. Initial mix (5-10 minutes)
     2. First rest (15-20 minutes)
     3. Kneading (5-10 minutes)
     4. Bulk fermentation (varies by schedule)
     5. Divide and shape into balls (10-15 minutes)
     6. Final proof (varies by schedule)
     7. Ready to use
   - Every step MUST include:
     * Exact time duration (no ranges)
     * Temperature
     * Clear description
     * Relevant tips
   - Time values must be exact (e.g., "2 hours" not "2-3 hours")
   - Total time must match ${totalFermentationHours} hours
   - Each step must flow logically into the next
   - Include temperature for each fermentation step
   - Add specific tips for each step

2. Timing Guidelines by Schedule:
   - Quick (2-4h):
     * Initial mix + rest: 30 minutes total
     * Bulk fermentation: 1.5-2 hours
     * Final proof: 1-1.5 hours
   - Same-day (8-12h):
     * Initial mix + rest: 30 minutes total
     * Bulk fermentation: 6-8 hours
     * Final proof: 2-3 hours
   - Overnight (16-20h):
     * Initial mix + rest: 30 minutes total
     * Room temp bulk: 2-3 hours
     * Cold bulk: 12-14 hours
     * Final proof: 2-3 hours
   - Cold (24-72h):
     * Initial mix + rest: 30 minutes total
     * Brief room temp: 1 hour
     * Cold bulk: 20-68 hours
     * Final proof: 2-3 hours

3. Temperature Requirements:
   - Room temperature steps: ${fermentationSchedule.temperature.room || 75}°F
   - Cold fermentation: ${fermentationSchedule.temperature.cold || 38}°F
   - Maintain consistent temperatures throughout each phase

4. Required Tips Categories:
   - Dough handling
   - Temperature control
   - Visual/tactile cues
   - Common mistakes to avoid
   - Success indicators`;

    console.log('Sending request to OpenAI');
    
    try {
      // Make the API call
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: `You are a pizza dough calculator API. You MUST:
1. Return ONLY valid JSON
2. Follow the EXACT structure provided
3. Do not add ANY additional fields
4. Do not include ANY explanatory text outside the JSON
5. Ensure all JSON is properly formatted with no trailing commas
6. Use double quotes for all strings
7. Do not use any special characters that would need escaping
8. Keep all string values concise and focused`
          },
          {
            role: "user",
            content: `Analyze this ${pizzaStyle.name} pizza dough with:
${recipe.flourMix ? `- Primary Flour: ${recipe.flourMix.primaryType} (${recipe.flourMix.primaryPercentage}%)
- Secondary Flour: ${recipe.flourMix.secondaryType} (${100 - (recipe.flourMix.primaryPercentage || 0)}%)` : '- Standard Flour (100%)'}
- Hydration: ${recipe.hydration || pizzaStyle.defaultHydration}%
- Salt: ${recipe.salt || pizzaStyle.defaultSaltPercentage}%
- Oil: ${recipe.oil ?? pizzaStyle.defaultOilPercentage}%
- Fermentation: ${recipe.fermentationTime} (${totalFermentationHours} hours)

Style Information:
- Style: ${pizzaStyle.name}
- Ideal Flour: ${pizzaStyle.idealFlour}
${pizzaStyle.flourTypes && pizzaStyle.flourTypes.length > 0 ? `- Recommended Flours: ${pizzaStyle.flourTypes.map(f => `${f.name} (${f.protein}% protein): ${f.description}`).join(', ')}` : ''}
- Signature Characteristics: ${pizzaStyle.signatureCharacteristics.join(', ')}

Return a JSON object with this EXACT structure:
{
  "flourRecommendation": ${recipe.flourMix ? 
    `"Analysis of how well the chosen flour mix of ${recipe.flourMix.primaryType} and ${recipe.flourMix.secondaryType} suits a ${pizzaStyle.name} style pizza"` : 
    `"Specific flour recommendation for ${pizzaStyle.name} style, referencing ideal protein content, brand recommendations if applicable"`},
  "technicalAnalysis": ${recipe.flourMix ? 
    `"Detailed technical analysis of how ${recipe.flourMix.primaryType} (${recipe.flourMix.primaryPercentage}%) and ${recipe.flourMix.secondaryType} (${100 - (recipe.flourMix.primaryPercentage || 0)}%) interact for ${pizzaStyle.name} style"` : 
    `"Technical analysis of ideal flour characteristics for ${pizzaStyle.name} style, including protein content, gluten development potential, and fermentation behavior"`},
  "adjustmentRationale": "Brief explanation of any adjustments needed",
  "techniqueGuidance": [
    "Step 1 guidance",
    "Step 2 guidance"
  ],
  "timeline": [
    {
      "step": "Step name",
      "time": "Time for step",
      "description": "Step description",
      "temperature": 75,
      "tips": ["Tip 1", "Tip 2"]
    }
  ],
  "detailedAnalysis": {
    "flourAnalysis": {
      "type": "${recipe.flourMix ? `Mix of ${recipe.flourMix.primaryType} and ${recipe.flourMix.secondaryType}` : `Single flour for ${pizzaStyle.name} style`}",
      "proteinContent": ${recipe.flourMix ? 
        `"Analysis of the combined protein content in this flour mix"` : 
        `"Specific protein content needed for ${pizzaStyle.name} style (reference ideal range)"`},
      "rationale": ${recipe.flourMix ? 
        `"Detailed explanation of why this flour mix works for ${pizzaStyle.name} style"` : 
        `"Explanation of why specific protein content and flour characteristics matter for ${pizzaStyle.name} style"`},
      "flours": [
        ${recipe.flourMix ? `{
          "type": "${recipe.flourMix.primaryType}",
          "percentage": ${recipe.flourMix.primaryPercentage},
          "proteinContent": "Estimated protein percentage and gluten quality for ${recipe.flourMix.primaryType}",
          "purpose": "Specific functional role of ${recipe.flourMix.primaryType} in this ${pizzaStyle.name} dough (texture, structure, flavor contribution)"
        },
        {
          "type": "${recipe.flourMix.secondaryType}",
          "percentage": ${100 - (recipe.flourMix.primaryPercentage || 0)},
          "proteinContent": "Estimated protein percentage and gluten quality for ${recipe.flourMix.secondaryType}",
          "purpose": "Specific functional role of ${recipe.flourMix.secondaryType} in this ${pizzaStyle.name} dough (texture, structure, flavor contribution)"
        }` : 
        `{
          "type": "${pizzaStyle.idealFlour.split('(')[0].trim()}",
          "percentage": 100,
          "proteinContent": "Protein content analysis with specific percentage range ideal for ${pizzaStyle.name}",
          "purpose": "Detailed explanation of how this flour contributes to authentic ${pizzaStyle.name} characteristics"
        }`}
      ],
      "alternatives": [
        "Alternative flour 1 with brief explanation",
        "Alternative flour 2 with brief explanation"
      ]
    },
    "hydrationAnalysis": {
      "percentage": ${recipe.hydration || pizzaStyle.defaultHydration},
      "rationale": "Hydration choice explanation",
      "impact": ["Impact 1", "Impact 2"]
    },
    "saltAnalysis": {
      "percentage": ${recipe.salt || pizzaStyle.defaultSaltPercentage},
      "rationale": "Salt percentage explanation",
      "impact": ["Impact 1", "Impact 2"]
    },
    "oilAnalysis": {
      "percentage": ${recipe.oil ?? pizzaStyle.defaultOilPercentage},
      "rationale": "Oil percentage explanation",
      "impact": ["Impact 1", "Impact 2"]
    },
    "fermentationAnalysis": {
      "totalTime": ${totalFermentationHours},
      "roomTemp": {
        "time": ${fermentationSchedule.duration.min},
        "temperature": ${fermentationSchedule.temperature.room || 75},
        "impact": ["Room temp impact 1", "Room temp impact 2"]
      },
      "enzymaticActivity": "Description of enzyme activity",
      "gluten": "Description of gluten development"
    },
    "ovenAnalysis": {
      "ovenType": "${ovenDescription}",
      "maxTemp": ${maxOvenTemp},
      "recommendations": ["Oven technique recommendation 1", "Oven technique recommendation 2"],
      "impact": ["Oven type impact 1", "Oven type impact 2"]
    }
  }
}`
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      console.log('OpenAI Raw Response:', completion.choices[0]?.message?.content);

      if (!completion.choices[0]?.message?.content) {
        throw new Error('Empty response from OpenAI');
      }

      let aiResponse: EnhancedPizzaioloAnalysis;
      try {
        // Clean the response
        const rawContent = completion.choices[0].message.content;
        
        // First, try to find valid JSON within the response
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No valid JSON object found in response');
        }

        // Clean and parse the JSON
        const sanitizedContent = jsonMatch[0]
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
          .replace(/\n/g, ' ') // Replace newlines with spaces
          .replace(/,\s*}/g, '}') // Remove trailing commas
          .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
          .trim();
        
        console.log('Sanitized content:', sanitizedContent);

        // Validate JSON structure before parsing
        if (!sanitizedContent.startsWith('{') || !sanitizedContent.endsWith('}')) {
          throw new Error('Invalid JSON structure');
        }

        const parsedResponse = JSON.parse(sanitizedContent);

        // Update the validation section
        const requiredFields: Record<string, 'string' | 'array' | 'object'> = {
          flourRecommendation: 'string',
          technicalAnalysis: 'string',
          adjustmentRationale: 'string',
          techniqueGuidance: 'array',
          timeline: 'array',
          detailedAnalysis: 'object'
        };

        const missingOrInvalidFields = Object.entries(requiredFields)
          .filter(([field, type]) => {
            const value = parsedResponse[field];
            return !value || (type === 'array' && !Array.isArray(value)) || 
                   (type === 'object' && typeof value !== 'object') ||
                   (type === 'string' && typeof value !== 'string');
          })
          .map(([field]) => field);

        if (missingOrInvalidFields.length > 0) {
          throw new Error(`Invalid or missing fields in API response: ${missingOrInvalidFields.join(', ')}`);
        }

        // Validate timeline structure
        if (!Array.isArray(parsedResponse.timeline) || parsedResponse.timeline.length === 0) {
          throw new Error('Timeline must be a non-empty array');
        }

        // Check for minimum number of steps in timeline
        if (parsedResponse.timeline.length < 4) {
          console.warn('Timeline has too few steps, adding missing steps');
          
          // Check if we have the basic required steps
          const requiredSteps = ['mix', 'fermentation', 'proof', 'use'];
          const hasStep = (stepName: string) => 
            parsedResponse.timeline.some((step: Timeline) => 
              step.step.toLowerCase().includes(stepName) || step.description.toLowerCase().includes(stepName));
          
          // Add missing steps for Quick fermentation
          if (recipe.fermentationTime === 'quick') {
            const defaultTemp = fermentationSchedule.temperature.room || 75;
            const existingSteps = parsedResponse.timeline.map((step: Timeline) => step.step.toLowerCase());
            
            // Essential steps for a complete pizza dough process
            const essentialSteps = [
              {
                check: ['mix', 'knead', 'prepare', 'preparation'],
                default: {
                  step: "Initial Mix",
                  time: "10 minutes",
                  description: "Combine flour, water, salt, and yeast in a bowl",
                  temperature: defaultTemp,
                  tips: ["Use a digital scale for accuracy", "Mix until no dry flour remains"]
                }
              },
              {
                check: ['rest', 'autolyse'],
                default: {
                  step: "Rest Period",
                  time: "20 minutes",
                  description: "Let the dough rest to hydrate the flour",
                  temperature: defaultTemp,
                  tips: ["Cover with plastic wrap to prevent drying"]
                }
              },
              {
                check: ['knead', 'develop'],
                default: {
                  step: "Kneading",
                  time: "10 minutes",
                  description: "Develop the gluten structure",
                  temperature: defaultTemp,
                  tips: ["Look for a smooth, elastic dough", "Dough should pass the windowpane test"]
                }
              },
              {
                check: ['bulk', 'ferment'],
                default: {
                  step: "Bulk Fermentation",
                  time: "1 hour 30 minutes",
                  description: "Let the dough rise at room temperature",
                  temperature: defaultTemp,
                  tips: ["Place in a lightly oiled container", "Dough should nearly double in size"]
                }
              },
              {
                check: ['divide', 'shape', 'ball'],
                default: {
                  step: "Divide and Shape",
                  time: "10 minutes",
                  description: "Divide the dough into balls for individual pizzas",
                  temperature: defaultTemp,
                  tips: ["Use a bench scraper for dividing", "Shape into tight balls for even rising"]
                }
              },
              {
                check: ['final', 'proof'],
                default: {
                  step: "Final Proof",
                  time: "1 hour 40 minutes",
                  description: "Let the dough balls rise until ready to use",
                  temperature: defaultTemp,
                  tips: ["Cover to prevent drying", "Dough should be soft and pillowy"]
                }
              },
              {
                check: ['ready', 'use'],
                default: {
                  step: "Ready to Use",
                  time: "0 minutes",
                  description: "The dough is now ready to be stretched and topped",
                  temperature: defaultTemp,
                  tips: ["Let dough come to room temperature if refrigerated", "Handle gently to preserve gas bubbles"]
                }
              }
            ];
            
            // Identify missing steps
            const newTimeline = [...parsedResponse.timeline];
            let hasChanges = false;
            
            essentialSteps.forEach(stepInfo => {
              // Check if this type of step exists
              const hasThisStep = stepInfo.check.some(keyword => 
                existingSteps.some((step: string) => step.includes(keyword)));
              
              if (!hasThisStep) {
                console.log(`Adding missing step: ${stepInfo.default.step}`);
                newTimeline.push(stepInfo.default);
                hasChanges = true;
              }
            });
            
            if (hasChanges) {
              // Sort timeline in a logical order
              const stepOrder = [
                'initial mix', 'mix', 'prepare', 'preparation',
                'rest', 'autolyse',
                'knead', 'develop',
                'bulk', 'ferment',
                'divide', 'shape', 'ball',
                'final proof', 'proof',
                'ready', 'use'
              ];
              
              newTimeline.sort((a: Timeline, b: Timeline) => {
                const stepA = a.step.toLowerCase();
                const stepB = b.step.toLowerCase();
                
                // Find the index of the first keyword that matches
                const indexA = stepOrder.findIndex(keyword => stepA.includes(keyword));
                const indexB = stepOrder.findIndex(keyword => stepB.includes(keyword));
                
                // If neither matches any keyword, keep original order
                if (indexA === -1 && indexB === -1) return 0;
                // If only one matches, put the matching one first
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                // Otherwise sort by the keyword index
                return indexA - indexB;
              });
              
              parsedResponse.timeline = newTimeline;
            }
          }
        }

        // Validate each timeline step
        for (const step of parsedResponse.timeline) {
          if (!step.step || !step.time || !step.description) {
            throw new Error('Each timeline step must have step, time, and description fields');
          }
        }

        // Validate detailedAnalysis structure
        const detailedAnalysis = parsedResponse.detailedAnalysis;
        if (!detailedAnalysis) {
          throw new Error('Missing detailed analysis in response');
        }

        // Validate fermentation structure
        if (detailedAnalysis.fermentationAnalysis) {
          // Ensure coldTemp has the right structure if present
          if (detailedAnalysis.fermentationAnalysis.coldTemp) {
            const coldTemp = detailedAnalysis.fermentationAnalysis.coldTemp;
            
            // If coldTemp is not the expected structure, fix it
            if (typeof coldTemp !== 'object' || !('temperature' in coldTemp) || !('time' in coldTemp)) {
              console.warn('Invalid coldTemp format, fixing structure');
              // Create a default cold temp object with appropriate structure
              detailedAnalysis.fermentationAnalysis.coldTemp = {
                temperature: fermentationSchedule.temperature.cold || 38,
                time: fermentationSchedule.temperature.cold ? 
                  (totalFermentationHours - fermentationSchedule.duration.min) : 0,
                impact: ['Slower, more controlled fermentation', 'Enhanced flavor development']
              };
            }
          }
        }

        // Validate and enhance flour analysis
        if (!detailedAnalysis.flourAnalysis) {
          // Create a default flour analysis if missing
          detailedAnalysis.flourAnalysis = {
            type: recipe.flourMix ? `Mix of ${recipe.flourMix.primaryType} and ${recipe.flourMix.secondaryType}` : `${pizzaStyle.idealFlour.split('(')[0].trim()}`,
            proteinContent: pizzaStyle.idealFlour.includes('protein') ? 
              pizzaStyle.idealFlour.match(/(\d+(?:\.\d+)?-\d+(?:\.\d+)?|\d+(?:\.\d+)?)%\s+protein/i)?.[1] || "Not specified" : 
              "Not specified",
            rationale: `${pizzaStyle.name} style pizza typically requires ${pizzaStyle.idealFlour}.`,
            flours: []
          };
        }

        // Initialize flours array if missing or empty
        if (!Array.isArray(detailedAnalysis.flourAnalysis.flours) || detailedAnalysis.flourAnalysis.flours.length === 0) {
          if (recipe.flourMix) {
            // For custom flour mix
            detailedAnalysis.flourAnalysis.flours = [
              {
                type: recipe.flourMix.primaryType,
                percentage: recipe.flourMix.primaryPercentage || 70,
                proteinContent: `Typically ${recipe.flourMix.primaryType === "00 Flour" ? "11-12.5%" : 
                  recipe.flourMix.primaryType === "Bread Flour" ? "12-14%" : 
                  recipe.flourMix.primaryType === "All-Purpose" ? "10-12%" : 
                  "11-13%"} protein`,
                purpose: `Primary flour providing the main structure and ${recipe.flourMix.primaryType === "00 Flour" ? "fine texture" : 
                  recipe.flourMix.primaryType === "Bread Flour" ? "strong gluten development" : 
                  recipe.flourMix.primaryType === "All-Purpose" ? "balanced characteristics" : 
                  "basic structure"} in this ${pizzaStyle.name} dough.`
              },
              {
                type: recipe.flourMix.secondaryType || "Secondary Flour",
                percentage: 100 - (recipe.flourMix.primaryPercentage || 70),
                proteinContent: `Typically ${recipe.flourMix.secondaryType === "00 Flour" ? "11-12.5%" : 
                  recipe.flourMix.secondaryType === "Bread Flour" ? "12-14%" : 
                  recipe.flourMix.secondaryType === "All-Purpose" ? "10-12%" : 
                  "11-13%"} protein`,
                purpose: `Complementary flour adding ${recipe.flourMix.secondaryType === "00 Flour" ? "refined texture" : 
                  recipe.flourMix.secondaryType === "Bread Flour" ? "strength and structure" : 
                  recipe.flourMix.secondaryType === "All-Purpose" ? "balanced characteristics" : 
                  recipe.flourMix.secondaryType === "Whole Wheat" ? "nutty flavor and nutritional value" : 
                  recipe.flourMix.secondaryType === "Semolina" ? "color and coarse texture" : 
                  "textural variation"} to this ${pizzaStyle.name} dough.`
              }
            ];
          } else {
            // For standard flour selection
            const idealFlourName = pizzaStyle.idealFlour.split('(')[0].trim();
            const idealProtein = pizzaStyle.idealFlour.includes('protein') ? 
              pizzaStyle.idealFlour.match(/(\d+(?:\.\d+)?-\d+(?:\.\d+)?|\d+(?:\.\d+)?)%\s+protein/i)?.[1] || "Not specified" : 
              "Not specified";
              
            detailedAnalysis.flourAnalysis.flours = [
              {
                type: idealFlourName,
                percentage: 100,
                proteinContent: `${idealProtein} protein`,
                purpose: `Ideal for ${pizzaStyle.name} style pizza, providing ${
                  pizzaStyle.name === "Neapolitan" ? "the perfect balance of strength and extensibility for a soft yet chewy crust" : 
                  pizzaStyle.name === "New York" ? "strong gluten development necessary for a foldable yet chewy texture" : 
                  pizzaStyle.name === "Detroit" ? "sufficient strength for a light and airy crumb with crispy bottom" : 
                  pizzaStyle.name === "Sicilian" ? "good structure to support the thicker crust while maintaining softness" : 
                  "the appropriate texture and structure for this style"
                }.`
              }
            ];

            // Add alternatives if not present
            if (!detailedAnalysis.flourAnalysis.alternatives || !Array.isArray(detailedAnalysis.flourAnalysis.alternatives)) {
              detailedAnalysis.flourAnalysis.alternatives = pizzaStyle.flourTypes?.slice(0, 2).map(f => 
                `${f.name}: ${f.description}`
              ) || [];
            }
          }
        }

        // Ensure flourRecommendation is meaningful
        if (!parsedResponse.flourRecommendation || parsedResponse.flourRecommendation.toLowerCase().includes('standard flour')) {
          parsedResponse.flourRecommendation = recipe.flourMix ? 
            `A mix of ${recipe.flourMix.primaryType} (${recipe.flourMix.primaryPercentage}%) and ${recipe.flourMix.secondaryType} (${100 - (recipe.flourMix.primaryPercentage)}%) creates a balanced dough for ${pizzaStyle.name} style.` : 
            `For authentic ${pizzaStyle.name} style, use ${pizzaStyle.idealFlour}.`;
        }

        // Ensure technical analysis is meaningful
        if (!parsedResponse.technicalAnalysis || parsedResponse.technicalAnalysis.length < 20) {
          parsedResponse.technicalAnalysis = recipe.flourMix ? 
            `The combination of ${recipe.flourMix.primaryType} and ${recipe.flourMix.secondaryType} provides a balanced protein content for ${pizzaStyle.name} style, affecting gluten development and final texture.` : 
            `${pizzaStyle.idealFlour} is recommended for ${pizzaStyle.name} style due to its protein content and gluten quality, which creates the characteristic texture.`;
        }

        aiResponse = parsedResponse as EnhancedPizzaioloAnalysis;

      } catch (error) {
        console.error('AI Response Error:', error);
        return NextResponse.json(
          { error: `Failed to generate recipe analysis: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 500 }
        );
      }

      // Create the final result with actual values only
      const result: EnhancedPizzaioloAnalysis = {
        hydration: recipe.hydration || pizzaStyle.defaultHydration,
        salt: recipe.salt || pizzaStyle.defaultSaltPercentage,
        oil: recipe.oil ?? pizzaStyle.defaultOilPercentage,
        yeast: {
          type: (recipe.yeast?.type || 'instant') as YeastInfo['type'],
          percentage: yeastPercentage
        },
        recipe: recipe.flourMix ? {
          flourMix: {
            primaryType: recipe.flourMix.primaryType,
            secondaryType: recipe.flourMix.secondaryType || undefined,
            primaryPercentage: recipe.flourMix.primaryPercentage || 100
          }
        } : undefined,
        fermentationSchedule: {
          room: {
            hours: recipe.fermentationTime === 'custom' ? fermentation.duration.min : fermentationSchedule.duration.min,
            temperature: fermentationSchedule.temperature.room || 72,
            milestones: aiResponse.fermentationSchedule?.room?.milestones || []
          },
          cold: {
            hours: recipe.fermentationTime === 'custom' ? 
              (fermentation.duration.max - fermentation.duration.min) : 
              (fermentationSchedule.temperature.cold ? fermentationSchedule.duration.max - fermentationSchedule.duration.min : 0),
            temperature: fermentationSchedule.temperature.cold || 38,
            milestones: aiResponse.fermentationSchedule?.cold?.milestones || []
          }
        },
        flourRecommendation: aiResponse.flourRecommendation,
        technicalAnalysis: aiResponse.technicalAnalysis,
        adjustmentRationale: aiResponse.adjustmentRationale,
        techniqueGuidance: aiResponse.techniqueGuidance,
        advancedOptions: {
          preferment: false,
          autolyse: processSteps.autolyse,
          additionalIngredients: []
        },
        timeline: aiResponse.timeline,
        detailedAnalysis: aiResponse.detailedAnalysis
      };

      // Ensure fermentation analysis has the correct structure
      if (result.detailedAnalysis?.fermentationAnalysis) {
        // Check room temp
        if (!result.detailedAnalysis.fermentationAnalysis.roomTemp ||
            typeof result.detailedAnalysis.fermentationAnalysis.roomTemp !== 'object') {
          result.detailedAnalysis.fermentationAnalysis.roomTemp = {
            temperature: fermentationSchedule.temperature.room || 75,
            time: fermentationSchedule.duration.min,
            impact: ['Promotes yeast activity', 'Develops gluten structure']
          };
        }
        
        // Check cold temp for cold fermentation types
        if (recipe.fermentationTime === 'cold' || recipe.fermentationTime === 'overnight') {
          if (!result.detailedAnalysis.fermentationAnalysis.coldTemp ||
              typeof result.detailedAnalysis.fermentationAnalysis.coldTemp !== 'object' ||
              !('temperature' in result.detailedAnalysis.fermentationAnalysis.coldTemp)) {
            
            result.detailedAnalysis.fermentationAnalysis.coldTemp = {
              temperature: fermentationSchedule.temperature.cold || 38,
              time: fermentationSchedule.temperature.cold ? 
                (totalFermentationHours - fermentationSchedule.duration.min) : 0,
              impact: ['Slower, more controlled fermentation', 'Enhanced flavor development']
            };
          }
        }
      }
      
      // Only include oil analysis if oil is used and provided by AI
      if (recipe.oil && aiResponse.detailedAnalysis?.oilAnalysis) {
        result.detailedAnalysis.oilAnalysis = aiResponse.detailedAnalysis.oilAnalysis;
      }

      console.log('Final Response:', JSON.stringify(result, null, 2));

      // Only cache the result if not using no-cache mode
      if (!noCache) {
        await cache.set(cacheKey, JSON.stringify(result));
      }

      return NextResponse.json(result, {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } catch (error) {
      console.error('OpenAI API error:', error);
        return NextResponse.json(
        { error: 'Failed to generate recipe analysis' },
          { status: 500 }
      );
    }
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 