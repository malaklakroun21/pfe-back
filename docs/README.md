# docs/

Project documentation — API reference, architecture diagrams, and design decisions.

> **Status:** Planned — folder is scaffolded, documentation not yet written.

---

## Planned Contents

```
docs/
├── README.md           # This file — index of documentation
├── api/
│   ├── auth.md         # Auth endpoint reference
│   ├── users.md        # Users endpoint reference
│   ├── projects.md     # Projects endpoint reference
│   ├── sessions.md     # Sessions endpoint reference
│   └── messages.md     # Messages endpoint reference
│
├── architecture.md     # System architecture overview and diagrams
├── data-model.md       # Entity-relationship description and field definitions
└── credit-system.md    # How the credit/transaction system works
```

---

## API Documentation Format

Each endpoint document should follow this format:

````markdown
## POST /api/v1/auth/register

**Description:** Creates a new user account.

**Auth required:** No

**Request body:**
```json
{
  "name": "string (required)",
  "email": "string (required, valid email)",
  "password": "string (required, min 8 chars)"
}
```

**Success response — 201:**
```json
{
  "success": true,
  "data": {
    "token": "eyJ...",
    "user": { "id": "...", "name": "...", "email": "..." }
  }
}
```

**Error responses:**
- `400 VALIDATION_ERROR` — Invalid input
- `409 EMAIL_TAKEN` — Email already registered
````

---

## Architecture Overview

The backend follows a **3-layer architecture**:

```
┌────────────────────────────────────────────────┐
│                   HTTP Layer                   │
│   Routes + Controllers + Middleware            │
└────────────────┬───────────────────────────────┘
                 │
┌────────────────▼───────────────────────────────┐
│               Business Layer                   │
│                  Services                      │
└────────────────┬───────────────────────────────┘
                 │
┌────────────────▼───────────────────────────────┐
│                Data Layer                      │
│           Models + MongoDB                     │
└────────────────────────────────────────────────┘
```

See the root [README.md](../README.md) for the full tech stack and setup instructions.

---

## Data Model Overview

```
User
 ├── name, email, passwordHash
 ├── skills[]          (skills the user offers)
 ├── credits           (balance for skill exchanges)
 └── role              (user | admin)

Project
 ├── title, description
 ├── owner             → User
 ├── requiredSkill
 └── status

Session
 ├── project           → Project
 ├── teacher           → User
 ├── learner           → User
 ├── scheduledAt
 └── status            (pending | confirmed | completed | cancelled)

Message
 ├── sender            → User
 ├── receiver          → User
 ├── content
 └── readAt

Transaction
 ├── from              → User
 ├── to                → User
 ├── amount
 ├── type              (debit | credit)
 └── session           → Session
```
