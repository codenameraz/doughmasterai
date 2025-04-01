import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { NewsletterSubscribe } from '@/components/NewsletterSubscribe'

export function Footer() {
  return (
    <footer className="border-t border-primary/10 bg-secondary/20">
      <div 
        className="absolute inset-0 bg-repeat opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23d1a97c' fill-opacity='0.4'%3E%3Cpath d='M0 0h10v10H0V0zm10 10h10v10H10V10z'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      ></div>
      
      <div className="container py-12 md:py-16 relative">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          <div className="md:col-span-4">
            <Logo size="lg" />
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              Craft exceptional pizza dough with our precision calculator. Authentic recipes customized to your style, schedule, and kitchen environment.
            </p>
          </div>
          
          <div className="md:col-span-2">
            <h4 className="font-serif text-base font-bold mb-4">Navigate</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-warm">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/calculator" className="text-sm text-muted-foreground hover:text-primary transition-warm">
                  Calculator
                </Link>
              </li>
              <li>
                <Link href="/recipes" className="text-sm text-muted-foreground hover:text-primary transition-warm">
                  Recipes
                </Link>
              </li>
              <li>
                <Link href="/guide" className="text-sm text-muted-foreground hover:text-primary transition-warm">
                  Guide
                </Link>
              </li>
            </ul>
          </div>
          
          <div className="md:col-span-2">
            <h4 className="font-serif text-base font-bold mb-4">Pizza Styles</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/styles/neapolitan" className="text-sm text-muted-foreground hover:text-primary transition-warm">
                  Neapolitan
                </Link>
              </li>
              <li>
                <Link href="/styles/new-york" className="text-sm text-muted-foreground hover:text-primary transition-warm">
                  New York
                </Link>
              </li>
              <li>
                <Link href="/styles/detroit" className="text-sm text-muted-foreground hover:text-primary transition-warm">
                  Detroit
                </Link>
              </li>
              <li>
                <Link href="/styles/sicilian" className="text-sm text-muted-foreground hover:text-primary transition-warm">
                  Sicilian
                </Link>
              </li>
            </ul>
          </div>
          
          <div className="md:col-span-4">
            <div className="rustic-card">
              <h4 className="font-serif text-base font-bold mb-2">Join the DoughMaster Community</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Subscribe for weekly pizza tips, new recipes, and seasonal specials.
              </p>
              <NewsletterSubscribe variant="rustic" />
            </div>
          </div>
        </div>
        
        <div className="mt-12 pt-6 border-t border-primary/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; 2024 DoughMaster.ai. Crafted with passion for pizza artisans.
          </p>
          <div className="flex gap-6">
            <Link href="/terms" className="text-xs text-muted-foreground hover:text-primary transition-warm">
              Terms
            </Link>
            <Link href="/privacy" className="text-xs text-muted-foreground hover:text-primary transition-warm">
              Privacy
            </Link>
            <Link href="/contact" className="text-xs text-muted-foreground hover:text-primary transition-warm">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
} 