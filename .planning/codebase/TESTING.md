# Testing Patterns

**Analysis Date:** 2026-03-27

## Status

This codebase is in early skeleton stage. No test infrastructure or source code has been implemented yet. This document provides recommendations for establishing testing patterns as development begins.

## Recommended Test Framework

**Runner:**
- **Recommended:** Vitest (faster, excellent for TypeScript, modern ESM support)
- **Alternative:** Jest (mature, feature-complete, larger ecosystem)
- Config location: `vitest.config.ts` or `jest.config.js`

**Assertion Library:**
- **Recommended:** Vitest built-in `expect()` or `@testing-library/jest-dom`
- **Alternative:** `chai` for more expressive assertions

**Suggested package.json scripts:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:watch": "vitest --watch",
    "test:e2e": "cypress"
  }
}
```

## Test File Organization

**Location:**
- Co-located with source files in a `__tests__` subdirectory, OR
- Mirror structure in separate `tests/` directory at project root
- Recommended: Co-located for easier discovery and maintenance

**Naming:**
- Suffix pattern: `.test.ts` or `.spec.ts`
- Use consistent suffix across codebase (recommend `.test.ts`)
- Example: `user-service.ts` → `user-service.test.ts`

**Directory Structure:**
```
backend/
├── src/
│   ├── services/
│   │   ├── user-service.ts
│   │   ├── user-service.test.ts
│   │   └── auth-service.ts
│   │   └── auth-service.test.ts
│   └── utils/
│       ├── validators.ts
│       └── validators.test.ts
└── tests/
    ├── integration/
    │   ├── auth.integration.test.ts
    │   └── api.integration.test.ts
    └── e2e/
        └── user-flow.e2e.test.ts

frontend/
├── src/
│   ├── components/
│   │   ├── UserProfile.tsx
│   │   ├── UserProfile.test.tsx
│   │   └── LoginForm.tsx
│   │   └── LoginForm.test.tsx
│   └── hooks/
│       ├── useAuth.ts
│       └── useAuth.test.ts
```

## Test Structure

**Suite Organization Pattern:**
```typescript
// Example test file structure
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserService } from './user-service';

describe('UserService', () => {
  let service: UserService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = { query: vi.fn() };
    service = new UserService(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      // Arrange
      const userId = '123';
      const expectedUser = { id: userId, name: 'John' };
      mockDb.query.mockResolvedValue(expectedUser);

      // Act
      const result = await service.getUserById(userId);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(mockDb.query).toHaveBeenCalledWith(userId);
    });

    it('should throw NotFoundError when user not found', async () => {
      // Arrange
      mockDb.query.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getUserById('nonexistent')).rejects.toThrow('NotFoundError');
    });
  });

  describe('createUser', () => {
    it('should create user with valid data', async () => {
      const userData = { name: 'Jane', email: 'jane@example.com' };
      mockDb.query.mockResolvedValue({ id: '456', ...userData });

      const result = await service.createUser(userData);

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Jane');
    });
  });
});
```

**Patterns:**
- Use `describe()` blocks for logical groupings
- Organize by function/component, then by scenario
- Use "should/when" naming for clarity
- Follow AAA pattern: Arrange, Act, Assert
- Keep tests focused and independent
- Setup in `beforeEach()`, cleanup in `afterEach()`

## Mocking

**Framework:** Vitest has built-in mocking via `vi.mock()` and `vi.fn()`

**Patterns:**

```typescript
// Mock a module
vi.mock('../services/user-service', () => ({
  UserService: vi.fn().mockImplementation(() => ({
    getUser: vi.fn(),
    createUser: vi.fn(),
  })),
}));

// Mock functions
const mockFetch = vi.fn();
mockFetch.mockResolvedValue({ status: 200, json: () => ({ id: 1 }) });

// Mock with implementation
const mockDb = {
  query: vi.fn().mockImplementation((sql) => {
    if (sql.includes('SELECT')) {
      return Promise.resolve([{ id: 1 }]);
    }
    return Promise.reject(new Error('Invalid query'));
  }),
};
```

**What to Mock:**
- External services (API calls, databases)
- File system operations
- System time/dates (use `vi.useFakeTimers()`)
- Async operations for faster tests
- Complex dependencies to isolate unit under test

**What NOT to Mock:**
- The code under test itself
- Pure utility functions
- Simple synchronous operations
- Actual validation logic you're testing

## Fixtures and Factories

**Test Data Pattern:**

```typescript
// tests/fixtures/user.fixture.ts
export const createMockUser = (overrides?: Partial<User>): User => ({
  id: '123',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user',
  createdAt: new Date(),
  ...overrides,
});

export const createMockAdmin = (overrides?: Partial<User>): User =>
  createMockUser({ role: 'admin', ...overrides });

// Usage in tests
import { createMockUser } from '../fixtures/user.fixture';

it('should allow admin to delete users', () => {
  const admin = createMockAdmin();
  const user = createMockUser();
  // test logic
});
```

**Location:**
- `tests/fixtures/` for unit test data
- `tests/factories/` for complex object builders
- Keep alongside integration tests

## Coverage

**Requirements:** Recommend aiming for 70-80% coverage minimum

**View Coverage:**
```bash
npm run test:coverage

# Output to HTML report
npm run test:coverage -- --reporter=html
```

**Configure in package.json or vitest.config.ts:**
```json
{
  "vitest": {
    "coverage": {
      "provider": "v8",
      "reporter": ["text", "json", "html"],
      "exclude": [
        "node_modules/",
        "tests/",
        "**/*.d.ts",
        "**/*.config.ts"
      ],
      "lines": 70,
      "functions": 70,
      "branches": 70,
      "statements": 70
    }
  }
}
```

## Test Types

**Unit Tests:**
- Test individual functions/components in isolation
- Mock all external dependencies
- Fast execution, high coverage
- Examples: `user-service.test.ts`, `validators.test.ts`
- Location: Co-located with source files

**Integration Tests:**
- Test multiple components working together
- Use real database (test database) or in-memory database
- Test API endpoints with actual middleware
- Location: `tests/integration/`
- Examples: `auth.integration.test.ts`, `user-flow.integration.test.ts`
- Pattern:
  ```typescript
  describe('User Auth Flow', () => {
    beforeEach(async () => {
      await db.seed(); // Real test data
    });

    it('should register and login user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'password' });

      expect(response.status).toBe(201);
      expect(response.body.token).toBeDefined();
    });
  });
  ```

**E2E Tests:**
- Test complete user workflows via browser/API
- Recommended: Cypress or Playwright
- Location: `tests/e2e/`
- Run against deployed/running application
- Example: Full login → create post → share post workflow

## Common Patterns

**Async Testing:**
```typescript
// Proper async/await handling
it('should fetch user data', async () => {
  const user = await service.getUser('123');
  expect(user.id).toBe('123');
});

// Or return promise
it('should fetch user data', () => {
  return service.getUser('123').then((user) => {
    expect(user.id).toBe('123');
  });
});

// Error cases
it('should handle fetch errors', async () => {
  mockApi.mockRejectedValue(new Error('Network error'));
  await expect(service.getUser('123')).rejects.toThrow('Network error');
});
```

**Error Testing:**
```typescript
// Test specific error types
it('should throw ValidationError for invalid email', () => {
  expect(() => {
    validateEmail('not-an-email');
  }).toThrow(ValidationError);
});

// Test error messages
it('should provide helpful error message', () => {
  try {
    validateEmail('invalid');
  } catch (error) {
    expect(error.message).toContain('Invalid email format');
  }
});
```

**React Component Testing (with React Testing Library):**
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('should submit form with email and password', () => {
    const mockSubmit = vi.fn();
    render(<LoginForm onSubmit={mockSubmit} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(mockSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });
});
```

## Test Configuration

**Recommended vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom', // or 'node' for backend
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      lines: 70,
      functions: 70,
      branches: 70,
      statements: 70,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

## Running Tests

**Development:**
```bash
npm run test              # Run once
npm run test:watch       # Watch mode for TDD
npm run test -- --ui     # Interactive UI
```

**CI/CD Pipeline:**
```bash
npm run test:coverage    # Generate coverage report
# Can fail if coverage thresholds not met
```

---

*Testing analysis: 2026-03-27*
