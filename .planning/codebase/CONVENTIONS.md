# Coding Conventions

**Analysis Date:** 2026-03-27

## Status

This codebase is in early skeleton stage. No source code has been implemented yet. This document provides guidance for establishing conventions as development begins.

## Recommended Naming Patterns

**Files:**
- Use lowercase with hyphens for multi-word filenames: `user-service.ts`, `api-routes.ts`
- React components: PascalCase in separate files: `UserProfile.tsx`, `LoginForm.tsx`
- Utility modules: descriptive lowercase names: `db-config.ts`, `auth-utils.ts`

**Functions:**
- Use camelCase for all function names: `getUserById()`, `validateEmail()`, `fetchUserData()`
- Async functions should have clear async naming patterns: `fetchUsers()`, `loadConfig()`

**Variables:**
- Use camelCase for variables and constants
- Constants in UPPER_SNAKE_CASE only for truly immutable values: `API_KEY`, `MAX_RETRIES`
- Boolean variables prefixed with `is` or `has`: `isLoading`, `hasError`, `isAuthenticated`

**Types:**
- Interface/Type names in PascalCase: `User`, `ApiResponse`, `AuthContext`
- Type files: `types.ts` or `{domain}.types.ts` pattern

## Code Style

**Formatting:**
- Recommended: Prettier for automatic formatting
- Consider configuring in `.prettierrc` or `package.json` with:
  - 2-space indentation
  - Single quotes for strings
  - Semicolons required
  - 80-100 character line length

**Linting:**
- Recommended: ESLint with TypeScript support
- Suggested config: `.eslintrc.json` or `eslint.config.js`
- Consider using `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin`
- Base configurations recommended: `eslint:recommended` + TypeScript strict rules

## Import Organization

**Order:**
1. External packages (node modules, npm packages)
2. Absolute imports from project root (if using path aliases)
3. Relative imports from parent/sibling directories
4. Type imports (separate lines with `type` keyword)

**Path Aliases:**
- Consider setting up in `tsconfig.json` for cleaner imports
- Suggested aliases:
  - `@/` → source root
  - `@components/` → components directory
  - `@utils/` → utilities directory
  - `@types/` → types directory

**Example:**
```typescript
import express from 'express';
import { Prisma } from '@prisma/client';

import { config } from '@/config';
import { authMiddleware } from '@/middleware';

import { logger } from '../utils/logger';
import type { User } from './types';
```

## Error Handling

**Patterns:**
- Create custom error classes extending `Error`:
  ```typescript
  class ValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ValidationError';
    }
  }
  ```
- Use try-catch blocks for async operations
- Provide meaningful error messages for debugging
- Distinguish between user-facing and debug errors

## Logging

**Framework:** Recommended - `winston`, `pino`, or similar structured logging library

**Patterns:**
- Use appropriate log levels: `error`, `warn`, `info`, `debug`
- Log at function entry for debugging complex flows
- Log errors with full stack traces
- Avoid logging sensitive data (passwords, tokens, PII)
- Include context information (request IDs, user IDs) for traceability

**Example:**
```typescript
logger.info('User login attempt', { userId: user.id, timestamp: new Date() });
logger.error('Database connection failed', { error: err.message });
```

## Comments

**When to Comment:**
- Complex business logic that isn't immediately obvious
- Non-obvious algorithm choices or optimizations
- Workarounds or temporary fixes (include issue/ticket reference)
- Public API documentation (via JSDoc)

**JSDoc/TSDoc:**
- Document all exported functions with JSDoc blocks
- Include `@param`, `@returns`, `@throws` tags
- Add `@deprecated` for removed features
- Example:
  ```typescript
  /**
   * Fetches a user by ID from the database.
   * @param userId - The user's unique identifier
   * @returns Promise resolving to User object
   * @throws {NotFoundError} If user doesn't exist
   */
  async function getUserById(userId: string): Promise<User> {
    // implementation
  }
  ```

## Function Design

**Size:** Keep functions under 30 lines when possible. Break complex logic into smaller, testable units.

**Parameters:**
- Limit to 3-4 positional parameters
- Use object parameters for functions with many options:
  ```typescript
  function createUser(options: { email: string; name: string; role?: string }): User {
    // implementation
  }
  ```

**Return Values:**
- Be consistent: always return the same type
- For optional returns, use `T | null` or `T | undefined` (prefer null for absence)
- Return early to reduce nesting

## Module Design

**Exports:**
- Use named exports for multiple items
- Use default export sparingly (mainly for components in React)
- Group related exports together

**Barrel Files:**
- Create `index.ts` in directories for cleaner imports
- Example structure:
  ```typescript
  // src/middleware/index.ts
  export { authMiddleware } from './auth';
  export { errorHandler } from './error-handler';
  ```

## TypeScript Specific

**Strict Mode:** Enable `strict: true` in `tsconfig.json`

**Type Annotations:**
- Explicitly type function parameters and returns
- Use generics for reusable components/functions
- Avoid `any` type; use `unknown` with type guards instead

**Example:**
```typescript
function processData<T>(data: T[]): T[] {
  return data.filter(Boolean);
}
```

---

*Convention analysis: 2026-03-27*
