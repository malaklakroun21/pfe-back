# src/validators/

[Joi](https://joi.dev/) schema definitions for validating incoming HTTP request data (body, params, query).

Validators are **pure schema objects** — they contain no logic. The `validate.middleware.js` runs them before the request reaches a controller.

---

## Files

| File                     | Validates requests for          |
|--------------------------|---------------------------------|
| `auth.validator.js`      | `/api/v1/auth` routes           |
| `user.validator.js`      | `/api/v1/users` routes          |
| `project.validator.js`   | `/api/v1/projects` routes       |
| `session.validator.js`   | `/api/v1/sessions` routes       |

---

## Pattern

Each file exports named Joi schemas, one per request type:

```js
const Joi = require('joi');

const registerSchema = Joi.object({
  name:     Joi.string().min(2).max(50).required(),
  email:    Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
});

module.exports = { registerSchema, loginSchema };
```

---

## Using a Schema in a Route

```js
const { registerSchema } = require('../validators/auth.validator');
const validate = require('../middleware/validate.middleware');

router.post('/register', validate(registerSchema), authController.register);
```

When validation fails, `validate.middleware.js` responds immediately with:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "\"email\" must be a valid email address"
  }
}
```

---

## Validation Rules Reference

| Field type    | Common rules                                   |
|---------------|------------------------------------------------|
| String        | `.min()`, `.max()`, `.trim()`, `.email()`      |
| Number        | `.min()`, `.max()`, `.integer()`               |
| ObjectId ref  | `Joi.string().hex().length(24)`                |
| Enum          | `.valid('a', 'b', 'c')`                        |
| Optional field| `.optional()` or omit `.required()`            |

---

## Principle

Validators enforce **shape and format** of the input. They do **not** check business rules such as "does this email already exist" — that check belongs in the service layer.
