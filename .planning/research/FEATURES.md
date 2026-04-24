# Feature Landscape: Hypertube Auth & API Patterns

**Domain:** Authentication, RESTful API, Streaming Platform Backend
**Researched:** 2026-03-27
**Overall confidence:** HIGH (most claims verified against official docs or primary sources)

---

## 1. Hono JWT Authentication Patterns

### Session vs JWT — Recommendation for This Stack

**Use JWT with httpOnly refresh tokens in cookies.** Rationale:

- Hypertube is a React SPA + Hono API. Sessions require a shared session store (Redis or DB). JWT avoids this dependency.
- The "stateless" promise breaks down as soon as you need token revocation (e.g., logout). Accept this tradeoff: short-lived access tokens (15 min) + long-lived refresh tokens (7 days in httpOnly cookie) is the standard mitigation.
- Store the access token in memory (React state / Zustand), never in localStorage. Store the refresh token in an httpOnly, Secure, SameSite=Strict cookie.

**This pattern in Hono:**

```typescript
// Token pair shape
interface TokenPair {
  accessToken: string;   // 15 min expiry, returned in JSON body
  refreshToken: string;  // 7 day expiry, set as httpOnly cookie
}

// Sign with hono/jwt helper
import { sign, verify } from 'hono/jwt'

const accessToken = await sign(
  { sub: user.id, role: user.role, exp: Math.floor(Date.now() / 1000) + 900 },
  process.env.JWT_SECRET!,
  'HS256'
)

const refreshToken = await sign(
  { sub: user.id, exp: Math.floor(Date.now() / 1000) + 604800 },
  process.env.REFRESH_TOKEN_SECRET!,
  'HS256'
)

// Set refresh token as httpOnly cookie
setCookie(c, 'refresh_token', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'Strict',
  maxAge: 604800,
  path: '/auth/refresh'  // scope the cookie path — only send on refresh endpoint
})
```

### Hono JWT Middleware

```typescript
import { jwt } from 'hono/jwt'
import type { JwtVariables } from 'hono/jwt'

type Variables = JwtVariables

const app = new Hono<{ Variables: Variables }>()

// Protect routes
app.use('/api/*', jwt({ secret: process.env.JWT_SECRET!, alg: 'HS256' }))

// Access payload downstream
app.get('/api/me', (c) => {
  const payload = c.get('jwtPayload')
  return c.json({ userId: payload.sub })
})
```

**Critical Hono difference vs Express:** The `jwt()` middleware from `hono/jwt` is NOT the same as `express-jwt`. It verifies the token and puts the payload in `c.get('jwtPayload')`, not `req.user`. Express tutorials will mislead you here.

**Dynamic secret (env vars):** The middleware accepts a function for the secret if you need runtime env access:

```typescript
app.use('/api/*', (c, next) => {
  return jwt({ secret: c.env.JWT_SECRET })(c, next)
})
```

This is the correct pattern when using `c.env` (Cloudflare Workers style) or when the secret comes from middleware-resolved config.

### Refresh Token Flow

```
POST /auth/refresh
  ← reads refresh_token httpOnly cookie
  ← verifies refresh token signature + expiry
  ← issues new access token in JSON body
  ← optionally rotates refresh token (recommended: rotate on use)
```

**Rotation on use:** On each refresh, invalidate the old refresh token and issue a new one. This requires storing a whitelist of valid refresh token IDs (jti claim) in PostgreSQL. This is the minimum viable revocation strategy.

```typescript
// Prisma schema addition
model RefreshToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique  // SHA-256 of the raw token
  expiresAt DateTime
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}
```

**Sources:**
- [Hono JWT Middleware](https://hono.dev/docs/middleware/builtin/jwt)
- [Hono JWT Helper](https://hono.dev/docs/helpers/jwt)

---

## 2. OAuth2 with Hono — 42 + GitHub

### Recommended Library: Arctic

**Use `arctic` (pilcrowonpaper/arctic).** It is:
- Framework-agnostic (built on Fetch API, no Node.js-specific API)
- Runtime-agnostic (Node.js 20+, Bun, Deno, Cloudflare Workers)
- Fully typed TypeScript
- Has a built-in **42 School provider** with the exact API endpoints already wired
- Has a built-in **GitHub provider**
- Authorization code flow only (which is exactly what OAuth client login needs)

**DO NOT use Passport.js with Hono.** Passport was designed for Express's `req`/`res`/`next` middleware pattern. Hono uses Web Standards (`Request`/`Response`). There is a community `hono-passport-oauth2` wrapper but it is unmaintained and adds unnecessary complexity.

**DO NOT use `@hono/oauth-providers`.** It only supports Google, GitHub, Facebook, LinkedIn. No 42 provider. Less flexible than Arctic.

### Installation

```bash
npm install arctic
```

### 42 School OAuth Flow

```typescript
import { FortyTwo, generateState, OAuth2RequestError, ArcticFetchError } from 'arctic'

const fortyTwo = new FortyTwo(
  process.env.FORTYTWO_CLIENT_ID!,
  process.env.FORTYTWO_CLIENT_SECRET!,
  process.env.FORTYTWO_REDIRECT_URI!  // e.g. http://localhost:3000/auth/42/callback
)

// Step 1: Initiate — redirect user to 42
app.get('/auth/42', (c) => {
  const state = generateState()
  const url = fortyTwo.createAuthorizationURL(state, ['public'])

  setCookie(c, 'oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 600,
    path: '/'
  })

  return c.redirect(url.toString())
})

// Step 2: Callback — exchange code for token, fetch user
app.get('/auth/42/callback', async (c) => {
  const { code, state } = c.req.query()
  const storedState = getCookie(c, 'oauth_state')

  if (!code || !state || state !== storedState) {
    return c.json({ error: 'Invalid state' }, 400)
  }

  try {
    const tokens = await fortyTwo.validateAuthorizationCode(code)
    const accessToken = tokens.accessToken()

    // Fetch user info from 42 API
    const response = await fetch('https://api.intra.42.fr/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    const fortyTwoUser = await response.json() as {
      id: number
      login: string
      email: string
      image: { link: string }
      displayname: string
    }

    // Upsert user in database
    const user = await prisma.user.upsert({
      where: { fortyTwoId: String(fortyTwoUser.id) },
      update: { email: fortyTwoUser.email },
      create: {
        fortyTwoId: String(fortyTwoUser.id),
        username: fortyTwoUser.login,
        email: fortyTwoUser.email,
        avatarUrl: fortyTwoUser.image.link,
        provider: 'fortytwo'
      }
    })

    // Issue JWT pair and redirect
    const { accessToken: jwt } = await issueTokenPair(c, user.id)
    return c.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${jwt}`)
  } catch (e) {
    if (e instanceof OAuth2RequestError) {
      return c.json({ error: 'OAuth error', details: e.message }, 400)
    }
    if (e instanceof ArcticFetchError) {
      return c.json({ error: 'Network error contacting 42 API' }, 502)
    }
    throw e
  }
})
```

**42 API user info shape (key fields from `/v2/me`):**
- `id` — numeric, stable identifier
- `login` — intra username (e.g. `jdoe`)
- `email` — school email
- `displayname` — full name
- `image.link` — profile picture URL
- `campus[0].name` — campus

### GitHub OAuth Flow

```typescript
import { GitHub, generateState } from 'arctic'

const github = new GitHub(
  process.env.GITHUB_CLIENT_ID!,
  process.env.GITHUB_CLIENT_SECRET!,
  process.env.GITHUB_REDIRECT_URI!
)

// Authorization URL
app.get('/auth/github', (c) => {
  const state = generateState()
  const url = github.createAuthorizationURL(state, ['user:email'])
  // ... set state cookie, redirect
})

// Callback
app.get('/auth/github/callback', async (c) => {
  const tokens = await github.validateAuthorizationCode(code)
  const accessToken = tokens.accessToken()

  // Get user profile
  const userRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'hypertube' }
  })
  const githubUser = await userRes.json()

  // GitHub may return null email if private — fetch /user/emails
  if (!githubUser.email) {
    const emailRes = await fetch('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'hypertube' }
    })
    const emails = await emailRes.json()
    githubUser.email = emails.find((e: any) => e.primary)?.email
  }
})
```

### OAuth State Cookie — Hono Gotcha

**Hono does not automatically import `getCookie`/`setCookie` from a cookie helper with `jwt()` middleware.** You must import from `hono/cookie`:

```typescript
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
```

This is NOT automatic — Express middleware often handles cookies for you through `cookie-parser`. In Hono you manage cookies explicitly.

### Protecting OAuth Users from Password Reset

OAuth-registered users have no password hash. Your password reset endpoint must check the `provider` field and return a meaningful error:

```typescript
if (user.provider !== 'local') {
  return c.json({ error: 'This account uses OAuth login. Password reset is not available.' }, 400)
}
```

**Sources:**
- [Arctic library — 42 School provider](https://arcticjs.dev/providers/42)
- [Arctic library — GitHub provider](https://arcticjs.dev/providers/github)
- [42 API web application flow](https://api.intra.42.fr/apidoc/guides/web_application_flow)

---

## 3. Password Reset Flow

### Recommended Approach: Crypto Token (not JWT)

Use `crypto.randomBytes(32)` for reset tokens, NOT JWT. Reasons:
- JWT reset tokens are invalidated by changing the secret key or by using the old password as the secret — both are fragile patterns.
- A random token stored (hashed) in the DB is simpler, more explicit, and trivially revocable.

### Implementation Pattern

```typescript
import crypto from 'crypto'

// Generate token
const rawToken = crypto.randomBytes(32).toString('hex')  // 64-char hex string
const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')

// Store hashed token + expiry in DB
await prisma.user.update({
  where: { email },
  data: {
    passwordResetToken: hashedToken,
    passwordResetExpiresAt: new Date(Date.now() + 10 * 60 * 1000)  // 10 minutes
  }
})

// Send raw token in email URL
const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}&email=${email}`
```

### Email with Nodemailer

```typescript
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,  // true for 465, false for 587 (STARTTLS)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

await transporter.sendMail({
  from: `"Hypertube" <noreply@hypertube.io>`,
  to: email,
  subject: 'Reset your password',
  html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. Link expires in 10 minutes.</p>`
})
```

**For 42 school projects (no real SMTP):** Use [Mailpit](https://github.com/axllent/mailpit) (Docker local SMTP catcher) or [Mailtrap](https://mailtrap.io) (free tier) for development. Both work as SMTP servers that catch emails rather than sending them.

### Token Verification Endpoint

```typescript
app.post('/auth/reset-password', async (c) => {
  const { token, email, newPassword } = await c.req.json()

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

  const user = await prisma.user.findFirst({
    where: {
      email,
      passwordResetToken: hashedToken,
      passwordResetExpiresAt: { gt: new Date() }  // not expired
    }
  })

  if (!user) {
    return c.json({ error: 'Invalid or expired reset token' }, 400)
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)

  // One-time use: clear token fields on use
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiresAt: null
    }
  })

  return c.json({ message: 'Password updated' })
})
```

### Prisma Schema

```prisma
model User {
  // ...existing fields...
  passwordResetToken     String?   @unique
  passwordResetExpiresAt DateTime?
}
```

### Security Requirements

1. **Do not reveal if email exists.** Always return `200 OK` on `POST /auth/forgot-password`, even if the email is not in the DB. Return "If that email exists, you'll receive a link shortly."
2. **Rate limit the forgot-password endpoint.** Use `@hono-rate-limiter/redis` or a simple in-memory limiter.
3. **Hash stored token.** Never store the raw token — SHA-256 is sufficient (not bcrypt; tokens are random, not passwords).
4. **10-minute expiry** is the standard. Do not exceed 1 hour.

**Sources:**
- [LogRocket — Secure password reset in Node.js](https://blog.logrocket.com/implementing-secure-password-reset-node-js/)
- [Prisma + PostgreSQL reset password guide](https://codevoweb.com/crud-api-node-prisma-postgresql-reset-password/)

---

## 4. OAuth2 Server (Issuing Tokens to API Consumers)

### What the Hypertube Subject Likely Requires

The 42 Hypertube subject specifies "RESTful API with OAuth2 authentication." In most interpretations of this subject, this means your API accepts OAuth2 Bearer tokens from consumers — not that you build a full OAuth2 authorization server. The simplest compliant implementation is:

**Interpretation A (most common):** Your API is protected by OAuth2 Bearer tokens that you issue. Consumers obtain tokens via `POST /oauth/token` with `client_credentials` grant. This is an M2M (machine-to-machine) token endpoint.

**Interpretation B (full AS):** You implement a complete authorization server with authorization codes, consent pages, etc. This is rarely required in student projects.

### Recommended Solution: Better Auth OAuth2.1 Provider Plugin

**Use Better Auth's `oauthProvider` plugin.** It is the only production-grade, Hono-compatible, Prisma-aware OAuth2 server implementation available in 2025. It:
- Runs entirely inside your Hono app
- Uses your Prisma adapter for storage
- Provides `POST /oauth2/token` with `client_credentials`, `authorization_code`, and `refresh_token` grants
- Is RFC 7662 (introspection) and RFC 7009 (revocation) compliant

**NOTE:** The endpoint is `/oauth2/token` not `/oauth/token` by default. Verify with the subject or use a Hono alias route.

```typescript
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { jwt as jwtPlugin } from 'better-auth/plugins'
import { oauthProvider } from '@better-auth/oauth-provider'

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  plugins: [
    jwtPlugin(),
    oauthProvider({
      loginPage: '/login',
      consentPage: '/consent'
    })
  ]
})

// In Hono
app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw))
```

Run migrations: `npx @better-auth/cli migrate`

### Alternative: Manual Client Credentials Endpoint

If Better Auth is overkill or the subject strictly requires a specific endpoint path, implement a minimal client credentials endpoint manually:

```typescript
// Registered API clients in DB
model ApiClient {
  id           String @id @default(cuid())
  clientId     String @unique
  clientSecret String  // bcrypt hashed
  name         String
  scopes       String[]
}

app.post('/oauth/token', async (c) => {
  const body = await c.req.parseBody()
  const grantType = body['grant_type']
  const clientId = body['client_id'] as string
  const clientSecret = body['client_secret'] as string

  if (grantType !== 'client_credentials') {
    return c.json({ error: 'unsupported_grant_type' }, 400)
  }

  const client = await prisma.apiClient.findUnique({ where: { clientId } })
  if (!client || !(await bcrypt.compare(clientSecret, client.clientSecret))) {
    return c.json({ error: 'invalid_client' }, 401)
  }

  const token = await sign(
    {
      sub: client.clientId,
      scope: client.scopes.join(' '),
      exp: Math.floor(Date.now() / 1000) + 3600
    },
    process.env.JWT_SECRET!,
    'HS256'
  )

  return c.json({
    access_token: token,
    token_type: 'Bearer',
    expires_in: 3600
  })
})
```

**Accept-content-type gotcha:** The OAuth2 spec says the token endpoint MUST accept `application/x-www-form-urlencoded`. `c.req.parseBody()` handles this. Do NOT use `c.req.json()` here — OAuth clients send form data, not JSON.

**Sources:**
- [Better Auth OAuth2.1 Provider plugin](https://better-auth.com/docs/plugins/oauth-provider)
- [Better Auth Hono integration](https://better-auth.com/docs/integrations/hono)
- [node-oauth2-server (for reference — requires Express wrapper)](https://github.com/node-oauth/node-oauth2-server)

---

## 5. Infinite Scroll Pattern

### Cursor vs Offset — Recommendation

**Use cursor-based pagination.** For Hypertube's movie list (potentially thousands of results), cursor pagination maintains constant `O(log n)` query time regardless of page depth. Offset pagination degrades — at 200+ results, PostgreSQL must scan all preceding rows.

**Offset is acceptable only if:** total result set is small and bounded (under 500 rows), or if users need direct page jumps. Neither applies to a streaming catalogue.

### Backend: Prisma Cursor Pagination

```typescript
app.get('/api/movies', async (c) => {
  const { cursor, limit = '20', q } = c.req.query()
  const take = Math.min(parseInt(limit), 50)  // cap max page size

  const movies = await prisma.movie.findMany({
    take: take + 1,  // fetch one extra to determine hasNextPage
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    where: q ? { title: { contains: q, mode: 'insensitive' } } : undefined,
    orderBy: { createdAt: 'desc' }
  })

  const hasNextPage = movies.length > take
  const items = hasNextPage ? movies.slice(0, take) : movies
  const nextCursor = hasNextPage ? items[items.length - 1].id : null

  return c.json({ items, nextCursor, hasNextPage })
})
```

**Prisma cursor gotcha:** The cursor must be a `@unique` or `@id` field. You cannot cursor on a non-unique field. If you need to cursor on `createdAt`, combine with `id` as a compound cursor or use the `id` alone with `orderBy: id`.

### Frontend: IntersectionObserver Pattern (React)

```tsx
import { useRef, useCallback, useEffect, useState } from 'react'

function useInfiniteScroll<T>(fetchFn: (cursor?: string) => Promise<{ items: T[], nextCursor: string | null }>) {
  const [items, setItems] = useState<T[]>([])
  const [nextCursor, setNextCursor] = useState<string | null | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const loadMore = useCallback(async () => {
    if (isLoading || nextCursor === null) return
    setIsLoading(true)
    try {
      const data = await fetchFn(nextCursor ?? undefined)
      setItems(prev => [...prev, ...data.items])
      setNextCursor(data.nextCursor)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, nextCursor, fetchFn])

  // Sentinel ref — attach to the last element or a bottom div
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading) return
    if (observerRef.current) observerRef.current.disconnect()
    if (!node) return

    observerRef.current = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadMore()
    }, { rootMargin: '200px' })  // trigger 200px before element is visible

    observerRef.current.observe(node)
  }, [isLoading, loadMore])

  // Initial load
  useEffect(() => { loadMore() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  return { items, sentinelRef, isLoading, hasMore: nextCursor !== null }
}

// Usage
function MovieGrid() {
  const { items, sentinelRef, isLoading, hasMore } = useInfiniteScroll(fetchMovies)
  return (
    <div>
      {items.map(movie => <MovieCard key={movie.id} movie={movie} />)}
      {hasMore && <div ref={sentinelRef} />}
      {isLoading && <Spinner />}
    </div>
  )
}
```

**Key implementation details:**
- `rootMargin: '200px'` starts loading before the user reaches the bottom (prefetch behavior).
- Initial `nextCursor === undefined` (not loaded yet) vs `nextCursor === null` (last page) must be distinguished. Use `undefined` as "not yet loaded" sentinel.
- Disconnect and reconnect the observer when `isLoading` changes to avoid duplicate requests.

**React Query / TanStack Query alternative:** If using TanStack Query, use `useInfiniteQuery` with `getNextPageParam`. It handles loading states, error retries, and deduplication automatically. This is the production-recommended approach.

```tsx
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: ['movies', searchQuery],
  queryFn: ({ pageParam }) => fetchMovies(pageParam),
  getNextPageParam: (lastPage) => lastPage.nextCursor,
  initialPageParam: undefined
})
```

**Sources:**
- [Prisma pagination docs](https://www.prisma.io/docs/orm/prisma-client/queries/pagination)
- [LogRocket — React infinite scroll](https://blog.logrocket.com/react-infinite-scroll/)
- [Cursor pagination deep dive](https://www.milanjovanovic.tech/blog/understanding-cursor-pagination-and-why-its-so-fast-deep-dive)

---

## 6. Hono + Prisma Patterns

### Type-Safe Context Injection

The core pattern is to define a `Variables` type and pass it as a generic to `Hono<>`. Middleware then sets typed values on `c`.

```typescript
// src/types.ts
import type { PrismaClient } from '@prisma/client'
import type { User } from '@prisma/client'

export type AppVariables = {
  prisma: PrismaClient
  user?: User
}

export type AppEnv = {
  Variables: AppVariables
}

// src/app.ts
import { Hono } from 'hono'
import type { AppEnv } from './types'

export const app = new Hono<AppEnv>()
```

### Prisma Middleware (Singleton Pattern)

```typescript
// src/middleware/prisma.ts
import { createMiddleware } from 'hono/factory'
import { PrismaClient } from '@prisma/client'
import type { AppEnv } from '../types'

// Single instance for the process lifetime — CRITICAL for Node.js long-lived servers
const prismaClient = new PrismaClient()

export const prismaMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  c.set('prisma', prismaClient)
  await next()
})
```

**NEVER instantiate `new PrismaClient()` inside a request handler.** Each instantiation opens a new connection pool. For Node.js (long-lived process), create one instance at module load time and reuse it. This is different from serverless (Cloudflare Workers) where per-request instantiation with a connection pooler like Prisma Accelerate is standard.

### Auth Middleware (User Injection)

```typescript
// src/middleware/auth.ts
import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'
import type { AppEnv } from '../types'

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const token = authHeader.slice(7)
  try {
    const payload = await verify(token, process.env.JWT_SECRET!, 'HS256')
    const prisma = c.get('prisma')
    const user = await prisma.user.findUnique({ where: { id: payload.sub as string } })
    if (!user) return c.json({ error: 'User not found' }, 401)
    c.set('user', user)
    await next()
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})
```

### Route Organization with Hono Router

```typescript
// src/routes/movies.ts
import { Hono } from 'hono'
import type { AppEnv } from '../types'

const movies = new Hono<AppEnv>()

movies.get('/', async (c) => {
  const prisma = c.get('prisma')
  // c.get('prisma') is fully typed here — no `as PrismaClient` cast needed
})

export { movies }

// src/app.ts
app.use('*', prismaMiddleware)
app.use('/api/*', authMiddleware)
app.route('/api/movies', movies)
```

**Hono gotcha — `createMiddleware` vs inline function:** Always use `createMiddleware<AppEnv>()` for middleware that sets context variables. Inline arrow functions lose the generic type information and TypeScript will not infer `c.get('prisma')` correctly.

**Sources:**
- [Prisma + Hono official guide](https://www.prisma.io/docs/guides/hono)
- [Hono middleware guide](https://hono.dev/docs/guides/middleware)

---

## 7. File Upload Security (Profile Pictures)

### Why Multer Does NOT Work with Hono

Multer is an Express-specific middleware that mutates `req.file` and `req.files`. Hono does not use Node.js `IncomingMessage` — it uses the Web Standard `Request`. Multer cannot be adapted to Hono without an Express compatibility shim, which negates Hono's performance advantages.

**Use Hono's native `c.req.parseBody()` instead.**

### Full Secure Upload Pattern

```typescript
import { bodyLimit } from 'hono/body-limit'
import { fileTypeFromBuffer } from 'file-type'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_FILE_SIZE = 5 * 1024 * 1024  // 5MB

app.post(
  '/api/user/avatar',
  bodyLimit({
    maxSize: MAX_FILE_SIZE,
    onError: (c) => c.json({ error: 'File too large (max 5MB)' }, 413)
  }),
  authMiddleware,
  async (c) => {
    const body = await c.req.parseBody()
    const file = body['avatar']

    if (!(file instanceof File)) {
      return c.json({ error: 'No file provided' }, 400)
    }

    // Check size again (bodyLimit handles this, but be explicit)
    if (file.size > MAX_FILE_SIZE) {
      return c.json({ error: 'File too large' }, 400)
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // CRITICAL: Detect REAL MIME type from magic bytes — NOT from file.type
    // file.type is client-supplied and trivially spoofed
    const detectedType = await fileTypeFromBuffer(buffer)
    if (!detectedType || !ALLOWED_MIME_TYPES.includes(detectedType.mime)) {
      return c.json({ error: 'Invalid file type. Only JPEG, PNG, WebP, GIF allowed.' }, 422)
    }

    // Generate a safe filename — never use the original filename
    const ext = detectedType.ext
    const safeFilename = `${crypto.randomUUID()}.${ext}`
    const uploadPath = path.join(process.env.UPLOAD_DIR!, safeFilename)

    // Write to disk
    await fs.promises.writeFile(uploadPath, buffer)

    // Optionally resize with sharp
    // await sharp(buffer).resize(200, 200, { fit: 'cover' }).toFile(uploadPath)

    const user = c.get('user')
    await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: `/uploads/${safeFilename}` }
    })

    return c.json({ avatarUrl: `/uploads/${safeFilename}` })
  }
)
```

### Storage Strategy for 42 School Projects

**Use local disk storage.** Cloud storage (S3, Cloudflare R2) requires paid API keys and is overkill for a school project. For a containerized setup:

```yaml
# compose.dev.yml addition
volumes:
  - ./uploads:/app/uploads
```

Serve files via Hono's static middleware:

```typescript
import { serveStatic } from '@hono/node-server/serve-static'

app.use('/uploads/*', serveStatic({ root: './' }))
```

**Security: uploads directory must be outside the web root** if serving user files. In the above pattern, `./uploads` is explicitly mapped. Do NOT store uploads inside `./src` or `./public` where they could be mistaken for application code.

### Required npm Packages

```bash
npm install file-type sharp
npm install -D @types/node
```

**`file-type` is ESM-only** as of v19+. If your project uses CommonJS (`require()`), pin to `file-type@18`:

```bash
npm install file-type@18
```

If using Node.js 24 with `"type": "module"` in package.json, the latest version works fine.

### Key Security Checklist

- [ ] Detect MIME from magic bytes (`file-type`), NOT from `Content-Type` header or `file.type`
- [ ] Enforce size limit with `bodyLimit` middleware before reading the file
- [ ] Generate random UUIDs for filenames — never trust user-provided filenames
- [ ] Store uploads outside the source tree
- [ ] Validate file count (only one avatar at a time)
- [ ] Consider resizing with `sharp` to prevent storing arbitrarily large decoded images

**Sources:**
- [Hono file upload docs](https://hono.dev/examples/file-upload)
- [Hono bodyLimit middleware](https://hono.dev/docs/middleware/builtin/body-limit)
- [file-type npm](https://www.npmjs.com/package/file-type)
- [File type validation in Multer is NOT SAFE (security article)](https://dev.to/ayanabilothman/file-type-validation-in-multer-is-not-safe-3h8l)

---

## 8. i18n in React

### Recommendation: react-i18next

**Use `react-i18next` + `i18next`.** It is the most widely deployed React i18n solution, has excellent TypeScript support, and integrates trivially with Vite. For a 42 school project with 2-3 languages, it is not overengineered.

**LinguiJS** is technically superior for large-scale apps (compile-time extraction, smaller bundles) but requires a build step and has more configuration overhead. Not worth it for this project.

### Installation

```bash
npm install react-i18next i18next i18next-browser-languagedetector
```

`i18next-browser-languagedetector` auto-detects user language from browser settings (`navigator.language`), localStorage, or URL parameters.

### Minimal Setup (Vite + TypeScript)

```typescript
// src/i18n/index.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import fr from './locales/fr.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr }
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr'],
    interpolation: { escapeValue: false },  // React already escapes XSS
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  })

export default i18n
```

```typescript
// src/main.tsx
import './i18n'  // Initialize before React renders
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
)
```

### TypeScript Autocompletion for Translation Keys

```typescript
// src/i18n/types.d.ts
import 'i18next'
import type en from './locales/en.json'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: { translation: typeof en }
  }
}
```

This provides full type-checking on `t('key.nested.path')` — typos in translation keys become compile errors.

### Usage in Components

```tsx
import { useTranslation } from 'react-i18next'

function Header() {
  const { t, i18n } = useTranslation()
  return (
    <header>
      <h1>{t('app.title')}</h1>
      <button onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'fr' : 'en')}>
        {t('ui.switchLanguage')}
      </button>
    </header>
  )
}
```

### Locale File Structure

```json
// src/i18n/locales/en.json
{
  "app": { "title": "Hypertube" },
  "auth": {
    "login": "Log in",
    "logout": "Log out",
    "forgotPassword": "Forgot password?",
    "resetPassword": "Reset password"
  },
  "ui": {
    "switchLanguage": "Français",
    "loading": "Loading...",
    "noResults": "No results found"
  },
  "errors": {
    "invalidCredentials": "Invalid email or password",
    "tokenExpired": "Session expired. Please log in again."
  }
}
```

### Persisting Language Preference Server-Side

Store the user's language preference in the DB and sync it on login:

```prisma
model User {
  preferredLanguage String @default("en")
}
```

On login response, return `preferredLanguage` and call `i18n.changeLanguage(user.preferredLanguage)` client-side.

**Bundle size note:** `react-i18next` (7.1 kB gz) + `i18next` (15.1 kB gz) = ~22 kB total. For a project of this scale this is acceptable. Use lazy-loaded namespace chunks if the translation files grow large.

**Sources:**
- [react-i18next quick start](https://react.i18next.com/guides/quick-start.md)
- [i18next TypeScript docs](https://www.i18next.com/overview/typescript)

---

## Summary: Hono-Specific Patterns vs Express Tutorials

This section is a quick reference for the most common places Express tutorials will lead you wrong when building with Hono.

| Topic | Express Tutorial Says | Hono Reality |
|---|---|---|
| **JWT payload** | `req.user` or `req.auth` | `c.get('jwtPayload')` via `hono/jwt` |
| **Cookies** | `cookie-parser` middleware (automatic) | `import { getCookie, setCookie } from 'hono/cookie'` (explicit) |
| **File upload** | `multer` middleware | `c.req.parseBody()` natively; multer does NOT work |
| **Body parsing** | `express.json()` middleware | Built-in: `c.req.json()`, `c.req.text()`, `c.req.parseBody()` |
| **Middleware typing** | Mutate `req` with interface extension | `Hono<{ Variables: T }>` generics + `createMiddleware<T>()` |
| **Static files** | `express.static()` | `import { serveStatic } from '@hono/node-server/serve-static'` |
| **OAuth2** | Passport.js strategies | Arctic (framework-agnostic, Web Standards-based) |
| **Auth library** | Passport + strategies | Better Auth (Hono-native, Prisma adapter) |
| **CORS** | `cors` npm package | `import { cors } from 'hono/cors'` (built-in) |
| **Error handling** | `next(error)` | `app.onError((err, c) => ...)` |
| **Env variables** | `process.env.X` directly | Also `process.env.X` in Node.js; `c.env.X` only on edge runtimes |

---

## Anti-Features (Explicitly Avoid)

| Anti-Feature | Why Avoid | Alternative |
|---|---|---|
| Passport.js with Hono | Passport is Express-only; adapters are unmaintained | Arctic for OAuth client; Better Auth for full auth |
| Multer with Hono | Mutates Express `req` object; incompatible | `c.req.parseBody()` + `file-type` |
| Storing JWT in localStorage | XSS trivially steals tokens | Memory (React state) + httpOnly cookie for refresh |
| JWT for password reset tokens | Fragile invalidation logic | `crypto.randomBytes()` + DB-stored hash |
| Offset pagination for catalogues | O(n) scan performance at depth | Cursor pagination with Prisma |
| `new PrismaClient()` per request | Exhausts connection pool instantly | Module-level singleton |
| Trusting `Content-Type` for file validation | Client-supplied, trivially spoofed | `file-type` magic byte detection |
| Storing user filenames | Path traversal and XSS risks | `crypto.randomUUID()` generated names |
