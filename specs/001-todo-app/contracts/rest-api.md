# REST API Contract: Simple Todo App

**Phase**: 1 — Design & Contracts  
**Date**: 2026-03-09 (revised — Fastify + PostgreSQL + JWT auth)  
**Branch**: `001-todo-app`  
**Base URL**: `http://localhost:3001/api` (development)

---

## Overview

The backend exposes two resources: `auth` (registration and login) and `todos` (CRUD, all routes protected by JWT). Responses are JSON. Errors follow a consistent structure.

**Content-Type**: `application/json` (all requests and responses)  
**Authentication**: Bearer token (JWT), required on all `/api/todos` endpoints

---

## Authentication

Protected routes require an `Authorization` header:

```
Authorization: Bearer <access_token>
```

Tokens expire after **15 minutes**. On expiry the server returns `401 EXPIRED_TOKEN`. The client must redirect the user to `/login`.

---

## Common Types

### User Object (safe — no password)

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "user@example.com",
  "createdAt": "2026-03-09T10:00:00.000Z"
}
```

### Todo Object

```json
{
  "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "text": "Buy groceries",
  "completed": false,
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "createdAt": "2026-03-09T10:05:00.000Z",
  "updatedAt": "2026-03-09T10:05:00.000Z"
}
```

### Error Response

```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE"
  }
}
```

### Error Codes

| Code | HTTP Status | When |
|------|-------------|------|
| `VALIDATION_ERROR` | 400 | Request body fails schema validation |
| `EMAIL_TAKEN` | 409 | Attempted registration with an existing email |
| `INVALID_CREDENTIALS` | 401 | Email not found or password incorrect |
| `UNAUTHORIZED` | 401 | Missing or malformed `Authorization` header |
| `EXPIRED_TOKEN` | 401 | JWT token has expired |
| `NOT_FOUND` | 404 | Todo with given ID does not exist (or belongs to another user) |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

> **Note on 404 vs 403**: When a todo ID exists but belongs to a different user, the server returns `404 NOT_FOUND` (not `403 Forbidden`) to avoid leaking information about other users' data.

---

## Auth Endpoints

---

### POST /api/auth/register

Create a new user account and return a JWT access token.

**Request**

```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "mysecretpassword"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `email` | string | Yes | Valid email format |
| `password` | string | Yes | Minimum 8 characters |

**Response: 201 Created**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "user@example.com",
    "createdAt": "2026-03-09T10:00:00.000Z"
  }
}
```

**Response: 400 Bad Request** (validation failure)

```json
{
  "error": {
    "message": "Password must be at least 8 characters",
    "code": "VALIDATION_ERROR"
  }
}
```

**Response: 409 Conflict** (email already registered)

```json
{
  "error": {
    "message": "An account with this email already exists",
    "code": "EMAIL_TAKEN"
  }
}
```

---

### POST /api/auth/login

Authenticate an existing user and return a JWT access token.

**Request**

```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "mysecretpassword"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `email` | string | Yes | Valid email format |
| `password` | string | Yes | Non-empty |

**Response: 200 OK**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "user@example.com",
    "createdAt": "2026-03-09T10:00:00.000Z"
  }
}
```

**Response: 401 Unauthorized** (wrong email or password)

```json
{
  "error": {
    "message": "Invalid email or password",
    "code": "INVALID_CREDENTIALS"
  }
}
```

> The error message is intentionally vague — it does not reveal whether the email exists, preventing account enumeration attacks.

---

## Todo Endpoints

All todo endpoints require `Authorization: Bearer <token>`. Todos are always scoped to the authenticated user — a user can never access, modify, or delete another user's todos.

---

### GET /api/todos

Retrieve all todos for the authenticated user, ordered by creation date (newest first).

**Request**

```
GET /api/todos
Authorization: Bearer <token>
```

**Response: 200 OK**

```json
[
  {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "text": "Buy groceries",
    "completed": false,
    "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "createdAt": "2026-03-09T10:05:00.000Z",
    "updatedAt": "2026-03-09T10:05:00.000Z"
  }
]
```

Returns `[]` when no todos exist. Never returns todos belonging to another user.

**Response: 401 Unauthorized** (missing or expired token)

```json
{
  "error": {
    "message": "Authentication required",
    "code": "UNAUTHORIZED"
  }
}
```

---

### POST /api/todos

Create a new todo for the authenticated user.

**Request**

```
POST /api/todos
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "Buy groceries"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `text` | string | Yes | 1–500 characters |

**Response: 201 Created**

```json
{
  "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "text": "Buy groceries",
  "completed": false,
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "createdAt": "2026-03-09T10:05:00.000Z",
  "updatedAt": "2026-03-09T10:05:00.000Z"
}
```

**Response: 400 Bad Request**

```json
{
  "error": {
    "message": "Todo text is required",
    "code": "VALIDATION_ERROR"
  }
}
```

---

### PATCH /api/todos/:id

Update the `completed` status of a todo owned by the authenticated user.

**Request**

```
PATCH /api/todos/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "completed": true
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `completed` | boolean | Yes | `true` or `false` |

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | ID of the todo to update |

**Response: 200 OK**

```json
{
  "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "text": "Buy groceries",
  "completed": true,
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "createdAt": "2026-03-09T10:05:00.000Z",
  "updatedAt": "2026-03-09T10:15:00.000Z"
}
```

**Response: 404 Not Found** (does not exist or belongs to another user)

```json
{
  "error": {
    "message": "Todo not found",
    "code": "NOT_FOUND"
  }
}
```

---

### DELETE /api/todos/:id

Permanently delete a todo owned by the authenticated user.

**Request**

```
DELETE /api/todos/:id
Authorization: Bearer <token>
```

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | ID of the todo to delete |

**Response: 204 No Content**

Empty body. Deletion was successful.

**Response: 404 Not Found**

```json
{
  "error": {
    "message": "Todo not found",
    "code": "NOT_FOUND"
  }
}
```

---

## Health Check

### GET /health

Verify server and database connectivity. No authentication required.

**Response: 200 OK**

```json
{
  "status": "ok",
  "timestamp": "2026-03-09T10:00:00.000Z"
}
```

**Response: 503 Service Unavailable**

```json
{
  "status": "error",
  "message": "Database connection unavailable"
}
```

---

## Error Handling Summary

| Scenario | HTTP Status | Code |
|----------|-------------|------|
| Missing required field | 400 | `VALIDATION_ERROR` |
| Field fails validation rule | 400 | `VALIDATION_ERROR` |
| Email already registered | 409 | `EMAIL_TAKEN` |
| Wrong email or password | 401 | `INVALID_CREDENTIALS` |
| Missing Authorization header | 401 | `UNAUTHORIZED` |
| Expired JWT | 401 | `EXPIRED_TOKEN` |
| Todo ID not found (or wrong user) | 404 | `NOT_FOUND` |
| Database / unhandled error | 500 | `INTERNAL_ERROR` |

All 500 errors log the full stack trace server-side. The client only receives the human-readable message — no stack traces, database details, or internal paths are exposed.

---

## CORS Policy

- Development: `http://localhost:5173` (Vite dev server)
- Production: value of `CLIENT_ORIGIN` environment variable
- Allowed methods: `GET, POST, PATCH, DELETE, OPTIONS`
- Allowed headers: `Content-Type, Authorization`
