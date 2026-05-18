# FENNEKY XP System

## Overview

XP is a **global, non-spendable** reputation signal. It is separate from **Credits** (currency) and **Trust Score** (future).

- **Credits**: earned by teaching, spent to learn (`credit.service.js`)
- **XP**: earned when credits are earned from completed sessions (`1 credit = 10 XP`)
- **Levels**: Seed → Sprout → Grower → Builder → Guide → Oasis

## File structure

```
pfe-backend/
  src/
    constants/xp.js           # Level thresholds, sources, conversion rate
    services/xp.service.js      # calculateLevel, addXP, awardSessionCompletionXP
    controllers/xp.controller.js
    routes/xp.routes.js
    models/User.js              # xpTotal, level, levelTitle, xpHistory, lastXpGainAt
    models/Session.js           # xpAwarded (idempotency)
    services/session.service.js # XP hook on completeSession

pfe-frontend/
  src/
    api/client.js               # xpApi.getMe(), xpApi.getByUserId()
    component/XP/
      XPBadge.jsx
      XPProgressBar.jsx
      LevelCard.jsx
      XPHistoryList.jsx
      XP.css
    component/Dashboard/MySkills/MySkills.jsx  # Profile integration
```

## API endpoints

Base path: `/api/v1/xp` (Vite dev proxy forwards `/api` → `http://localhost:5000`).

### `GET /api/v1/xp/me` (authenticated)

**Response `data`:**

```json
{
  "userId": "USR-abc123",
  "xpTotal": 360,
  "level": 3,
  "levelTitle": "Grower",
  "currentLevelMinXP": 350,
  "nextLevelXP": 800,
  "progressPercent": 2.22,
  "isMaxLevel": false,
  "recentHistory": [
    {
      "amount": 10,
      "source": "session_completed",
      "sessionId": "SES-uuid",
      "description": "Earned from Python tutoring session",
      "createdAt": "2026-05-18T12:00:00.000Z"
    }
  ]
}
```

### `GET /api/v1/xp/:userId` (authenticated, public profile view)

Same shape as above **without** `recentHistory`.

## Level thresholds

| Level | XP range   | Title   |
|-------|------------|---------|
| 1     | 0–99       | Seed    |
| 2     | 100–349    | Sprout  |
| 3     | 350–799    | Grower  |
| 4     | 800–1499   | Builder |
| 5     | 1500–2999  | Guide   |
| 6     | 3000+      | Oasis   |

## Integration steps

1. **Start MongoDB** and the backend (`npm run dev` in `pfe-backend`).
2. **Existing users** get defaults (`xpTotal: 0`, `level: 1`, `levelTitle: Seed`) on next read/save.
3. **Complete a session** as teacher: `PATCH /api/v1/sessions/:id/complete` — credits transfer, then XP = `chargedCredits × 10`.
4. **Verify XP**: `GET /api/v1/xp/me` with Bearer token.
5. **Frontend**: open `/app/skills` — Level card and progress bar appear when XP loads.

## Security

- No public `POST/PATCH` for XP — only `xp.service.addXP` from trusted flows.
- Duplicate protection: `Session.xpAwarded` + `xpHistory` sessionId check for `session_completed`.
- Session completion runs inside a MongoDB transaction (credits + XP roll back together on failure).

## Future extensions

Add new sources in `constants/xp.js` (`bonus_event`, `challenge_reward`, etc.) and call `addXP(userId, amount, source, metadata)` from the relevant service.
