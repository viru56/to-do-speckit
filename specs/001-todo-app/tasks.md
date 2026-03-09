# Tasks: Simple Todo App

**Input**: Design documents from `/specs/001-todo-app/`  
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Tests**: Added in Phase 9 (post-implementation test suite). No TDD requirement — tests are written after feature code is complete.

**Organization**: Tasks grouped by user story. Each story phase is independently implementable and testable.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[US#]**: Which user story this task serves
- Paths follow the monorepo layout: `apps/backend/`, `apps/frontend/`, `packages/types/`

---

## Phase 1: Setup (Monorepo Scaffolding)

**Purpose**: Create the monorepo skeleton — all config files and empty package structure. No application code yet.

- [x] T001 Create monorepo root config: `package.json` (name: `todo-app`, workspaces scripts), `pnpm-workspace.yaml` (globs: `apps/*`, `packages/*`), `.gitignore`
- [x] T002 Create Turborepo config `turbo.json` with `build`, `dev`, `test`, `lint`, `type-check` pipeline (build depends on `^build`; dev is persistent + no-cache)
- [x] T003 Create shared TypeScript base config `tsconfig.base.json` at repo root (strict mode, ES2022 target, module: NodeNext)
- [x] T004 [P] Initialize `packages/types/` — `package.json` (name: `@todo-app/types`), `tsconfig.json` (extends base), `src/index.ts` with all shared types: `User`, `Todo`, `AuthResponse`, `CreateTodoInput`, `UpdateTodoInput`, `LoginInput`, `RegisterInput`
- [x] T005 [P] Initialize `apps/backend/` — `package.json` (name: `@todo-app/backend`, depends on `@todo-app/types` via `workspace:*`), `tsconfig.json` (extends base), `vitest.config.ts`, `.env.example`
- [x] T006 [P] Initialize `apps/frontend/` — `package.json` (name: `@todo-app/frontend`, depends on `@todo-app/types` via `workspace:*`), `tsconfig.json` (extends base), `vite.config.ts` (with `@tanstack/router-plugin`), `index.html`, `vitest.config.ts`
- [x] T007 Run `pnpm install` at repo root and verify all workspace packages link correctly (`pnpm list -r`)

**Checkpoint**: `pnpm install` succeeds; workspace packages resolve each other; `@todo-app/types` is importable from both apps

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure required by ALL user stories. Auth is included here because every todo endpoint requires a verified JWT. Nothing in Phases 3+ can begin until this phase is complete.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Database

- [x] T008 Define Prisma schema in `apps/backend/prisma/schema.prisma` — `User` model (id UUID, email unique, password, timestamps) and `Todo` model (id UUID, text VarChar(500), completed Boolean default false, userId FK → User cascade delete, timestamps, index on userId)
- [x] T009 Run `prisma migrate dev --name init` to generate the initial migration and Prisma client in `apps/backend/prisma/migrations/` ✅ Migration `20260309063713_init` exists on disk

### Backend App Shell

- [x] T010 Create Fastify app factory in `apps/backend/src/app.ts` — registers plugins (CORS, JWT, Prisma), mounts routes under `/api`, registers global error handler (400/401/404/500 → `{ error: { message, code } }`)
- [x] T011 Create server entry point in `apps/backend/src/server.ts` — reads `PORT` from env, starts Fastify listener, logs startup URL
- [x] T012 [P] Implement Prisma client Fastify plugin in `apps/backend/src/plugins/prisma.ts` — instantiates `PrismaClient` once, decorates `fastify.prisma`, closes connection on `fastify.close`
- [x] T013 [P] Implement JWT Fastify plugin in `apps/backend/src/plugins/jwt.ts` — registers `@fastify/jwt` with `JWT_SECRET` from env, adds `fastify.authenticate` decorator that calls `request.jwtVerify()` and attaches `request.user` (`{ sub: userId, email }`)
- [x] T014 [P] Configure `@fastify/cors` in `apps/backend/src/app.ts` with `CLIENT_ORIGIN` env var; allowed methods: GET, POST, PATCH, DELETE, OPTIONS; allowed headers: Content-Type, Authorization
- [x] T015 [P] Add `GET /health` route in `apps/backend/src/app.ts` — returns `{ status: "ok", timestamp }` (200) or `{ status: "error", message }` (503) based on Prisma connectivity

### Auth Module (Backend)

- [x] T016 Create auth Zod schemas in `apps/backend/src/modules/auth/auth.schema.ts` — `registerSchema` (email: valid+lowercase, password: min 8) and `loginSchema` (email, password: non-empty)
- [x] T017 Implement auth controller in `apps/backend/src/modules/auth/auth.controller.ts` — `register` (hash password with bcryptjs rounds=10, check email uniqueness → 409 if taken, create User, sign JWT, return `AuthResponse` without password), `login` (find user by email, compare hash, sign JWT, return `AuthResponse`)
- [x] T018 Register auth routes in `apps/backend/src/modules/auth/auth.routes.ts` — `POST /api/auth/register` and `POST /api/auth/login` with Zod body validation; mount in `app.ts`

### Auth UI + Frontend Shell (Frontend)

- [x] T019 Create Zustand auth store in `apps/frontend/src/store/auth.store.ts` — state: `token`, `user`, `isAuthenticated`; actions: `login(token, user)` (writes to localStorage), `logout()` (clears localStorage), `loadFromStorage()` (rehydrates on app mount)
- [x] T020 Create HTTP client in `apps/frontend/src/services/api.ts` — wraps `fetch` with base URL from `VITE_API_BASE_URL`; auto-attaches `Authorization: Bearer <token>` from auth store; on 401 response calls `auth.store.logout()` and redirects to `/login`
- [x] T021 [P] Create login page in `apps/frontend/src/routes/login.tsx` — form with email + password fields, calls `POST /api/auth/login`, stores token via auth store, redirects to `/` on success, shows error on failure
- [x] T022 [P] Create register page in `apps/frontend/src/routes/register.tsx` — form with email + password fields, calls `POST /api/auth/register`, stores token via auth store, redirects to `/` on success
- [x] T023 Create TanStack Router root layout in `apps/frontend/src/routes/__root.tsx` — calls `auth.loadFromStorage()` on mount; `beforeLoad` hook: redirects unauthenticated users to `/login`; provides auth context to child routes
- [x] T024 Wire `apps/frontend/src/main.tsx` — creates Fastify router instance, registers route tree, wraps app in `<RouterProvider>`

**Checkpoint**: `pnpm dev` starts both apps; visiting `/login` shows the form; registering creates a user in the DB; logging in returns a token and redirects to `/` (empty todo page)

---

## Phase 3: User Story 1 — View and Manage Todo List (Priority: P1) 🎯 MVP

**Goal**: Authenticated user opens the app and immediately sees their todo list with proper loading, empty, and error states. All todos are visually organized with completed items distinguishable from active ones.

**Independent Test**: Log in → the app loads the todo list page with a loading state, then shows an empty-state prompt (no todos yet). Refresh the page — the list is still displayed. Take the backend offline — the error state renders without a crash.

### Backend

- [x] T025 [US1] Create todo Zod schemas file `apps/backend/src/modules/todos/todo.schema.ts` — `createTodoSchema`, `updateTodoSchema` (completed: boolean)
- [x] T026 [US1] Implement `getAll` handler in `apps/backend/src/modules/todos/todo.controller.ts` — queries `fastify.prisma.todo.findMany({ where: { userId: request.user.sub }, orderBy: { createdAt: 'desc' } })`, returns todo array (never includes password)
- [x] T027 [US1] Register `GET /api/todos` in `apps/backend/src/modules/todos/todo.routes.ts` — protected by `onRequest: [fastify.authenticate]`; mount in `app.ts`

### Frontend

- [x] T028 [US1] Create Zustand todo store in `apps/frontend/src/store/todo.store.ts` — state: `todos[]`, `status: 'idle'|'loading'|'error'`, `error: string|null`; action: `fetchTodos()` (calls GET /api/todos, updates state)
- [x] T029 [P] [US1] Create `LoadingState` component in `apps/frontend/src/components/LoadingState.tsx` — spinner or skeleton placeholder shown while `status === 'loading'`
- [x] T030 [P] [US1] Create `EmptyState` component in `apps/frontend/src/components/EmptyState.tsx` — illustrated prompt shown when `todos.length === 0` and `status === 'idle'`
- [x] T031 [P] [US1] Create `ErrorState` component in `apps/frontend/src/components/ErrorState.tsx` — error message + retry button shown when `status === 'error'`
- [x] T032 [US1] Create `TodoList` component in `apps/frontend/src/components/TodoList.tsx` — renders list of todo items; delegates to `LoadingState`, `EmptyState`, or `ErrorState` based on store status
- [x] T033 [US1] Wire todo list page in `apps/frontend/src/routes/index.tsx` — calls `fetchTodos()` on mount via `useEffect`; renders `TodoList`; visually distinguishes completed todos (strikethrough + muted color via CSS class)

**Checkpoint**: Authenticated user sees the todo list page with loading → empty state transition. Refreshing preserves the authenticated session. Disconnecting the backend shows the error state gracefully.

---

## Phase 4: User Story 2 — Create a New Todo (Priority: P1)

**Goal**: User types a task description and submits it. The new todo appears at the top of the list immediately without a page reload. The input clears and focuses for the next entry. Empty submissions are rejected with an inline error.

**Independent Test**: Submit a new todo — it appears instantly at the top of the list. Submit an empty input — a validation error appears, no todo is created. Refresh — the new todo is still there.

### Backend

- [x] T034 [US2] Implement `create` handler in `apps/backend/src/modules/todos/todo.controller.ts` — validates body with `createTodoSchema`, calls `fastify.prisma.todo.create({ data: { text, userId: request.user.sub } })`, returns 201 with the new todo
- [x] T035 [US2] Register `POST /api/todos` in `apps/backend/src/modules/todos/todo.routes.ts` — protected, body validated with Zod schema

### Frontend

- [x] T036 [US2] Add `addTodo(text: string)` action to `apps/frontend/src/store/todo.store.ts` — calls POST /api/todos, prepends returned todo to `todos[]` on success, sets error on failure
- [x] T037 [US2] Create `TodoForm` component in `apps/frontend/src/components/TodoForm.tsx` — controlled input with inline validation (rejects empty/whitespace), submit button, clears + re-focuses input after successful add, shows API error message if submission fails
- [x] T038 [US2] Integrate `TodoForm` into `apps/frontend/src/routes/index.tsx` — rendered above `TodoList`

**Checkpoint**: Type a todo → submit → it appears at the top of the list instantly. Submit empty → validation error shown. Refresh → todo persists.

---

## Phase 5: User Story 3 — Mark a Todo as Complete (Priority: P2)

**Goal**: User clicks a toggle on a todo. It instantly updates visually (completed ↔ active) without a page reload. The state persists after refresh. Slow network: UI updates optimistically and rolls back if the request fails.

**Independent Test**: Toggle a todo as complete → visual change is immediate → refresh → still completed. Toggle back to active → refresh → still active.

### Backend

- [x] T039 [US3] Implement `update` handler in `apps/backend/src/modules/todos/todo.controller.ts` — validates body with `updateTodoSchema`; calls `fastify.prisma.todo.updateMany({ where: { id, userId: request.user.sub } })`; returns 404 if no row matched; returns updated todo on success
- [x] T040 [US3] Register `PATCH /api/todos/:id` in `apps/backend/src/modules/todos/todo.routes.ts` — protected, body validated

### Frontend

- [x] T041 [US3] Add `toggleTodo(id: string, completed: boolean)` action to `apps/frontend/src/store/todo.store.ts` — optimistic update (flip state immediately), call PATCH /api/todos/:id, revert on error and set error message
- [x] T042 [US3] Create `TodoItem` component in `apps/frontend/src/components/TodoItem.tsx` — renders todo text with completion-state styling (strikethrough + muted when completed); checkbox or button triggers `toggleTodo`
- [x] T043 [US3] Integrate `TodoItem` into `apps/frontend/src/components/TodoList.tsx` — replaces plain todo rendering with `TodoItem`

**Checkpoint**: Clicking the toggle on any todo immediately updates its appearance. Refresh confirms the new state was persisted. Forcing a network error shows a rollback to the previous state.

---

## Phase 6: User Story 4 — Delete a Todo (Priority: P2)

**Goal**: User removes a todo permanently. It disappears from the list immediately. Deletion persists across refreshes. Deleting the last todo shows the empty state.

**Independent Test**: Delete a todo → it disappears instantly → refresh → it's gone. Delete the last todo → empty state is displayed.

### Backend

- [x] T044 [US4] Implement `remove` handler in `apps/backend/src/modules/todos/todo.controller.ts` — calls `fastify.prisma.todo.deleteMany({ where: { id, userId: request.user.sub } })`; returns 404 if no row matched; returns 204 No Content on success
- [x] T045 [US4] Register `DELETE /api/todos/:id` in `apps/backend/src/modules/todos/todo.routes.ts` — protected

### Frontend

- [x] T046 [US4] Add `deleteTodo(id: string)` action to `apps/frontend/src/store/todo.store.ts` — optimistic removal (remove from array immediately), call DELETE /api/todos/:id, restore item on error
- [x] T047 [US4] Add delete button to `apps/frontend/src/components/TodoItem.tsx` — visible on hover (desktop) or always visible (mobile); calls `deleteTodo` on click; shows loading state while in-flight to prevent double-click

**Checkpoint**: Delete a todo → disappears immediately → refresh → confirmed gone. Delete last todo → empty state renders. Force a network error → deleted item reappears with an error message.

---

## Phase 7: User Story 5 — Responsive Cross-Device Experience (Priority: P3)

**Goal**: The app is fully usable on screen widths from 320px (small mobile) to 1440px (desktop). All touch interactions work correctly. No horizontal scrolling.

**Independent Test**: Open the app at 320px viewport — all elements are readable and usable, no overflow or horizontal scrolling. Tap the toggle, delete button, and form submit on a touch device — all actions work correctly.

- [x] T048 [P] [US5] Add responsive layout CSS to `apps/frontend/src/` — constrain content width with a centered container, fluid padding on mobile; ensure `TodoForm` input fills available width
- [x] T049 [P] [US5] Ensure `TodoItem` touch targets (toggle + delete button) meet minimum 44×44px tap area; confirm no overlap between interactive elements on narrow viewports
- [x] T050 [P] [US5] Verify desktop layout in `apps/frontend/src/routes/index.tsx` — content is readable at wide viewports without becoming excessively wide (max-width constraint)

**Checkpoint**: App is usable and visually correct at 320px, 768px (tablet), and 1440px. All interactions work via touch.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening across all user stories — edge cases, UX polish, security checks, and deployment readiness.

- [x] T051 [P] Add 401/expired-token auto-logout in `apps/frontend/src/services/api.ts` — on any 401 response, call `auth.store.logout()` and redirect to `/login` with a "Session expired" message
- [x] T052 [P] Add double-submit prevention to `apps/frontend/src/components/TodoForm.tsx` — disable submit button while request is in-flight; re-enable and preserve input on error
- [x] T053 [P] Add whitespace-only input guard to `TodoForm` in `apps/frontend/src/components/TodoForm.tsx` — trim before submit; reject and show validation error if result is empty
- [x] T054 [P] Add `GET /health` frontend connectivity check — `apps/frontend/src/services/api.ts` catches network-level failures (no server response) with a distinct "Cannot reach server" error message separate from API errors
- [x] T055 Add `logout` button to the authenticated layout in `apps/frontend/src/routes/__root.tsx` — calls `auth.store.logout()` and redirects to `/login`
- [ ] T056 Validate full quickstart.md flow end-to-end ⚠️ Manual step — requires running PostgreSQL + `pnpm dev`: `pnpm install` → DB migrate → `pnpm dev` → register → login → add todos → complete → delete → logout → log back in → data persists

**Checkpoint**: Full round-trip verified. All edge cases handled. App behaves correctly across auth expiry, network loss, empty input, and rapid interactions.

---

## Phase 9: Testing

**Purpose**: Add automated test coverage for critical paths. Matches the test files defined in plan.md's project structure (`apps/backend/tests/`, `apps/frontend/tests/`). Depends on all feature phases (3–8) being complete.

### Backend Integration Tests

- [ ] T057 [P] Create auth integration tests in `apps/backend/tests/auth.test.ts` — test `POST /api/auth/register` (success 201, duplicate email 409, validation errors 400) and `POST /api/auth/login` (success 200, wrong password 401, non-existent email 401); use Fastify `inject()` with a test Prisma client
- [ ] T058 [P] Create todo CRUD integration tests in `apps/backend/tests/todos.test.ts` — test `GET /api/todos` (returns user-scoped list), `POST /api/todos` (success 201, empty text 400), `PATCH /api/todos/:id` (toggle completed, 404 for wrong user), `DELETE /api/todos/:id` (success 204, 404 for wrong user); each test authenticates via a registered test user
- [ ] T059 [P] Create health endpoint test in `apps/backend/tests/health.test.ts` — test `GET /health` returns 200 with `{ status: "ok" }`

### Frontend Component Tests

- [ ] T060 Create `TodoItem` component test in `apps/frontend/tests/components/TodoItem.test.tsx` — renders todo text, shows strikethrough when completed, calls `toggleTodo` on checkbox click, calls `deleteTodo` on delete button click; mock the todo store

**Checkpoint**: `pnpm test` passes across both apps. Auth, CRUD, and key component interactions are covered by automated tests.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **blocks all user story phases**
- **Phases 3–7 (User Stories)**: All depend on Phase 2; can proceed sequentially (P1 → P2 → P3) or in parallel across backend/frontend sub-tasks
- **Phase 8 (Polish)**: Depends on all user story phases being complete
- **Phase 9 (Testing)**: Depends on all feature phases (3–8) being complete; can run in parallel with T056

### User Story Dependencies

| Story | Depends On | Notes |
|-------|-----------|-------|
| US1 — View List | Phase 2 complete | GET /api/todos + frontend list |
| US2 — Create Todo | US1 complete | Adds to the list US1 renders |
| US3 — Complete Todo | US2 complete | Toggles items US2 created |
| US4 — Delete Todo | US2 complete | Removes items US2 created |
| US5 — Responsive | US3 + US4 complete | Polish on top of full feature set |

### Within Each Phase

- Models/schemas before controllers
- Controllers before route registration
- Backend routes before frontend store actions
- Store actions before UI components
- Components before page-level integration

### Parallel Opportunities

- **Phase 1**: T004, T005, T006 can run in parallel after T001–T003
- **Phase 2**: T012, T013, T014, T015 (backend plugins + CORS + health) can run in parallel; T021 + T022 (login + register pages) can run in parallel
- **Phase 3**: T029, T030, T031 (LoadingState, EmptyState, ErrorState) can run in parallel
- **Phase 7**: T048, T049, T050 can all run in parallel
- **Phase 8**: T051, T052, T053, T054 can run in parallel

---

## Parallel Example: Phase 2 (Foundational)

```
# After T010 (app.ts shell) is done, run simultaneously:
T012: Configure CORS in apps/backend/src/app.ts
T013: Implement JWT plugin in apps/backend/src/plugins/jwt.ts     [P]
T014: Configure CORS plugin in apps/backend/src/app.ts
T015: Add GET /health route                                         [P]

# After T018 (auth routes) and T019 (auth store) are done:
T021: Login page in apps/frontend/src/routes/login.tsx             [P]
T022: Register page in apps/frontend/src/routes/register.tsx       [P]
```

## Parallel Example: Phase 3 (User Story 1)

```
# After T028 (todo store fetchTodos) is done, run simultaneously:
T029: LoadingState component in apps/frontend/src/components/      [P]
T030: EmptyState component in apps/frontend/src/components/        [P]
T031: ErrorState component in apps/frontend/src/components/        [P]
# Then:
T032: TodoList (depends on T029–T031)
T033: index.tsx wiring (depends on T032)
```

---

## Implementation Strategy

### MVP First (Phases 1–3)

1. Phase 1: Scaffold monorepo
2. Phase 2: Full foundational (DB + Fastify + auth)
3. Phase 3: View todo list (GET endpoint + list UI)
4. **STOP and VALIDATE**: Can log in, see the todo list, observe empty/loading/error states
5. Deploy or demo if ready — this is a complete, working app slice

### Incremental Delivery

| After phase | What works |
|------------|------------|
| Phase 2 | Auth: register, login, JWT protection |
| Phase 3 | View empty/populated todo list |
| Phase 4 | + Create todos |
| Phase 5 | + Mark todos complete |
| Phase 6 | + Delete todos (full CRUD — shippable v1) |
| Phase 7 | + Mobile-responsive layout |
| Phase 8 | + Edge cases, polish, verified deployment |

### Parallel Team Strategy

With two developers after Phase 2 completes:

- **Developer A** — Backend: T025→T027 (US1 API), T034→T035 (US2), T039→T040 (US3), T044→T045 (US4)
- **Developer B** — Frontend: T028→T033 (US1 UI), T036→T038 (US2), T041→T043 (US3), T046→T047 (US4)

Both tracks merge at each user story checkpoint before proceeding.

---

## Notes

- `[P]` = can run in parallel with other `[P]` tasks in the same phase (different files, no shared dependencies)
- `[US#]` maps every task to its user story for traceability
- Each phase ends with a **Checkpoint** — verify it independently before proceeding
- The todo module (`todo.controller.ts`, `todo.routes.ts`) is built incrementally across Phases 3–6; each phase adds one handler + one route
- Use `pnpm --filter @todo-app/backend dev` and `pnpm --filter @todo-app/frontend dev` for isolated debugging during development
- Commit after each Checkpoint, not after every task
