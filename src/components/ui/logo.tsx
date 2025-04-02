'use client'

import { cn } from '@/lib/utils'
import Link from 'next/link'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Logo({ className, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  }

  return (
    <Link 
      href="/" 
      className={cn(
        'flex items-center gap-3 group',
        className
      )}
    >
      <div className={cn("relative aspect-square", sizeClasses[size])}>
        {/* Base Shape - Pizza Peel */}
        <div 
          className="absolute inset-0 bg-amber-800 rounded-lg transition-all duration-300 group-hover:rotate-6"
          style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
        >
          {/* Circuit Board Pattern */}
          <div className="absolute inset-[15%] bg-amber-400 rounded-full overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-full relative">
                {/* Neural Connections */}
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1 p-1">
                  <div className="bg-amber-800/40 rounded-full" />
                  <div className="bg-amber-800/40 rounded-full" />
                  <div className="bg-amber-800/40 rounded-full" />
                  <div className="bg-amber-800/40 rounded-full" />
                </div>
                {/* Connection Lines */}
                <div className="absolute inset-0" 
                  style={{
                    background: `
                      linear-gradient(45deg, transparent 40%, rgba(146, 64, 14, 0.4) 40%, rgba(146, 64, 14, 0.4) 60%, transparent 60%),
                      linear-gradient(-45deg, transparent 40%, rgba(146, 64, 14, 0.4) 40%, rgba(146, 64, 14, 0.4) 60%, transparent 60%)
                    `
                  }}
                />
              </div>
            </div>
          </div>
          {/* Handle */}
          <div className="absolute bottom-0 left-1/2 w-[20%] h-[40%] -translate-x-1/2 bg-amber-900 rounded-b-sm" />
        </div>
      </div>
      <div className="flex flex-col">
        <div className="font-serif font-bold tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-800 to-amber-600">
            DoughMaster
          </span>
          <span className="font-mono font-normal text-foreground">.AI</span>
        </div>
        <span className="text-xs tracking-wider uppercase text-muted-foreground hidden md:block">
          Artisan Intelligence
        </span>
      </div>
    </Link>
  )
} 