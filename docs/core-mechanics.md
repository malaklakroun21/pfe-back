# Fenneky Core Mechanics

Trust score (per skill), credits, and XP work together. **XP is not recalculated here** — session settlement calls the existing `xp.service` after credits transfer (`1 credit earned = 10 XP` for the teacher).

## Architecture

```
pfe-backend/src/
├── constants/mechanics.js      # Tiers, badges, caps, multipliers
├── models/
│   ├── Skill.js                # Per-skill trust + tier + portfolio
│   ├── Session.js              # Dual confirmation + settlement flags
│   └── Endorsement.js          # Post-collaboration endorsements
├── services/
│   ├── trustScore.service.js
│   ├── credit.service.js
│   ├── endorsement.service.js
│   ├── skill.service.js
│   └── session.service.js      # confirm → credits → XP → trust
├── middleware/mentor.middleware.js
├── validators/mechanics.validator.js
└── routes/                     # Mounted under /api/v1
```

## Trust score (per skill)

**Formula:** `round(0.55 × P + 0.45 × E)`

| P (portfolio) | Condition |
|---------------|-----------|
| 0 | Nothing linked |
| 30 | 1 platform |
| 55 | 2 platforms |
| 75 | 2 platforms + active projects |
| 90–100 | Strong portfolio + Fenneky projects |

| E (endorsements count) | E score |
|------------------------|---------|
| 0 | 0 |
| 1–2 | 20–35 |
| 3–5 | 50–70 |
| 6–9 | 75–88 |
| 10+ | 90–100 |

**Badges & modifiers**

| Score | Badge | Modifier |
|-------|-------|----------|
| 0–24 | Unverified | ×1.0 |
| 25–49 | Bronze | ×1.05 |
| 50–74 | Silver | ×1.10 |
| 75–89 | Gold | ×1.20 |
| 90–100 | Verified | ×1.30 |

## Credits

**Formula:** `Credits = T × S × M`

- **T** — hours (max **4** per session)
- **S** — skill tier multiplier (mentor/admin assigns tier only)
- **M** — trust modifier from teacher’s skill badge

**Settlement:** Both `teacherConfirmed` and `learnerConfirmed` on an `ACCEPTED` session → transfer → XP (existing service) → `endorsementsUnlocked`.

**Anti-abuse:** Unverified teachers capped at **5 credits/week** earned; duplicate confirmations and XP awards blocked on the session document.

## API (prefix `/api/v1`, JWT required)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/sessions/confirm` | Body: `{ sessionId, actualDuration? }` |
| PATCH | `/sessions/:id/complete` | Teacher confirm (legacy; waits for learner) |
| POST | `/endorsements` | Body: `{ toUserId, sessionId \| projectId, skillId?, message? }` |
| GET | `/trust/:userId` | Trust profile by skill |
| GET | `/skills/:userId` | Same skill list with trust fields |
| PATCH | `/skills/:skillId/tier` | Mentor/admin only |
| PATCH | `/skills/:skillId/platforms` | Owner updates `linkedPlatforms` |
| GET | `/credits/me` | Balance, weekly cap, history, XP summary |

### Example: dual confirm (first party)

```json
POST /api/v1/sessions/confirm
{ "sessionId": "sess_abc123" }

{
  "success": true,
  "data": {
    "sessionId": "sess_abc123",
    "status": "ACCEPTED",
    "teacherConfirmed": true,
    "learnerConfirmed": false
  }
}
```

### Example: after both confirm

```json
{
  "status": "COMPLETED",
  "teacherConfirmed": true,
  "learnerConfirmed": true,
  "chargedCredits": 7.2,
  "creditBreakdown": {
    "hours": 2,
    "skillTier": "INTERMEDIATE",
    "trustModifier": 1.2,
    "calculatedCredits": 7.2
  },
  "xpAwarded": true,
  "endorsementsUnlocked": true
}
```

### Example: GET `/credits/me`

```json
{
  "balance": 42,
  "weeklyEarned": 3,
  "weeklyCap": 5,
  "earned": 120,
  "spent": 78,
  "xp": { "xpTotal": 420, "level": 3, "levelTitle": "Sprout" }
}
```

## Frontend (`pfe-frontend`)

- `src/component/Mechanics/` — TrustBadge, SkillCard, CreditsCard, SessionConfirmationCard, EndorsementModal
- Profile (`MySkills.jsx`) — XP level, credits card, per-skill trust
- Sessions (`MySessionsPanel.jsx`) — dual confirmation UI

## Integration checklist

1. Ensure skills exist for teachers (`Skill` documents with `skillTier`, `linkedPlatforms`).
2. Complete sessions via **both** confirmations (UI or `POST /sessions/confirm`).
3. Endorse only after `endorsementsUnlocked` on a completed session/project.
4. Assign tiers via mentor/admin: `PATCH /skills/:skillId/tier`.
5. Do **not** write to `xpTotal` directly — use session completion flow only.
