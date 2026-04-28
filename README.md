# Skill Exchange — Backend API

A RESTful backend API for a **Skill Exchange Platform** where users can offer, discover, and trade skills with one another. Built with Node.js, Express, and MongoDB.

> **PFE Project** — Final Year Engineering Project

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

The Skill Exchange Platform allows users to:

- Register and manage their profile with a set of skills they offer
- Browse and search other users' skills
- Create and manage projects/sessions for skill-sharing
- Exchange messages with other users
- Handle a credit-based transaction system for skill trades

This repository contains the **backend API** only. The frontend client connects to this API at `/api/v1`.

---

## Tech Stack

| Layer          | Technology                        |
|----------------|-----------------------------------|
| Runtime        | Node.js                           |
| Framework      | Express.js v5                     |
| Database       | MongoDB (via Mongoose v9)         |
| Authentication | JSON Web Tokens (JWT)             |
| Validation     | Joi                               |
| Security       | Helmet, CORS, express-mongo-sanitize, express-rate-limit |
| Logging        | Morgan                            |
| Dev Tools      | Nodemon, ESLint, Prettier, Jest   |

---

## Architecture

The project follows a layered **MVC + Service** architecture:

```
Request → Router → Middleware → Controller → Service → Model → Database
                                                             ↓
                                                         Response
```

- **Routes** — define endpoints and attach middleware/controllers
- **Controllers** — handle HTTP request/response logic
- **Services** — contain the core business logic (reusable, testable)
- **Models** — define MongoDB schemas and data structure
- **Middleware** — cross-cutting concerns (auth, validation, error handling)
- **Utils** — shared helpers (ApiError, ApiResponse, JWT, hashing)

---

## Getting Started

### Prerequisites

- Node.js >= 18.x
- MongoDB >= 6.x (local or Atlas)
- npm >= 9.x

### Installation

```bash
# Clone the repository
git clone https://github.com/malaklakroun21/pfe-back.git
cd pfe-back

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values (see Environment Variables section below)

# Optional: seed the database with demo data
npm run seed

# Start development server
npm run dev
```

The server starts on `http://localhost:5000` by default.

### Health Check

```
GET http://localhost:5000/health
→ { "success": true, "message": "Server is running" }
```

---

## Project Structure

```
pfe-back/
├── server.js               # Entry point — connects DB and starts server
├── package.json
├── .env.example            # Environment variable template
├── .eslintrc.json          # Linting rules
├── .prettierrc             # Code formatting rules
├── scripts/                # Operational scripts (database seeding, maintenance)
│
├── src/
│   ├── app.js              # Express app setup (middleware, routes)
│   ├── config/             # DB connection and environment config
│   ├── controllers/        # Route handler functions (HTTP layer)
│   ├── models/             # Mongoose schemas and models
│   ├── routes/             # Express routers (URL → controller mapping)
│   ├── services/           # Business logic layer
│   ├── middleware/         # Auth, validation, error handling
│   ├── utils/              # Shared helpers (ApiError, JWT, hash)
│   ├── validators/         # Joi request validation schemas
│   └── sockets/            # WebSocket handlers (planned)
│
├── tests/                  # Test suites (Jest + Supertest)
└── docs/                   # API and architecture documentation
```

See each folder's own `README.md` for details on its contents and conventions.

---

## API Reference

All endpoints are prefixed with `/api/v1`.

| Resource     | Base Path           | Description                        |
|--------------|---------------------|------------------------------------|
| Auth         | `/api/v1/auth`      | Register, login, refresh tokens    |
| Users        | `/api/v1/users`     | User profiles and skills           |
| Projects     | `/api/v1/projects`  | Skill-exchange project management  |
| Sessions     | `/api/v1/sessions`  | Scheduled skill-sharing sessions   |
| Messages     | `/api/v1/messages`  | User-to-user messaging             |

> Full endpoint documentation will be available in [docs/](./docs/).

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

| Variable       | Default                                    | Description                          |
|----------------|--------------------------------------------|--------------------------------------|
| `NODE_ENV`     | `development`                              | Runtime environment                  |
| `PORT`         | `5000`                                     | HTTP port the server listens on      |
| `MONGODB_URI`  | `mongodb://localhost:27017/skill-exchange` | MongoDB connection string            |
| `JWT_SECRET`   | *(required)*                               | Secret key for signing JWT tokens    |
| `JWT_EXPIRE`   | `7d`                                       | Token expiration duration            |
| `CLIENT_URL`   | `http://localhost:3000`                    | Allowed CORS origin (frontend URL)   |
| `BCRYPT_SALT_ROUNDS` | `10`                               | Number of bcrypt hashing rounds      |

---

## Scripts

```bash
npm start          # Start production server (node server.js)
npm run dev        # Start development server with auto-reload (nodemon)
npm run seed       # Create or update the demo database seed
npm run seed:reset # Clear seeded collections, then insert demo data
npm test           # Run test suite (Jest)
npm run test:watch # Run tests in watch mode
npm run lint       # Lint source files with ESLint
npm run lint:fix   # Auto-fix linting issues
npm run format     # Format source files with Prettier
```

---

## Security

The API applies the following security measures out of the box:

- **Helmet** — sets secure HTTP response headers
- **CORS** — restricts requests to the configured `CLIENT_URL`
- **express-mongo-sanitize** — strips `$` operators from user input to prevent NoSQL injection
- **express-rate-limit** — limits repeated requests to prevent brute-force attacks
- **bcryptjs** — hashes passwords before storing them
- **JWT** — stateless authentication with signed tokens
- **Request size limit** — JSON bodies capped at 10 KB

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes following the project's ESLint and Prettier rules
4. Open a pull request against `main`

Please read the folder-level `README.md` files to understand conventions before adding code.

---

## License

MIT — see [LICENSE](./LICENSE) for details.
