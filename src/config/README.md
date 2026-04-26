# src/config/

Application-level configuration and external connection setup.

---

## Files

### `db.js`

Establishes the MongoDB connection using Mongoose.

```js
const connectDB = require('./config/db');
await connectDB(); // called once in server.js before app.listen()
```

- Reads `MONGODB_URI` from the environment (set in `.env`)
- On success: logs the connected host
- On failure: logs the error and exits the process (`process.exit(1)`) — the server should not run without a database

### `env.js`

Reserved for centralised environment variable validation/export. Currently empty.

**Planned use:** parse and validate all `process.env` values in one place and export typed constants, so the rest of the app imports from `config/env` rather than accessing `process.env` directly.

---

## Environment Variables Used Here

| Variable      | Used in  | Purpose                        |
|---------------|----------|--------------------------------|
| `MONGODB_URI` | `db.js`  | Full MongoDB connection string |

See the root [`.env.example`](../../.env.example) for all required variables.

---

## Adding New Config

If you need to add a new external service (Redis, email provider, etc.):

1. Create a new file in this folder (e.g., `redis.js`)
2. Export a single connect/init function
3. Call it in `server.js` alongside `connectDB()`
4. Add the required environment variables to `.env.example`
