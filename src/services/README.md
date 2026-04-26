# src/services/

The **business logic layer**. Services are the heart of the application — they contain all meaningful operations, database interactions, and domain rules.

Controllers call services. Services call models. Services never touch `req` or `res`.

---

## Files

| File                 | Responsibility                                                 |
|----------------------|----------------------------------------------------------------|
| `auth.service.js`    | Register user, validate credentials, generate/verify tokens   |
| `user.service.js`    | Find, update, and delete user records; skill management        |
| `project.service.js` | Create, query, and manage skill-exchange projects             |
| `session.service.js` | Schedule sessions, update status, notify participants          |
| `credit.service.js`  | Credit balance management and transaction recording            |

---

## Why a Service Layer?

| Without services                        | With services                           |
|-----------------------------------------|-----------------------------------------|
| Business logic scattered in controllers | Logic centralised and reusable          |
| Hard to unit-test (coupled to HTTP)     | Easy to test in isolation               |
| Duplicate code across controllers       | One service function called from many places |

---

## Service Pattern

```js
const User    = require('../models/User');
const ApiError = require('../utils/ApiError');

const getUserById = async (id) => {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  return user;
};

module.exports = { getUserById };
```

Key rules:
- Export plain async functions (no classes required)
- Throw `ApiError` for expected failures (not found, unauthorized, conflict)
- Let unexpected errors (DB crash, etc.) propagate naturally — the global error handler catches them

---

## `credit.service.js` — Credit System

The platform uses a credit system for skill exchanges:

- A user earns credits by teaching/sharing a skill
- A user spends credits to receive a skill from another user
- Every debit/credit pair is recorded as a `Transaction` document

This service is responsible for:
1. Checking sufficient balance before a session
2. Atomically debiting one user and crediting another
3. Creating a `Transaction` record for audit/history

---

## Adding a New Service

1. Create `src/services/<resource>.service.js`
2. Import the relevant Mongoose models
3. Export named async functions
4. Import and use them in the matching controller
