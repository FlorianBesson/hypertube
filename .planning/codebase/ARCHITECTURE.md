# Architecture

**Analysis Date:** 2026-03-27

## Pattern Overview

**Overall:** Monorepo with decoupled frontend and backend services using containerized development environment.

**Key Characteristics:**
- Separate frontend and backend application containers
- Containerized development workflow via Docker Compose
- Frontend-backend API communication (backend on port 3000, frontend on port 5173)
- Database abstraction via Prisma ORM
- File upload handling on backend

## Layers

**Frontend Layer:**
- Purpose: React-based user interface
- Location: `frontend/`
- Contains: React application code, components, views
- Depends on: Vite (build tool), React framework, backend API (via HTTP)
- Used by: End users (browser)
- Port: 5173 (development)

**Backend Layer:**
- Purpose: REST/HTTP API server for frontend consumption
- Location: `backend/`
- Contains: Hono application code, route handlers, business logic
- Depends on: Hono framework, Prisma ORM, Node.js runtime
- Used by: Frontend application, external clients
- Port: 3000 (development)

**Data Access Layer:**
- Purpose: Database abstraction and query building
- Tool: Prisma ORM
- Manages: Database connections, schema migrations, query generation
- Connected via: Environment-configured database connection string

**Storage Layer:**
- Purpose: File upload and asset storage
- Location: `/app/src/uploads` (mounted volume in backend container)
- Handles: User-generated content persistence
- Access: Direct filesystem operations from backend

## Data Flow

**Frontend → Backend → Database:**

1. User interaction triggers frontend action
2. Frontend makes HTTP request to backend API (port 3000)
3. Backend receives request via Hono router
4. Backend queries database through Prisma ORM
5. Backend returns JSON response to frontend
6. Frontend updates state and re-renders UI

**File Upload Flow:**

1. User selects file in frontend
2. Frontend sends multipart/form-data to backend
3. Backend receives upload at designated endpoint
4. Backend writes file to `/app/src/uploads` directory
5. Backend stores file reference in database via Prisma
6. Frontend receives response with file metadata/URL

## Key Abstractions

**API Handler Pattern:**
- Purpose: Encapsulate HTTP endpoint logic
- Framework: Hono provides decorator and middleware patterns
- Pattern: Route handler functions receive request context and return responses
- Location: Expected in `backend/src/routes/` or similar

**ORM Abstraction:**
- Purpose: Database operations without raw SQL
- Tool: Prisma Client
- Pattern: Type-safe queries via generated Prisma schema
- Location: Database schema defined in `prisma/schema.prisma` (standard Prisma convention)

**React Component Architecture:**
- Purpose: Reusable UI elements
- Framework: React functional components with hooks
- Pattern: Component composition, state management via hooks or context
- Location: Expected in `frontend/src/components/`

## Entry Points

**Frontend Entry Point:**
- Location: Expected at `frontend/src/main.tsx` or `frontend/src/index.tsx`
- Triggers: Application startup via `npm run dev`
- Responsibilities: React root mounting, router setup, global state initialization
- Container: Exposed on port 5173 via Docker volume mount

**Backend Entry Point:**
- Location: Expected at `backend/src/index.ts` or `backend/src/server.ts`
- Triggers: Application startup via `npm run dev` (Dockerfile CMD)
- Responsibilities: Hono app initialization, route registration, database connection
- Container: Exposed on port 3000 via Docker volume mount
- Database Studio: Prisma Studio available on port 5555 for schema inspection

**Development Orchestration:**
- Location: `compose.dev.yml`
- Triggers: `make dev` command from `Makefile`
- Responsibilities: Container lifecycle management, volume mounting, port exposure

## Error Handling

**Strategy:** Presumed to follow framework defaults pending implementation

**Expected Patterns:**
- Frontend: Try-catch in async operations, error boundaries for React component failures
- Backend: Hono error middleware for exception handling, HTTP status codes for error responses
- Database: Prisma error handling for connection failures and constraint violations

## Cross-Cutting Concerns

**Logging:** Docker container logs accessible via `docker compose logs` command. Pending structured logging implementation.

**Validation:**
- Frontend: Form validation expected in React components before API calls
- Backend: Input validation via Hono middleware or route handlers

**Authentication:** Not yet implemented. No auth provider detected in current scaffold.

**Environment Configuration:** Centralized via `.env` file, volume-mounted into containers for both frontend and backend access.

**Database Migrations:** Prisma migration files expected at `prisma/migrations/` (standard Prisma convention). Studio on port 5555 allows inspection of schema state.

---

*Architecture analysis: 2026-03-27*
