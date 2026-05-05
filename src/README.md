# src/

This is the main source directory. Everything inside here is the application code loaded by `server.js`.

---

## Entry Point

`app.js` — creates and configures the Express application:

1. Applies security middleware (Helmet, CORS, mongo-sanitize)
2. Applies request parsers (JSON, URL-encoded)
3. Enables Morgan HTTP logging in development
4. Registers the `/health` endpoint
5. Mounts all API routes under `/api/v1`
6. Attaches the 404 and global error handlers (must be last)

`server.js` (root) calls `connectDB()` then `app.listen()`.

---

## Folder Map

| Folder          | Responsibility                                             |
|-----------------|------------------------------------------------------------|
| `config/`       | Database connection and environment setup                  |
| `controllers/`  | HTTP layer — reads req, calls service, sends res           |
| `models/`       | Mongoose schemas and model definitions                     |
| `routes/`       | URL-to-controller mapping, middleware attachment           |
| `services/`     | Business logic — all database operations live here        |
| `middleware/`   | Reusable Express middleware (auth, validation, errors)     |
| `utils/`        | Pure helper functions (ApiError, ApiResponse, JWT, hash)   |
| `validators/`   | Joi schemas for validating incoming request bodies/params  |
| `sockets/`      | Socket.io event handlers for chat, presence, and sessions  |

---

## Request Lifecycle

```
Incoming HTTP Request
        │
        ▼
  app.js middleware
  (helmet, cors, json parser, mongo-sanitize)
        │
        ▼
  routes/index.js  →  routes/<resource>.routes.js
        │
        ▼
  middleware (auth, validate)
        │
        ▼
  controllers/<resource>.controller.js
        │
        ▼
  services/<resource>.service.js
        │
        ▼
  models/<Resource>.js  ──▶  MongoDB
        │
        ▼
  ApiResponse / ApiError
        │
        ▼
  HTTP Response (JSON)
```

Errors thrown anywhere in the chain bubble up to `middleware/error.middleware.js` via Express's `next(err)`.

---

## Conventions

- All controllers use `express-async-handler` (or try/catch) so async errors reach the error middleware automatically.
- Throw `new ApiError(statusCode, message, code)` from services/controllers for expected errors (e.g., 404, 401).
- Unexpected errors (e.g., DB crash) are caught by the global error handler and returned as `500`.
- Never put business logic in controllers — keep them thin. Move it to the corresponding service.
- Never put HTTP logic (req/res) in services — they must be framework-agnostic.
