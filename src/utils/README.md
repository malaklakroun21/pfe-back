# src/utils/

Pure helper modules with no side effects. These are shared across the entire application.

---

## Files

### `ApiError.js`

Custom error class used throughout the app to signal expected (operational) failures.

```js
class ApiError extends Error {
  constructor(statusCode, message, code = 'ERROR')
}
```

| Parameter    | Type   | Example                       |
|--------------|--------|-------------------------------|
| `statusCode` | Number | `404`, `401`, `400`           |
| `message`    | String | `'User not found'`            |
| `code`       | String | `'USER_NOT_FOUND'` (optional) |

**Usage:**
```js
const ApiError = require('../utils/ApiError');

if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
```

The global `error.middleware.js` reads these properties to build the error response. The `isOperational: true` flag distinguishes expected errors from unexpected ones (for monitoring/alerting purposes).

---

### `ApiResponse.js`

Standardises the shape of all successful responses.

**Planned structure:**
```js
class ApiResponse {
  constructor(statusCode, data, message = 'Success')
}
// → { success: true, statusCode, message, data }
```

**Usage in controllers:**
```js
res.status(200).json(new ApiResponse(200, user, 'User fetched'));
```

---

### `jwt.js`

Wraps `jsonwebtoken` to provide simple sign/verify helpers.

**Planned exports:**
```js
generateToken(payload)   // signs and returns a JWT string
verifyToken(token)       // verifies and returns the decoded payload
```

---

### `hash.js`

Wraps `bcryptjs` to provide simple password hashing helpers.

**Planned exports:**
```js
hashPassword(plain)           // hashes a plain-text password
comparePassword(plain, hash)  // returns true/false
```

---

### `logger.js`

Application-level logger. Wraps `console` or a logging library (e.g., Winston) for structured log output.

**Planned exports:**
```js
logger.info('message')
logger.warn('message')
logger.error('message')
```

---

## Conventions

- Utils are stateless — they take inputs and return outputs with no side effects
- They must never import from controllers, services, routes, or middleware
- They may import from each other (e.g., `auth.service.js` uses both `jwt.js` and `hash.js`)
