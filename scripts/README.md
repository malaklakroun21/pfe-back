# scripts/

Operational scripts for local development and maintenance tasks.

---

## Files

| File      | Responsibility                                                |
|-----------|----------------------------------------------------------------|
| `seed.js` | Populates MongoDB with a coherent development dataset for the platform |

---

## Seeding the Database

```bash
npm run seed
```

This creates or updates a demo dataset with:

- countries and cities
- admin, mentor, and learner accounts
- learner, mentor, and admin profile records
- skill categories, skills, mentor skills, and validation data
- sessions, conversations, messages, credits, notifications, and statistics

To clear the seeded collections before inserting the demo dataset:

```bash
npm run seed:reset
```

---

## Environment

The script reads the same `MONGODB_URI` as the application and supports an optional `SEED_DEFAULT_PASSWORD` variable for demo accounts.
