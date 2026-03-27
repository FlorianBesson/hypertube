# External Integrations

**Analysis Date:** 2026-03-27

## APIs & External Services

**Note:** Codebase is in early scaffold stage with minimal external integrations detected.

## Data Storage

**Databases:**
- Relational Database (via Prisma ORM)
  - Client: Prisma
  - Connection: Configured via environment variables
  - Studio: Accessible on port 5555 (for development)

**File Storage:**
- Local filesystem
  - Location: `/app/src/uploads` (mounted in backend container via `compose.dev.yml`)
  - Purpose: User-generated uploads handling

**Caching:**
- Not detected

## Authentication & Identity

**Auth Provider:**
- Not detected

## Monitoring & Observability

**Error Tracking:**
- Not detected

**Logs:**
- Docker logs via compose (`docker compose logs`)

## CI/CD & Deployment

**Hosting:**
- Docker containers (development-ready)
- No production deployment configuration detected

**CI Pipeline:**
- Not detected

## Environment Configuration

**Required env vars:**
- `.env` file must be present (validated by Makefile `check-env` target)
- Example provided in `.env.example` with placeholder value `POKEMON=carapuce`
- Configuration shared with containers via volume mount in `compose.dev.yml`

**Secrets location:**
- `.env` file (local, not committed to git)

## Webhooks & Callbacks

**Incoming:**
- Not detected

**Outgoing:**
- Not detected

---

*Integration audit: 2026-03-27*
