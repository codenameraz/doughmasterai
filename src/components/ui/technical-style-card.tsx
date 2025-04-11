"use client"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface StyleSpecs {
  hydration: number
  salt: number
  temp: number
  time: number
  protein: number
}

interface TechnicalStyleCardProps {
  style: string
  specs: StyleSpecs
  description: string
  className?: string
}

export function TechnicalStyleCard({ style, specs, description, className }: TechnicalStyleCardProps) {
  return (
    <Card className={cn("p-6 relative overflow-hidden group", className)}>
      {/* Background Gradient Circle */}
      <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 bg-primary/5 rounded-full" />
      
      {/* Content */}
      <div className="relative">
        <h3 className="text-xl font-bold mb-4">{style}</h3>
        <p className="text-sm text-muted-foreground mb-6">{description}</p>

        {/* Specs Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Hydration Visualization */}
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Hydration</span>
              <span className="text-sm text-primary">{specs.hydration}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${specs.hydration}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Temperature */}
          <div className="space-y-1">
            <span className="text-sm font-medium">Temperature</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-primary">{Math.round(specs.temp * 9/5 + 32)}°F</span>
              <span className="text-sm text-muted-foreground">/ {specs.temp}°C</span>
            </div>
          </div>

          {/* Time */}
          <div className="space-y-1">
            <span className="text-sm font-medium">Bake Time</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-primary">{specs.time}</span>
              <span className="text-sm text-muted-foreground">min</span>
            </div>
          </div>

          {/* Protein Content */}
          <div className="col-span-2 pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Protein Content</span>
              <span className="text-sm text-primary">{specs.protein}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${(specs.protein / 14) * 100}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
} 