# Recall Changelog & Feature Reference

> Last updated: 2026-06-11

This document catalogs every production-grade improvement, new feature, and architectural decision applied to Recall across all development sessions.

---

## Table of Contents

1. [Code Quality & Architecture Fixes](#1-code-quality--architecture-fixes)
2. [Bun-Native API Migration](#2-bun-native-api-migration)
3. [New Commands](#3-new-commands)
4. [Database & Schema Changes](#4-database--schema-changes)
5. [Tool Scanner Expansion](#5-tool-scanner-expansion)
6. [Test Coverage](#6-test-coverage)
7. [Homebrew Distribution](#7-homebrew-distribution)
8. [CI & Release Infrastructure](#8-ci--release-infrastructure)
9. [Major Changes (v0.1 → v0.2)](#9-major-changes-v01--v02)
10. [Breaking Changes](#10-breaking-changes)

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
| Tests | 93 | 180 | +87 |
| Files | 11 | 17 | +6 |
| Expect calls | 184 | 364 | +180 |

### 6.2 New Test Files

| File | Tests | Coverage |
|------|-------|----------|
| `tests/cli/digest.test.ts` | 2 | Empty state, command surfacing |
| `tests/cli/workflows.test.ts` | 5 | Empty state, detection, restore by ID, missing ID, not found |
| `tests/tools/scanner.test.ts` | 8 | All 8 scanners (brew, npm, cargo, pip, gem, go, pnpm, yarn) |
| `tests/insights/index.test.ts` | 29 | Tool alternative word-boundary, forgotten tool age/usage, frequency, e2e priority ordering |
| `tests/cli/session.test.ts` | 14 | getRecentSessions grouping/filtering/metadata, CLI empty/grouped/JSON/--repo |
| `tests/errors/matcher.test.ts` | 29 | hashCommandSignature path/flag/pkg stripping, deriveErrorSignature fallback, autoRecordError with/without stderr, autoDetectFix lifecycle/confidence boost/edge cases |

### 6.3 Improved Tests

| File | Change |
|------|--------|
| `tests/db/commands.test.ts` | Completely rewritten: 25 behavioral tests with seeded data and deterministic ordering |
| `tests/cli/core.test.ts` | Fixed 2 stale string assertions |

---

## 10. Breaking Changes

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
- `src/cli/session.ts`
- `src/db/workflows.ts`
- `src/mcp/index.ts`
- `src/mcp/binary.ts`
- `src/cli/mcp.ts`
- `src/hooks/cd-tracker.ts`
- `src/insights/index.ts`
- `src/ui/json-output.ts`
- `homebrew/Formula/recall.rb`
- `.github/workflows/release.yml`
- `.github/workflows/update-formula.yml`
- `scripts/setup-homebrew-tap.sh`
- `scripts/test-promoted.sh`
- `scripts/benchmark.ts`
- `tests/cli/digest.test.ts`
- `tests/cli/workflows.test.ts`
- `tests/cli/session.test.ts`
- `tests/insights/index.test.ts`
- `tests/tools/scanner.test.ts`
- `tests/errors/matcher.test.ts`
- `bun-api-migration-plan.md`

### Modified Files (production code)
- `src/index.ts` — registered digest, workflows, restore, mcp, session; promoted ask/fix/forgotten-tools; added --json flags
- `src/cli/doctor.ts` — `Bun.which()`, `--json` flag, insight section, insight in JSON output
- `src/cli/init.ts` — `Bun.file().text()`, updated init wizard for promoted commands, first-run value bomb insight
- `src/cli/hook.ts` — decomposed into helpers; added `handleHookCd()` for auto-cd; auto-record errors + auto-detect fixes in handleHookUpdate
- `src/cli/export.ts` — path validation
- `src/cli/import.ts` — path validation
- `src/cli/ask.ts` — `--json` flag
- `src/cli/fix.ts` — promoted from experimental, `--json` flag
- `src/cli/forgotten-tools.ts` — promoted from experimental, `--json` flag
- `src/cli/search.ts` — `--json` flag
- `src/cli/recent.ts` — `--json` flag
- `src/cli/project.ts` — `--json` flag
- `src/cli/config.ts` — `--json` flag
- `src/cli/digest.ts` — `--json` flag
- `src/cli/workflows.ts` — `--json` flag
- `src/errors/matcher.ts` — hashCommandSignature, deriveErrorSignature, autoRecordError, autoDetectFix for session-based auto-learning
- `src/insights/index.ts` — insight engine with 3 priority-tiered generators, word-boundary matching
- `src/ui/colors.ts` — added `insight` highlight color (bold)
- `src/ui/icons.ts` — added `bulb` icon (💡/`*`)
- `src/hooks/detect.ts` — Bun-native file I/O
- `src/hooks/zsh-snippet.ts` — added `chpwd` hook for auto-cd
- `src/hooks/bash-snippet.ts` — added `cd()` override for auto-cd
- `src/db/index.ts` — singleton, migrations, `setDb()`
- `src/db/commands.ts` — Zod schema, `withDbCatch()`, `getTopCommandsSince()`, `getRecentSessions()`, `getRecentFailedBySession()`
- `src/db/tools.ts` — expanded source union
- `src/db/errors.ts` — `getRecentErrorsSince()`
- `src/db/schema.sql` — workflows table, relaxed tools constraint
- `src/ai/adapter.ts` — per-provider factories, `AzureModule` type; AI config resolution bugfix
- `src/tools/scanner.ts` — 5 new scanners
- `package.json` — added `bench` and `bench:quick` scripts
- `src/ui/index.ts` — (re-export additions)
- `README.md` — beta status, Homebrew install, promoted commands
- `SPEC.md` — updated status and experimental commands list
- `AGENTS.md` — updated experimental commands, Homebrew build note, MCP server docs, added session to production commands

### Modified Files (tests)
- `tests/db/commands.test.ts` — rewritten with seeded data
- `tests/cli/core.test.ts` — fixed stale expectations
- `tests/security/path-validation.test.ts` — (reference for path logic)
- `tests/insights/index.test.ts` — (new) 29 tests covering all insight generators + e2e priority ordering
- `tests/cli/session.test.ts` — (new) 14 tests covering DB function + CLI command
- `tests/errors/matcher.test.ts` — (new) 29 tests covering hashCommandSignature normalization, deriveErrorSignature fallback, autoRecordError with/without stderr, autoDetectFix lifecycle/confidence

---

---

## 7. Homebrew Distribution

### 7.1 Homebrew Tap Setup
**New files:** `homebrew/Formula/recall.rb`, `scripts/setup-homebrew-tap.sh`

Recall now ships via Homebrew. The tap repository (`owner/homebrew-recall`) provides a formula with:
- **Binary install** — downloads platform-specific tarballs from GitHub Releases (macOS ARM, macOS Intel, Linux x86_64)
- **Source install** — `brew install --HEAD recall` builds from source using `bun build --compile`
- **Auto-updating formula** — CI updates version + SHA256 on each release

**Install:**
```bash
brew tap <owner>/recall
brew install recall
```

### 7.2 Setup Script
**File:** `scripts/setup-homebrew-tap.sh`

One-time script that creates the `homebrew-recall` GitHub repository, populates it with the initial formula and CI workflow. Detects the GitHub org from `git remote`.

---

## 8. CI & Release Infrastructure

### 8.1 Release Workflow
**File:** `.github/workflows/release.yml`

Triggered by `git tag v*`. Builds compiled binaries on 3 platforms in parallel:
- `macos-latest` (ARM64) — signed + ad-hoc notarized
- `macos-13` (Intel x64) — signed + ad-hoc notarized
- `ubuntu-latest` (Linux x64)

Each build produces a `.tar.gz` with the standalone binary + `.sha256` checksum, uploaded to the GitHub Release.

### 8.2 Tap Update Job
After all platforms finish, the `update-homebrew` job:
1. Checks out the `homebrew-recall` tap repo using `HOMEBREW_TAP_PAT`
2. Downloads checksums from the release
3. Updates formula version + all 3 SHA256 values via line-anchored `sed`
4. Creates a PR against the tap repo with the updated formula

Gracefully skips if `HOMEBREW_TAP_PAT` is not set.

### 8.3 Manual Fallback Workflow
**File:** `.github/workflows/update-formula.yml`

Workflow that lives in the tap repo for manual trigger (e.g., if auto-update failed or for pre-release testing).

---

## 9. Major Changes (v0.1 → v0.2)

### 9.1 Auto-CD Project Memory
**Files:** `src/hooks/cd-tracker.ts` (new), `src/cli/hook.ts`, `src/hooks/zsh-snippet.ts`, `src/hooks/bash-snippet.ts`

When you `cd` into a git repo, Recall shows a brief project context summary:
```
  recall: my-project | git status · bun test · npm run dev
         ↳ startup: npm run dev
         ↳ workflow: git add → git commit → git push (5x)
```

**Mechanism:**
- **Zsh:** `chpwd` hook fires on every directory change (`cd`, `pushd`, `popd`)
- **Bash:** `cd()` function override fires after successful navigation (with `& disown` for fire-and-forget)
- **Anti-spam:** 5-minute cooldown per repo via file-based timestamps in `~/.recall/cd-hints/`
- **Privacy:** respects `isCaptureEnabled()`, silent on non-git dirs and repos without data

### 9.2 Promoted Commands: ask, fix, forgotten-tools
**Files:** `src/index.ts`, `src/cli/init.ts`, `README.md`, `SPEC.md`, `AGENTS.md`

Three commands promoted from experimental (`RECALL_EXPERIMENTAL=1`) to production:
- `recall ask "<query>"` — AI-powered semantic search with keyword fallback
- `recall fix` — shows known fixes for recent errors
- `recall forgotten-tools` — surfaces installed but unused tools

**No gating:** Works without `RECALL_EXPERIMENTAL`. AI features require opt-in config, not env flags.

### 9.3 `--json` Output on All Commands
**Files:** `src/ui/json-output.ts` (new), 10 CLI handler files, `src/index.ts`

Every output-producing command now supports `--json` for programmatic use and MCP integration:

| Command | JSON Output |
|---------|-------------|
| `search` | `Command[]` — flat array |
| `recent` | `Command[]` — flat array |
| `project` | `{ repo, recent_commands, startup_commands, workflows, failed_commands, successful_commands }` |
| `doctor` | `{ healthy, issues, checks, stats, ai_provider, insight }` |
| `config` | Full `RecallConfig` object |
| `digest` | `{ top_commands, dormant_tools, repeated_errors }` |
| `session` | `Session[]` — array of sessions with nested `commands` arrays |
| `workflows` | `Workflow[]` — flat array |
| `ask` | `{ results, search_method, ai_error }` |
| `fix` | `{ fixes }` or `{ fixes, errors }` |
| `forgotten-tools` | `ScannedTool[]` — flat array |

### 9.4 AI Config Resolution Bugfix
**File:** `src/ai/adapter.ts`

**Bug:** Setting `RECALL_AI_PROVIDER=none` fell through to auto-detect, picking up API keys from the environment.

**Fix:** Explicit `none` and `local` checks now return immediately in the explicit provider block, skipping auto-detect entirely.

Also fixed a TypeScript error: removed dead `(provider as string) === 'ollama'` cast in the auto-detect block (provider is always `undefined` at that point).

### 9.5 Integration Tests
**File:** `scripts/test-promoted.sh` (new)

14-test integration suite covering all promoted commands:
- `forgotten-tools` (text + JSON)
- `ask` keyword fallback (text + JSON)
- `fix` with captured failures (text + JSON)
- `--json` on `recent`, `search`, `project`, `doctor`
- RECALL_EXPERIMENTAL gate removal verification
- doctor --json includes `insight` field (section 5)

### 9.6 Status: Beta
**Files:** `README.md`, `SPEC.md`

Project status updated from "dogfood MVP" to **beta** — core features (capture, search, project memory, tool rediscovery, AI search) are production-ready.

### 9.7 MCP Server (AI Tool Integration)
**Files:** `src/mcp/index.ts` (new), `src/mcp/binary.ts` (new), `src/cli/mcp.ts` (new), `src/index.ts`, `AGENTS.md`

Recall now exposes its command memory as **MCP tools** for Claude Code, Cursor, and any MCP-compatible AI assistant via `recall mcp`.

**Architecture:**
- Uses `@modelcontextprotocol/sdk` with stdio transport
- Each tool shells out to `recall <command> --json` — no logic duplication
- Binary resolution handles both dev (`bun run`) and compiled binary modes
- Graceful shutdown on SIGINT/SIGTERM

**Exposed Tools:**

| Tool | Backed By | Purpose |
|------|-----------|---------|
| `recall_search` | `recall search --json` | Search command history |
| `recall_recent` | `recall recent --json` | Recent commands |
| `recall_project` | `recall project --json` | Project context |
| `recall_doctor` | `recall doctor --json` | Installation health |
| `recall_workflows` | `recall workflows --json` | Repeated sequences |
| `recall_forgotten_tools` | `recall forgotten-tools --json` | Unused tools |
| `recall_digest` | `recall digest --json` | Weekly activity |
| `recall_fix` | `recall fix --json` | Error fixes |
| `recall_config` | `recall config --json` | Configuration |

**Claude Desktop Config:**
```json
{
  "mcpServers": {
    "recall": {
      "command": "recall",
      "args": ["mcp"]
    }
  }
}
```

### 9.8 First-Run Value Bomb (`recall init`)
**Files:** `src/insights/index.ts` (new), `src/cli/init.ts`, `src/ui/colors.ts`, `src/ui/icons.ts`

After init imports shell history and scans installed tools, the user now sees a **surprising personal insight** — making the value of Recall immediately tangible.

**Mechanism:**
- Queries `getTopCommands` (all sources — includes imported history) + `getDormantTools` after setup
- Runs 3 priority-tiered generators and returns the single highest-priority insight:
  - **Priority 1 — Tool alternatives:** user has `ripgrep`/`fd`/`bat`/`eza`/`procs` installed but their history shows `grep`/`find`/`cat`/`ls`/`ps`
  - **Priority 2 — Forgotten tools:** tools installed 30+ days ago with zero usage
  - **Priority 3 — Frequency anomalies:** a command run 10+ times
- Does **word-boundary token matching** (not substring) to avoid false positives like `ripgrep` matching `grep` or `psql` matching `ps`

**Output example:**
```
  🔄 You have ripgrep (rg) installed but still use `grep`
     10x faster with better defaults
```

**Graceful empty state:** If no history or tools are found, no insight is shown — the init flow proceeds normally.

### 9.9 Doctor Insight (Ongoing Value)
**Files:** `src/cli/doctor.ts`

The insight engine now also fires in `recall doctor`, giving users ongoing value beyond first init.

**Display:**
- A new `Insights` section appears between Privacy Settings and Summary
- Shows the same priority-tiered insight as init (tool alternative → forgotten tool → frequency anomaly)
- **JSON output** adds an `insight: { text, tip }` field when available
- Gracefully omitted when no insight is found — no empty section or stray `null` in JSON

**What users see:**
```
  Insights
  ──────────────────────────────────────────────────
  💡 You have ripgrep (rg) installed but still use `grep`
     10x faster with better defaults
```

### 9.10 Error Auto-Learning (P2.2)
**Files:** `src/errors/matcher.ts`, `src/db/commands.ts`, `src/cli/hook.ts`, `tests/errors/matcher.test.ts`

Recall now automatically learns from command failures and their fixes — without any user interaction.

**Mechanism:**

When `recall hook update` receives a command result:
- **Exit code ≠ 0** → `autoRecordError()` records the failure. Uses stderr if captured (`recordCommandError`), otherwise falls back to command-based hashing (`hashCommandSignature`) that strips paths, flags, and package names before hashing with the exit code.
- **Exit code = 0** → `autoDetectFix()` checks the last failed command in the same session. If a subsequent command succeeds after a failure, it's auto-recorded as a potential fix with initial confidence 0.2. Repeated same-fix patterns boost confidence (+0.2 each time).

**Key design decisions:**
- **Session-scoped detection** — fix relationships only considered within the same shell session (bounded by inactivity gaps)
- **Command-based fallback** — `hashCommandSignature()` enables auto-learning even when `stderr_output` isn't captured by shell hooks
- **Idempotent upserts** — `insertError()` increments occurrences on repeated failures
- **Never fail the hook** — all auto-learning wrapped in try/catch; the shell pipeline is never blocked

**New exports from `src/errors/matcher.ts`:**
- `hashCommandSignature(normalizedCommand, exitCode)` — fallback signature when stderr unavailable
- `deriveErrorSignature(stderr, normalizedCommand, exitCode)` — chooses stderr vs command hashing
- `autoRecordError(commandId, stderr, normalizedCommand, exitCode)` — background error recording
- `autoDetectFix(sessionId, fixCommandId, fixNormalizedCommand)` — background fix detection

**New DB function:**
- `getRecentFailedBySession(sessionId, excludeCommandId?)` — finds the most recent failed command in a session for fix association

**Usage:**
```bash
# No user-facing command — runs automatically on every hook update
# After a session like:
npm install      # fails (exit 1)
npm install --legacy-peer-deps  # succeeds (exit 0)
# Recall auto-records: npm install exit 1 → fixed by npm install --legacy-peer-deps
```

---

### 9.11 Performance Benchmarks (P3.1)
**Files:** `scripts/benchmark.ts` (new), `package.json`

Established measurable performance baselines for the three most critical operations:

**Mechanism:**
- Uses the actual DB functions directly (no subprocess overhead) via `bun run scripts/benchmark.ts`
- Seeds databases at multiple sizes (100, 1K, 10K, 100K) and runs each benchmark multiple times
- Reports min/avg/max times with p50/p95 percentiles
- Flags: `--quick` for small-scale, `--hook`/`--search`/`--import` for individual sections

**Results (macOS ARM64, across all scales):**

| Operation | 100 | 1K | 10K | 100K |
|-----------|-----|-----|------|------|
| `insertCommand` (minimal) | ~0ms | ~0ms | — | — |
| `getCommandCount` | ~0ms | ~0ms | — | — |
| Round-trip batch (25) | 0.1ms/cmd | 0.1ms/cmd | — | — |
| FTS: exact match | ~0ms | ~0ms | 0–1ms | 4–15ms |
| FTS: partial match | ~0ms | ~0ms | 0–1ms | 4–15ms |
| LIKE keyword fallback | ~0ms | ~0ms | ~3ms | 27–30ms |
| `getRecentCommands(20)` | ~0ms | ~1ms | ~7ms | ~70ms |
| Batch insert (transaction) | 16.7K/s | 20.8K/s | 20.9K/s | — |
| Sequential insert (no tx) | 20.0K/s | 19.6K/s | 19.6K/s | — |

**Key insights:**
- **Sub-millisecond at 1K** — All operations are instant at typical user scale
- **FTS stays fast at 100K** — Only 4–15ms for full-text search across 100K rows. The FTS5 index scales linearly.
- **LIKE fallback degrades gracefully** — 0ms at 1K → 3ms at 10K → ~30ms at 100K. Acceptable for a fallback path.
- **`getRecentCommands(20)` shows index cost** — 70ms at 100K with `ORDER BY created_at DESC`. The query plan uses the `idx_commands_source` + `created_at` index but still scans many rows.
- **Import throughput plateaus at ~20K/s** — Bun's SQLite WAL mode saturates at ~20K inserts/sec regardless of transaction batching. No optimization needed — init imports at ~20K/cmd are fast enough for any realistic history file (<1s for 20K commands).

**Usage:**
```bash
bun run bench            # Full benchmarks (10K commands)
bun run bench:quick      # Quick run (100 commands)
bun run scripts/benchmark.ts --hook  # Hook latency only
```

---

### 9.12 Session Timeline (`recall session`)
**Files:** `src/cli/session.ts` (new), `src/db/commands.ts`, `src/index.ts`

Groups commands by `session_id` into a timeline view — showing what you did in each session, how long it lasted, and every command within it.

**Usage:**
```bash
recall session                         # Last 10 sessions
recall session --limit 5               # Last 5 sessions
recall session --repo <hash>           # Sessions in a specific repo
recall session --json                  # Machine-readable output
```

**Output example:**
```
Session Timeline
──────────────────────────────────────────────────
  Session #1 · 5 commands · 12m 30s · 2h ago
  ──────────────────────────────────────────────
    1. ⚡ git status            ~/project   2h ago ✓  15ms
    2. ⚡ git add .             ~/project   2h ago ✓
    3. ⚡ git commit -m "fix"   ~/project   2h ago ✓
```

**Implementation:**
- New DB function `getRecentSessions(opts: { limit?, repo_path_hash? })` — groups by session_id, returns `command_count`, `started_at`, `ended_at`, `duration_seconds` using `julianday` arithmetic
- Filters to `source = 'hook'` commands only, ignores `session_id IS NULL`
- JSON output enriches each session with its full command list via `getCommandsBySession`
- Uses `formatSeconds` for duration display and `formatRelativeTime` for session age

---

## Quick Reference: What You Can Do Now

```bash
# Phase 1: Trust & Memory
recall init                              # Set up hooks, import history, scan tools
recall search "git push"                 # Find past commands (add --json for programmatic use)
recall recent                            # Last 20 commands (add --json)
recall project                           # Current repo context (add --json)
recall doctor                            # Health check (add --json)

# Phase 2: AI & Error Recovery
recall ask "how do I deploy?"            # AI-powered semantic search (keyword fallback)
recall fix                               # Show known fixes for recent errors
recall forgotten-tools                   # Installed but unused tools
recall digest                            # Weekly activity summary

# Phase 3: Workflow Automation
recall session                          # Session timeline view (add --json)
recall workflows                         # Detect repeated sequences (add --json)
recall restore --id 1                    # Replay a workflow

# Data management
recall export --output backup.json       # Portable backup
recall import --file backup.json         # Restore
recall delete --id 42                    # Remove one command
recall delete --all --yes                # Nuclear option
recall pause / recall resume             # Toggle capture
recall mcp                              # Start MCP server for AI tool integration
recall <command> --help                  # Show help for any command
recall <command> --json                  # Machine-readable output for any command
```
