"use client"

import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface OptimizedImageProps extends React.ComponentProps<typeof Image> {
  fallbackClassName?: string;
}

export function OptimizedImage({
  alt,
  className,
  fallbackClassName,
  onError,
  ...props
}: OptimizedImageProps) {
  const [error, setError] = useState(false)

  if (error) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          fallbackClassName || className
        )}
        title={alt}
      >
        <span className="text-2xl">🍕</span>
      </div>
    )
  }

  return (
    <Image
      alt={alt}
      className={className}
      onError={(e) => {
        setError(true)
        onError?.(e)
      }}
      {...props}
    />
  )
} 