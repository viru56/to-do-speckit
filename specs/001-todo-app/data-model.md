# Data Model: Simple Todo App

**Phase**: 1 — Design & Contracts  
**Date**: 2026-03-09 (revised — PostgreSQL + Prisma + JWT auth)  
**Branch**: `001-todo-app`

---

## Entities

### User

Represents an authenticated account. Each user owns an isolated set of todos.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | UUID | Auto-generated | Unique, primary key | Identifier, stored as UUID v4 |
| `email` | String | Yes | Unique, valid email format, lowercase | Used for login |
| `password` | String | Yes | Hashed (bcryptjs, 10 rounds); never returned to client | Stored hash of the user's password |
| `createdAt` | DateTime (UTC) | Auto-generated | Set once on creation | Account creation timestamp |
| `updatedAt` | DateTime (UTC) | Auto-generated | Updated on every save | Last modification timestamp |

**Security rules**:
- The `password` field is **never** included in any API response
- Email is normalized to lowercase before storing and querying
- The `id` (UUID) is used as the JWT `sub` claim — never the email

---

### Todo

Represents a single task owned by a specific user.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | UUID | Auto-generated | Unique, primary key | Identifier |
| `text` | String | Yes | 1–500 characters, trimmed | The task description |
| `completed` | Boolean | Yes | Default: `false` | Whether the task is done |
| `userId` | UUID | Yes | Foreign key → `User.id`; cascade delete | Owner of this todo |
| `createdAt` | DateTime (UTC) | Auto-generated | Set once on creation, immutable | Creation timestamp |
| `updatedAt` | DateTime (UTC) | Auto-generated | Updated on every save | Last modification timestamp |

**Data isolation rule**: Every query for todos MUST filter by `userId` derived from the verified JWT. A user cannot read, modify, or delete another user's todos.

---

## Relationships

```
User (1) ──── (many) Todo
  │
  └─ One User owns zero or more Todos
  └─ Deleting a User cascades and deletes all their Todos
```

---

## Validation Rules

### User

| Field | Rule | Error Message |
|-------|------|---------------|
| `email` | Required | "Email is required" |
| `email` | Valid email format | "Must be a valid email address" |
| `password` | Required | "Password is required" |
| `password` | Minimum 8 characters | "Password must be at least 8 characters" |
| `email` | Must not already exist | "An account with this email already exists" |
| `email` + `password` | Must match a stored user on login | "Invalid email or password" (intentionally vague to prevent enumeration) |

### Todo

| Field | Rule | Error Message |
|-------|------|---------------|
| `text` | Required (non-empty after trim) | "Todo text is required" |
| `text` | Maximum 500 characters | "Todo text must be 500 characters or fewer" |
| `completed` | Must be boolean | "Completed must be a boolean value" |

---

## State Transitions

### Todo

```
        ┌────────────────────────────────┐
        │            CREATE              │
        │  text: string, completed: false│
        ▼                                │
  ┌──────────┐       TOGGLE         ┌───────────┐
  │  active  │ ───────────────────▶ │ completed │
  │completed │ ◀─────────────────── │ completed │
  │  = false │       TOGGLE         │  = true   │
  └──────────┘                      └───────────┘
        │                                │
        │             DELETE             │
        └───────────────────────────────▶ (removed)
```

### User (Auth)

```
  [anonymous] ──register──▶ [authenticated, token valid]
  [anonymous] ──login────▶ [authenticated, token valid]
  [authenticated] ────────▶ [token expired (15m)] ──▶ [anonymous, redirect to /login]
```

---

## Prisma Schema

```prisma
// backend/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  todos     Todo[]
}

model Todo {
  id        String   @id @default(uuid())
  text      String   @db.VarChar(500)
  completed Boolean  @default(false)
  userId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

---

## TypeScript Types (Shared)

```typescript
// packages/types/src/index.ts

export interface User {
  id: string;
  email: string;
  createdAt: string; // ISO 8601
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  userId: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// Auth API payloads
export interface RegisterInput {
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Todo API payloads
export interface CreateTodoInput {
  text: string;
}

export interface UpdateTodoInput {
  completed: boolean;
}
```

---

## Zod Schemas (Backend Reference)

```typescript
// backend/src/modules/auth/auth.schema.ts
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().email('Must be a valid email address').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

// backend/src/modules/todos/todo.schema.ts
export const createTodoSchema = z.object({
  text: z.string().trim().min(1, 'Todo text is required').max(500, 'Todo text must be 500 characters or fewer'),
});

export const updateTodoSchema = z.object({
  completed: z.boolean(),
});
```

---

## Zustand Store Shapes (Frontend Reference)

```typescript
// frontend/src/store/auth.store.ts
interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;

  login: (token: string, user: User) => void;
  logout: () => void;
  loadFromStorage: () => void; // rehydrate on app mount
}

// frontend/src/store/todo.store.ts
interface TodoState {
  todos: Todo[];
  status: 'idle' | 'loading' | 'error';
  error: string | null;

  fetchTodos: () => Promise<void>;
  addTodo: (text: string) => Promise<void>;
  toggleTodo: (id: string, completed: boolean) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
}
```

---

## Database Indexes

| Table | Index | Reason |
|-------|-------|--------|
| `Todo` | `@@index([userId])` | All todo queries filter by `userId` — this prevents a full table scan |
| `User` | `email` (unique constraint creates an index automatically) | Login lookups by email |

---

## Future Extensions (v2+)

| Field/Entity | Type | Future Use |
|---|---|---|
| `Todo.priority` | Enum: low/medium/high | Task prioritization |
| `Todo.dueDate` | DateTime (nullable) | Deadlines feature |
| `Todo.tags` | Many-to-many (Tag model) | Categorization |
| `User.refreshToken` | String (nullable) | Upgrade to access + refresh token pair |
| `User.role` | Enum: user/admin | Role-based access control |
