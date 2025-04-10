// Import the main calculator component
import { DoughCalculator } from '@/components/DoughCalculator'
import { Suspense } from 'react'
// import { TestSelect } from '@/components/calculator/TestSelect'

export const metadata = {
  title: 'Pizza Dough Calculator',
  description: 'Calculate perfect pizza dough recipes with our advanced dough calculator.',
}

export default function CalculatorPage() {
  // No state needed here anymore

  return (
    <main className="container py-8">
      <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]">Loading calculator...</div>}>
        <DoughCalculator />
      </Suspense>
    </main>
  )
}
