// Restore original imports and remove test component import
import { DoughCalculator } from '@/components/DoughCalculator'
// import { TestSelect } from '@/components/calculator/TestSelect'

export const metadata = {
  title: 'Pizza Dough Calculator',
  description: 'Calculate perfect pizza dough recipes with our advanced dough calculator.',
}

export default function CalculatorPage() {
  // No state needed here anymore

  return (
    <main className="container py-8">
      <DoughCalculator />
    </main>
  )
}
