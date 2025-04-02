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
const MODEL = 'mistralai/mistral-7b-instruct'

// Initialize OpenRouter client with error logging
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
  timeout: 45000, // 45 second timeout
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
    
    // Parse request body with error handling
    let body: ApiRequest;
    try {
      body = await request.json() as ApiRequest;
    } catch (error) {
      console.error('Error parsing request body:', error);
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    const { style, recipe, fermentation } = body;
    
    console.log('Request payload:', JSON.stringify(body, null, 2));

    // Validate required fields
    if (!style || !PIZZA_STYLES[style]) {
      return NextResponse.json(
        { error: 'Invalid pizza style' },
        { status: 400 }
      );
    }

    if (!recipe || !fermentation) {
      return NextResponse.json(
        { error: 'Missing required fields: recipe or fermentation' },
        { status: 400 }
      );
    }

    // Rate limiting check
    try {
      await rateLimiter.checkRateLimit();
    } catch (error) {
      console.error('Rate limit exceeded:', error);
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Try to get cached response first
    const cacheKey = JSON.stringify(body);
    const cachedResponse = await cache.get(cacheKey);
    if (cachedResponse) {
      console.log('Returning cached response');
      return NextResponse.json(cachedResponse);
    }

    // Prepare the prompt
    const pizzaStyle = PIZZA_STYLES[style];
    const totalFermentationHours = (fermentation.duration.min + fermentation.duration.max) / 2;
    const prompt = `Analyze this ${pizzaStyle.name} style pizza dough recipe and provide recommendations. 

IMPORTANT: You MUST respond with a valid JSON object matching this exact structure. Each section MUST be detailed and specific:
{
  "timeline": [
    {
      "step": string,
      "time": string,
      "description": string (MUST be detailed, explaining the technique and why it's important),
      "temperature": number (optional),
      "tips": string[] (at least 2-3 specific, actionable tips)
    }
  ],
  "detailedAnalysis": {
    "flourAnalysis": {
      "type": string (MUST specify exact flour type with brand names),
      "proteinContent": string (MUST include exact protein percentage range),
      "rationale": string (MUST explain why this flour type is ideal for this style),
      "flours": [
        {
          "type": string (MUST include specific brand names and flour types),
          "percentage": number (MUST total 100% across all flours),
          "proteinContent": string (MUST specify exact protein range),
          "purpose": string (MUST explain the specific role this flour plays in the dough)
        }
      ],
      "alternatives": string[] (MUST list 2-3 specific brand name alternatives with similar properties)
    },
    "hydrationAnalysis": {
      "percentage": number,
      "rationale": string (MUST explain why this hydration level works for this style),
      "impact": string[] (MUST list at least 3 specific effects on dough properties)
    },
    "saltAnalysis": {
      "percentage": number,
      "rationale": string (MUST explain the role of salt at this percentage),
      "impact": string[] (MUST list at least 3 specific effects on dough)
    },
    "oilAnalysis": {
      "percentage": number,
      "rationale": string (MUST explain why this oil percentage suits the style),
      "impact": string[] (MUST list at least 3 specific effects)
    },
    "fermentationAnalysis": {
      "totalTime": number,
      "roomTemp": {
        "time": number,
        "temperature": number,
        "impact": string[] (MUST list at least 3 specific effects)
      },
      "coldTemp": {
        "time": number,
        "temperature": number,
        "impact": string[] (MUST list at least 3 specific effects)
      } (optional),
      "enzymaticActivity": string (MUST explain specific enzyme actions during fermentation),
      "gluten": string (MUST describe gluten development stages)
    },
    "ovenAnalysis": {
      "ovenType": string,
      "maxTemp": number,
      "recommendations": string[] (MUST provide at least 3 specific techniques),
      "impact": string[] (MUST list at least 3 specific effects of oven conditions)
    }
  },
  "hydration": number,
  "salt": number,
  "oil": number | null,
  "yeast": {
    "type": "fresh" | "active dry" | "instant",
    "percentage": number
  },
  "fermentationSchedule": {
    "room": {
      "hours": number,
      "temperature": number
    },
    "cold": {
      "hours": number,
      "temperature": number
    }
  },
  "flourRecommendation": string (MUST include specific brand names and explain why they're ideal),
  "technicalAnalysis": string (MUST provide detailed analysis of dough characteristics),
  "adjustmentRationale": string (MUST explain any adjustments needed),
  "techniqueGuidance": string[] (MUST provide at least 3 specific technique tips),
  "advancedOptions": {
    "preferment": boolean,
    "autolyse": boolean,
    "additionalIngredients": Array<{
      "ingredient": string,
      "purpose": string (MUST explain specific benefit)
    }>
  }
}

Recipe specifications:
- Style: ${pizzaStyle.name} ${style !== 'custom' ? '(standard style - provide specific flour recommendations)' : ''}
- Dough balls: ${body.doughBalls}
- Weight per ball: ${body.weightPerBall}g
- Hydration: ${recipe.hydration}%
- Salt: ${recipe.salt}%
- Oil: ${recipe.oil !== null ? recipe.oil + '%' : 'none'}
- Flour mix: ${recipe.flourMix ? `${recipe.flourMix.primaryType} (${recipe.flourMix.primaryPercentage}%)${recipe.flourMix.secondaryType ? ` and ${recipe.flourMix.secondaryType} (${100 - recipe.flourMix.primaryPercentage}%)` : ''}` : 'not specified'}
- Yeast type: ${recipe.yeast.type}
- Fermentation time: ${recipe.fermentationTime}
- Schedule: ${fermentation.schedule} (${totalFermentationHours} hours)
- Room temp: ${fermentation.temperature.room || 'N/A'}°F
- Cold temp: ${fermentation.temperature.cold || 'N/A'}°F
${body.environment?.ovenType ? `- Oven type: ${body.environment.ovenType} (max ${body.environment.maxOvenTemp}°F)` : ''}
${body.environment?.altitude ? `- Altitude: ${body.environment.altitude} feet` : ''}

Style-specific flour requirements:
${style === 'neapolitan' ? `For Neapolitan pizza:
- Primary flour MUST be "00 flour" (90-100%)
- Protein content must be 11-13%
- MUST recommend specific Italian 00 flour brands (e.g., Caputo 00 Chef's Flour, Antimo Caputo 00 Pizzeria Flour)
- MUST explain why each recommended flour is suitable for Neapolitan style
- No cake flour, all-purpose flour, or low-protein flours allowed
- Any secondary flour (if used) must complement the primary 00 flour` : ''}
${style === 'new-york' ? `For New York pizza:
- Primary flour MUST be bread flour or high-gluten flour (90-100%)
- Protein content must be 12-14%
- MUST recommend specific brands (e.g., King Arthur Bread Flour, All Trumps High-Gluten Flour)
- MUST explain why each recommended flour creates proper NY-style characteristics
- Any secondary flour (if used) must enhance chewiness and structure` : ''}

Remember:
1. For standard pizza styles (non-custom), MUST provide specific flour brands and types
2. MUST include exact protein content ranges for all recommended flours
3. MUST explain in detail why each flour is suitable for the specific style
4. Timeline MUST include ALL steps in sequence with detailed explanations
5. Each step MUST have exact times (no ranges)
6. Total time MUST match ${totalFermentationHours} hours
7. Response MUST be valid JSON
8. All fields in the JSON structure are required unless marked optional
9. NEVER recommend cake flour or low-protein flour for pizza dough
10. MUST follow style-specific flour requirements when provided
11. MUST provide specific, actionable advice (not generic statements)
12. MUST explain the reasoning behind each recommendation`;

    // Make API call with retry logic
    const response = await withRetry(async () => {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert pizzaiolo analyzing pizza dough recipes. You MUST respond with valid JSON matching the specified structure. Do not include any text outside the JSON object. Ensure all required fields are present and properly formatted.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      });

      if (!completion.choices?.[0]?.message?.content) {
        console.error('OpenRouter Response:', completion);
        throw new Error('No response from OpenAI');
      }

      console.log('Raw OpenAI Response:', completion.choices[0].message.content);
      return completion;
    }, 3, 2000);

    // Parse OpenAI response with better error handling
    let parsedResponse: EnhancedPizzaioloAnalysis;
    try {
      const content = response.choices[0].message.content;
      if (!content) {
        console.error('Empty Response Object:', response);
        throw new Error('Empty response from OpenAI');
      }
      
      // Try to clean the response if it's not valid JSON
      const cleanedContent = content.trim().replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      console.log('Cleaned Response:', cleanedContent);
      
      try {
        parsedResponse = JSON.parse(cleanedContent);
        console.log('Parsed Response:', JSON.stringify(parsedResponse, null, 2));
      } catch (parseError) {
        console.error('Raw response:', content);
        console.error('Cleaned response:', cleanedContent);
        console.error('Parse error:', parseError);
        throw new Error('Invalid JSON format in response');
      }
    } catch (error) {
      console.error('API Error:', error);
      console.error('API Error Stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('API Error Details:', {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        model: MODEL,
        timestamp: new Date().toISOString()
      });

      // Check if error is related to model availability
      if (error instanceof Error && 
          (error.message.includes('model') || 
           error.message.includes('unavailable') || 
           error.message.includes('quota'))) {
        console.error('Model availability error, falling back to alternative model');
        // You could implement model fallback here if needed
        return NextResponse.json(
          { error: 'The service is temporarily unavailable. Please try again in a few minutes.' },
          { status: 503 }
        );
      }
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
          console.error('Timeout Error Details:', {
            timeout: openai.timeout,
            errorMessage: error.message
          });
          return NextResponse.json(
            { error: 'Request timed out. Please try again.' },
            { status: 504 }
          );
        }
        
        if (error.message.includes('rate limit')) {
          console.error('Rate Limit Error:', error.message);
          return NextResponse.json(
            { error: 'Service is busy. Please try again in a few minutes.' },
            { status: 429 }
          );
        }
      }

      // Log unexpected errors
      console.error('Unexpected Error:', {
        error: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.constructor.name : typeof error,
        timestamp: new Date().toISOString()
      });

      // Generic error response
      return NextResponse.json(
        { 
          error: 'An unexpected error occurred. Please try again.',
          errorId: new Date().getTime().toString(36) // Add an error ID for tracking
        },
        { status: 500 }
      );
    }

    // Validate parsed response
    if (!parsedResponse || !parsedResponse.timeline || !parsedResponse.detailedAnalysis) {
      console.error('Invalid response structure:', parsedResponse);
      return NextResponse.json(
        { error: 'Invalid response format from AI. Please try again.' },
        { status: 500 }
      );
    }

    // Cache the successful response
    await cache.set(cacheKey, parsedResponse);

    // Return the response
    return NextResponse.json(parsedResponse);

  } catch (error) {
    console.error('API Error:', error);
    console.error('API Error Stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('API Error Details:', {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      model: MODEL,
      timestamp: new Date().toISOString()
    });
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        console.error('Timeout Error Details:', {
          timeout: openai.timeout,
          errorMessage: error.message
        });
        return NextResponse.json(
          { error: 'Request timed out. Please try again.' },
          { status: 504 }
        );
      }
      
      if (error.message.includes('rate limit')) {
        console.error('Rate Limit Error:', error.message);
        return NextResponse.json(
          { error: 'Service is busy. Please try again in a few minutes.' },
          { status: 429 }
        );
      }
    }

    // Log unexpected errors
    console.error('Unexpected Error:', {
      error: error instanceof Error ? error.message : String(error),
      type: error instanceof Error ? error.constructor.name : typeof error,
      timestamp: new Date().toISOString()
    });

    // Generic error response
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred. Please try again.',
        errorId: new Date().getTime().toString(36) // Add an error ID for tracking
      },
      { status: 500 }
    );
  }
} 