# src/controllers/

Controllers are the **HTTP layer** of the application. Each controller function:

1. Reads data from `req` (body, params, query, user)
2. Calls the corresponding **service** to execute business logic
3. Sends a JSON response via `res`

Controllers do **not** contain business logic or database queries — those belong in `services/`.

---

## Files

| File                      | Handles              |
|---------------------------|----------------------|
| `auth.controller.js`      | Register, login, logout, token refresh |
| `user.controller.js`      | Get/update/delete user profiles, list users |
| `project.controller.js`   | Create, read, update, delete projects |
| `session.controller.js`   | Schedule, join, complete skill-sharing sessions |
| `message.controller.js`   | Send and retrieve messages between users |

---

## Controller Pattern

Every controller function follows this structure:

```js
const asyncHandler = require('express-async-handler');
const SomeService  = require('../services/some.service');
const ApiResponse  = require('../utils/ApiResponse');

exports.doSomething = asyncHandler(async (req, res) => {
  const result = await SomeService.doSomething(req.body, req.user);
  res.status(200).json(new ApiResponse(200, result, 'Success'));
});
```

- Wrap with `express-async-handler` so any thrown error is forwarded to the global error middleware automatically.
- Use `ApiResponse` for consistent success response shape.
- Use `ApiError` (thrown from services) for consistent error responses.

---

## Response Shape

**Success:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "...",
  "data": { ... }
}
```

**Error (handled by error.middleware.js):**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found"
  }
}
```

---

## Adding a New Controller

1. Create `src/controllers/<resource>.controller.js`
2. Import the matching service from `src/services/`
3. Export named functions (one per route action)
4. Register the controller in `src/routes/<resource>.routes.js`
