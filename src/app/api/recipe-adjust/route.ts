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
    const cacheKey = `recipe-${style}-${JSON.stringify(recipe)}-${JSON.stringify(fermentation)}`;
    const cachedResult = await cache.get(cacheKey);
    
    if (cachedResult) {
      console.log('Returning cached result');
      return NextResponse.json(JSON.parse(cachedResult));
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

    // Update the prompt to be more explicit about the required structure
    const prompt = `As an expert pizzaiolo, analyze and provide detailed recommendations for a ${pizzaStyle.name} style pizza dough with the following specifications:

Dough Parameters:
- Hydration: ${recipe.hydration || pizzaStyle.defaultHydration}%
- Salt: ${recipe.salt || pizzaStyle.defaultSaltPercentage}%
- Oil: ${recipe.oil ?? pizzaStyle.defaultOilPercentage}%
${recipe.flourMix ? `- Flour Mix:
  - Primary Flour: ${recipe.flourMix.primaryType} (${recipe.flourMix.primaryPercentage}%)
  - Secondary Flour: ${recipe.flourMix.secondaryType} (${100 - (recipe.flourMix.primaryPercentage || 0)}%)` : '- Flour: Standard bread flour (100%)'}
- Yeast Type: ${recipe.yeast?.type || 'instant'}
- Yeast Percentage: ${yeastPercentage}%
- Fermentation Type: ${recipe.fermentationTime || 'same-day'}
- Total Fermentation Hours: ${totalFermentationHours}

Your response must be a valid JSON object with EXACTLY this structure:
{
  "flourRecommendation": "string describing flour recommendation",
  "technicalAnalysis": "string with technical analysis",
  "adjustmentRationale": "string explaining adjustments",
  "techniqueGuidance": ["array of technique guidance strings"],
  "detailedAnalysis": {
    "flourAnalysis": {
      "type": "string",
      "proteinContent": "string",
      "rationale": "string"
    },
    "hydrationAnalysis": {
      "percentage": number,
      "rationale": "string",
      "impact": ["array of impact strings"]
    },
    "saltAnalysis": {
      "percentage": number,
      "rationale": "string",
      "impact": ["array of impact strings"]
    },
    "fermentationAnalysis": {
      "totalTime": number,
      "roomTemp": {
        "time": number,
        "temperature": number,
        "impact": ["array of impact strings"]
      },
      "enzymaticActivity": "string",
      "gluten": "string"
    }
  }
}`;

    console.log('Sending request to OpenAI');
    
    try {
      // Make the API call
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: `You are a pizza dough calculator API. You MUST:
1. Return ONLY a JSON object
2. Follow the EXACT structure provided
3. Do not add ANY additional fields
4. Do not include ANY explanatory text outside the JSON
5. Ensure all JSON is properly formatted with no trailing commas
6. Use double quotes for all strings
7. Do not use any special characters in strings that would need escaping`
          },
          {
            role: "user",
            content: `Return a JSON object with this EXACT structure for a ${pizzaStyle.name} pizza:

{
  "flourRecommendation": "brief flour recommendation",
  "technicalAnalysis": "brief technical analysis",
  "adjustmentRationale": "brief adjustment rationale",
  "techniqueGuidance": ["technique 1", "technique 2"],
  "detailedAnalysis": {
    "flourAnalysis": {
      "type": "flour type",
      "proteinContent": "protein content",
      "rationale": "flour rationale"
    },
    "hydrationAnalysis": {
      "percentage": ${recipe.hydration || pizzaStyle.defaultHydration},
      "rationale": "hydration rationale",
      "impact": ["impact 1", "impact 2"]
    },
    "saltAnalysis": {
      "percentage": ${recipe.salt || pizzaStyle.defaultSaltPercentage},
      "rationale": "salt rationale",
      "impact": ["impact 1", "impact 2"]
    },
    "fermentationAnalysis": {
      "totalTime": ${totalFermentationHours},
      "roomTemp": {
        "time": ${fermentationSchedule.duration.min},
        "temperature": ${fermentationSchedule.temperature.room || 75},
        "impact": ["impact 1", "impact 2"]
      },
      "enzymaticActivity": "enzyme activity description",
      "gluten": "gluten development description"
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

        // More specific validation of the AI response structure
        const requiredFields: Record<string, 'string' | 'array' | 'object'> = {
          flourRecommendation: 'string',
          technicalAnalysis: 'string',
          adjustmentRationale: 'string',
          techniqueGuidance: 'array',
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

        // Validate detailedAnalysis structure
        const detailedAnalysis = parsedResponse.detailedAnalysis;
        if (!detailedAnalysis.flourAnalysis?.type || 
            !detailedAnalysis.hydrationAnalysis?.impact ||
            !detailedAnalysis.saltAnalysis?.impact ||
            !detailedAnalysis.fermentationAnalysis?.roomTemp) {
          throw new Error('Missing required fields in detailedAnalysis');
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
        timeline: aiResponse.timeline || generateTimeline(recipe.fermentationTime, fermentationSchedule, processSteps),
        detailedAnalysis: aiResponse.detailedAnalysis
      };

      // Only include oil analysis if oil is used and provided by AI
      if (recipe.oil && aiResponse.detailedAnalysis?.oilAnalysis) {
        result.detailedAnalysis.oilAnalysis = aiResponse.detailedAnalysis.oilAnalysis;
      }

      console.log('Final Response:', JSON.stringify(result, null, 2));

      // Cache the result
      await cache.set(cacheKey, JSON.stringify(result));

      return NextResponse.json(result);
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

// Helper function to generate timeline based on fermentation type
function generateTimeline(
  fermentationType: string,
  schedule: FermentationScheduleType,
  processSteps: {
    autolyse: boolean;
    initialMix: boolean;
    bulkFermentation: boolean;
    divideAndBall: boolean;
    finalProof: boolean;
  } = {
    autolyse: false,
    initialMix: true,
    bulkFermentation: true,
    divideAndBall: true,
    finalProof: true
  }
): Timeline[] {
  const timeline: Timeline[] = [];
  const totalHours = schedule.duration.max;
  const isCustomSchedule = fermentationType === 'custom';
  
  // Initial mix step
  if (processSteps.initialMix) {
    timeline.push({
      step: 'Initial Mix',
      time: 'Start',
      description: processSteps.autolyse 
        ? 'Combine flour and water (reserve 50g) for autolyse. Mix for 2 minutes until shaggy.'
        : 'Combine all ingredients. Mix until incorporated.',
      tips: ['Use room temperature water (75°F)', 'Mix just until no dry flour remains']
    });

    // Only add autolyse if explicitly enabled
    if (processSteps.autolyse) {
      timeline.push({
        step: 'Autolyse Rest',
        time: '+20 minutes',
        description: 'Rest dough to hydrate flour and begin gluten development.',
        tips: ['Cover dough', 'No kneading during this period']
      });

      timeline.push({
        step: 'Final Mix',
        time: '+10 minutes',
        description: 'Add remaining ingredients. Mix until medium development.',
        temperature: 75,
        tips: ['Use windowpane test to check gluten', 'Dough should be tacky but not sticky']
      });
    }
  }

  // Bulk fermentation
  if (processSteps.bulkFermentation) {
    const bulkTime = isCustomSchedule ? 
      `${schedule.duration.min} hours` :
      fermentationType === 'quick' ? '1-2 hours' :
      fermentationType === 'same-day' ? '2-3 hours' :
      '3-4 hours';

    timeline.push({
      step: 'Bulk Fermentation',
      time: bulkTime,
      description: `Let dough rise at room temperature until ${isCustomSchedule || fermentationType === 'quick' ? '1.3x' : '1.5x'} in size.`,
      temperature: schedule.temperature.room || 75,
      tips: ['Cover well', 'Maintain consistent temperature']
    });
  }

  // Divide and ball
  if (processSteps.divideAndBall) {
    timeline.push({
      step: 'Divide & Ball',
      time: '15 minutes',
      description: 'Divide dough and shape into tight balls.',
      tips: ['Use minimal flour', 'Create tension without tearing']
    });
  }

  // Add cold fermentation step if applicable
  if (schedule.temperature.cold) {
    const coldHours = isCustomSchedule ? 
      totalHours - schedule.duration.min :
      totalHours - (schedule.duration.min || 0);

    if (coldHours > 0) {
      timeline.push({
        step: 'Cold Fermentation',
        time: `${coldHours} hours`,
        description: 'Refrigerate dough balls for flavor development.',
        temperature: schedule.temperature.cold,
        tips: ['Space balls well apart', 'Use sealed containers']
      });
    }
  }

  // Final proof
  if (processSteps.finalProof) {
    timeline.push({
      step: 'Final Proof',
      time: schedule.temperature.cold ? '2 hours' : '30 minutes',
      description: schedule.temperature.cold ? 'Bring dough to room temperature before shaping.' : 'Final proof at room temperature.',
      temperature: 75,
      tips: ['Watch for bubbles forming', 'Dough should be relaxed']
    });
  }

  return timeline;
} 