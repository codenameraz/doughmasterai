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

// Define a simplified version of the fermentation schedules for fallback
const FERMENTATION_SCHEDULES = {
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

export async function POST(request: Request) {
  try {
    console.log('Starting recipe-adjust API request processing');
    
    // Parse request body
    const body = await request.json();
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

    try {
      await rateLimiter.checkRateLimit();
    } catch (error) {
      console.log('Rate limit exceeded:', error);
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const pizzaStyle = PIZZA_STYLES[style];

    // Get fermentation schedule details
    let fermentationSchedule;
    let totalFermentationHours;

    if (recipe.fermentationTime === 'custom' && fermentation.duration) {
      // For custom schedules, use the provided duration
      totalFermentationHours = fermentation.duration.max;
      fermentationSchedule = {
        duration: fermentation.duration,
        temperature: fermentation.temperature
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
        { error: 'API configuration error' },
        { status: 500 }
      );
    }

    // Construct the prompt for the AI
    const prompt = `As an expert pizzaiolo, analyze and provide detailed recommendations for a ${pizzaStyle.name} style pizza dough with the following specifications:

Dough Parameters:
- Hydration: ${recipe.hydration || pizzaStyle.defaultHydration}%
- Salt: ${recipe.salt || pizzaStyle.defaultSaltPercentage}%
- Oil: ${recipe.oil ?? pizzaStyle.defaultOilPercentage}%
${recipe.flourMix ? `- Flour Mix:
  - Primary Flour: ${recipe.flourMix.primaryType} (${recipe.flourMix.primaryPercentage}%)
  - Secondary Flour: ${recipe.flourMix.secondaryType} (${100 - (recipe.flourMix.primaryPercentage || 0)}%)` : ''}
- Yeast Type: ${recipe.yeast?.type || 'instant'}
- Yeast Percentage: ${yeastPercentage}%
- Fermentation Type: ${recipe.fermentationTime || 'same-day'}
- Total Fermentation Hours: ${totalFermentationHours}
${recipe.fermentationTime === 'custom' ? `- Custom Schedule:
  - Room Temperature: ${fermentation.temperature.room}°F
  - Cold Temperature: ${fermentation.temperature.cold}°F
  - Duration: ${fermentation.duration.min}-${fermentation.duration.max} hours` : ''}

Please provide a comprehensive analysis including:
1. ${recipe.flourMix ? `Flour mix analysis:
   - Impact of combining ${recipe.flourMix.primaryType} (${recipe.flourMix.primaryPercentage}%) with ${recipe.flourMix.secondaryType} (${100 - (recipe.flourMix.primaryPercentage || 0)}%)
   - How this mix affects dough strength, flavor, and texture
   - Protein content analysis of the combined flours
   - Specific benefits and challenges of this combination` : 'Flour recommendation (type, protein content, alternatives)'}
2. Hydration analysis (rationale, impact on dough)
3. Salt analysis (rationale, impact on fermentation and flavor)
4. Oil analysis (if applicable)
5. Fermentation analysis (room temp phase, cold phase if applicable)
6. Technical considerations specific to ${pizzaStyle.name} style
7. Technique guidance for optimal results

Format the response as a JSON object matching the EnhancedPizzaioloAnalysis interface.`;

    console.log('Sending request to OpenAI');
    
    try {
      // Make the API call
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: `You are an expert pizzaiolo with deep knowledge of dough fermentation, flour characteristics, and pizza styles. 
Your response MUST be a valid JSON object with ALL of the following required fields:
- flourRecommendation (string)
- technicalAnalysis (string)
- adjustmentRationale (string)
- techniqueGuidance (string[])
- detailedAnalysis (object) containing:
  - flourAnalysis: { type, proteinContent, rationale }
  - hydrationAnalysis: { percentage, rationale, impact }
  - saltAnalysis: { percentage, rationale, impact }
  - fermentationAnalysis: { totalTime, roomTemp: { time, temperature, impact }, enzymaticActivity, gluten }

For flour mixes, analyze how the combination affects:
- Overall protein content and gluten development
- Flavor profile and texture characteristics
- Fermentation behavior and enzyme activity
- Specific benefits and potential challenges

Your analysis must be detailed, scientific, and specific to the given parameters.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      console.log('OpenAI Raw Response:', completion.choices[0]?.message?.content);

      if (!completion.choices[0]?.message?.content) {
        throw new Error('Empty response from OpenAI');
      }

      let aiResponse;
      try {
        // Attempt to sanitize the response before parsing
        const sanitizedContent = completion.choices[0].message.content
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
          .replace(/\n/g, '\\n') // Properly escape newlines
          .trim();
        
        console.log('Sanitized content:', sanitizedContent);
        aiResponse = JSON.parse(sanitizedContent);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Failed to parse content:', completion.choices[0].message.content);
        
        // Provide a fallback response
        aiResponse = {
          flourRecommendation: 'Analysis pending due to technical error',
          technicalAnalysis: 'Technical analysis pending',
          adjustmentRationale: 'Adjustment rationale pending',
          techniqueGuidance: ['Basic technique guidance pending'],
          detailedAnalysis: {
            flourAnalysis: {
              type: 'Analysis pending',
              proteinContent: 'Analysis pending',
              rationale: 'Analysis pending'
            },
            hydrationAnalysis: {
              percentage: recipe.hydration || pizzaStyle.defaultHydration,
              rationale: 'Analysis pending',
              impact: ['Analysis pending']
            },
            saltAnalysis: {
              percentage: recipe.salt || pizzaStyle.defaultSaltPercentage,
              rationale: 'Analysis pending',
              impact: ['Analysis pending']
            },
            fermentationAnalysis: {
              totalTime: totalFermentationHours,
              roomTemp: {
                time: fermentationSchedule.duration.min,
                temperature: fermentationSchedule.temperature.room || 72,
                impact: ['Analysis pending']
              },
              enzymaticActivity: 'Analysis pending',
              gluten: 'Analysis pending'
            }
          }
        };
      }

      // Validate required fields from AI response
      const missingFields = [];
      if (!aiResponse.flourRecommendation) missingFields.push('flourRecommendation');
      if (!aiResponse.technicalAnalysis) missingFields.push('technicalAnalysis');
      if (!aiResponse.detailedAnalysis) missingFields.push('detailedAnalysis');
      if (!aiResponse.adjustmentRationale) missingFields.push('adjustmentRationale');
      if (!aiResponse.techniqueGuidance) missingFields.push('techniqueGuidance');

      if (missingFields.length > 0) {
        console.error('Missing fields in AI response:', missingFields);
        console.error('AI Response Structure:', Object.keys(aiResponse));
        
        // Attempt to construct a valid response even with missing fields
        aiResponse.flourRecommendation = aiResponse.flourRecommendation || 'Analysis pending';
        aiResponse.technicalAnalysis = aiResponse.technicalAnalysis || 'Technical analysis pending';
        aiResponse.adjustmentRationale = aiResponse.adjustmentRationale || 'Adjustment rationale pending';
        aiResponse.techniqueGuidance = aiResponse.techniqueGuidance || ['Basic technique guidance pending'];
        
        if (!aiResponse.detailedAnalysis) {
          aiResponse.detailedAnalysis = {
            flourAnalysis: {
              type: recipe.flourMix ? 
                `${recipe.flourMix.primaryType} (${recipe.flourMix.primaryPercentage}%) + ${recipe.flourMix.secondaryType} (${100 - (recipe.flourMix.primaryPercentage || 0)}%)` :
                'Analysis pending',
              proteinContent: 'Analysis pending',
              rationale: 'Analysis pending'
            },
            hydrationAnalysis: {
              percentage: recipe.hydration || pizzaStyle.defaultHydration,
              rationale: 'Analysis pending',
              impact: ['Analysis pending']
            },
            saltAnalysis: {
              percentage: recipe.salt || pizzaStyle.defaultSaltPercentage,
              rationale: 'Analysis pending',
              impact: ['Analysis pending']
            },
            fermentationAnalysis: {
              totalTime: totalFermentationHours,
              roomTemp: {
                time: fermentationSchedule.duration.min,
                temperature: fermentationSchedule.temperature.room || 72,
                impact: ['Analysis pending']
              },
              enzymaticActivity: 'Analysis pending',
              gluten: 'Analysis pending'
            }
          };
        }
      }

      // Create the final result with minimal fallbacks
      const result: EnhancedPizzaioloAnalysis = {
        // Core values from recipe input
        hydration: recipe.hydration || pizzaStyle.defaultHydration,
        salt: recipe.salt || pizzaStyle.defaultSaltPercentage,
        oil: recipe.oil ?? pizzaStyle.defaultOilPercentage,
        yeast: {
          type: recipe.yeast?.type || 'instant',
          percentage: yeastPercentage
        },
        // Include recipe details with flour mix
        recipe: recipe.flourMix ? {
          flourMix: {
            primaryType: recipe.flourMix.primaryType,
            secondaryType: recipe.flourMix.secondaryType || undefined,
            primaryPercentage: recipe.flourMix.primaryPercentage || 100
          }
        } : undefined,
        fermentationSchedule: aiResponse.fermentationSchedule || {
          room: {
            hours: recipe.fermentationTime === 'custom' ? fermentation.duration.min : fermentationSchedule.duration.min,
            temperature: fermentationSchedule.temperature.room || 72,
            milestones: ['Initial fermentation begins', 'Gluten development starts', 'First rise phase']
          },
          cold: {
            hours: recipe.fermentationTime === 'custom' ? (fermentation.duration.max - fermentation.duration.min) : (fermentationSchedule.temperature.cold ? fermentationSchedule.duration.max - fermentationSchedule.duration.min : 0),
            temperature: fermentationSchedule.temperature.cold || 38,
            milestones: ['Flavor development phase', 'Slow fermentation period', 'Final maturation']
          }
        },
        flourRecommendation: aiResponse.flourRecommendation,
        technicalAnalysis: aiResponse.technicalAnalysis,
        adjustmentRationale: aiResponse.adjustmentRationale,
        techniqueGuidance: aiResponse.techniqueGuidance,
        advancedOptions: aiResponse.advancedOptions || {
          preferment: false,
          autolyse: true,
          additionalIngredients: []
        },
        timeline: aiResponse.timeline || generateTimeline(recipe.fermentationTime, fermentationSchedule),
        detailedAnalysis: aiResponse.detailedAnalysis
      };

      // Add oil analysis if oil is used
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
function generateTimeline(fermentationType: string, schedule: typeof FERMENTATION_SCHEDULES[keyof typeof FERMENTATION_SCHEDULES]): Timeline[] {
  const timeline: Timeline[] = [];
  const totalHours = schedule.duration.max;
  
  // Initial steps are the same for all schedules
  timeline.push({
    step: 'Initial Mix',
    time: 'Start',
    description: 'Combine flour, water (reserve 50g) for autolyse. Mix for 2 minutes until shaggy.',
    tips: ['Use room temperature water (75°F)', 'Mix just until no dry flour remains']
  });

  timeline.push({
    step: 'Autolyse',
    time: '+20 minutes',
    description: 'Rest dough to hydrate flour and begin gluten development.',
    tips: ['Cover dough', 'No kneading during this period']
  });

  timeline.push({
    step: 'Final Mix',
    time: '+10 minutes',
    description: 'Add salt, yeast, oil, and reserved water. Mix until medium development.',
    temperature: 75,
    tips: ['Use windowpane test to check gluten', 'Dough should be tacky but not sticky']
  });

  // Adjust bulk fermentation based on schedule
  const bulkTime = fermentationType === 'quick' ? '1-2 hours' :
                   fermentationType === 'same-day' ? '2-3 hours' :
                   '3-4 hours';

  timeline.push({
    step: 'Bulk Fermentation',
    time: bulkTime,
    description: `Let dough rise at room temperature until ${fermentationType === 'quick' ? '1.3x' : '1.5x'} in size.`,
    temperature: schedule.temperature.room || 75,
    tips: ['Cover well', 'Maintain consistent temperature']
  });

  timeline.push({
    step: 'Divide & Ball',
    time: '15 minutes',
    description: 'Divide dough and shape into tight balls.',
    tips: ['Use minimal flour', 'Create tension without tearing']
  });

  // Add cold fermentation step if applicable
  if (schedule.temperature.cold) {
    const coldHours = totalHours - (schedule.duration.min || 0);
    timeline.push({
      step: 'Cold Fermentation',
      time: `${coldHours} hours`,
      description: 'Refrigerate dough balls for flavor development.',
      temperature: schedule.temperature.cold,
      tips: ['Space balls well apart', 'Use sealed containers']
    });
  }

  // Add final proof step
  timeline.push({
    step: 'Final Proof',
    time: schedule.temperature.cold ? '2 hours' : '30 minutes',
    description: schedule.temperature.cold ? 'Bring dough to room temperature before shaping.' : 'Final proof at room temperature.',
    temperature: 75,
    tips: ['Watch for bubbles forming', 'Dough should be relaxed']
  });

  return timeline;
} 