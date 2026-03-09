# Quickstart: Simple Todo App

**Branch**: `001-todo-app`  
**Date**: 2026-03-09 (revised — pnpm + Turborepo monorepo)

This guide walks a developer through setting up the full monorepo locally from scratch.

---

## Prerequisites

| Tool | Minimum Version | Install / Check |
|------|-----------------|-----------------|
| Node.js | 20 LTS | `node --version` — use [nvm](https://github.com/nvm-sh/nvm): `nvm use 20` |
| pnpm | 9+ | `npm install -g pnpm` then `pnpm --version` |
| PostgreSQL | 16 (local or managed) | `psql --version` |
| Git | Any recent | `git --version` |

> **pnpm is required** — this repo uses pnpm workspaces. Do not use `npm install` or `yarn` at the root.

### Optional: PostgreSQL via Docker

```bash
docker run --name todo-db \
  -e POSTGRES_USER=todo \
  -e POSTGRES_PASSWORD=todo \
  -e POSTGRES_DB=todo_app \
  -p 5432:5432 \
  -d postgres:16
```

Connection string: `postgresql://todo:todo@localhost:5432/todo_app`

---

## Monorepo Layout

```
simple-todo-app/
├── apps/
│   ├── backend/       # @todo-app/backend  (Fastify + Prisma + PostgreSQL)
│   └── frontend/      # @todo-app/frontend (React + Vite + Zustand + TanStack Router)
├── packages/
│   └── types/         # @todo-app/types    (shared TypeScript types)
├── turbo.json
├── pnpm-workspace.yaml
├── package.json       (root — tooling only)
└── tsconfig.base.json
```

---

## 1. Clone & Set Up

```bash
git clone <repo-url>
cd simple-todo-app
git checkout 001-todo-app

# Install all workspace dependencies in one command
pnpm install
```

pnpm resolves all workspace packages (backend, frontend, types) and links them together automatically.

---

## 2. Configure Environment Variables

### Backend (`apps/backend/.env`)

```bash
cp apps/backend/.env.example apps/backend/.env
```

Edit `apps/backend/.env`:

```env
DATABASE_URL="postgresql://todo:todo@localhost:5432/todo_app"
JWT_SECRET="replace-with-a-random-32-char-secret"
JWT_EXPIRES_IN="15m"
PORT=3001
CLIENT_ORIGIN="http://localhost:5173"
NODE_ENV="development"
```

Generate a secure JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Frontend (`apps/frontend/.env`)

```bash
cp apps/frontend/.env.example apps/frontend/.env
```

Edit `apps/frontend/.env`:

```env
VITE_API_BASE_URL="http://localhost:3001/api"
```

---

## 3. Set Up the Database (Prisma)

```bash
# Run migrations (creates the DB schema)
pnpm --filter @todo-app/backend db:migrate

# Optional: inspect the DB in a browser UI
pnpm --filter @todo-app/backend db:studio

# Optional: regenerate Prisma client after schema changes
pnpm --filter @todo-app/backend db:generate
```

---

## 4. Run the Full Stack (Development)

```bash
# Start all apps simultaneously with hot reload
pnpm dev
```

Turborepo starts `apps/backend` and `apps/frontend` in parallel. Both watch for file changes.

| Service | URL |
|---------|-----|
| API | `http://localhost:3001` |
| Frontend | `http://localhost:5173` |
| Health check | `http://localhost:3001/health` |

To run a **single app**:

```bash
pnpm --filter @todo-app/backend dev
pnpm --filter @todo-app/frontend dev
```

---

## 5. Build

```bash
# Build all packages and apps (types → backend + frontend)
pnpm build

# Build a single app
pnpm --filter @todo-app/backend build
pnpm --filter @todo-app/frontend build
```

Turborepo builds `packages/types` first (because `apps/*` depend on it), then builds both apps in parallel.

---

## 6. Run Tests

```bash
# Run all tests across the monorepo
pnpm test

# Test a single app
pnpm --filter @todo-app/backend test
pnpm --filter @todo-app/frontend test

# Watch mode (per app)
pnpm --filter @todo-app/backend test:watch
pnpm --filter @todo-app/frontend test:watch

# Coverage
pnpm --filter @todo-app/backend test:coverage
```

The backend test suite requires a separate test database. Set `DATABASE_URL` in `apps/backend/.env.test`:

```env
DATABASE_URL="postgresql://todo:todo@localhost:5432/todo_app_test"
```

---

## 7. Lint & Type Check

```bash
# Lint all packages
pnpm lint

# Type check all packages
pnpm type-check

# Scoped
pnpm --filter @todo-app/backend lint
pnpm --filter @todo-app/frontend type-check
```

---

## 8. Root Scripts Reference

All root scripts delegate to Turborepo and run across all relevant workspaces.

| Command | What it does |
|---------|-------------|
| `pnpm install` | Install all dependencies for all workspaces |
| `pnpm dev` | Start all apps in parallel (hot reload) |
| `pnpm build` | Build all packages + apps in dependency order |
| `pnpm test` | Run all test suites |
| `pnpm lint` | Lint all packages |
| `pnpm type-check` | TypeScript type check all packages |

---

## 9. Per-App Scripts Reference

Use `pnpm --filter <package-name> <script>` to target a specific workspace.

### Backend (`apps/backend`)

| Command | Script | Description |
|---------|--------|-------------|
| `pnpm --filter @todo-app/backend dev` | `tsx watch src/server.ts` | Dev server with hot reload |
| `pnpm --filter @todo-app/backend build` | `tsc` | Compile TypeScript → `dist/` |
| `pnpm --filter @todo-app/backend start` | `node dist/server.js` | Run compiled server |
| `pnpm --filter @todo-app/backend test` | `vitest run` | Run tests once |
| `pnpm --filter @todo-app/backend test:watch` | `vitest` | Watch mode |
| `pnpm --filter @todo-app/backend test:coverage` | `vitest --coverage` | Coverage report |
| `pnpm --filter @todo-app/backend db:migrate` | `prisma migrate dev` | Apply migrations |
| `pnpm --filter @todo-app/backend db:studio` | `prisma studio` | Open DB browser |
| `pnpm --filter @todo-app/backend db:generate` | `prisma generate` | Regenerate client |

### Frontend (`apps/frontend`)

| Command | Script | Description |
|---------|--------|-------------|
| `pnpm --filter @todo-app/frontend dev` | `vite` | Vite dev server |
| `pnpm --filter @todo-app/frontend build` | `vite build` | Production build |
| `pnpm --filter @todo-app/frontend preview` | `vite preview` | Preview prod build |
| `pnpm --filter @todo-app/frontend test` | `vitest run` | Run tests |
| `pnpm --filter @todo-app/frontend test:watch` | `vitest` | Watch mode |
| `pnpm --filter @todo-app/frontend test:ui` | `vitest --ui` | Vitest browser UI |

### Shared Types (`packages/types`)

| Command | Description |
|---------|-------------|
| `pnpm --filter @todo-app/types build` | Compile types package (rarely needed manually; `turbo build` handles this) |

---

## 10. Adding a New Dependency

```bash
# Add to a specific app
pnpm --filter @todo-app/backend add fastify-plugin
pnpm --filter @todo-app/frontend add @tanstack/react-query

# Add as dev dependency
pnpm --filter @todo-app/backend add -D @types/node

# Add to the shared types package
pnpm --filter @todo-app/types add -D typescript

# Add a root-level dev tool (e.g., a linter config)
pnpm add -D -w eslint
```

---

## 11. Key File Locations

| File | Purpose |
|------|---------|
| `pnpm-workspace.yaml` | Declares `apps/*` and `packages/*` as workspaces |
| `turbo.json` | Task pipeline: build, dev, test, lint, type-check |
| `tsconfig.base.json` | Base TypeScript config extended by all packages |
| `packages/types/src/index.ts` | Shared types: `User`, `Todo`, `AuthResponse`, input types |
| `apps/backend/prisma/schema.prisma` | Prisma models: `User`, `Todo` |
| `apps/backend/src/app.ts` | Fastify app factory |
| `apps/backend/src/plugins/jwt.ts` | @fastify/jwt plugin + `authenticate` decorator |
| `apps/backend/src/modules/auth/` | Register + login endpoints |
| `apps/backend/src/modules/todos/` | CRUD endpoints (all protected) |
| `apps/frontend/src/store/auth.store.ts` | Zustand auth store |
| `apps/frontend/src/store/todo.store.ts` | Zustand todo store |
| `apps/frontend/src/services/api.ts` | HTTP client (Bearer token + 401 handler) |
| `apps/frontend/src/routes/__root.tsx` | Root layout + auth guard |

---

## 12. Common Issues

### "command not found: pnpm"

```bash
npm install -g pnpm
```

### "Cannot find module '@todo-app/types'"

The shared types package needs to be built first:

```bash
pnpm --filter @todo-app/types build
# Or just run turbo which handles this automatically:
pnpm build
```

### pnpm complains about missing lockfile

Always run `pnpm install` (not `npm install`) at the repo root. The `pnpm-lock.yaml` must be committed.

### PostgreSQL connection errors

```bash
pg_isready -h localhost -p 5432
# Verify DATABASE_URL in apps/backend/.env
```

### Turborepo cache returning stale results

```bash
# Clear the local turbo cache
pnpm turbo daemon clean
# Or bypass cache for a single run:
pnpm build --force
```

### TanStack Router route tree is stale

Restart the Vite dev server (`pnpm --filter @todo-app/frontend dev`). The `routeTree.gen.ts` is auto-generated by the Vite plugin on startup.
