# Research: Simple Todo App

**Phase**: 0 — Outline & Research  
**Date**: 2026-03-09 (revised — monorepo: pnpm + Turborepo)  
**Branch**: `001-todo-app`

---

## 0. Monorepo Tooling

**Decision**: pnpm 9 workspaces + Turborepo 2  
**Rationale**: pnpm is the most efficient package manager for monorepos — its content-addressable store means shared dependencies are stored once on disk (benchmarks show ~70% smaller `node_modules` vs npm). The `workspace:*` protocol for internal package references ensures that workspace packages are always resolved locally rather than from the registry. Turborepo 2 adds task caching and parallelization on top: it hashes all inputs (source files, env vars, lockfile) and caches task outputs, skipping re-work on unchanged packages. This combination is the most widely adopted full-stack TypeScript monorepo setup in 2025–2026.

**Workspace layout**:
- `apps/` — deployable applications (`backend`, `frontend`); each has its own `package.json` and build pipeline
- `packages/` — internal shared libraries not deployed independently; referenced by apps via `workspace:*`
- Root `package.json` — dev tooling only (turbo, typescript, eslint config); no runtime dependencies

**Shared packages in v1**:
- `@todo-app/types` — single source of truth for TypeScript types shared between backend and frontend (`User`, `Todo`, `AuthResponse`, input types). Eliminates the per-app `types/index.ts` files and prevents type drift.

**Why not a shared validators package?**: The Zod schemas serve slightly different purposes on each side (backend schemas include `.transform()` for sanitization; frontend schemas are for form validation). Sharing them would require abstraction that adds complexity without clear benefit. Types-only sharing is the right v1 boundary.

**Turborepo pipeline highlights**:
- `build` depends on `^build` — `@todo-app/types` is always built before its consumers
- `dev` is persistent with `cache: false` — dev servers run continuously, never cached
- `test` depends on `^build` — tests run against the compiled types package

**Alternatives considered**:
- **Nx**: More feature-rich (project graph, generators, affected commands), but heavier to configure for a two-app project; better fit when 5+ packages are present
- **pnpm workspaces alone (no Turborepo)**: Simpler setup, but loses task caching and parallelization; acceptable for v1 but Turborepo's overhead is minimal and the caching benefit justifies it
- **Yarn workspaces + Turborepo**: Viable, but pnpm's strict dependency isolation catches phantom dependency bugs that Yarn (hoisting) misses
- **npm workspaces**: Workspaces support has improved but pnpm's disk efficiency and strictness make it the better default

---

## 1. Backend Runtime & Framework

**Decision**: Node.js 20 LTS + Fastify 5  
**Rationale**: Fastify 5 is the current stable release and the highest-throughput Node.js web framework available (benchmarks consistently show 2–3× higher req/s than Express for JSON-heavy APIs). More importantly for this project, Fastify has first-class TypeScript support with full generic inference on route schemas, and its plugin system (`fastify.register`) makes isolating concerns like Prisma, JWT, and CORS clean and testable. Fastify 5 also provides native `async`/`await` support with automatic error propagation — errors thrown inside `async` route handlers are automatically caught and forwarded to the error handler.  
**Alternatives considered**:
- Express 5: Familiar, but slower and TypeScript support requires manual augmentation. Switched to Fastify per user request.
- Hono: Excellent for edge/serverless, but native Prisma integration is more complex; overkill without an edge deployment target
- NestJS: Full framework with DI container; too much boilerplate for a deliberately minimal v1

---

## 2. Database

**Decision**: PostgreSQL 16  
**Rationale**: PostgreSQL is the most widely deployed open-source relational database. The Todo + User schema has clear relational structure (a Todo belongs to a User via foreign key), and PostgreSQL's ACID guarantees ensure the data consistency and durability requirements in the spec (FR-016). It supports future additions like deadlines (timestamps), tags (JSONB or many-to-many), and full-text search without a schema redesign.  
**Alternatives considered**:
- MongoDB: Was the original choice in the prior plan; switched to PostgreSQL per user request. MongoDB's document model loses the referential integrity benefits needed when isolating todos per user.
- SQLite: Fine for local development, but not suitable for a production deployment with concurrent users; would require a driver swap later
- MySQL: Solid choice but PostgreSQL has better JSON support, more advanced indexing, and stronger open-source community momentum in 2026

---

## 3. ORM / Query Layer

**Decision**: Prisma 5  
**Rationale**: Prisma provides a schema-first workflow — you define `schema.prisma`, run `prisma migrate dev`, and get a fully type-safe client with auto-completion for every query. The generated `PrismaClient` types are tightly coupled to the actual schema, so TypeScript errors are caught at compile time if a query references a non-existent field. Prisma Studio (a GUI for the database) is a free bonus for development inspection.

**Key Prisma practices**:
- Instantiate `PrismaClient` once as a Fastify plugin decoration (`fastify.prisma`) to avoid connection pool exhaustion
- Use `.select()` to limit returned fields (never return `password` hash to the client)
- Use `prisma.$transaction()` for any multi-step operations that must succeed atomically  

**Alternatives considered**:
- Drizzle: User explicitly chose Prisma. Note: Drizzle is a strong alternative with SQL-like syntax and no codegen step — worth considering for v2 if migration performance becomes a concern
- raw `pg` (node-postgres): Maximum control but requires manual type management; not justified when Prisma's type safety is the primary benefit

---

## 4. Authentication Strategy

**Decision**: JWT access tokens via `@fastify/jwt` v10 + `bcryptjs` for password hashing  

**JWT details**:
- Plugin: `@fastify/jwt` v10 — the official Fastify JWT plugin using `fast-jwt` internally (significantly faster than the legacy `jsonwebtoken` package)
- Token lifetime: 15 minutes (short-lived, access-only — no refresh token per user choice)
- Payload: `{ sub: userId, email }` — minimal claims
- Storage on client: `localStorage` (accepts the simplicity/security trade-off for a personal app; a production-grade app should use httpOnly cookies)
- Signing secret: loaded from `JWT_SECRET` environment variable (minimum 32 characters)

**Password hashing**:
- `bcryptjs` (pure JavaScript, no native bindings required, simpler setup)
- Salt rounds: 10 (OWASP minimum recommendation; balances security and registration latency)
- Never store or return the password hash in any API response — enforced via Prisma `.select()` exclusion

**Auth flow**:
1. Register: validate input → check email not taken → hash password → create User → sign token → return `{ token, user }`
2. Login: validate input → find User by email → compare hashed password → sign token → return `{ token, user }`
3. Protected routes: `onRequest: [fastify.authenticate]` hook calls `request.jwtVerify()` → attaches decoded payload to `request.user`

**Alternatives considered**:
- Argon2 (`@node-rs/argon2`): Faster and more memory-hard than bcrypt; however, requires native bindings which add build complexity. Good upgrade path for v2.
- Passport.js: Unnecessary middleware layer when `@fastify/jwt` covers the use case directly
- `@fastify/auth`: Useful for composing multiple auth strategies (e.g., JWT + API key); overkill for a single JWT strategy

---

## 5. Input Validation

**Decision**: Zod with `@fastify/type-provider-zod`  
**Rationale**: `@fastify/type-provider-zod` bridges Zod schemas into Fastify's native type provider, giving full TypeScript inference on `request.body`, `request.params`, and `request.query` directly from the schema definition. A single Zod schema validates the input AND provides the TypeScript type — no duplication.

**Example**:
```typescript
const createTodoSchema = z.object({
  text: z.string().trim().min(1).max(500),
});
type CreateTodoInput = z.infer<typeof createTodoSchema>; // TypeScript type derived automatically
```

**Alternatives considered**:
- Fastify's native JSON Schema validation (TypeBox): Performant and built-in, but less ergonomic than Zod for TypeScript-first development; Zod's `.transform()` and `.refine()` are more expressive

---

## 6. Frontend Framework & Build Tool

**Decision**: React 19 + Vite 5 + TypeScript 5.4 (unchanged from prior plan)  
**Rationale**: No change — React 19 with Vite 5 is the correct choice. The auth additions require two new pages (login, register) but don't change the fundamental frontend architecture.

---

## 7. State Management

**Decision**: Zustand 5 (unchanged, extended with auth store)  

**Two stores**:

1. **`auth.store.ts`**:
   - `token: string | null` — JWT access token
   - `user: { id, email } | null` — currently authenticated user
   - `isAuthenticated: boolean` — derived from token presence
   - Actions: `login(token, user)`, `logout()`, `loadFromStorage()` (rehydrate from localStorage on app mount)

2. **`todo.store.ts`** (unchanged in shape, updated to include token in API calls):
   - `todos`, `status`, `error`
   - Actions: `fetchTodos`, `addTodo`, `toggleTodo`, `deleteTodo`

**Alternatives considered**: Same as prior plan — Redux Toolkit and React Context remain unjustified for this scope.

---

## 8. Client-Side Routing

**Decision**: TanStack Router v1 with file-based routing (unchanged, extended with auth routes)  

**Route structure**:
- `__root.tsx` — Root layout; reads `auth.store` and redirects unauthenticated users to `/login` via `beforeLoad`
- `login.tsx` (path: `/login`) — Login form
- `register.tsx` (path: `/register`) — Registration form
- `index.tsx` (path: `/`) — Protected todo list; redirects to `/login` if unauthenticated

**Auth guard pattern** using TanStack Router's `beforeLoad`:
```typescript
// In __root.tsx or index.tsx
beforeLoad: ({ context }) => {
  if (!context.auth.isAuthenticated) {
    throw redirect({ to: '/login' });
  }
},
```

---

## 9. HTTP Client (Frontend)

**Decision**: Native `fetch` wrapper in `services/api.ts`  
**Updated behavior**: The wrapper reads the JWT token from the auth store and automatically attaches `Authorization: Bearer <token>` to every request. On a 401 response, it calls `auth.store.logout()` and redirects to `/login`.

---

## 10. Testing Strategy

**Decision**: Vitest for both frontend and backend  

**Backend** (switched from Jest to Vitest for unified tooling):
- Vitest + `@fastify/inject` for integration tests against a real PostgreSQL test database
- Use a separate `.env.test` file with a dedicated test DB connection string
- Run `prisma migrate deploy` before the test suite
- Test: register flow, login flow, authenticated CRUD, unauthenticated rejection (401)

**Frontend**:
- Vitest + React Testing Library for component tests
- Mock `services/api.ts` in component tests to isolate from the backend

---

## 11. Environment Configuration

**Key environment variables** (backend):

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | Prisma connection string | `postgresql://user:pass@localhost:5432/todo_app` |
| `JWT_SECRET` | HMAC signing secret (min 32 chars) | `your-super-secret-jwt-key-here-1234` |
| `JWT_EXPIRES_IN` | Token lifetime | `15m` |
| `PORT` | Server port | `3001` |
| `CLIENT_ORIGIN` | CORS allowed origin | `http://localhost:5173` |
| `NODE_ENV` | Environment | `development` |

**Key environment variables** (frontend):

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_API_BASE_URL` | Backend base URL | `http://localhost:3001/api` |

---

## 12. Deployment Architecture

**Decision**: Separate deployable services  
- Backend: Render or Railway (Node.js service)
- Frontend: Vercel or Netlify (static export)
- Database: Supabase or Railway PostgreSQL (managed, free tier available)

Prisma migrations are run as part of the deploy pipeline (`prisma migrate deploy`) before the server starts.
