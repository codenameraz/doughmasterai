import { addHours, format, parse, parseISO } from 'date-fns'
import {
  CalculatorInputs,
  FermentationSchedule,
  FermentationType,
  FermentationStep,
  FERMENTATION_PRESETS,
  TEMP_RANGES,
  YeastCalculation,
  YeastType,
  YEAST_FACTORS
} from './types'

export function calculateYeast(
  flourWeight: number,
  fermentationType: FermentationType,
  yeastType: YeastType,
  temperature: 'cold' | 'room' | 'mixed'
): YeastCalculation {
  // Base yeast percentage (for fresh yeast, room temperature, 4-6 hours)
  let basePercentage = 1.0 // 1% of flour weight for a quick fermentation

  // Adjust for fermentation time
  if (fermentationType !== 'custom') {
    const preset = FERMENTATION_PRESETS[fermentationType]
    const avgDuration = (preset.duration.min + preset.duration.max) / 2
    
    // Exponential reduction based on fermentation time
    // Longer fermentation = less yeast needed
    basePercentage = basePercentage * Math.pow(0.7, Math.log2(avgDuration / 4))
  }

  // Temperature adjustments
  if (temperature === 'cold') {
    basePercentage = basePercentage * 2 // Need more yeast for cold fermentation
  } else if (temperature === 'mixed') {
    basePercentage = basePercentage * 1.5 // Moderate increase for mixed
  }

  // Calculate amount based on flour weight
  const freshYeastAmount = (flourWeight * basePercentage) / 100

  // Apply yeast type factor
  const factor = YEAST_FACTORS[yeastType]
  const amount = freshYeastAmount * factor

  // Round to 2 decimal places
  return {
    amount: Math.round(amount * 100) / 100,
    type: yeastType,
    factor
  }
}

export function calculateFermentationSchedule(
  fermentationType: FermentationType,
  customSchedule?: { targetDate: string; preferredTemp: 'room' | 'cold' | 'mixed' }
): FermentationSchedule {
  const now = new Date()
  let schedule: FermentationSchedule

  if (fermentationType === 'custom' && customSchedule) {
    const targetDate = parseISO(customSchedule.targetDate)
    schedule = createCustomSchedule(now, targetDate, customSchedule.preferredTemp)
  } else if (fermentationType !== 'custom') {
    const preset = FERMENTATION_PRESETS[fermentationType]
    schedule = createPresetSchedule(now, preset)
  } else {
    throw new Error('Custom schedule required for custom fermentation type')
  }

  return schedule
}

function createPresetSchedule(startTime: Date, preset: typeof FERMENTATION_PRESETS.quick): FermentationSchedule {
  const steps: FermentationStep[] = []
  let currentTime = startTime
  const avgDuration = (preset.duration.min + preset.duration.max) / 2

  if (preset.steps.includes('mix')) {
    const endTime = addHours(currentTime, 0.5)
    steps.push({
      type: 'mix',
      temp: preset.temp,
      duration: 0.5,
      startTime: currentTime.toISOString(),
      endTime: endTime.toISOString(),
      description: 'Mix ingredients and knead dough'
    })
    currentTime = endTime
  }

  if (preset.steps.includes('bulk')) {
    const duration = preset.temp === 'cold' ? avgDuration * 0.6 : 2
    const endTime = addHours(currentTime, duration)
    steps.push({
      type: 'bulk',
      temp: preset.temp,
      duration,
      startTime: currentTime.toISOString(),
      endTime: endTime.toISOString(),
      description: `Bulk fermentation at ${preset.temp} temperature`
    })
    currentTime = endTime
  }

  if (preset.steps.includes('ball')) {
    const endTime = addHours(currentTime, 0.5)
    steps.push({
      type: 'ball',
      temp: preset.temp,
      duration: 0.5,
      startTime: currentTime.toISOString(),
      endTime: endTime.toISOString(),
      description: 'Divide and ball dough'
    })
    currentTime = endTime
  }

  const remainingTime = avgDuration - steps.reduce((acc, step) => acc + step.duration, 0)
  if (remainingTime > 0) {
    steps.push({
      type: 'proof',
      temp: preset.temp,
      duration: remainingTime,
      startTime: currentTime.toISOString(),
      endTime: addHours(currentTime, remainingTime).toISOString(),
      description: `Final proof at ${preset.temp} temperature`
    })
  }

  return {
    startTime: startTime.toISOString(),
    steps,
    totalTime: avgDuration
  }
}

function createCustomSchedule(
  startTime: Date,
  targetDate: Date,
  preferredTemp: 'room' | 'cold' | 'mixed'
): FermentationSchedule {
  const totalHours = (targetDate.getTime() - startTime.getTime()) / (1000 * 60 * 60)
  const steps: FermentationStep[] = []
  let currentTime = startTime

  // Initial mix
  const mixEndTime = addHours(currentTime, 0.5)
  steps.push({
    type: 'mix',
    temp: 'room',
    duration: 0.5,
    startTime: currentTime.toISOString(),
    endTime: mixEndTime.toISOString(),
    description: 'Mix ingredients and knead dough'
  })
  currentTime = mixEndTime

  // Determine bulk fermentation strategy
  const bulkTemp = preferredTemp === 'mixed' ? 'room' : preferredTemp
  const bulkDuration = preferredTemp === 'cold' ? totalHours * 0.6 : Math.min(3, totalHours * 0.3)

  const bulkEndTime = addHours(currentTime, bulkDuration)
  steps.push({
    type: 'bulk',
    temp: bulkTemp,
    duration: bulkDuration,
    startTime: currentTime.toISOString(),
    endTime: bulkEndTime.toISOString(),
    description: `Bulk fermentation at ${bulkTemp} temperature`
  })
  currentTime = bulkEndTime

  // Ball formation
  const ballEndTime = addHours(currentTime, 0.5)
  steps.push({
    type: 'ball',
    temp: preferredTemp === 'cold' ? 'cold' : 'room',
    duration: 0.5,
    startTime: currentTime.toISOString(),
    endTime: ballEndTime.toISOString(),
    description: 'Divide and ball dough'
  })
  currentTime = ballEndTime

  // Final proof
  const remainingTime = totalHours - steps.reduce((acc, step) => acc + step.duration, 0)
  if (remainingTime > 0) {
    const proofTemp = preferredTemp === 'mixed' ? 'cold' : preferredTemp
    steps.push({
      type: 'proof',
      temp: proofTemp,
      duration: remainingTime,
      startTime: currentTime.toISOString(),
      endTime: targetDate.toISOString(),
      description: `Final proof at ${proofTemp} temperature`
    })
  }

  return {
    startTime: startTime.toISOString(),
    steps,
    totalTime: totalHours
  }
} 