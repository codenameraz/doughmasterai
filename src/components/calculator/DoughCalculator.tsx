'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { PIZZA_STYLES, PizzaStyle as OpenAIPizzaStyle, FLOUR_TYPES } from '@/lib/openai/config'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { calculateYeast, calculateFermentationSchedule } from '@/lib/calculator'
import { 
  FERMENTATION_PRESETS, 
  FermentationSchedule,
  FermentationType,
  Temperature,
  YeastType,
  RecipeResults,
  RecipeAdjustment,
  AdditionalIngredient,
  FermentationStep
} from '@/lib/types'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface DoughCalculatorProps {
  className?: string
}

const calculatorSchema = z.object({
  style: z.string(),
  ballCount: z.number().min(1).max(100),
  ballWeight: z.number().min(100).max(1000),
  hydration: z.number().min(50).max(90),
  salt: z.number().min(1).max(5),
  oil: z.number().min(0).max(10).default(0),
  fermentationType: z.enum(['quick', 'sameDay', 'overnight', 'longCold', 'custom']),
  customSchedule: z.object({
    targetDate: z.string(),
    preferredTemp: z.enum(['room', 'cold', 'mixed'])
  }).optional(),
  yeastType: z.enum(['fresh', 'active', 'instant']),
  environment: z.object({
    location: z.string().optional(),
    altitude: z.number().optional(),
    humidity: z.number().optional(),
    temperature: z.number().optional(),
    equipment: z.array(z.string()).optional(),
    season: z.enum(['spring', 'summer', 'fall', 'winter']).optional()
  }).optional(),
  flourMix: z.object({
    primaryType: z.string(),
    secondaryType: z.string().optional(),
    primaryPercentage: z.number().min(0).max(100).optional()
  }).optional()
})

type CalculatorFormInputs = z.infer<typeof calculatorSchema>

interface APIError {
  error: string
  resetIn?: {
    minute: string
    day: string
  }
}

export function DoughCalculator({ className }: DoughCalculatorProps) {
  const [results, setResults] = useState<RecipeResults | null>(null)
  const [adjustment, setAdjustment] = useState<RecipeAdjustment | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<APIError | null>(null)
  const [showEnvironment, setShowEnvironment] = useState(false)
  const searchParams = useSearchParams()

  const form = useForm<CalculatorFormInputs>({
    resolver: zodResolver(calculatorSchema),
    defaultValues: {
      style: searchParams.get('style') || 'neapolitan',
      ballCount: 4,
      ballWeight: 250,
      hydration: PIZZA_STYLES.neapolitan.defaultHydration,
      salt: PIZZA_STYLES.neapolitan.defaultSaltPercentage,
      oil: PIZZA_STYLES.neapolitan.defaultOilPercentage || 0,
      fermentationType: 'sameDay',
      yeastType: 'instant',
      flourMix: {
        primaryType: PIZZA_STYLES.neapolitan.flourTypes[0]?.name,
        secondaryType: undefined
      },
      environment: {
        season: undefined,
        temperature: undefined,
        humidity: undefined,
        altitude: undefined,
        equipment: undefined,
        location: undefined
      }
    }
  })

  // Handle URL query parameters
  useEffect(() => {
    const style = searchParams.get('style')
    if (style && PIZZA_STYLES[style]) {
      const pizzaStyle = PIZZA_STYLES[style]
      form.setValue('style', style)
      form.setValue('hydration', pizzaStyle.defaultHydration)
      form.setValue('salt', pizzaStyle.defaultSaltPercentage)
      if (pizzaStyle.defaultOilPercentage !== null) {
        form.setValue('oil', pizzaStyle.defaultOilPercentage)
      }
    }
  }, [searchParams, form])

  // Update form values when style changes
  const handleStyleChange = useCallback((style: string) => {
    const pizzaStyle = PIZZA_STYLES[style];
    if (!pizzaStyle) return;

    form.setValue('hydration', pizzaStyle.defaultHydration);
    form.setValue('salt', pizzaStyle.defaultSaltPercentage);
    form.setValue('oil', pizzaStyle.defaultOilPercentage || 0);
    
    if (style === 'custom') {
      form.setValue('flourMix', {
        primaryType: pizzaStyle.flourTypes[0]?.name,
        secondaryType: undefined
      });
    } else {
      form.setValue('flourMix', {
        primaryType: pizzaStyle.flourTypes[0]?.name,
        secondaryType: undefined
      });
    }
  }, [form]);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'style') {
        handleStyleChange(value.style as string);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, handleStyleChange]);

  const onSubmit = async (data: CalculatorFormInputs) => {
    setIsLoading(true)
    setError(null)
    try {
      const totalDoughWeight = data.ballCount * data.ballWeight
      const flourWeight = Math.round(totalDoughWeight / (1 + data.hydration / 100))
      const waterWeight = Math.round(flourWeight * (data.hydration / 100))
      const saltWeight = Math.round(flourWeight * (data.salt / 100))
      const oilWeight = Math.round(flourWeight * ((data.oil ?? 0) / 100))

      // Calculate flour mix amounts
      let flourMix
      if (data.flourMix?.secondaryType && data.flourMix.primaryPercentage !== undefined) {
        const primaryFlourWeight = Math.round(flourWeight * (data.flourMix.primaryPercentage / 100))
        const secondaryFlourWeight = flourWeight - primaryFlourWeight
        flourMix = {
          primary: primaryFlourWeight,
          secondary: secondaryFlourWeight
        }
      }

      // Calculate fermentation schedule
      let schedule: FermentationSchedule
      if (data.fermentationType === 'custom' && data.customSchedule) {
        schedule = calculateFermentationSchedule('custom', data.customSchedule)
      } else {
        schedule = calculateFermentationSchedule(data.fermentationType as FermentationType)
      }

      // Calculate yeast amount
      const temp = FERMENTATION_PRESETS[data.fermentationType === 'custom' ? 'sameDay' : data.fermentationType].temp
      const yeast = calculateYeast(
        flourWeight,
        data.fermentationType,
        data.yeastType as YeastType,
        temp
      )

      // Set results first so we can use them in the API request
      const currentResults: RecipeResults = {
        flour: flourWeight,
        flourMix: flourMix ? {
          primary: flourMix.primary,
          secondary: flourMix.secondary
        } : undefined,
        water: waterWeight,
        salt: saltWeight,
        oil: oilWeight,
        yeast: yeast.amount,
        schedule: {
          steps: schedule.steps.map(step => ({
            type: step.type || 'bulk',
            temp: step.temp || 'room',
            title: step.title || '',
            description: step.description,
            startTime: step.startTime,
            endTime: step.endTime,
            duration: step.duration
          })),
          totalTime: schedule.totalTime
        }
      }
      setResults(currentResults)

      // Get AI insights for the recipe
      const response = await fetch('/api/recipe-adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          style: data.style,
          environment: showEnvironment ? data.environment : undefined,
          recipe: {
            hydration: data.hydration,
            salt: data.salt,
            oil: data.oil,
            fermentationType: data.fermentationType,
            yeastType: data.yeastType,
            flourMix: data.flourMix,
            customSchedule: data.fermentationType === 'custom' ? {
              targetDate: data.customSchedule?.targetDate,
              preferredTemp: data.customSchedule?.preferredTemp
            } : undefined,
            schedule: currentResults.schedule
          }
        })
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result as APIError)
        return
      }

      if (result._meta?.remaining) {
        // console.log('Remaining requests:', result._meta.remaining)
      }

      setAdjustment(result)

      // Only update values if environment was provided
      if (data.environment) {
        data.hydration = result.hydration
        data.salt = result.salt
        if (result.oil !== null) {
          data.oil = result.oil
        }
      }

      setResults(currentResults)
    } catch (error) {
      setError({
        error: 'Failed to calculate recipe. Please try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("w-full max-w-4xl mx-auto", className)}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="p-6">
            <div className="space-y-6">
              {/* Pizza Style Selection */}
                      <FormField
                        control={form.control}
                        name="style"
                        render={({ field }) => (
                          <FormItem>
                    <FormLabel>Pizza Style</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger className="h-10 sm:h-12 text-sm sm:text-base">
                        <SelectValue placeholder="Select pizza style" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(PIZZA_STYLES).map(([key, style]) => (
                                  <SelectItem key={key} value={key}>
                                    {style.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                    <FormDescription>
                              {PIZZA_STYLES[field.value]?.description}
                            </FormDescription>
                    <FormMessage />
                          </FormItem>
                        )}
                      />

              {/* Ball Count and Weight */}
              <div className="grid gap-6 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                  name="ballCount"
                        render={({ field }) => (
                          <FormItem>
                      <FormLabel>Number of Balls</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          className="h-10 sm:h-12 text-sm sm:text-base"
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        How many pizza dough balls do you want to make?
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                <FormField
                  control={form.control}
                  name="ballWeight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ball Weight (g)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={100}
                          max={1000}
                          step={10}
                          className="h-10 sm:h-12 text-sm sm:text-base"
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Target weight for each dough ball in grams
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Hydration and Salt */}
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="hydration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hydration (%)</FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          <Slider
                            min={50}
                            max={90}
                            step={1}
                            value={[field.value]}
                            onValueChange={(values: number[]) => field.onChange(values[0])}
                            className="py-2"
                          />
                          <Input
                            type="number"
                            min={50}
                            max={90}
                            className="h-10 sm:h-12 text-sm sm:text-base"
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value))}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Water to flour ratio (recommended: {PIZZA_STYLES[form.watch('style')]?.defaultHydration}%)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="salt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salt (%)</FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          <Slider
                            min={1}
                            max={5}
                            step={0.1}
                            value={[field.value]}
                            onValueChange={(values: number[]) => field.onChange(values[0])}
                            className="py-2"
                          />
                          <Input
                            type="number"
                            min={1}
                            max={5}
                            step={0.1}
                            className="h-10 sm:h-12 text-sm sm:text-base"
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Salt percentage (recommended: {PIZZA_STYLES[form.watch('style')]?.defaultSaltPercentage}%)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Oil - Only show for styles that use oil */}
              {PIZZA_STYLES[form.watch('style')]?.defaultOilPercentage !== null && (
                <FormField
                  control={form.control}
                  name="oil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Oil (%)</FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          <Slider
                            min={0}
                            max={10}
                            step={0.5}
                            value={[field.value]}
                            onValueChange={(values: number[]) => field.onChange(values[0])}
                            className="py-2"
                          />
                          <Input
                            type="number"
                            min={0}
                            max={10}
                            step={0.5}
                            className="h-10 sm:h-12 text-sm sm:text-base"
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Oil percentage (recommended: {PIZZA_STYLES[form.watch('style')]?.defaultOilPercentage}%)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Fermentation Type */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="fermentationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fermentation Schedule</FormLabel>
                      <Tabs
                        defaultValue={field.value}
                        onValueChange={field.onChange}
                        className="w-full"
                      >
                        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
                          <TabsTrigger value="quick">Quick</TabsTrigger>
                          <TabsTrigger value="sameDay">Same Day</TabsTrigger>
                          <TabsTrigger value="overnight">Overnight</TabsTrigger>
                          <TabsTrigger value="longCold">Long Cold</TabsTrigger>
                          <TabsTrigger value="custom">Custom</TabsTrigger>
                        </TabsList>
                        <TabsContent value="quick" className="mt-4">
                          <Card className="p-4 bg-secondary/30">
                            <p className="text-sm">2-4 hours at room temperature</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Best for emergency pizza needs. The dough will be workable but won't develop complex flavors.
                            </p>
                          </Card>
                        </TabsContent>
                        <TabsContent value="sameDay" className="mt-4">
                          <Card className="p-4 bg-secondary/30">
                            <p className="text-sm">6-8 hours at room temperature</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Good balance of convenience and flavor development. Start in the morning for dinner.
                            </p>
                          </Card>
                        </TabsContent>
                        <TabsContent value="overnight" className="mt-4">
                          <Card className="p-4 bg-secondary/30">
                            <p className="text-sm">12-16 hours in the refrigerator</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Make the dough the night before. Cold fermentation develops better flavors.
                            </p>
                          </Card>
                        </TabsContent>
                        <TabsContent value="longCold" className="mt-4">
                          <Card className="p-4 bg-secondary/30">
                            <p className="text-sm">48-72 hours in the refrigerator</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Extended cold fermentation for maximum flavor development and digestibility.
                            </p>
                          </Card>
                        </TabsContent>
                        <TabsContent value="custom" className="mt-4">
                          <Card className="p-4 bg-secondary/30">
                            <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="customSchedule.targetDate"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                    <FormLabel>Target Date & Time</FormLabel>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <FormControl>
                                          <Button
                                            variant="outline"
                                            className={cn(
                                              "h-10 sm:h-12 text-sm sm:text-base w-full pl-3 text-left font-normal",
                                              !field.value && "text-muted-foreground"
                                            )}
                                          >
                                            {field.value ? (
                                              format(new Date(field.value), "PPP")
                                            ) : (
                                              <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                          </Button>
                                        </FormControl>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0" align="start">
                                <DatePicker
                                  selected={field.value ? new Date(field.value) : null}
                                  onChange={(date: Date | null) => {
                                    if (date) {
                                      field.onChange(date.toISOString())
                                    }
                                  }}
                                  showTimeSelect
                                          dateFormat="Pp"
                                  minDate={new Date()}
                                          className="w-full p-2 border rounded-md"
                                        />
                                      </PopoverContent>
                                    </Popover>
                                    <FormDescription>
                                      When do you plan to use the dough?
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="customSchedule.preferredTemp"
                            render={({ field }) => (
                              <FormItem>
                                    <FormLabel>Preferred Temperature</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <SelectTrigger className="h-10 sm:h-12 text-sm sm:text-base">
                                        <SelectValue placeholder="Select temperature preference" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="room">Room Temperature</SelectItem>
                                        <SelectItem value="cold">Cold (Refrigerator)</SelectItem>
                                    <SelectItem value="mixed">Mixed (Room + Cold)</SelectItem>
                                  </SelectContent>
                                </Select>
                                    <FormDescription>
                                  Choose your preferred fermentation temperature
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                            </div>
                          </Card>
                        </TabsContent>
                      </Tabs>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Yeast Type */}
                      <FormField
                        control={form.control}
                        name="yeastType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Yeast Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger className="h-10 sm:h-12 text-sm sm:text-base">
                                <SelectValue placeholder="Select yeast type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fresh">Fresh Yeast</SelectItem>
                                <SelectItem value="active">Active Dry Yeast</SelectItem>
                                <SelectItem value="instant">Instant Yeast</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Choose your preferred type of yeast
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Flour Selection - Only show for custom style */}
                      {form.watch('style') === 'custom' && (
                        <>
                          <FormField
                            control={form.control}
                            name="flourMix.primaryType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Primary Flour</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger className="h-10 sm:h-12 text-sm sm:text-base">
                                    <SelectValue placeholder="Select primary flour" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {PIZZA_STYLES[form.watch('style')].flourTypes.map((flour) => (
                                      <SelectItem key={flour.name} value={flour.name}>
                                        {flour.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  {PIZZA_STYLES[form.watch('style')].flourTypes.find(f => f.name === field.value)?.description}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="flourMix.secondaryType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Secondary Flour (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                                  <SelectTrigger className="h-10 sm:h-12 text-sm sm:text-base">
                                    <SelectValue placeholder="Select secondary flour" />
                                  </SelectTrigger>
                                  <SelectContent>
                            <SelectItem value="">None</SelectItem>
                                    {PIZZA_STYLES[form.watch('style')].flourTypes
                              .filter(flour => flour.name !== form.watch('flourMix.primaryType'))
                                      .map((flour) => (
                                        <SelectItem key={flour.name} value={flour.name}>
                                          {flour.name}
                                        </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                          {field.value ? PIZZA_STYLES[form.watch('style')].flourTypes.find(f => f.name === field.value)?.description : 'Optional secondary flour for blending'}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {form.watch('flourMix.secondaryType') && (
                            <FormField
                              control={form.control}
                              name="flourMix.primaryPercentage"
                              render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Flour Percentage</FormLabel>
                                  <FormControl>
                            <div className="space-y-4">
                                          <Slider
                                            min={0}
                                            max={100}
                                            step={5}
                                value={[field.value || 50]}
                                onValueChange={(values: number[]) => field.onChange(values[0])}
                                className="py-2"
                              />
                              <div className="flex justify-between text-sm">
                                <span>{field.value || 50}% {form.watch('flourMix.primaryType')}</span>
                                <span>{100 - (field.value || 50)}% {form.watch('flourMix.secondaryType')}</span>
                                      </div>
                                    </div>
                                  </FormControl>
                                  <FormDescription>
                            Adjust the ratio between your primary and secondary flour
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </>
                      )}

              {/* Environment Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Environment Settings</h4>
                  <Button
                          type="button"
                    variant="ghost"
                    size="sm"
                          onClick={() => setShowEnvironment(!showEnvironment)}
                    className="text-primary hover:text-primary/80"
                  >
                    {showEnvironment ? 'Hide' : 'Show'} Settings
                  </Button>
                      </div>

                      {showEnvironment && (
                  <Card className="p-4 bg-secondary/30 space-y-4">
                            <FormField
                              control={form.control}
                              name="environment.season"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Season</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                                    <SelectTrigger className="h-10 sm:h-12 text-sm sm:text-base">
                                      <SelectValue placeholder="Select season" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="spring">Spring</SelectItem>
                                      <SelectItem value="summer">Summer</SelectItem>
                                      <SelectItem value="fall">Fall</SelectItem>
                                      <SelectItem value="winter">Winter</SelectItem>
                                    </SelectContent>
                                  </Select>
                          <FormDescription>
                            Current season affects fermentation time and hydration
                          </FormDescription>
                          <FormMessage />
                                </FormItem>
                              )}
                            />

                    <div className="grid gap-4 sm:grid-cols-2">
                            <FormField
                              control={form.control}
                              name="environment.temperature"
                              render={({ field }) => (
                                <FormItem>
                            <FormLabel>Room Temperature (°C)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                min={10}
                                max={40}
                                className="h-10 sm:h-12 text-sm sm:text-base"
                                      {...field}
                                onChange={e => field.onChange(parseFloat(e.target.value))}
                                    />
                                  </FormControl>
                            <FormDescription>
                              Your kitchen's ambient temperature
                            </FormDescription>
                            <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="environment.humidity"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Humidity (%)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                min={0}
                                max={100}
                              className="h-10 sm:h-12 text-sm sm:text-base"
                              {...field}
                                onChange={e => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                            <FormDescription>
                              Current humidity level
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    </div>

                    <FormField
                      control={form.control}
                      name="environment.altitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Altitude (meters)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              max={4000}
                              className="h-10 sm:h-12 text-sm sm:text-base"
                              {...field}
                              onChange={e => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Your location's altitude affects fermentation
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </Card>
                )}
                            </div>
                  </div>
          </Card>

                  {/* Submit Button */}
                  <div className="col-span-full mt-2">
                    <Button 
                      type="submit" 
                      className="w-full sm:w-auto h-10 sm:h-12 text-sm sm:text-base px-8"
                      disabled={isLoading}
                    >
                      {isLoading ? "Calculating..." : "Calculate Recipe"}
                    </Button>
          </div>
        </form>

        {/* Results Section */}
        {error && (
          <div className="mt-6 bg-destructive/10 border-l-4 border-destructive rounded-r-xl p-4 text-sm">
            <p className="font-medium text-destructive">{error.error}</p>
            {error.resetIn && (
              <p className="mt-2 text-destructive/80">
                {error.resetIn.minute !== 'N/A' && (
                  <span>Minute limit resets in: {error.resetIn.minute}. </span>
                )}
                {error.resetIn.day !== 'N/A' && (
                  <span>Daily limit resets in: {error.resetIn.day}.</span>
                )}
              </p>
            )}
          </div>
        )}

        {results && (
          <div className="mt-8 space-y-6">
            <div className="flex flex-col items-center text-center mb-6">
              <h3 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary/80 bg-clip-text text-transparent">
                Master Pizzaiolo's Recipe
              </h3>
              <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
                <span>{new Date().toLocaleDateString()}</span>
                <span>•</span>
                <span className="font-medium">{PIZZA_STYLES[form.watch('style')].name}</span>
              </div>
            </div>
            
                  <div className="grid gap-6 sm:grid-cols-2">
              {/* Recipe Card */}
              <Card className="p-6 bg-card">
                <h4 className="text-lg font-semibold mb-4">Ingredients</h4>
                <div className="space-y-4">
                  {/* Flour */}
                        {results.flourMix ? (
                          <>
                            <div className="flex items-center justify-between py-2 border-b border-primary/20">
                              <span className="text-sm font-medium">Total Flour</span>
                              <span className="text-sm tabular-nums font-semibold">{results.flour}g</span>
                            </div>
                            <div className="pl-4 space-y-2 border-l-2 border-primary/20">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                  {form.watch('flourMix.primaryType') && 
                                   PIZZA_STYLES[form.watch('style')].flourTypes.find(f => f.name === form.watch('flourMix.primaryType'))?.name}
                                </span>
                                <span className="text-sm tabular-nums">{results.flourMix.primary}g</span>
                              </div>
                              {results.flourMix.secondary && form.watch('flourMix.secondaryType') && (
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-muted-foreground">
                                    {PIZZA_STYLES[form.watch('style')].flourTypes.find(f => f.name === form.watch('flourMix.secondaryType'))?.name}
                                  </span>
                                  <span className="text-sm tabular-nums">{results.flourMix.secondary}g</span>
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-between py-2 border-b border-primary/20">
                      <span className="text-sm font-medium">Flour ({PIZZA_STYLES[form.watch('style')].flourTypes[0]?.name})</span>
                            <span className="text-sm tabular-nums font-semibold">{results.flour}g</span>
                          </div>
                        )}

                  {/* Water */}
                        <div className="flex items-center justify-between py-2 border-b border-primary/20">
                          <span className="text-sm font-medium">Water</span>
                          <span className="text-sm tabular-nums font-semibold">{results.water}g</span>
                        </div>

                  {/* Salt */}
                        <div className="flex items-center justify-between py-2 border-b border-primary/20">
                          <span className="text-sm font-medium">Salt</span>
                          <span className="text-sm tabular-nums font-semibold">{results.salt}g</span>
                        </div>

                  {/* Yeast */}
                  <div className="flex items-center justify-between py-2 border-b border-primary/20">
                    <span className="text-sm font-medium">
                      Yeast ({form.watch('yeastType')})
                    </span>
                    <span className="text-sm tabular-nums font-semibold">{results.yeast}g</span>
                  </div>

                  {/* Oil - if used */}
                        {results.oil > 0 && (
                          <div className="flex items-center justify-between py-2 border-b border-primary/20">
                            <span className="text-sm font-medium">Oil</span>
                            <span className="text-sm tabular-nums font-semibold">{results.oil}g</span>
                          </div>
                        )}

                  {/* Additional Ingredients */}
                  {results.additionalIngredients?.map((ingredient, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-primary/20">
                      <span className="text-sm font-medium">{ingredient.name}</span>
                      <span className="text-sm tabular-nums font-semibold">{ingredient.amount}g</span>
                        </div>
                  ))}
                      </div>
              </Card>

              {/* Instructions Card */}
              <Card className="p-6 bg-card">
                <h4 className="text-lg font-semibold mb-4">Instructions</h4>
                      <div className="space-y-4">
                  {/* Mixing Instructions */}
                  <div className="space-y-2">
                    <h5 className="text-sm font-semibold text-primary">Mixing</h5>
                    <ol className="space-y-2 text-sm">
                      <li className="flex gap-2">
                        <span className="font-medium">1.</span>
                        <span>Dissolve salt in 90% of the water</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-medium">2.</span>
                        <span>In a separate container, dissolve yeast in remaining water</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-medium">3.</span>
                        <span>Mix flour with salt water until no dry flour remains</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-medium">4.</span>
                        <span>Add yeast mixture and knead until smooth (10-15 minutes)</span>
                      </li>
                      {results.oil > 0 && (
                        <li className="flex gap-2">
                          <span className="font-medium">5.</span>
                          <span>Gradually incorporate oil during final minutes of kneading</span>
                        </li>
                      )}
                    </ol>
                  </div>

                  {/* Fermentation Schedule */}
                  <div className="space-y-2">
                    <h5 className="text-sm font-semibold text-primary">Fermentation</h5>
                    <div className="space-y-3 text-sm">
                        {results.schedule.steps.map((step, index) => (
                        <div key={index} className="flex items-start gap-3 bg-white/80 rounded-lg p-3 border border-primary/20">
                          <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">{index + 1}</span>
                            </div>
                          <div>
                            <p className="font-medium">{step.title}</p>
                            <p className="text-muted-foreground text-xs mt-1">{step.description}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Environmental Adjustments */}
                  {adjustment && (
                        <div className="space-y-3">
                          <h5 className="text-sm font-semibold text-primary">Fine-Tuning</h5>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between bg-white/80 rounded-lg p-3 border border-primary/20">
                              <span className="text-sm">Hydration</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm tabular-nums font-medium">{adjustment.hydration}%</span>
                                {adjustment.hydration !== (form.getValues('hydration') || PIZZA_STYLES[form.watch('style')].defaultHydration) && (
                                  <span className={cn(
                                    "text-xs px-2 py-0.5 rounded-full font-medium",
                                    adjustment.hydration > (form.getValues('hydration') || PIZZA_STYLES[form.watch('style')].defaultHydration)
                                      ? "bg-green-100 text-green-700"
                                      : "bg-red-100 text-red-700"
                                  )}>
                                    {adjustment.hydration > (form.getValues('hydration') || PIZZA_STYLES[form.watch('style')].defaultHydration) ? "↑" : "↓"}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between bg-white/80 rounded-lg p-3 border border-primary/20">
                              <span className="text-sm">Salt</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm tabular-nums font-medium">{adjustment.salt}%</span>
                                {adjustment.salt !== (form.getValues('salt') || PIZZA_STYLES[form.watch('style')].defaultSaltPercentage) && (
                                  <span className={cn(
                                    "text-xs px-2 py-0.5 rounded-full font-medium",
                                    adjustment.salt > (form.getValues('salt') || PIZZA_STYLES[form.watch('style')].defaultSaltPercentage)
                                      ? "bg-green-100 text-green-700"
                                      : "bg-red-100 text-red-700"
                                  )}>
                                    {adjustment.salt > (form.getValues('salt') || PIZZA_STYLES[form.watch('style')].defaultSaltPercentage) ? "↑" : "↓"}
                                  </span>
                                )}
                              </div>
                            </div>
                            {adjustment.oil !== null && (
                              <div className="flex items-center justify-between bg-white/80 rounded-lg p-3 border border-primary/20">
                                <span className="text-sm">Oil</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm tabular-nums font-medium">{adjustment.oil}%</span>
                                  {adjustment.oil !== (form.getValues('oil') || PIZZA_STYLES[form.watch('style')].defaultOilPercentage || 0) && (
                                    <span className={cn(
                                      "text-xs px-2 py-0.5 rounded-full font-medium",
                                      adjustment.oil > (form.getValues('oil') || PIZZA_STYLES[form.watch('style')].defaultOilPercentage || 0)
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                    )}>
                                      {adjustment.oil > (form.getValues('oil') || PIZZA_STYLES[form.watch('style')].defaultOilPercentage || 0) ? "↑" : "↓"}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            {/* Yeast Adjustment */}
                            <div className="flex items-center justify-between bg-white/80 rounded-lg p-3 border border-primary/20">
                              <span className="text-sm">Yeast</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm tabular-nums font-medium">{adjustment.yeast.percentage}%</span>
                                <span className="text-xs text-gray-500">({adjustment.yeast.type})</span>
                              </div>
                            </div>
                                  </div>
                                </div>
                              )}
                                  </div>
              </Card>
                                  </div>
          </div>
        )}
      </Form>
    </div>
  )
} 