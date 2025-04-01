import { config } from 'dotenv'

// Load environment variables from .env file
config()

// Environment variables validation
const requiredEnvVars = [
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
]

// Optional but expected for various auth providers
const authProviderEnvVars = {
  google: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  github: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'],
  email: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM'],
}

// Database configuration
const dbEnvVars = [
  'DATABASE_URL',
]

// Check required environment variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`⚠️ Required environment variable ${envVar} is missing.`)
  }
}

// Check database environment variables
for (const envVar of dbEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`⚠️ Database environment variable ${envVar} is missing.`)
  }
}

// Determine which auth providers we have configured
export const enabledAuthProviders = {
  google: authProviderEnvVars.google.every(envVar => !!process.env[envVar]),
  github: authProviderEnvVars.github.every(envVar => !!process.env[envVar]),
  email: true, // Always enable email in development
}

// Log which providers are enabled
if (process.env.NODE_ENV === 'development') {
  console.log('Enabled auth providers:', Object.entries(enabledAuthProviders)
    .filter(([, enabled]) => enabled)
    .map(([provider]) => provider)
  )
}

if (!Object.values(enabledAuthProviders).some(enabled => enabled)) {
  console.warn('⚠️ No authentication providers are fully configured. Authentication will not work.')
} 