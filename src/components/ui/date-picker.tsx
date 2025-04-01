'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'

interface DatePickerProps {
  date?: Date | null
  onChange: (date: Date | null) => void
}

export function DateTimePicker({ date, onChange }: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const handleSelect = React.useCallback(
    (selectedDate: Date | undefined) => {
      onChange(selectedDate || null)
      setIsOpen(false)
    },
    [onChange]
  )

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        className={cn(
          "w-full justify-start text-left font-normal",
          !date && "text-muted-foreground"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {date ? format(date, "PPp") : "Pick a date and time"}
      </Button>
      
      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 rounded-md border bg-popover shadow-md">
          <Calendar
            mode="single"
            selected={date || undefined}
            onSelect={handleSelect}
            initialFocus
          />
        </div>
      )}
    </div>
  )
} 