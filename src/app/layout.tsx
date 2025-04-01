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
  title: "Pizzera - Professional Pizza Calculator",
  description: "Create perfect pizza dough with our professional calculator. Get precise measurements and expert guidance for Neapolitan, New York, Detroit, and more pizza styles.",
  keywords: ["pizza calculator", "pizza dough", "neapolitan pizza", "new york pizza", "detroit pizza", "dough hydration", "pizza recipe"],
  icons: {
    icon: '/favicon.ico',
  },
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