# Files and Directories to Clean Up Before GitHub Push

## Unused Components and Files
1. `src/components/calculator/TestSelect.tsx` - Test component not used anywhere
2. `src/components/calculator/DoughCalculator.tsx` - Duplicate of the main DoughCalculator component
3. `src/components/.NewsletterSubscribe.tsx.swp` - Vim swap file

## Unused API Routes
1. `src/app/api/models/route.ts` - OpenAI models API not used in the app

## Unused Authentication Files
1. `src/app/auth/` - Auth callback routes not actively used
2. `src/app/login/page.tsx` - Login page not integrated with the rest of the app

## Unused or Duplicate Utility Files
1. `src/lib/rate-limit.ts` - Not used in the app, only in tests
2. Either `src/lib/rateLimiter.ts` or `src/lib/rate-limit.ts` (keep one, not both)

## Temporary Files to Remove
1. `.DS_Store` files (in root and src/ directory)
2. `src/__tests__/auth.test.tsx` - Auth tests for unused auth functionality

## Configuration
1. Add the following patterns to `.gitignore`:
   ```
   # OS files
   .DS_Store
   
   # Editor files
   *.swp
   *.swo
   *~
   
   # Local environment
   .env.local
   .env.development.local
   .env.test.local
   .env.production.local
   ```

## Optional Cleanup
1. Consider removing or updating `src/app/styles/page.tsx` if it's not linked from the main navigation
2. Consider simplifying the OpenAI configuration if the recipe-adjust API is the only place it's used

## General Recommendations
1. Run `npm prune` to remove unused dependencies
2. Check for any other temporary files with `find . -name "*.tmp" -o -name "*~" | grep -v node_modules`
3. Consider using ESLint and Prettier before pushing to ensure code quality 