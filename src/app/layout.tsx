import { Inter as FontSans } from "next/font/google"
import localFont from "next/font/local"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import "./globals.css"
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/toaster";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-inter",
})

// Problematic font 'fontHeading' completely removed.

export const metadata = {
  title: "DoughMaster.ai - Professional Pizza Calculator",
  description: "Create perfect pizza dough with our professional calculator. Get precise measurements and expert guidance for Neapolitan, New York, Detroit, and more pizza styles.",
  keywords: ["pizza calculator", "pizza dough", "neapolitan pizza", "new york pizza", "detroit pizza", "dough hydration", "pizza recipe"],
  icons: [
    {
      rel: 'icon',
      url: 'data:image/png;base64,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'
    },
    { rel: 'icon', url: '/favicon.svg', type: 'image/svg+xml' },
    { rel: 'icon', url: '/favicon.ico' },
    { rel: 'icon', type: 'image/png', sizes: '32x32', url: '/favicon-32x32.png' },
    { rel: 'icon', type: 'image/png', sizes: '16x16', url: '/favicon-16x16.png' },
    { rel: 'apple-touch-icon', sizes: '180x180', url: '/apple-touch-icon.png' },
  ],
  manifest: '/site.webmanifest',
  authors: [
    { name: "DoughMaster.ai Team" }
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://doughmaster.ai",
    title: "DoughMaster.ai - Artisanal Pizza Dough Calculator",
    description: "Craft exceptional pizza dough with our precision calculator. Get professional results at home.",
    siteName: "DoughMaster.ai",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased",
        fontSans.variable
        // fontHeading usage completely removed
      )}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Header /> {/* Restore Header */}
          {/* Restore original main tag with padding for sticky header */}
          <main className="flex-1 pt-16">
            {children}
          </main>
          <Footer /> {/* Restore Footer */}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}