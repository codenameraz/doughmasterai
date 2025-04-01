import { PIZZA_STYLES } from '@/lib/openai/config'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function StylesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 pt-24 pb-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Pizza Styles Guide
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Explore different pizza styles and learn about their unique characteristics, from classic Neapolitan to Detroit-style deep dish.
          </p>

          <div className="grid gap-6">
            {Object.entries(PIZZA_STYLES).map(([key, style]) => (
              <div 
                key={key}
                className="bg-white rounded-2xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md"
              >
                <div className="p-6 md:p-8 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold mb-2">{style.name}</h2>
                      <p className="text-gray-600">{style.description}</p>
                    </div>
                    <span className="text-3xl">🍕</span>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4 pt-4">
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-sm font-medium mb-1">Hydration</p>
                      <p className="text-2xl font-semibold text-blue-600">
                        {style.defaultHydration}%
                      </p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-sm font-medium mb-1">Salt</p>
                      <p className="text-2xl font-semibold text-blue-600">
                        {style.defaultSaltPercentage}%
                      </p>
                    </div>
                    {style.defaultOilPercentage && (
                      <div className="bg-blue-50 rounded-xl p-4">
                        <p className="text-sm font-medium mb-1">Oil</p>
                        <p className="text-2xl font-semibold text-blue-600">
                          {style.defaultOilPercentage}%
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 pt-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Room Fermentation</p>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-600">
                          {style.fermentationTime.room.min} - {style.fermentationTime.room.max} hours
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Cold Fermentation</p>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-600">
                          {style.fermentationTime.cold.min} - {style.fermentationTime.cold.max} hours
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <Link href={`/calculator?style=${key}`}>
                      <Button className="w-full bg-blue-600 hover:bg-blue-700">
                        Calculate Recipe
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 