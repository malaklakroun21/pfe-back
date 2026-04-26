# src/middleware/

Reusable Express middleware functions. Middleware runs between the router and the controller, handling cross-cutting concerns.

---

## Files

### `auth.middleware.js`

Protects routes that require authentication.

**How it works:**
1. Reads the `Authorization: Bearer <token>` header from the request
2. Verifies the JWT using `JWT_SECRET`
3. Fetches the user from the database and attaches them to `req.user`
4. Calls `next()` on success, or throws `ApiError(401)` on failure

**Usage:**
```js
router.get('/protected', protect, controller.handler);
```

---

### `role.middleware.js`

Restricts routes to users with specific roles (e.g., `admin`, `moderator`).

Must be used **after** `auth.middleware.js` (since it reads `req.user.role`).

**Usage:**
```js
router.delete('/:id', protect, restrictTo('admin'), controller.delete);
```

---

### `validate.middleware.js`

Validates request data (body, params, query) against a Joi schema before the controller runs.

Returns a `400 Bad Request` with a descriptive message if validation fails.

**Usage:**
```js
const { createProjectSchema } = require('../validators/project.validator');
router.post('/', protect, validate(createProjectSchema), controller.create);
```

---

### `error.middleware.js`

Global error handler — must be registered **last** in `app.js`.

Catches any error passed via `next(err)` or thrown inside an `asyncHandler`.

**Response shape:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found"
  },
  "stack": "..." // only in development
}
```

- Reads `statusCode`, `message`, and `code` from the error object
- Defaults to `500 / Internal Server Error / INTERNAL_ERROR` for unrecognised errors
- Logs the full error in development mode only

---

### `notFound.middleware.js`

Catches requests to undefined routes (registered just before the error handler in `app.js`).

Creates a `404 ApiError` and passes it to the error handler:
```
Cannot GET /api/v1/unknown-route → 404 Not Found
```

---

## Middleware Execution Order in `app.js`

```
helmet → cors → json → urlencoded → mongoSanitize → morgan
         ↓
       routes (auth, validate, controller)
         ↓
       notFound middleware
         ↓
       error middleware
```

---

## Adding New Middleware

1. Create `src/middleware/<name>.middleware.js`
2. Export a function with signature `(req, res, next) => {}`
3. Import and apply it in `app.js` (global) or in a specific router (scoped)
