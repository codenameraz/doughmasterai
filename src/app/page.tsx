import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ChefHat, Clock, Thermometer, Sparkles, ArrowRight, Percent, Wheat, Utensils } from 'lucide-react'
import { NewsletterSubscribe } from "@/components/NewsletterSubscribe";

export default function Home() {
  return (
    <div className="flex flex-col space-y-6 md:space-y-8">
      {/* Hero Section */}
      <section className="relative py-6 md:py-10 overflow-hidden">
        <div className="hero-gradient absolute inset-0" />
        <div className="container px-4 sm:px-6 mx-auto">
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
            <span className="inline-block px-3 py-1 mb-3 text-xs rounded-full bg-primary/10 text-primary font-semibold">
              Professional Pizza Calculator
            </span>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80 mb-3">
              Master the Art of Pizza Dough
            </h1>
            <p className="text-sm md:text-base text-foreground max-w-xl mb-4">
              Create perfect pizza dough with precision. Our calculator helps you craft authentic Neapolitan, New York, or Detroit-style pizzas with professional results.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button size="default" asChild className="relative z-10">
                <Link href="/calculator">Start Creating</Link>
              </Button>
              <Button variant="outline" size="default" asChild className="relative z-10">
                <Link href="#features">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-6 md:py-10 relative bg-gradient-to-b from-background to-secondary/10">
        <div className="container px-4 sm:px-6 mx-auto">
          <h2 className="text-center text-xl md:text-2xl font-semibold tracking-tight mb-4">
            Craft Your Perfect Pizza
          </h2>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: ChefHat,
                title: "Regional Styles",
                description: "Choose from authentic Neapolitan, New York, Detroit, and more pizza styles."
              },
              {
                icon: Clock,
                title: "Fermentation Mastery",
                description: "Optimize your fermentation from quick same-day to 72-hour cold processes."
              },
              {
                icon: Thermometer,
                title: "Kitchen-Aware",
                description: "Recipes adapt to your environment—temperature, humidity, and altitude adjustments."
              },
              {
                icon: Sparkles,
                title: "Expert Guidance",
                description: "Get professional tips and techniques for authentic pizzeria-quality results."
              }
            ].map((feature, index) => (
              <Card key={index} className="p-3 hover:shadow-sm transition-shadow border-primary/10">
                <div className="flex gap-2 items-start">
                  <div className="h-7 w-7 p-1.5 rounded-md bg-primary/10 flex-shrink-0">
                    <feature.icon className="h-full w-full text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight mb-0.5">{feature.title}</h3>
                    <p className="text-xs text-foreground/80">{feature.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-6 md:py-10 relative overflow-hidden bg-accent/5">
        <div className="container px-4 sm:px-6 mx-auto">
          <h2 className="text-center text-xl md:text-2xl font-semibold tracking-tight mb-4">
            From Recipe to Reality
          </h2>
          
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
            {[
              {
                number: "01",
                title: "Choose Your Style",
                description: "Select from classic styles like Neapolitan or create your own custom blend with specialty flours."
              },
              {
                number: "02",
                title: "Set Your Schedule",
                description: "Plan your fermentation around your schedule—from quick same-day to flavor-rich long cold ferments."
              },
              {
                number: "03",
                title: "Get Expert Results",
                description: "Receive a precision-calculated recipe with pro tips, timing guides, and technique advice."
              }
            ].map((step, index) => (
              <Card key={index} className="p-3 hover:shadow-sm transition-shadow border-primary/10">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 flex-shrink-0 mt-0.5">
                    <span className="text-xs font-serif font-bold text-primary">{step.number}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight mb-0.5">{step.title}</h3>
                    <p className="text-xs text-foreground/80">{step.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
      
      {/* Testimonial Section */}
      <section className="py-6 md:py-10 bg-gradient-to-b from-secondary/30 to-background">
        <div className="container px-4 sm:px-6 mx-auto">
          <Card className="max-w-2xl mx-auto p-4 text-center relative overflow-hidden hover:shadow-sm transition-shadow border-primary/10">
            <div className="absolute top-2 left-2 text-3xl text-primary/20 font-serif">"</div>
            <div className="relative z-10 px-4">
              <p className="text-sm md:text-base font-serif italic text-foreground">
                After years of inconsistent results, this calculator transformed my pizza game. The precision and adaptability to my kitchen environment made all the difference.
              </p>
              <div className="mt-2 text-sm font-medium text-primary">
                Marco V. - Home Pizza Enthusiast
              </div>
            </div>
            <div className="absolute bottom-2 right-2 text-3xl text-primary/20 font-serif rotate-180">"</div>
          </Card>
        </div>
      </section>

      {/* Specialty Section */}
      <section className="py-6 md:py-10 relative bg-gradient-to-b from-background to-primary/5">
        <div className="container px-4 sm:px-6 mx-auto">
          <div className="grid md:grid-cols-2 gap-4 items-start">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold tracking-tight mb-3">
                What Makes Our Calculator Special
              </h2>
              <div className="space-y-2">
                {[
                  {
                    icon: Percent,
                    title: "Baker's Percentages",
                    description: "Professional formulas with accurate baker's percentages for perfect hydration."
                  },
                  {
                    icon: Wheat,
                    title: "Flour Blends",
                    description: "Customize your flour blends for the perfect texture and flavor profile."
                  },
                  {
                    icon: Utensils,
                    title: "Cook Time Adjustments",
                    description: "Temperature and cooking time recommendations based on your oven and style."
                  }
                ].map((feature, index) => (
                  <Card key={index} className="p-2 hover:shadow-sm transition-shadow border-primary/10">
                    <div className="flex gap-2">
                      <div className="flex-shrink-0 h-6 w-6 p-1 rounded-md bg-primary/10">
                        <feature.icon className="h-full w-full text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold">{feature.title}</h3>
                        <p className="text-xs text-foreground/80">{feature.description}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              
              <div className="mt-3">
                <Button asChild variant="link" className="group p-0">
                  <Link href="/calculator" className="inline-flex items-center text-primary text-sm font-medium">
                    Try the calculator <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>
            </div>
            
            <Card className="p-3 hover:shadow-sm transition-shadow border-primary/10">
              <h3 className="text-sm font-bold mb-2">Sample Neapolitan Recipe</h3>
              <div className="space-y-1 font-mono text-xs text-foreground/90">
                <div className="flex justify-between">
                  <span>Caputo 00 Flour</span>
                  <span>1000g (100%)</span>
                </div>
                <div className="flex justify-between">
                  <span>Water</span>
                  <span>650g (65%)</span>
                </div>
                <div className="flex justify-between">
                  <span>Salt</span>
                  <span>28g (2.8%)</span>
                </div>
                <div className="flex justify-between">
                  <span>Yeast</span>
                  <span>1g (0.1%)</span>
                </div>
                <div className="pt-1 border-t border-primary/10 mt-1">
                  <div className="flex justify-between">
                    <span>Bulk Fermentation</span>
                    <span>2 hours at room temp</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ball Fermentation</span>
                    <span>16-24 hours at 4°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Final Proof</span>
                    <span>2 hours at room temp</span>
                  </div>
                </div>
                <div className="pt-1 border-t border-primary/10 mt-1">
                  <div className="flex justify-between">
                    <span>Baking</span>
                    <span>90 seconds at 450°C</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-6 md:py-10 bg-gradient-to-b from-primary/5 to-accent/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,theme(colors.accent.DEFAULT/10),transparent_80%)]"></div>
        <div className="container px-4 sm:px-6 mx-auto relative text-center">
          <div className="max-w-md mx-auto">
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight mb-2">
              Ready to Make Perfect Pizza?
            </h2>
            <p className="text-sm md:text-base text-foreground mb-4">
              Join passionate pizza makers crafting exceptional artisanal pies at home. Your pizza journey starts here.
            </p>
            <Button asChild>
              <Link href="/calculator">Get Started Now</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
