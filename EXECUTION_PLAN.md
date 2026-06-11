# Recall — Prioritized Execution Plan

> Generated: 2026-06-11
> Based on: Complete codebase review + market analysis (`MARKET_ANALYSIS.md`)

---

## Current State Assessment

Before planning what to build, here's what **already exists** (and it's substantial):

### ✅ Phase 1: Trust & Memory — **COMPLETE**

| Feature | Status | Quality |
|---------|--------|---------|
| `recall init` — onboarding wizard | ✅ Built | Clean 4-step wizard with auto/print modes |
| Shell hook capture (zsh + bash) | ✅ Built | Zod-validated, decomposed, dedup with window |
| `recall search <query>` | ✅ Built | FTS5 full-text search + LIKE fallback |
| `recall recent` | ✅ Built | With --repo, --all, --limit filters |
| `recall project` — repo context | ✅ Built | Startup patterns, recent cmds, workflows, failures |
| `recall doctor` — health check | ✅ Built | 7 checks: binary, DB, hook, stats, AI, privacy |
| `recall config` | ✅ Built | --get, --set, --list, --reset with type validation |
| `recall ignore` | ✅ Built | add/remove/list patterns |
| `recall delete` | ✅ Built | --id and --all with confirmation |
| `recall uninstall` | ✅ Built | With --keep-data option |
| `recall export` / `recall import` | ✅ Built | JSON with path validation, dedup |
| `recall pause` / `recall resume` | ✅ Built | Toggle capture with config persistence |
| `recall pick` — interactive picker | ✅ Built | Arrow-key navigation with Ctrl-R widget binding |

**Quality notes:** DRY error handling (`withDbCatch`), Bun-native APIs, Zod validation on all inputs, proper FTS5 with triggers, comprehensive PRAGMAs (WAL, busy_timeout), path traversal protection on export/import, secret redaction, session IDs, stderr capture.

### ✅ Phase 2: Delight & Tool Rediscovery — **COMPLETE**

| Feature | Status | Quality |
|---------|--------|---------|
| Tool scanner | ✅ Built | 8 scanners: brew, npm, cargo, pip, gem, go, pnpm, yarn |
| `recall forgotten-tools` | ✅ Built | Compares installed vs used with alternatives (ripgrep→grep, fd→find, etc.) |
| `recall digest` — weekly summary | ✅ Built | Top commands, forgotten tools, pain points with bar charts |

**Quality notes:** Tool alternatives map is well-curated. Digest tracks `last_digest_at`. Dormant tool detection uses `minDaysSinceUse` threshold.

### ✅ Phase 3: Workflow Automation — **COMPLETE**

| Feature | Status | Quality |
|---------|--------|---------|
| Workflow detection engine | ✅ Built | Sequence analysis (length 2-3), session grouping, confidence scoring |
| `recall workflows` | ✅ Built | Lists detected sequences with frequency + session count |
| `recall restore --id <n>` | ✅ Built | Replays by workflow ID |
| `recall replay` | ✅ Built | Dry-run mode, dangerous command detection, skip support |
| Workflow executor | ✅ Built | Sequence execution with safety checks |
| `recall pick` + Ctrl-R widget | ✅ Built | Interactive picker + shell widget binding |

**Quality notes:** `detectAndStoreWorkflows()` algorithm is solid — requires ≥2 sessions and ≥3 total occurrences. Confidence capped at 1.0 via `Math.min(1.0, sessions * 0.25)`.

### ✅ Phase 4: AI / Semantic Search — **SHIPPED (EXPERIMENTAL)**

| Feature | Status | Quality |
|---------|--------|---------|
| AI adapter | ✅ Built | 8 providers: OpenAI, OpenRouter, Ollama, Google, Cohere, Azure, Custom, Local (ONNX) |
| `recall ask` — semantic search | ✅ Built | Fallback chain: AI → keyword. Timeout protection. |
| `recall fix` — error memory | ✅ Built | Error signature matching, fix recall, confidence scoring |
| `recall embed` — background embedding | ✅ Built | Batch + daemon modes |
| Local embedder (ONNX) | ✅ Built | `@xenova/transformers`, all-MiniLM-L6-v2, 384-dim |
| Embeddings DB | ✅ Built | BLOB vectors, command_id foreign key, model tracking |
| Rate limiter | ✅ Built | Per-provider rate limiting with retry/backoff |

**Quality notes:** Clean provider abstraction (SDKEmbedder class), config resolution with auto-detect, validation with `validateAIConfig()`, graceful NoopEmbedder fallback everywhere. The `handleAsk` function has proper timeout protection (`Promise.race` with 10s/15s limits).

### Test Suite

| Metric | Count |
|--------|-------|
| Test files | 14 |
| Total tests | 108+ |
| Categories | CLI commands, DB operations, imports, security, workflows, tools |

---

## The Gap: What the Market Analysis Says vs. Reality

The market analysis identified these priorities:
1. **Perfect the first-run experience** — Show value in 30 seconds
2. **Auto-cd project memory** — zoxide-level mind-reading
3. **Ship `recall ask` to production** — Promote from experimental
4. **Build MCP server** — AI distribution channel
5. **Double down on differentiators** — forgotten tools, workflows, project memory

But actually, the product is MUCH further along than the analysis assumed. So the priorities shift.

---

## Prioritized Execution Plan (Revised)

### TIER 0: Launch Readiness (Do These First)

These are the highest-leverage things that make the product shippable.

#### P0.1: Promote `recall ask` and `recall forgotten-tools` to Production

**Why now:** These are the two features that differentiate Recall from Atuin. They're already built and working behind `RECALL_EXPERIMENTAL=1`. Keeping them hidden means Atuin wins the narrative.

**What to do:**
- Remove `experimentalEnabled` gating for `recall ask`, `recall fix`, and `recall forgotten-tools`
- Add a small privacy notice on first use of `recall ask` (since it needs network for cloud providers)
- Add a `recall config --enable-ai` flag for users who want to opt in cleanly

**Files:** `src/index.ts` — move these commands outside the `if (experimentalEnabled)` block

**Effort:** 🟢 Low (1 file change)

**Impact:** 🔥🔥🔥🔥🔥 — Changes the narrative from "experimental toy" to "shipped product"

---

#### P0.2: Add Auto-Cd Project Memory

**Why now:** This is the "holy shit" moment that zoxide users rave about. Currently, `recall project` is a manual command. The magic happens when it auto-displays.

**What to build:**
- When shell hook detects a `cd` into a git repo, run `recall project` output automatically
- Only show output at most once per session per repo (avoid spam)
- Show it brief: repo name, last 3 commands, startup pattern

**Implementation approach:**
1. Add a `--auto` flag to `recall hook capture` that triggers post-capture context display
2. Detect `cd` commands (start with `cd` or `z ` or `j `)
3. After detection, check if new repo → display context on next new prompt line
4. Track shown repos in a session-level map to avoid repetition

**Alternative simpler approach:**
- Add a `recall hook cd` handler that shells out to display project context
- Hook into `cd` via `chpwd()` in zsh and `cd()` function override in bash

**Files:** `src/cli/hook.ts`, `src/hooks/zsh-snippet.ts`, `src/hooks/bash-snippet.ts`

**Effort:** 🟡 Medium

**Impact:** 🔥🔥🔥🔥🔥 — This is the feature that generates word-of-mouth

---

#### P0.3: First-Run Value Bomb

**Why now:** The current `recall init` shows a friendly wizard but doesn't deliver a "wow" moment. Users need to see something surprising within 30 seconds.

**What to build:**
- After history import, show the **single most surprising insight** immediately
- Examples:
  - "You've run `git status` 47 times this month — want an alias?"
  - "You have `ripgrep` installed but still use `grep`. Switch to save 10x time."
  - "You always run `npm test` after `git pull`. I spotted that pattern."
- Add a `--demo` flag that creates synthetic data for evaluation

**Files:** `src/cli/init.ts`

**Effort:** 🟢 Low (add insight summary to existing init flow)

**Impact:** 🔥🔥🔥🔥🔥 — Makes the first impression unforgettable

---

### TIER 1: Distribution & Ecosystem

#### P1.1: Build MCP Server for Recall

**Why now:** MCP (Model Context Protocol) lets Claude Code, Cursor, and other AI tools query Recall's database. This is a **zero-cost distribution channel** — every Claude Code user becomes a potential Recall user.

**What to build:**
- MCP server that exposes tools:
  - `recall_search(query, repo?, limit?)` — search command history
  - `recall_project(repo_path)` — get project context
  - `recall_recent(limit?)` — recent commands
  - `recall_workflows()` — detected workflows
  - `recall_forgotten_tools()` — installed but unused tools
- Uses stdio transport (bundled with Recall)
- Returns AI-optimized JSON

**Files:** New `src/mcp/` directory

**Effort:** 🟡 Medium (well-documented pattern, clean API abstraction)

**Impact:** 🔥🔥🔥🔥🔥 — Opens AI distribution channel instantly. Makes Recall the "long-term memory" for every AI coding session.

---

#### P1.2: Add `--json` Output to All Commands

**Why now:** JSON output enables piping into other tools, AI integration, and GUI building. It's the foundation for the MCP server and future ecosystem.

**What to build:**
- Add `--json` flag to `search`, `recent`, `project`, `forgotten-tools`, `workflows`, `digest`
- When `--json` is set, output JSON to stdout, errors to stderr
- Ensure the JSON output is stable and versioned

**Files:** All CLI command files

**Effort:** 🟢 Low (add flag + JSON serialization)

**Impact:** 🔥🔥🔥🔥 — Enables programmatic use and ecosystem building

---

#### P1.3: Add `cd` Command Hook to Zsh/Bash Snippets

**Why now:** To enable auto-cd project memory, the shell hooks need to detect directory changes. Currently they only capture commands.

**What to build:**
- In zsh: use `chpwd()` hook (fires on every `cd`)
- In bash: override `cd()` function
- When a new repo is entered, fire a lightweight `recall hook cd --cwd <pwd>`

**Files:** `src/hooks/zsh-snippet.ts`, `src/hooks/bash-snippet.ts`

**Effort:** 🟢 Low

**Impact:** 🔥🔥🔥🔥 — Prerequisite for auto-cd project memory

---

### TIER 2: Product Depth

#### P2.1: Session Timeline View

**Why:** Currently `recall recent` shows a flat list. A timeline grouped by session is more useful for understanding "what I was doing during that debugging session."

**What to build:**
- `recall session` or `recall recent --grouped` — groups commands by session_id
- Shows session start/end time, duration, number of commands
- Expands each session to show commands in chronological order

**Effort:** 🟡 Medium

**Impact:** 🔥🔥🔥🔥 — Makes "remember what I did" much more intuitive

---

#### P2.2: Error Pattern Memory Auto-Learning

**Why:** The error→fix memory exists (`recall fix`) but requires manual recording. Auto-learning would make it magical.

**What to build:**
- When a command fails (exit code != 0), extract error signature
- If the same command later succeeds, record the fix automatically
- This creates a self-learning error memory

**Files:** `src/cli/hook.ts` (post-capture), `src/errors/matcher.ts`

**Effort:** 🟡 Medium

**Impact:** 🔥🔥🔥🔥🔥 — "Error I saw 3 weeks ago? Fix auto-suggested."

---

#### P2.3: Weekly Email Digest

**Why:** The `recall digest` command is good, but an email that lands in your inbox weekly creates a habit loop.

**What to build:**
- Email generation from digest data
- Send via API (optional, user configures)
- Most importantly: keep it very short (3 bullets max)

**Effort:** 🔴 Large (depends on email service integration)

**Impact:** 🔥🔥🔥 — Creates retention loop

---

### TIER 3: Competitive Hardening

#### P3.1: Performance Benchmarks

**Why:** Atuin is Rust. Recall is Bun/TypeScript. Need to verify performance is competitive.

**What to do:**
- Benchmark: hook capture latency (<50ms target)
- Benchmark: search latency (<100ms for 10K records)
- Benchmark: history import throughput (>10K/min)
- Publish results in README

**Effort:** 🟢 Low

**Impact:** 🔥🔥🔥 — Addresses the "but is it fast enough?" question

---

#### P3.2: MacOS Binary + Homebrew Tap

**Why:** The `bun build --compile` + codesign pipeline exists. Need to make installation trivial.

**What to do:**
- Create Homebrew tap (`brew install recall-cli`)
- Create curl-to-bash installer (`curl -fsSL https://recall.sh/install | bash`)
- Optimize binary size (tree-shake dependencies)

**Effort:** 🟡 Medium

**Impact:** 🔥🔥🔥🔥 — Lowers friction to try

---

### TIER 4: Marketing & Launch

#### P4.1: Screenshot/Walkthrough Generation

**Why:** Can't launch without showing what it does.

**What to build:**
- Script that generates a demo of each command
- Record terminal sessions as animated GIFs (vhs or asciinema)
- Create README screenshots

**Effort:** 🟢 Low

**Impact:** 🔥🔥🔥🔥 — Assets needed for every launch activity

---

#### P4.2: Comparison Page Content

**Why:** Users will compare Recall vs Atuin vs fzf. Need to own the narrative.

**What to do:**
- Create `VS.md` or website page comparing Recall with competitors
- Honest, data-driven comparisons (not FUD)
- Highlight unique features: forgotten tools, workflow detection, project memory

**Effort:** 🟢 Low

**Impact:** 🔥🔥🔥 — Helps win the comparison battle

---

## Summary: The Top 5 Things to Build

| # | Task | Effort | Impact | Why Now |
|---|------|--------|--------|---------|
| 1 | **Promote experimental features to prod** | 🟢 Low | 🔥🔥🔥🔥🔥 | Forgotten tools and ask are ready. Hiding them costs launches. |
| 2 | **MCP Server** | 🟡 Medium | 🔥🔥🔥🔥🔥 | Distribution via Claude Code, Cursor. Zero-cost channel. |
| 3 | **Auto-cd project memory** | 🟡 Medium | 🔥🔥🔥🔥🔥 | Holy-shit moment. zoxide-level magic. Word-of-mouth driver. |
| 4 | **First-run value bomb** | 🟢 Low | 🔥🔥🔥🔥🔥 | Makes or breaks first impression. Currently too polite. |
| 5 | **JSON output + Homebrew tap** | 🟡 Medium | 🔥🔥🔥🔥 | Foundation for ecosystem and distribution. |

---

## What NOT to Build (Yet)

| Don't Build | Why |
|-------------|-----|
| GUI/TUI | The line-based output is a feature (pipes well). Add later. |
| Cloud sync | Undermines local-first positioning. Let Atuin own sync. |
| Team features | Premature for pre-launch. |
| Mobile app | Wrong surface for this product. |
| Plugin system | Too early — don't know what plugins users want. |
| More package manager scanners | 8 covers 95% of developers. Add on demand. |

---

## Effort Legend

| Icon | Meaning |
|------|---------|
| 🟢 Low | 1-2 files, <1 day |
| 🟡 Medium | 3-5 files, 1-3 days |
| 🔴 Large | 5+ files, 3-7 days |
| 🔴🔴 Very Large | Multiple modules, 1-2 weeks |
