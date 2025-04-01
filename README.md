# DoughMaster.ai - Professional Pizza Dough Calculator

![DoughMaster.ai Logo](public/logo.png)

## Overview

DoughMaster.ai is a powerful, precision pizza dough calculator designed for both home enthusiasts and professional pizzaiolos. It provides mathematically precise dough formulations based on baker's percentages while accounting for environmental factors, fermentation schedules, and regional pizza styles.

## Features

- **Regional Style Presets**: Authentic formulations for Neapolitan, New York, Detroit, Sicilian, and Roman Al Taglio styles
- **Adaptive Recipes**: Automatically adjusts for temperature, humidity, and altitude
- **Fermentation Optimization**: Controls for same-day to long cold fermentation (up to 72 hours)
- **Technical Analysis**: Detailed breakdowns of hydration, salt percentage, and enzyme activity
- **Timeline Generation**: Clear step-by-step instructions with timing guidance
- **Community**: Newsletter subscription for pizza tips, new recipes, and seasonal specials

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React with TypeScript
- **Styling**: Tailwind CSS
- **Component Library**: Shadcn UI (built on Radix UI primitives)
- **Icons**: Lucide React
- **Forms**: React Hook Form with Zod validation
- **State Management**: React hooks for local state

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **API Routes**: Next.js API routes with TypeScript
- **Email**: Newsletter subscription system with database storage

### DevOps
- **Hosting**: Vercel
- **Version Control**: Git/GitHub
- **Environment**: Node.js

## Architecture

The application follows a modern architecture leveraging Next.js App Router for server-side rendering and API routes:

- **Server Components**: Used for static content and data fetching
- **Client Components**: Used for interactive elements with state
- **API Routes**: Handle subscription and data processing
- **Database**: Stores newsletter subscriptions with proper RLS policies
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints

## Application Structure

```
/src
  /app                 # Next.js App Router
    /api               # API routes
      /subscribe       # Newsletter subscription endpoint
    /calculator        # Calculator page
    /layout.tsx        # Root layout with providers
    /page.tsx          # Homepage
  /components          # React components
    /layout            # Layout components (Header, Footer)
    /ui                # UI components from shadcn
    DoughCalculator.tsx # Main calculator component
    NewsletterSubscribe.tsx # Newsletter subscription component
  /hooks               # Custom React hooks
  /lib                 # Utility functions
/public                # Static assets
/supabase              # Supabase configuration and migrations
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/codenameraz/doughmasterai.git
cd doughmasterai
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
```
# Create a .env.local file with:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Database Schema

The application uses a Supabase PostgreSQL database with:

- `subscribers` table for newsletter subscriptions
  - Columns: id, email, subscribed_at, status, created_at
  - Row Level Security (RLS) policies for secure access

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by traditional pizza-making techniques from Italy
- Based on baker's percentage calculations
- Developed for pizza enthusiasts who want precision in their craft
