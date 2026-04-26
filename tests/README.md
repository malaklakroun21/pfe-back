# tests/

Test suites for the Skill Exchange backend API.

> **Status:** Scaffolded — test runner is configured but no test files have been written yet.

---

## Stack

| Tool         | Purpose                                      |
|--------------|----------------------------------------------|
| **Jest**     | Test runner, assertions, mocking             |
| **Supertest**| HTTP integration testing (fires real requests against the Express app) |

---

## Planned Structure

```
tests/
├── unit/
│   ├── services/
│   │   ├── auth.service.test.js
│   │   ├── user.service.test.js
│   │   └── credit.service.test.js
│   └── utils/
│       ├── ApiError.test.js
│       └── jwt.test.js
│
└── integration/
    ├── auth.routes.test.js
    ├── user.routes.test.js
    ├── project.routes.test.js
    └── session.routes.test.js
```

---

## Running Tests

```bash
npm test           # Run all tests once
npm run test:watch # Run in watch mode (re-runs on file save)
```

---

## Writing a Unit Test

Unit tests target service functions in isolation. Use Jest to mock model calls so no real database is needed.

```js
// tests/unit/services/user.service.test.js
const UserService = require('../../../src/services/user.service');
const User        = require('../../../src/models/User');

jest.mock('../../../src/models/User');

describe('UserService.getUserById', () => {
  it('throws 404 when user does not exist', async () => {
    User.findById.mockResolvedValue(null);
    await expect(UserService.getUserById('invalid-id'))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});
```

---

## Writing an Integration Test

Integration tests spin up the Express app and make real HTTP requests using Supertest. They connect to a test database.

```js
// tests/integration/auth.routes.test.js
const request = require('supertest');
const app     = require('../../src/app');

describe('POST /api/v1/auth/register', () => {
  it('returns 201 with a token on success', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123!',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeDefined();
  });
});
```

---

## Test Database

Set `MONGODB_URI` to a separate test database in your environment (e.g., `mongodb://localhost:27017/skill-exchange-test`) when running tests. Use `beforeAll` / `afterAll` hooks to connect and disconnect Mongoose.

---

## Coverage

```bash
npx jest --coverage
```

Coverage reports are written to `coverage/` (excluded from git via `.gitignore`).
