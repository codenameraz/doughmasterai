/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'localhost:3001'],
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://mnnjxpgyqjsamelbmfow.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ubmp4cGd5cWpzYW1lbGJtZm93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwODI4OTUsImV4cCI6MjA1ODY1ODg5NX0.LdNWw3xc5_09r-ikPAG58VP_L2rPOBfTC_hfD6tb9Io',
  },
}

module.exports = nextConfig 