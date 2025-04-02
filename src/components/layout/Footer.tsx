import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { NewsletterSubscribe } from '@/components/NewsletterSubscribe'

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container flex flex-col items-center gap-4 py-10 md:h-24 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <Logo size="sm" />
        </div>
        <div className="flex flex-1 items-center justify-end">
          <nav className="flex items-center space-x-6">
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
              Terms
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  )
} 