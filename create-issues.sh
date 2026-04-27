#!/bin/bash

# ==============================================================================
# create-issues.sh
# Creates GitHub labels, milestones, and issues for the pfe-back repository.
# Requires: GitHub CLI (gh) authenticated with repo write access.
# ==============================================================================

set -euo pipefail

# ── Confirmation prompt ────────────────────────────────────────────────────────
echo "========================================================"
echo "  GitHub Issues Bootstrap for pfe-back"
echo "========================================================"
echo ""
echo "This script will create:"
echo "  • 10 labels"
echo "  • 5 milestones"
echo "  • 42 issues"
echo ""
read -r -p "Continue? [y/N] " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi
echo ""

# ── Helpers ────────────────────────────────────────────────────────────────────
REPO="${GH_REPO:-}"  # optional override; gh falls back to the current repo

gh_label() {
  local name="$1" color="$2"
  if [ -n "$REPO" ]; then
    gh label create "$name" --color "$color" --repo "$REPO" --force 2>/dev/null || true
  else
    gh label create "$name" --color "$color" --force 2>/dev/null || true
  fi
}

# Returns the milestone number for a given title (creates it first if needed).
# Usage: MILESTONE_NUM=$(gh_milestone_number "Setup" "2026-05-02T00:00:00Z")
gh_milestone_number() {
  local title="$1" due="$2"
  local repo_flag=""
  [ -n "$REPO" ] && repo_flag="--repo $REPO"

  # Try to create; if it already exists we just look it up.
  # shellcheck disable=SC2086
  gh api \
    --method POST \
    $repo_flag \
    repos/{owner}/{repo}/milestones \
    --field title="$title" \
    --field due_on="$due" \
    --jq '.number' 2>/dev/null \
  || \
  gh api \
    $repo_flag \
    repos/{owner}/{repo}/milestones \
    --jq ".[] | select(.title==\"$title\") | .number"
}

gh_issue() {
  local title="$1" body="$2" labels="$3" milestone_num="$4"
  local repo_flag=""
  [ -n "$REPO" ] && repo_flag="--repo $REPO"

  # shellcheck disable=SC2086
  gh issue create \
    $repo_flag \
    --title "$title" \
    --body "$body" \
    --label "$labels" \
    --milestone "$milestone_num"
}

# ── Due dates (relative to today) ─────────────────────────────────────────────
DUE_SETUP=$(date -u -d "+5 days"  "+%Y-%m-%dT00:00:00Z" 2>/dev/null \
            || date -u -v+5d      "+%Y-%m-%dT00:00:00Z")
DUE_AUTH=$(date -u -d "+14 days" "+%Y-%m-%dT00:00:00Z" 2>/dev/null \
            || date -u -v+14d     "+%Y-%m-%dT00:00:00Z")
DUE_SESS=$(date -u -d "+21 days" "+%Y-%m-%dT00:00:00Z" 2>/dev/null \
            || date -u -v+21d     "+%Y-%m-%dT00:00:00Z")
DUE_PROJ=$(date -u -d "+28 days" "+%Y-%m-%dT00:00:00Z" 2>/dev/null \
            || date -u -v+28d     "+%Y-%m-%dT00:00:00Z")
DUE_TEST=$(date -u -d "+30 days" "+%Y-%m-%dT00:00:00Z" 2>/dev/null \
            || date -u -v+30d     "+%Y-%m-%dT00:00:00Z")

# ==============================================================================
# 1. LABELS
# ==============================================================================
echo "── Creating labels ──────────────────────────────────────"
gh_label "priority-high"   "D93F0B" && echo "  ✔ priority-high"
gh_label "priority-medium" "FBCA04" && echo "  ✔ priority-medium"
gh_label "priority-low"    "0E8A16" && echo "  ✔ priority-low"
gh_label "setup"           "C5DEF5" && echo "  ✔ setup"
gh_label "feature"         "A2EEEF" && echo "  ✔ feature"
gh_label "auth"            "F9D0C4" && echo "  ✔ auth"
gh_label "database"        "5319E7" && echo "  ✔ database"
gh_label "api"             "BFD4F2" && echo "  ✔ api"
gh_label "testing"         "1D76DB" && echo "  ✔ testing"
gh_label "documentation"   "0075CA" && echo "  ✔ documentation"
echo ""

# ==============================================================================
# 2. MILESTONES
# ==============================================================================
echo "── Creating milestones ──────────────────────────────────"
MS_SETUP=$(gh_milestone_number "Setup"                  "$DUE_SETUP")
echo "  ✔ Setup (milestone #${MS_SETUP})"
MS_AUTH=$(gh_milestone_number  "Auth & Users"           "$DUE_AUTH")
echo "  ✔ Auth & Users (milestone #${MS_AUTH})"
MS_SESS=$(gh_milestone_number  "Sessions & Credits"     "$DUE_SESS")
echo "  ✔ Sessions & Credits (milestone #${MS_SESS})"
MS_PROJ=$(gh_milestone_number  "Projects & Messaging"   "$DUE_PROJ")
echo "  ✔ Projects & Messaging (milestone #${MS_PROJ})"
MS_TEST=$(gh_milestone_number  "Testing & Polish"       "$DUE_TEST")
echo "  ✔ Testing & Polish (milestone #${MS_TEST})"
echo ""

# ==============================================================================
# 3. ISSUES
# ==============================================================================
echo "── Creating issues ──────────────────────────────────────"

# ── Setup ─────────────────────────────────────────────────────────────────────
echo "  [Setup]"

gh_issue \
  "Initialize project and install dependencies" \
  "Set up Node.js project with Express, Mongoose, and required packages.

Tasks:
- npm init
- Install: express, mongoose, dotenv, bcryptjs, jsonwebtoken, cors, helmet, joi
- Install dev: nodemon, jest, supertest
- Add scripts: dev, start, test" \
  "setup,priority-high" "$MS_SETUP"
echo "    ✔ Initialize project and install dependencies"

gh_issue \
  "Create folder structure" \
  "Create folders: src/{config,models,controllers,services,routes,middleware,utils}, tests/
Add placeholder files for each module." \
  "setup,priority-high" "$MS_SETUP"
echo "    ✔ Create folder structure"

gh_issue \
  "Configure MongoDB connection" \
  "Create src/config/db.js to connect to MongoDB using MONGODB_URI from .env.
Handle connection errors and log success." \
  "setup,database,priority-high" "$MS_SETUP"
echo "    ✔ Configure MongoDB connection"

gh_issue \
  "Set up .env and .env.example" \
  "Create .env.example with: PORT, MONGODB_URI, JWT_SECRET, JWT_EXPIRE, CLIENT_URL.
Add .env to .gitignore." \
  "setup,priority-high" "$MS_SETUP"
echo "    ✔ Set up .env and .env.example"

gh_issue \
  "Set up Express app with middleware" \
  "Configure src/app.js with: cors, helmet, express.json, morgan (dev only).
Add /health endpoint. Mount routes under /api/v1." \
  "setup,priority-high" "$MS_SETUP"
echo "    ✔ Set up Express app with middleware"

gh_issue \
  "Add error handling middleware" \
  "Create global error handler and 404 handler.
Standardize response format: { success, data, message } / { success: false, error }." \
  "setup,priority-high" "$MS_SETUP"
echo "    ✔ Add error handling middleware"

gh_issue \
  "Write README with setup instructions" \
  "Document: project description, tech stack, setup steps, scripts, folder structure, branching workflow." \
  "setup,documentation" "$MS_SETUP"
echo "    ✔ Write README with setup instructions"

# ── Auth & Users ──────────────────────────────────────────────────────────────
echo "  [Auth & Users]"

gh_issue \
  "Create User model" \
  "Fields: name, email (unique), password, role (user/mentor/admin), bio, skillsOffered, skillsWanted, credits (default 10), rating, createdAt.
Hash password before save. Add comparePassword method." \
  "feature,database,auth,priority-high" "$MS_AUTH"
echo "    ✔ Create User model"

gh_issue \
  "Implement register endpoint" \
  "POST /api/v1/auth/register
Validate input, check email uniqueness, hash password, return user + JWT." \
  "feature,auth,api,priority-high" "$MS_AUTH"
echo "    ✔ Implement register endpoint"

gh_issue \
  "Implement login endpoint" \
  "POST /api/v1/auth/login
Validate input, check credentials, return user + JWT." \
  "feature,auth,api,priority-high" "$MS_AUTH"
echo "    ✔ Implement login endpoint"

gh_issue \
  "Build auth middleware (JWT verification)" \
  "Verify JWT from Authorization header, attach user to req.user.
Return 401 if invalid or missing." \
  "feature,auth,priority-high" "$MS_AUTH"
echo "    ✔ Build auth middleware (JWT verification)"

gh_issue \
  "Build role-based authorization middleware" \
  "authorize(...roles) middleware. Returns 403 if user role not allowed." \
  "feature,auth,priority-high" "$MS_AUTH"
echo "    ✔ Build role-based authorization middleware"

gh_issue \
  "Build user profile endpoints" \
  "- GET /api/v1/users/me — current user
- PUT /api/v1/users/me — update profile (name, bio only)
- GET /api/v1/users/:id — public profile
- GET /api/v1/users — search/list users" \
  "feature,api,priority-high" "$MS_AUTH"
echo "    ✔ Build user profile endpoints"

gh_issue \
  "Build skills management endpoints" \
  "- POST/DELETE /api/v1/users/me/skills/offered
- POST/DELETE /api/v1/users/me/skills/wanted" \
  "feature,api,priority-medium" "$MS_AUTH"
echo "    ✔ Build skills management endpoints"

gh_issue \
  "Build admin user management endpoints" \
  "Admin only:
- GET /api/v1/admin/users
- PATCH /api/v1/admin/users/:id/role
- DELETE /api/v1/admin/users/:id" \
  "feature,api,priority-medium" "$MS_AUTH"
echo "    ✔ Build admin user management endpoints"

# ── Sessions & Credits ────────────────────────────────────────────────────────
echo "  [Sessions & Credits]"

gh_issue \
  "Create Session model" \
  "Fields: requester, provider, skill, scheduledAt, duration, creditsAmount, status (pending/accepted/rejected/completed/cancelled), createdAt." \
  "feature,database,priority-high" "$MS_SESS"
echo "    ✔ Create Session model"

gh_issue \
  "Create Transaction model for credit history" \
  "Fields: fromUser, toUser, amount, type, sessionId, createdAt.
Append-only log of all credit movements." \
  "feature,database,priority-high" "$MS_SESS"
echo "    ✔ Create Transaction model for credit history"

gh_issue \
  "Build credit transfer service" \
  "transferCredits(fromUserId, toUserId, amount, sessionId).
Use MongoDB transactions for atomicity.
Validate sufficient balance. Log to Transaction collection." \
  "feature,priority-high" "$MS_SESS"
echo "    ✔ Build credit transfer service"

gh_issue \
  "Build session request endpoint" \
  "POST /api/v1/sessions
Validate requester has enough credits. Create session with status 'pending'." \
  "feature,api,priority-high" "$MS_SESS"
echo "    ✔ Build session request endpoint"

gh_issue \
  "Build session accept/reject endpoints" \
  "- PATCH /api/v1/sessions/:id/accept (provider only)
- PATCH /api/v1/sessions/:id/reject (provider only)" \
  "feature,api,priority-high" "$MS_SESS"
echo "    ✔ Build session accept/reject endpoints"

gh_issue \
  "Build session complete endpoint" \
  "PATCH /api/v1/sessions/:id/complete
Both parties confirm. Transfer credits on completion." \
  "feature,api,priority-high" "$MS_SESS"
echo "    ✔ Build session complete endpoint"

gh_issue \
  "Build session cancel endpoint" \
  "PATCH /api/v1/sessions/:id/cancel
Either party can cancel before completion." \
  "feature,api,priority-medium" "$MS_SESS"
echo "    ✔ Build session cancel endpoint"

gh_issue \
  "Build session listing endpoint" \
  "GET /api/v1/sessions/me
Filter by role (requester/provider) and status." \
  "feature,api,priority-high" "$MS_SESS"
echo "    ✔ Build session listing endpoint"

gh_issue \
  "Build rating system" \
  "POST /api/v1/sessions/:id/rate
Only after session completed. Update target user's rating average." \
  "feature,api,priority-medium" "$MS_SESS"
echo "    ✔ Build rating system"

gh_issue \
  "Build credit history endpoint" \
  "GET /api/v1/users/me/transactions
Paginated list of user's credit movements." \
  "feature,api,priority-medium" "$MS_SESS"
echo "    ✔ Build credit history endpoint"

# ── Projects & Messaging ──────────────────────────────────────────────────────
echo "  [Projects & Messaging]"

gh_issue \
  "Create Project model" \
  "Fields: title, description, owner, skillsRequired, members, maxMembers, status, createdAt." \
  "feature,database,priority-high" "$MS_PROJ"
echo "    ✔ Create Project model"

gh_issue \
  "Build project CRUD endpoints" \
  "- POST /api/v1/projects
- GET /api/v1/projects
- GET /api/v1/projects/:id
- PUT /api/v1/projects/:id (owner only)
- DELETE /api/v1/projects/:id (owner only)" \
  "feature,api,priority-high" "$MS_PROJ"
echo "    ✔ Build project CRUD endpoints"

gh_issue \
  "Build project join/leave endpoints" \
  "- POST /api/v1/projects/:id/join
- POST /api/v1/projects/:id/leave
- DELETE /api/v1/projects/:id/members/:userId (owner only)" \
  "feature,api,priority-high" "$MS_PROJ"
echo "    ✔ Build project join/leave endpoints"

gh_issue \
  "Create Message model" \
  "Fields: sender, receiver, content, read, createdAt.
Index on [sender, receiver] for fast lookups." \
  "feature,database,priority-high" "$MS_PROJ"
echo "    ✔ Create Message model"

gh_issue \
  "Build messaging endpoints" \
  "- POST /api/v1/messages — send message
- GET /api/v1/messages/conversations — list of chats
- GET /api/v1/messages/with/:userId — conversation with user
- PATCH /api/v1/messages/:id/read — mark as read" \
  "feature,api,priority-high" "$MS_PROJ"
echo "    ✔ Build messaging endpoints"

gh_issue \
  "(Optional) Add Socket.io for real-time chat" \
  "Set up Socket.io. Authenticate sockets via JWT. Emit messages to recipient in real-time.
Skip if running short on time — polling works for MVP." \
  "feature,priority-low" "$MS_PROJ"
echo "    ✔ (Optional) Add Socket.io for real-time chat"

# ── Testing & Polish ──────────────────────────────────────────────────────────
echo "  [Testing & Polish]"

gh_issue \
  "Write tests for auth flow" \
  "Test register, login, JWT middleware, role authorization using Jest + Supertest." \
  "testing,priority-high" "$MS_TEST"
echo "    ✔ Write tests for auth flow"

gh_issue \
  "Write tests for credit transfer" \
  "Test successful transfer, insufficient credits, atomicity. Critical path." \
  "testing,priority-high" "$MS_TEST"
echo "    ✔ Write tests for credit transfer"

gh_issue \
  "Write tests for session lifecycle" \
  "Test full flow: request → accept → complete → credits transferred." \
  "testing,priority-medium" "$MS_TEST"
echo "    ✔ Write tests for session lifecycle"

gh_issue \
  "Add input validation to all endpoints" \
  "Use Joi schemas via validation middleware on every POST/PUT/PATCH endpoint." \
  "priority-high" "$MS_TEST"
echo "    ✔ Add input validation to all endpoints"

gh_issue \
  "Add rate limiting on auth endpoints" \
  "Use express-rate-limit. Login: 5 attempts / 15 min. Register: 3 / hour." \
  "priority-medium" "$MS_TEST"
echo "    ✔ Add rate limiting on auth endpoints"

gh_issue \
  "Write API documentation" \
  "Document all endpoints (method, path, auth, body, response).
Use Postman collection or simple Markdown in docs/API.md." \
  "documentation,priority-medium" "$MS_TEST"
echo "    ✔ Write API documentation"

gh_issue \
  "Create database seed script" \
  "Script to populate DB with sample users, sessions, projects for development." \
  "priority-low" "$MS_TEST"
echo "    ✔ Create database seed script"

# ==============================================================================
echo ""
echo "========================================================"
echo "  All done! 10 labels · 5 milestones · 42 issues created."
echo "========================================================"
