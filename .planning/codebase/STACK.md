# Technology Stack

**Analysis Date:** 2026-03-27

## Languages

**Primary:**
- JavaScript/TypeScript - Frontend and backend development

**Secondary:**
- YAML - Docker compose and configuration files

## Runtime

**Environment:**
- Node.js 24-alpine (as specified in `frontend/Dockerfile`)
- Docker containers for development isolation

**Package Manager:**
- npm
- Lockfile: Present (`package-lock.json`)

## Frameworks

**Core:**
- Hono (Backend framework) - API server on port 3000 (indicated by compose configuration)
- React (Frontend framework) - Development server on port 5173 (indicated by compose configuration)

**Build/Dev:**
- Docker & Docker Compose - Containerized development environment
- Vite - Frontend build tool (inferred from port 5173 in `compose.dev.yml`)

## Key Dependencies

**Critical:**
- node:24-alpine - Lightweight Node.js runtime for production containers
- Prisma (Prisma Studio on port 5555) - Database ORM/query builder indicated by compose configuration

## Configuration

**Environment:**
- `.env` file required (validated by `Makefile`)
- Configuration copied into Docker containers via volumes
- Basic example provided in `.env.example`

**Build:**
- `compose.dev.yml` - Docker Compose configuration for development
- `Dockerfile` (frontend) - Frontend container definition
- `Dockerfile` (backend) - Backend container definition (currently empty)
- `Makefile` - Development task automation

## Platform Requirements

**Development:**
- Docker and Docker Compose installed
- Node.js 24+ (for local development outside containers)
- Make (for running development commands)

**Production:**
- Docker container orchestration platform (Kubernetes, Docker Swarm, or similar)
- Node.js 24-alpine runtime compatibility

---

*Stack analysis: 2026-03-27*
