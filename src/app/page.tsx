import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ChefHat, ArrowRight } from 'lucide-react'
import { TechnicalVisualization } from '@/components/ui/technical-visualization'
import { Badge } from '@/components/ui/badge'

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section - Modern Scientific */}
      <section className="relative pb-16 pt-10 lg:pt-16 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
        <div className="container max-w-6xl relative z-10 px-4 sm:px-6">
          {/* Badge */}
          <div className="mb-12 flex justify-center lg:justify-start">
            <Badge variant="outline" className="px-4 py-1.5 border-primary/20 bg-primary/5 text-primary rounded-full text-sm font-medium">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-primary animate-pulse"></span>
              Professional Pizza Dough Calculator
            </Badge>
          </div>
          
          <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-center">
            {/* Left Content - 3 columns on large screens */}
            <div className="lg:col-span-2 flex flex-col text-center lg:text-left order-2 lg:order-1">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
                Master the <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/80">science</span> of perfect pizza dough
              </h1>
              
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
                Create authentic pizza styles with precision. Our AI calculator adapts recipes to your kitchen environment for professional results every time.
              </p>
              
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start mb-8">
                <Button size="lg" asChild className="rounded-full px-8 shadow-lg">
                  <Link href="/calculator">Start Calculating</Link>
                </Button>
                <Button variant="outline" size="lg" asChild className="rounded-full px-6 border-primary/20 text-foreground hover:bg-primary/5">
                  <Link href="#styles">Explore Styles</Link>
                </Button>
              </div>

              {/* Minimal Stats Row */}
              <div className="grid grid-cols-2 gap-8">
                <div className="text-center lg:text-left">
                  <div className="text-2xl font-bold text-foreground">10,000+</div>
                  <div className="text-sm text-muted-foreground">Pizza Makers</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-2xl font-bold text-foreground">50+</div>
                  <div className="text-sm text-muted-foreground">Countries</div>
                </div>
              </div>
            </div>

            {/* Right Column - Technical Cards - larger area */}
            <div className="relative lg:col-span-3 order-1 lg:order-2">
              <div className="relative z-10 p-2 bg-gradient-to-br from-muted/10 to-transparent rounded-xl">
                <TechnicalVisualization />
              </div>
              <div className="absolute -inset-4 bg-gradient-to-br from-background via-background to-background/0 blur-xl -z-0" />
            </div>
          </div>
        </div>
      </section>

      {/* Divider with Subtle Animation */}
      <div className="relative h-px w-full bg-gradient-to-r from-transparent via-border to-transparent my-8">
        <div className="absolute h-8 w-8 rounded-full bg-primary/10 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="absolute inset-1 rounded-full bg-gradient-to-r from-primary/30 to-primary/10 animate-pulse" />
        </div>
      </div>

      {/* Style Showcase - Minimalist Cards */}
      <section id="styles" className="py-20 bg-muted/10">
        <div className="container max-w-6xl px-4 sm:px-6">
          <div className="max-w-xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Master Any Style</h2>
            <p className="text-lg text-muted-foreground">
              Each style has unique scientific characteristics that our algorithm precisely calculates.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                style: "Neapolitan",
                href: "/calculator?style=neapolitan",
                description: "The original pizza from Naples with a thin center and airy, charred crust.",
                specs: {
                  hydration: 60,
                  protein: 12.5,
                  temp: 450
                },
                icon: "🇮🇹"
              },
              {
                style: "New York",
                href: "/calculator?style=new-york",
                description: "Large, foldable slices with crispy exterior and chewy interior.",
                specs: {
                  hydration: 62,
                  protein: 12.7,
                  temp: 290
                },
                icon: "🗽"
              },
              {
                style: "Detroit",
                href: "/calculator?style=detroit",
                description: "Square pan pizza with thick, airy crust and crispy cheese edges.",
                specs: {
                  hydration: 65,
                  protein: 13.5,
                  temp: 250
                },
                icon: "🏙️"
              }
            ].map((style, index) => (
              <Link 
                key={index}
                href={style.href}
                className="group"
              >
                <Card className="h-full p-6 hover:shadow-lg transition-all duration-300 border-primary/5 hover:border-primary/20 overflow-hidden relative">
                  <div className="flex items-center mb-4">
                    <span className="text-2xl mr-3">{style.icon}</span>
                    <h3 className="text-xl font-bold">{style.style}</h3>
                  </div>
                  <p className="text-muted-foreground text-sm mb-5">{style.description}</p>
                  
                  <div className="space-y-3">
                    {Object.entries(style.specs).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground capitalize">{key}</span>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {typeof value === 'number' && key === 'temp' 
                            ? `${value}°C` 
                            : typeof value === 'number' && (key === 'hydration' || key === 'protein')
                              ? `${value}%` 
                              : value}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-5 pt-4 border-t border-border">
                    <div className="flex items-center justify-between text-primary group-hover:text-primary/80">
                      <span className="text-sm font-medium">Try This Style</span>
                      <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                  
                  <div className="absolute top-0 right-0 h-32 w-32 bg-gradient-to-br from-primary/5 to-transparent rounded-full -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial - Minimalist Design */}
      <section className="py-20">
        <div className="container max-w-4xl px-4 sm:px-6">
          <Card className="mx-auto p-8 relative border-none shadow-sm bg-gradient-to-b from-background to-muted/5">
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 rounded-full bg-primary/10 p-2">
                <ChefHat className="h-6 w-6 text-primary" />
              </div>
              <p className="text-lg font-medium text-foreground mb-6 max-w-xl">
                "After years of inconsistent results, this calculator transformed my pizza game. The precision and adaptability to my kitchen environment made all the difference."
              </p>
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">MV</span>
                </div>
                <div className="text-left">
                  <div className="font-medium">Marco Veratti</div>
                  <div className="text-xs text-muted-foreground">Home Pizza Enthusiast</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA Section - Clean and Minimal */}
      <section className="py-20 bg-muted/10">
        <div className="container max-w-4xl px-4 sm:px-6 text-center">
          <div className="max-w-xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">Start Your Pizza Journey</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of pizza makers creating exceptional artisanal pies at home with precise calculations.
            </p>
            <Button size="lg" asChild className="rounded-full px-8 shadow-lg">
              <Link href="/calculator">Get Started Now</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
