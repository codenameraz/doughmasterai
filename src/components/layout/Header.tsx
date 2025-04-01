'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'

export function Header() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname === path
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
      <div className="container flex h-16 items-center">
        <div className="mr-8 flex">
          <Link href="/" className="group flex items-center space-x-2 transition-warm hover:opacity-90">
            <Logo />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/calculator"
              className={`nav-link ${isActive('/calculator') ? 'active' : ''}`}
            >
              Calculator
            </Link>
          </nav>
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 p-0 hover:bg-secondary"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="border-l border-primary/10">
              <VisuallyHidden.Root>
                <SheetTitle>Mobile Navigation Menu</SheetTitle>
                <SheetDescription>
                  Contains links to navigate the website, including Home and Calculator.
                </SheetDescription>
              </VisuallyHidden.Root>
              <div className="flex flex-col h-full">
                <div className="py-6">
                  <Logo size="lg" />
                </div>
                <nav className="flex flex-col space-y-6">
                  <Link
                    href="/"
                    className={`nav-link text-lg ${isActive('/') ? 'active' : ''}`}
                  >
                    Home
                  </Link>
                  <Link
                    href="/calculator"
                    className={`nav-link text-lg ${isActive('/calculator') ? 'active' : ''}`}
                  >
                    Calculator
                  </Link>
                </nav>
                <div className="mt-auto pt-6 border-t border-primary/10">
                  <p className="text-sm text-muted-foreground">
                    &copy; 2024 DoughMaster.ai
                  </p>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}