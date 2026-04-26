# src/models/

Mongoose model definitions. Each file exports a compiled Mongoose model that maps to a MongoDB collection.

---

## Files

| File               | Collection        | Description                                          |
|--------------------|-------------------|------------------------------------------------------|
| `User.js`          | `users`           | Platform user — profile, skills, credits, roles     |
| `Project.js`       | `projects`        | A skill-exchange project posted by a user            |
| `Session.js`       | `sessions`        | A scheduled meeting between users to exchange skills |
| `Message.js`       | `messages`        | Direct messages between users                        |
| `Transaction.js`   | `transactions`    | Credit movements (earn/spend) between users          |

---

## Domain Overview

```
User ──────────────── posts ──────────────▶ Project
  │                                            │
  │ schedules                          attracts│
  ▼                                            ▼
Session ◀──────────────────────────────── User
  │
  │ triggers
  ▼
Transaction (credit debit/credit between participants)

User ──── sends ────▶ Message ◀──── receives ──── User
```

---

## Model Conventions

- **Timestamps:** All models should include `{ timestamps: true }` in the schema options to automatically get `createdAt` and `updatedAt` fields.
- **References:** Use `mongoose.Schema.Types.ObjectId` with `ref: 'ModelName'` for relationships. Always use `.populate()` in services when you need the referenced document.
- **Validation:** Basic type/required constraints live in the schema. Complex cross-field or business validation belongs in the service layer.
- **Indexes:** Add indexes for fields that are frequently queried or filtered (e.g., `userId`, `status`, `createdAt`).

---

## Example Model Structure

```js
const mongoose = require('mongoose');

const exampleSchema = new mongoose.Schema(
  {
    field: { type: String, required: true, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Example', exampleSchema);
```

---

## Adding a New Model

1. Create `src/models/<Resource>.js` using PascalCase
2. Define the schema with proper types, validations, and indexes
3. Export `mongoose.model('ResourceName', schema)`
4. Import and use it in the corresponding service file
