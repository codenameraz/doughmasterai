'use client'

import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Logo({ className, size = 'md' }: LogoProps) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("relative", sizes[size])}>
        {/* Pizza Peel Base with Wood Texture */}
        <div
          className="absolute inset-0 rounded-full transition-transform duration-300 group-hover:rotate-12"
          style={{ 
            backgroundColor: "hsl(28 60% 40%)",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
          }}
        >
          <div className="h-full w-full overflow-hidden rounded-full">
            {/* Wood grain texture */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                background:
                  "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 3px, transparent 3px, transparent 5px, rgba(0,0,0,0.1) 5px, rgba(0,0,0,0.1) 6px)",
              }}
            ></div>
          </div>
        </div>

        {/* Pizza Slice */}
        <div
          className="absolute left-[15%] top-[15%] h-[40%] w-[40%] rounded-tl-full"
          style={{ 
            backgroundColor: "hsl(35 80% 70%)",
            boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.1)"
          }}
        >
          {/* Crust texture */}
          <div 
            className="absolute bottom-0 right-0 h-[20%] w-full rounded-tr-full"
            style={{ backgroundColor: "hsl(28 70% 60% / 0.7)" }}
          ></div>
        </div>

        {/* Tomato Sauce Base */}
        <div
          className="absolute left-[17%] top-[17%] h-[35%] w-[35%] rounded-tl-full opacity-70"
          style={{ backgroundColor: "hsl(var(--primary) / 0.7)" }}
        ></div>

        {/* Toppings */}
        <div
          className="absolute left-[25%] top-[20%] h-[10%] w-[10%] rounded-full"
          style={{ 
            backgroundColor: "hsl(80 50% 30%)",
            boxShadow: "inset 0 1px 1px rgba(0,0,0,0.3)"
          }}
        ></div>
        <div
          className="absolute left-[20%] top-[30%] h-[8%] w-[8%] rounded-full"
          style={{ 
            backgroundColor: "hsl(0 80% 40%)",
            boxShadow: "inset 0 1px 1px rgba(0,0,0,0.3)"
          }}
        ></div>
        <div
          className="absolute left-[30%] top-[25%] h-[6%] w-[6%] rounded-full"
          style={{ 
            backgroundColor: "hsl(40 90% 90%)",
            boxShadow: "inset 0 1px 1px rgba(0,0,0,0.1)"
          }}
        ></div>

        {/* Handle */}
        <div
          className="absolute bottom-0 left-1/2 h-[45%] w-[12%] -translate-x-1/2"
          style={{ 
            backgroundColor: "hsl(28 60% 30%)",
            boxShadow: "0 1px 1px rgba(0,0,0,0.3)"
          }}
        ></div>
      </div>
      <div className="flex flex-col">
        <span className="font-serif text-xl font-bold tracking-tight" 
              style={{ color: "hsl(var(--primary))" }}>
          DoughMaster
          <span className="text-lg font-mono font-normal" 
                style={{ color: "hsl(var(--foreground))" }}>.ai</span>
        </span>
        <span className="text-xs tracking-wider uppercase" 
              style={{ color: "hsl(var(--muted-foreground))" }}>
          Artisanal Pizza Calculator
        </span>
      </div>
    </div>
  )
} 