# Monetization-Ready Checklist

**Date:** 2026-06-12  
**Purpose:** What needs to be built before Recall can charge for Pro sync or Team workflow sharing.  
**Current state:** CLI is fully functional, local-only. `SyncAdapter` interface exists as a stub. Zero auth/infrastructure exists.

---

## Phase 0: Foundation (Pre-Monetization)

> These are prerequisites for anything paid. Do these first.

### □ Backend server (Bun + SQLite or Postgres)

| Task | Why | Complexity | Priority |
|------|-----|------------|----------|
| Choose hosting (Railway, Fly.io, or bare VPS) | Need somewhere to run the sync server | Low | P0 |
| Set up Bun HTTP server (Elysia or Hono) | Lightweight, shares TypeScript types with CLI | Medium | P0 |
| Set up database (Postgres via Neon or Supabase for hosted, SQLite for self-hosted) | Multi-tenant data storage | Medium | P0 |
| Set up CI/CD for server deployments | Ship updates without downtime | Low | P1 |

**Code changes needed:** New `server/` directory at project root.

### □ User accounts & auth

| Task | Why | Complexity | Priority |
|------|-----|------------|----------|
| Add `users` table to server DB | Store account info, subscription status | Low | P0 |
| Implement signup/login (magic link or OAuth — GitHub OAuth is most relevant) | Devs prefer OAuth; magic link is simpler | Medium | P0 |
| Add `recall login` CLI command | Authenticate CLI with server | Medium | P0 |
| Add `recall logout` CLI command | Clear credentials locally | Low | P0 |
| Store auth token in `~/.recall/auth.json` (mode 0o600) | Follow existing `~/.recall/` trust pattern | Low | P0 |
| Add auth token refresh logic | Tokens expire; auto-refresh prevents disruption | Medium | P1 |

**Code changes needed:** `src/cli/login.ts`, `src/cli/logout.ts`, `src/sync/auth.ts`, `server/src/routes/auth.ts`.

### □ Billing integration

| Task | Why | Complexity | Priority |
|------|-----|------------|----------|
| Choose payment processor (Stripe is the standard) | Need to charge users | Low | P0 |
| Set up Stripe webhook handler on server | Process subscription events | Medium | P0 |
| Add `subscriptions` table to server DB | Track plan, status, billing period | Low | P0 |
| Implement webhook handlers for: subscription created, updated, cancelled, past_due | Keep user entitlements in sync | Medium | P0 |
| Add Stripe Customer Portal link or manage-subscription CLI command | Let users manage billing without support | Low | P1 |

**No CLI-side code changes needed for billing** — all billing logic lives on the server. CLI just reads entitlement state from auth token or API response.

---

## Phase 1: Pro Features (Individual $4-6/mo)

> Build the first paid tier. Encrypted sync + bundled AI credits.

### □ Encrypted sync (the core Pro feature)

| Task | Why | Complexity | Priority |
|------|-----|------------|----------|
| **Implement `SyncAdapter` interface client-side** (currently NoopSyncAdapter) | Pluggable sync backends | Medium | P0 |
| Create `CloudSyncAdapter` class implementing `SyncAdapter` | Real sync implementation | Medium | P0 |
| Add `device_id` to local config (generated on `recall init`) | Identify unique devices for sync | Low | P0 |
| Implement client-side E2E encryption (XChaCha20-Poly1305 via `@noble/ciphers` or `libsodium-wrappers`) | Match Obsidian's trust model — server can't read data | High | P0 |
| Generate & store encryption key from user password or device key | Key management for E2E encryption | Medium | P0 |
| Add `recall sync` command | Manual sync trigger | Low | P0 |
| Add `recall sync --auto` flag or daemon mode | Background periodic sync | Medium | P1 |
| Implement conflict resolution (last-write-wins with per-row timestamps) | Handle simultaneous edits on different machines | High | P1 |
| Add sync status indicators (`recall status` or show in `recall doctor`) | Users need to know if sync is working | Low | P1 |

**Code changes needed:**
- `src/sync/cloud.ts` — `CloudSyncAdapter` implementation
- `src/sync/crypto.ts` — E2E encryption helpers
- `src/cli/sync.ts` — `recall sync` command
- `src/cli/status.ts` — `recall status` command (optional)
- `src/config/index.ts` — add `device_id`, `sync_enabled`, `sync_key` config fields
- `server/src/routes/sync.ts` — push/pull endpoints
- `server/src/middleware/auth.ts` — JWT verification
- `server/src/middleware/entitlement.ts` — check subscription status

### □ Bundled AI credits (Pro feature)

| Task | Why | Complexity | Priority |
|------|-----|------------|----------|
| Set up AI API proxy on server (so CLI doesn't need direct API keys) | Bundle AI costs into subscription | Medium | P0 |
| Add AI credit tracking on server (`usage` table per user) | Meter usage to prevent abuse | Low | P0 |
| Modify `src/ai/adapter.ts` to support server-proxied AI | CLI hits server instead of OpenAI directly | Medium | P0 |
| Add usage reporting to `recall status` | Transparency for users | Low | P1 |

### □ License enforcement (client-side)

| Task | Why | Complexity | Priority |
|------|-----|------------|----------|
| Check entitlement on `recall sync` | Block sync if not subscribed | Low | P0 |
| Cache entitlement check for 24h (don't phone home on every command) | Privacy-respecting + offline support | Low | P0 |
| Graceful degradation if server is unreachable | Don't break the terminal because billing is down | Low | P0 |
| Show upgrade prompt on `recall login` if no active subscription | Conversion | Low | P1 |

**Important:** The CLI should NEVER phone home on command capture. Entitlement checks happen only on explicit actions (sync, login). This preserves the core privacy promise.

---

## Phase 2: Team Features ($8-12/seat/mo)

> Build the second paid tier. Shared workflows, onboarding packs, team search.

### □ Team management

| Task | Why | Complexity | Priority |
|------|-----|------------|----------|
| Add `teams` and `team_members` tables to server DB | Team data model | Low | P0 |
| Add `recall team create` and `recall team invite <email>` commands | Team management from CLI | Medium | P0 |
| Add team seat counting + billing (per-seat pricing) | Charge per team member | Medium | P0 |
| Add team admin roles (owner, admin, member) | Access control | Medium | P0 |

### □ Team workflow sharing

| Task | Why | Complexity | Priority |
|------|-----|------------|----------|
| Add `recall workflow share <id>` command | Share a detected workflow with the team | Medium | P0 |
| Add `recall workflow list --team` command | Browse team's shared workflows | Low | P0 |
| Add `recall workflow import <id>` command | Import a shared workflow to local | Low | P0 |
| Add `workflow_shares` table to server DB | Store shared workflows | Low | P0 |
| Add `teams_workflows` table with approval/visibility | Control which workflows are visible to the team | Low | P1 |

### □ Onboarding packs

| Task | Why | Complexity | Priority |
|------|-----|------------|----------|
| Auto-detect project setup sequence (startup_commands_json) | Already partially implemented | Low | P0 |
| Add `recall pack create` command | Generate onboarding pack from current repo context | Medium | P0 |
| Add `recall pack apply <name>` command | Apply onboarding pack to current repo | Medium | P0 |
| Store packs on server, shareable by team | Multi-machine + team distribution | Medium | P0 |

### □ Team-wide search

| Task | Why | Complexity | Priority |
|------|-----|------------|----------|
| Add team-search endpoint to server | Search across all team members' commands | Medium | P0 |
| Add `recall search --team` flag | Query team's collective memory | Low | P0 |
| Privacy controls — allow users to opt-out of team search (per-repo or per-command) | Not everyone wants to share everything | Medium | P0 |

---

## Phase 3: Enterprise (Custom pricing)

> For organizations needing self-hosting, audit, and compliance.

| Task | Why | Complexity | Priority |
|------|-----|------------|----------|
| Docker Compose for self-hosted server | Enterprise won't use hosted service | Medium | P0 |
| SAML/SSO login | Enterprise auth requirement | High | P1 |
| Audit log (who searched what, when) | Compliance requirement | Medium | P1 |
| SLA guarantees | Enterprise procurement requirement | Low | P1 |
| Read-only deployment (non-admin users can't delete data) | Compliance + safety | Medium | P1 |

---

## Architecture: Server / CLI Boundary

### What runs on the server

```
recall-server/
├── src/
│   ├── index.ts              # Entry point (Elysia or Hono)
│   ├── routes/
│   │   ├── auth.ts           # Signup, login, logout, refresh
│   │   ├── sync.ts           # Push/pull encrypted data
│   │   ├── teams.ts          # CRUD teams, members, invites
│   │   ├── workflows.ts      # Share/import workflows
│   │   ├── packs.ts          # Onboarding packs
│   │   └── billing.ts        # Stripe webhook
│   ├── middleware/
│   │   ├── auth.ts           # JWT verification
│   │   ├── entitlements.ts   # Subscription check
│   │   └── rate-limit.ts     # Abuse prevention
│   ├── db/
│   │   ├── schema.ts         # Kysely/Drizzle schema
│   │   └── migrations/       # SQL migrations
│   └── lib/
│       ├── stripe.ts         # Stripe client
│       └── email.ts          # Transactional emails
├── package.json
└── Dockerfile
```

### What changes on the CLI side

```diff
 src/
+  cli/
+    login.ts          # recall login
+    logout.ts         # recall logout
+    sync.ts           # recall sync
+    status.ts         # recall status (optional)
+    team.ts           # recall team (create, invite, list)
+    pack.ts           # recall pack (create, apply, list)
   sync/
     adapter.ts        # SyncAdapter interface (exists)
+    cloud.ts          # CloudSyncAdapter implementation
+    crypto.ts         # E2E encryption helpers
+    auth.ts           # Token storage + refresh
   config/
     index.ts          # + device_id, sync_enabled fields
   ai/
     adapter.ts        # + server-proxied provider option
```

### Database — new tables needed on the server

```sql
-- Users
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  display_name  TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- Auth tokens (session management)
CREATE TABLE auth_tokens (
  id         TEXT PRIMARY KEY,
  user_id    TEXT REFERENCES users(id),
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions (Stripe-linked)
CREATE TABLE subscriptions (
  id             TEXT PRIMARY KEY,
  user_id        TEXT REFERENCES users(id),
  stripe_id      TEXT UNIQUE,
  plan           TEXT NOT NULL,          -- 'pro' | 'team' | 'enterprise'
  status         TEXT NOT NULL,          -- 'active' | 'past_due' | 'cancelled'
  current_period_start TIMESTAMP,
  current_period_end   TIMESTAMP,
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW()
);

-- Team seats (per-seat billing)
CREATE TABLE team_seats (
  id              TEXT PRIMARY KEY,
  subscription_id TEXT REFERENCES subscriptions(id),
  assigned_to     TEXT REFERENCES users(id),
  status          TEXT DEFAULT 'active', -- 'active' | 'invited' | 'removed'
  created_at      TIMESTAMP DEFAULT NOW()
);

-- Teams
CREATE TABLE teams (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  owner_id    TEXT REFERENCES users(id),
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE team_members (
  team_id   TEXT REFERENCES teams(id),
  user_id   TEXT REFERENCES users(id),
  role      TEXT DEFAULT 'member',  -- 'owner' | 'admin' | 'member'
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);

-- Synced command data (encrypted blobs)
CREATE TABLE sync_commands (
  id               TEXT PRIMARY KEY,
  user_id          TEXT REFERENCES users(id),
  encrypted_blob   BLOB NOT NULL,       -- Client-side encrypted
  encryption_iv    BLOB NOT NULL,       -- Initialization vector
  client_created_at TIMESTAMP NOT NULL,  -- For conflict resolution
  server_created_at TIMESTAMP DEFAULT NOW()
);

-- Shared workflows
CREATE TABLE shared_workflows (
  id                TEXT PRIMARY KEY,
  team_id           TEXT REFERENCES teams(id),
  shared_by         TEXT REFERENCES users(id),
  workflow_json     TEXT NOT NULL,       -- Decrypted by server (for search)
  name              TEXT,
  description       TEXT,
  created_at        TIMESTAMP DEFAULT NOW()
);

-- Onboarding packs
CREATE TABLE onboarding_packs (
  id          TEXT PRIMARY KEY,
  team_id     TEXT REFERENCES teams(id),
  name        TEXT NOT NULL,
  description TEXT,
  repo_url    TEXT,
  commands    JSON NOT NULL,            -- Array of commands
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Usage tracking for AI credits
CREATE TABLE usage (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id),
  feature     TEXT NOT NULL,            -- 'ai_search' | 'ai_suggest'
  cost        DECIMAL NOT NULL,         -- In micro-cents
  created_at  TIMESTAMP DEFAULT NOW()
);
```

---

## What NOT to Build (Anti-Patterns)

| Don't build | Why |
|-------------|-----|
| **Cloud-first version** | Betrays the local-first trust. Always keep the CLI fully functional offline. |
| **Feature-gating core CLI** | `recall search`, `recall recent`, `recall project` must always be free. |
| **Telemetry** | Obsidian proves you can build a successful paid product with zero telemetry. |
| **Complex pricing** | 3 tiers max: Free, Pro, Team. Enterprise is custom. |
| **Desktop/GUI** | Huge engineering cost. Atuin is already doing it. Stay CLI. |
| **Free hosted sync** | Atuin offers this for free. Competing on free sync is a race to zero. |
| **Invite-only beta** | Open beta from day one. Lower the barrier to entry. |
| **Yearly contracts** | Monthly to start. Annual discount comes later. |

---

## Dependency Checklist

| Dependency | Why needed | Estimated cost |
|------------|-----------|----------------|
| Server hosting (Railway or Fly.io) | Run the sync + auth server | $5-25/mo initially |
| Stripe account | Process payments | 2.9% + $0.30/transaction |
| Database hosting (Neon or Supabase) | Server data persistence | Free tier initially |
| Domain name (recall.sh or similar) | Landing page + server API | $10-15/yr |
| Transactional email (Resend or Loops) | Magic link login + invoices | Free tier initially |
| GitHub OAuth app registration | OAuth login | Free |
| AI API account (OpenAI, Anthropic) | Bundled AI credits for Pro users | ~$0.01/search query |

---

## Estimated Timeline

| Phase | Effort | Can be built by |
|-------|--------|----------------|
| **Phase 0** — Server + auth + billing | 2-3 weeks | Solo developer |
| **Phase 1** — Pro features (sync + AI) | 3-4 weeks | Solo developer |
| **Phase 2** — Team features | 4-6 weeks | Solo developer |
| **Phase 3** — Enterprise | 4-8 weeks | Needs dedicated infra |

**Total to first paid user:** ~5-7 weeks of focused work (Phases 0 + 1).
**Total to team revenue:** ~9-13 weeks (Phases 0 + 1 + 2).

---

## Validation Checklist (Before Building)

Don't build any of this until you've validated demand:

- [ ] **100+ active CLI users** who use Recall daily
- [ ] **At least 10 users asking** "can I sync this across machines?"
- [ ] **At least 5 teams asking** "can we share workflows?"
- [ ] **Willingness to pay test** — ask 20 active users: "if sync cost $5/mo, would you pay?"
- [ ] **At least 3 users who say yes** before writing any server code

**Build orders matter.** Ship the CLI, grow adoption, validate demand, then monetize. Don't build server infrastructure for an audience that doesn't exist yet.
