# Recall Changelog & Feature Reference

> Last updated: 2026-04-22

This document catalogs every production-grade improvement, new feature, and architectural decision applied to Recall across all development sessions.

---

## Table of Contents

1. [Code Quality & Architecture Fixes](#1-code-quality--architecture-fixes)
2. [Bun-Native API Migration](#2-bun-native-api-migration)
3. [New Commands](#3-new-commands)
4. [Database & Schema Changes](#4-database--schema-changes)
5. [Tool Scanner Expansion](#5-tool-scanner-expansion)
6. [Test Coverage](#6-test-coverage)
7. [Breaking Changes](#7-breaking-changes)

---

## 1. Code Quality & Architecture Fixes

### 1.1 ESM Compliance
**File:** `src/hooks/detect.ts`  
**Issue:** `require('node:fs')` inside a function body violated ESM rules.  
**Fix:** Replaced with top-level `import { readFileSync } from 'node:fs'`.

### 1.2 Literal `'~'` Bug
**Files:** `src/db/index.ts`, `src/cli/init.ts`  
**Issue:** `process.env.HOME ?? '~'` would literally write `~` to the database if `$HOME` was unset.  
**Fix:** Replaced with `homedir()` from `node:os`.

### 1.3 Strict Type Guard
**File:** `src/db/commands.ts`  
**Issue:** `isCommand()` used a shallow manual check that missed type mismatches.  
**Fix:** Replaced with a `z.object()` Zod schema and `safeParse()`.

### 1.4 DRY Error Handling
**File:** `src/db/commands.ts`  
**Issue:** Every DB function wrapped its body in an identical try/catch block.  
**Fix:** Extracted `withDbCatch<T>(operation, fallback, fn)` higher-order function. Reduced ~30 lines of boilerplate to 1 call per function.

### 1.5 Decomposed God Function
**File:** `src/cli/hook.ts`  
**Issue:** `handleHookCapture()` mixed 6 concerns: parsing, validation, dedup, repo detection, persistence, embedding spawn.  
**Fix:** Split into:
- `parseCaptureArgs()` — Zod validation
- `shouldRecordCommand()` — dedup + skip rules
- `buildCommandPayload()` — object construction
- `persistCommand()` — transaction wrapper

### 1.6 Split Switch Statement
**File:** `src/ai/adapter.ts`  
**Issue:** `createEmbedder()` had a 10-case switch with inline dynamic imports.  
**Fix:** Extracted per-provider factory functions (`createOpenAIEmbedder`, `createAzureEmbedder`, etc.).

### 1.7 Implicit `any` Typing
**File:** `src/ai/adapter.ts`  
**Issue:** `azureMod: any` lost all type safety.  
**Fix:** Added explicit `AzureModule` interface.

### 1.8 Icon Setting DRY
**File:** `src/index.ts`  
**Issue:** `if (flags.noIcons) setIconsEnabled(false)` repeated in every action handler.  
**Fix:** Extracted `applyIconSetting(flags)` helper.

### 1.9 Stale Test Expectations
**File:** `tests/cli/core.test.ts`  
**Issue:** 2 assertions checked for UI strings that had been updated.  
**Fix:** Aligned expectations with current output format.

---

## 2. Bun-Native API Migration

### Philosophy
Bun's file APIs (`Bun.file`, `Bun.write`) are **async-only**. We migrate only where the calling context is already async and where the replacement is a clean drop-in. Sync core infrastructure (`getDb()`, `loadConfig()`) intentionally remains on `node:fs` because Bun has no sync equivalents.

### Changes

| File | Before | After | Context |
|------|--------|-------|---------|
| `src/cli/doctor.ts` | `execSync('which recall')` | `Bun.which('recall')` | Cross-platform, zero-risk |
| `src/cli/init.ts` | `readFileSync(histPath)` | `await Bun.file(histPath).text()` | Already inside `async handleInit` |
| `src/hooks/detect.ts` | `existsSync` + `readFileSync` | `try/catch` around `Bun.file().text()` | Already async functions |

### What Was NOT Migrated (and why)

| API | Reason |
|-----|--------|
| `node:path` | No Bun equivalent. Security-critical in export/import. |
| `node:os` (`homedir`, `tmpdir`) | No Bun equivalent. Correct cross-platform abstraction. |
| `node:crypto` (`createHash`) | Web Crypto is async; would break sync repo hashing. |
| `node:fs` sync in `db/index.ts`, `config/index.ts` | `getDb()` / `loadConfig()` are sync singletons with 50+ call sites. No `Bun.existsSync` or `Bun.mkdirSync` exists. |

---

## 3. New Commands

### 3.1 `recall digest`
**Purpose:** Weekly terminal activity summary.  
**Sections:**
- **Most-used commands (last 7 days)** — bar chart of top 5 normalized commands with frequency
- **Forgotten tools** — top 5 dormant tools (installed but unused for 30+ days)
- **Repeated pain points** — errors seen >1x this week, with fix status if recorded

**Usage:**
```bash
recall digest
```

**Tracks:** Updates `config.last_digest_at` on each run so you know how long since the last one.

---

### 3.2 `recall workflows`
**Purpose:** Detect and list repeated command sequences across sessions.  
**Algorithm:**
1. Groups commands by `session_id`
2. Extracts all subsequences of length 2 and 3
3. Keeps sequences that appear in ≥2 different sessions and ≥3 total times
4. Scores confidence as `sessions * 0.25` (capped at 1.0)
5. Persists results to `workflows` table (clears and re-inserts on each run)

**Usage:**
```bash
recall workflows
```

**Output:**
```
Workflow #1 (seen 5x in 3 sessions)
  git add .
  git commit
  git push
```

---

### 3.3 `recall restore --id <n>`
**Purpose:** Replay a stored workflow by ID.  
**Usage:**
```bash
recall restore --id 1
```

**Output:** Lists the commands so you can copy-paste them.

---

## 4. Database & Schema Changes

### 4.1 New Table: `workflows`
```sql
CREATE TABLE IF NOT EXISTS workflows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  sequence_json TEXT NOT NULL,
  repo_path_hash TEXT,
  frequency INTEGER NOT NULL DEFAULT 1,
  confidence REAL DEFAULT 0.0,
  last_used_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_workflows_repo ON workflows(repo_path_hash);
CREATE INDEX IF NOT EXISTS idx_workflows_frequency ON workflows(frequency DESC);
```

### 4.2 Relaxed `tools.source` Constraint
**Before:** `CHECK(source IN ('brew', 'npm', 'cargo', 'manual'))`  
**After:** No `CHECK` constraint — accepts any source string.

**Why:** The hardcoded enum blocked new package managers (pip, gem, go, pnpm, yarn).  
**Migration:** `applyCompatibilityMigrations()` in `src/db/index.ts` auto-recreates the `tools` table if the old constraint is still present, preserving all data.

### 4.3 New Query Functions

| Function | File | Purpose |
|----------|------|---------|
| `getTopCommandsSince(days, limit)` | `src/db/commands.ts` | Time-boxed top commands for digest |
| `getRecentErrorsSince(days, limit)` | `src/db/errors.ts` | Time-boxed errors for digest |
| `detectAndStoreWorkflows()` | `src/db/workflows.ts` | Sequence detection algorithm |
| `insertWorkflow()` | `src/db/workflows.ts` | Persist detected workflow |
| `getWorkflowById(id)` | `src/db/workflows.ts` | Lookup for restore |
| `getAllWorkflows()` | `src/db/workflows.ts` | List all workflows |
| `clearWorkflows()` | `src/db/workflows.ts` | Clear before re-detection |

---

## 5. Tool Scanner Expansion

### 5.1 New Scanners

| Source | Command Parsed | Notes |
|--------|---------------|-------|
| **pip** | `pip list --format=freeze` | Parses `name==version` lines |
| **gem** | `gem list` | Extracts gem names from parenthetical version lists |
| **go** | `ls $(go env GOPATH)/bin` | Lists binaries in GOPATH bin directory |
| **pnpm** | `pnpm list -g --depth=0` | Parses global package tree |
| **yarn** | `yarn global list` | Extracts package names from `info` lines |

### 5.2 Updated Interfaces

```typescript
// ScannedTool.source now accepts 8 values
source: 'brew' | 'npm' | 'cargo' | 'pip' | 'gem' | 'go' | 'pnpm' | 'yarn'

// Tool.source (DB type) now accepts 9 values including 'manual'
source: 'brew' | 'npm' | 'cargo' | 'pip' | 'gem' | 'go' | 'pnpm' | 'yarn' | 'manual'
```

---

## 6. Test Coverage

### 6.1 Test Growth

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Tests | 93 | 108 | +15 |
| Files | 11 | 14 | +3 |
| Expect calls | 184 | 217 | +33 |

### 6.2 New Test Files

| File | Tests | Coverage |
|------|-------|----------|
| `tests/cli/digest.test.ts` | 2 | Empty state, command surfacing |
| `tests/cli/workflows.test.ts` | 5 | Empty state, detection, restore by ID, missing ID, not found |
| `tests/tools/scanner.test.ts` | 8 | All 8 scanners (brew, npm, cargo, pip, gem, go, pnpm, yarn) |

### 6.3 Improved Tests

| File | Change |
|------|--------|
| `tests/db/commands.test.ts` | Completely rewritten: 25 behavioral tests with seeded data and deterministic ordering |
| `tests/cli/core.test.ts` | Fixed 2 stale string assertions |

---

## 7. Breaking Changes

**None.** All changes are backward-compatible:
- Existing databases auto-migrate via `applyCompatibilityMigrations()`.
- New CLI commands are additive.
- Type relaxations only expand valid values, never restrict them.

---

## Files Changed Summary

### New Files
- `src/cli/digest.ts`
- `src/cli/workflows.ts`
- `src/cli/restore.ts`
- `src/db/workflows.ts`
- `tests/cli/digest.test.ts`
- `tests/cli/workflows.test.ts`
- `tests/tools/scanner.test.ts`
- `bun-api-migration-plan.md`

### Modified Files (production code)
- `src/index.ts` — registered digest, workflows, restore
- `src/cli/doctor.ts` — `Bun.which()`
- `src/cli/init.ts` — `Bun.file().text()`
- `src/cli/hook.ts` — decomposed into helpers
- `src/cli/export.ts` — path validation
- `src/cli/import.ts` — path validation
- `src/hooks/detect.ts` — Bun-native file I/O
- `src/db/index.ts` — singleton, migrations, `setDb()`
- `src/db/commands.ts` — Zod schema, `withDbCatch()`, `getTopCommandsSince()`
- `src/db/tools.ts` — expanded source union
- `src/db/errors.ts` — `getRecentErrorsSince()`
- `src/db/schema.sql` — workflows table, relaxed tools constraint
- `src/ai/adapter.ts` — per-provider factories, `AzureModule` type
- `src/tools/scanner.ts` — 5 new scanners
- `src/ui/index.ts` — (re-export additions)

### Modified Files (tests)
- `tests/db/commands.test.ts` — rewritten with seeded data
- `tests/cli/core.test.ts` — fixed stale expectations
- `tests/security/path-validation.test.ts` — (reference for path logic)

---

## Quick Reference: What You Can Do Now

```bash
# Phase 1: Trust & Memory
recall init                              # Set up hooks, import history, scan tools
recall search "git push"                 # Find past commands
recall recent                            # Last 20 commands
recall project                           # Current repo context
recall doctor                            # Health check

# Phase 2: Tool Rediscovery
recall forgotten-tools                   # Installed but unused tools
recall digest                            # Weekly activity summary

# Phase 3: Workflow Automation
recall workflows                         # Detect repeated sequences
recall restore --id 1                    # Replay a workflow

# Data management
recall export --output backup.json       # Portable backup
recall import --file backup.json         # Restore
recall delete --id 42                    # Remove one command
recall delete --all --yes                # Nuclear option
recall pause / recall resume             # Toggle capture
```
