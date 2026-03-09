# Simple Todo App

A full-stack todo application with JWT authentication and per-user todo isolation. Built as a pnpm + Turborepo monorepo with a Fastify REST API backend and a React single-page frontend.

**Features**: Create, complete, and delete todos · User registration and login · Per-user data isolation · Responsive design (mobile to desktop) · Optimistic UI updates

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20 LTS, TypeScript 5.4 |
| Backend | Fastify 5, Prisma 5, PostgreSQL 16 |
| Auth | @fastify/jwt, bcryptjs |
| Frontend | React 19, Zustand 5, TanStack Router v1, Vite 6 |
| Build | pnpm 9, Turborepo 2 |
| Testing | Vitest |

## Prerequisites

| Tool | Version | Check / Install |
|------|---------|-----------------|
| Node.js | >= 20 LTS | `node -v` / [nvm](https://github.com/nvm-sh/nvm): `nvm use 20` |
| pnpm | >= 9 | `pnpm -v` / `npm install -g pnpm` |
| PostgreSQL | 16 | `psql --version` / see Docker option below |
| Git | any recent | `git --version` |

> **pnpm is required.** Do not use `npm install` or `yarn` at the repo root.

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd simple-todo-app
pnpm install
```

### 2. Start PostgreSQL

If you don't have PostgreSQL running locally, use Docker:

```bash
docker run --name todo-db \
  -e POSTGRES_USER=todo \
  -e POSTGRES_PASSWORD=todo \
  -e POSTGRES_DB=todo_app \
  -p 5432:5432 \
  -d postgres:16
```

### 3. Configure environment variables

**Backend** — copy the example and edit as needed:

```bash
cp apps/backend/.env.example apps/backend/.env
```

`apps/backend/.env`:

```env
DATABASE_URL="postgresql://todo:todo@localhost:5432/todo_app"
JWT_SECRET="replace-with-a-random-32-char-secret-minimum"
JWT_EXPIRES_IN="15m"
PORT=3001
CLIENT_ORIGIN="http://localhost:5173"
NODE_ENV="development"
```

Generate a secure JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Frontend** — copy the example:

```bash
cp apps/frontend/.env.example apps/frontend/.env
```

`apps/frontend/.env`:

```env
VITE_API_BASE_URL="http://localhost:3001/api"
```

### 4. Run database migrations

```bash
pnpm --filter @todo-app/backend db:migrate
```

### 5. Start development

```bash
pnpm dev
```

Turborepo starts both apps in parallel with hot reload.

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:3001 |
| Health check | http://localhost:3001/health |

## Commands

### Root (all workspaces via Turborepo)

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps with hot reload |
| `pnpm build` | Build all packages and apps in dependency order |
| `pnpm test` | Run all test suites |
| `pnpm lint` | Lint all packages |
| `pnpm type-check` | TypeScript type-check all packages |

### Backend (`apps/backend`)

| Command | Description |
|---------|-------------|
| `pnpm --filter @todo-app/backend dev` | Dev server with hot reload |
| `pnpm --filter @todo-app/backend test` | Run tests |
| `pnpm --filter @todo-app/backend db:migrate` | Apply Prisma migrations |
| `pnpm --filter @todo-app/backend db:studio` | Open Prisma Studio (DB browser) |
| `pnpm --filter @todo-app/backend db:reset` | Reset database and re-apply migrations |

### Frontend (`apps/frontend`)

| Command | Description |
|---------|-------------|
| `pnpm --filter @todo-app/frontend dev` | Vite dev server |
| `pnpm --filter @todo-app/frontend test` | Run tests |
| `pnpm --filter @todo-app/frontend build` | Production build |
| `pnpm --filter @todo-app/frontend preview` | Preview production build |

## Project Structure

```
simple-todo-app/
├── apps/
│   ├── backend/                 # @todo-app/backend — Fastify REST API
│   │   ├── prisma/              #   Prisma schema and migrations
│   │   └── src/
│   │       ├── plugins/         #   Fastify plugins (Prisma client, JWT)
│   │       └── modules/         #   Feature modules (auth, todos)
│   └── frontend/                # @todo-app/frontend — React SPA
│       └── src/
│           ├── components/      #   UI components (TodoList, TodoForm, etc.)
│           ├── routes/          #   TanStack Router pages (login, register, index)
│           ├── store/           #   Zustand stores (auth, todos)
│           └── services/        #   HTTP client with auth handling
├── packages/
│   └── types/                   # @todo-app/types — shared TypeScript types
├── specs/                       # Feature specifications and documentation
├── turbo.json                   # Turborepo task pipeline
├── pnpm-workspace.yaml          # Workspace globs: apps/*, packages/*
├── tsconfig.base.json           # Shared TypeScript base config
└── package.json                 # Root scripts and dev tooling
```

## Documentation

Detailed documentation lives in `specs/001-todo-app/`:

- **[API Contract](specs/001-todo-app/contracts/rest-api.md)** — endpoint specifications, request/response formats, error codes
- **[Data Model](specs/001-todo-app/data-model.md)** — Prisma schema, entity relationships, validation rules
- **[Quickstart](specs/001-todo-app/quickstart.md)** — extended setup guide with per-app script reference and troubleshooting
