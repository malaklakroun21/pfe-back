# src/routes/

Route definitions — maps HTTP methods and URL paths to controller functions, with middleware applied per-route or per-router.

---

## Files

| File                  | Mounted at             | Description                              |
|-----------------------|------------------------|------------------------------------------|
| `index.js`            | `/api/v1`              | Root router — imports and mounts all sub-routers |
| `auth.routes.js`      | `/api/v1/auth`         | Registration, login, token refresh       |
| `user.routes.js`      | `/api/v1/users`        | User profile CRUD                        |
| `project.routes.js`   | `/api/v1/projects`     | Project creation and management          |
| `session.routes.js`   | `/api/v1/sessions`     | Session scheduling and management        |
| `message.routes.js`   | `/api/v1/messages`     | Messaging between users                  |

---

## Planned Endpoints

### Auth — `/api/v1/auth`

| Method | Path              | Description                  | Auth Required |
|--------|-------------------|------------------------------|---------------|
| POST   | `/register`       | Create a new account         | No            |
| POST   | `/login`          | Authenticate and get token   | No            |
| POST   | `/logout`         | Invalidate session           | Yes           |
| POST   | `/refresh`        | Refresh JWT access token     | No            |

### Users — `/api/v1/users`

| Method | Path              | Description                  | Auth Required |
|--------|-------------------|------------------------------|---------------|
| GET    | `/`               | List/search users            | Yes           |
| GET    | `/:id`            | Get a user's public profile  | Yes           |
| PUT    | `/me`             | Update own profile           | Yes           |
| DELETE | `/me`             | Delete own account           | Yes           |

### Projects — `/api/v1/projects`

| Method | Path              | Description                  | Auth Required |
|--------|-------------------|------------------------------|---------------|
| GET    | `/`               | List all projects            | Yes           |
| POST   | `/`               | Create a project             | Yes           |
| GET    | `/:id`            | Get project details          | Yes           |
| PUT    | `/:id`            | Update a project             | Yes (owner)   |
| DELETE | `/:id`            | Delete a project             | Yes (owner)   |

### Sessions — `/api/v1/sessions`

| Method | Path              | Description                  | Auth Required |
|--------|-------------------|------------------------------|---------------|
| GET    | `/`               | List sessions for current user | Yes          |
| POST   | `/`               | Schedule a new session       | Yes           |
| GET    | `/:id`            | Get session details          | Yes           |
| PUT    | `/:id/status`     | Update session status        | Yes           |

### Messages — `/api/v1/messages`

| Method | Path              | Description                  | Auth Required |
|--------|-------------------|------------------------------|---------------|
| GET    | `/`               | Get user's conversations     | Yes           |
| POST   | `/`               | Send a message               | Yes           |
| GET    | `/:userId`        | Get thread with a user       | Yes           |

---

## Route File Pattern

```js
const express = require('express');
const router  = express.Router();
const protect = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { schema } = require('../validators/resource.validator');
const controller = require('../controllers/resource.controller');

router.post('/', protect, validate(schema), controller.create);
router.get('/:id', protect, controller.getOne);

module.exports = router;
```

---

## Registering a New Route File

In `routes/index.js`:

```js
const resourceRoutes = require('./resource.routes');
router.use('/resources', resourceRoutes);
```
