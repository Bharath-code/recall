# Recall — Implementation Plan & Research

## Overview

Recall is a local-first developer workflow memory assistant. Phase 1 MVP ships in 3 weeks with: reliable shell hook capture, local command memory, fast search, project memory basics, and low-friction onboarding.

**Core promise:** "Your terminal remembers what you forget."

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Bun SQLite for storage | Native Bun support, fast, zero-config |
| CAC over Commander | Lighter weight, better TypeScript support |
| Hook payload via IPC | Clean separation, testable, async |
| Zod for validation | Runtime type safety, clear schema |
| Pino for logging | Structured logs, low overhead |
| Idempotent shell hook install | No backups — detect and skip (zinit pattern) |
| Respect $HISTFILE env var | Industry standard for shell history tools |
| Layered command normalization | Trim → collapse → tilde-expand → case-sensitive window dedup |
| AI layer separated | `src/ai/` stub now, impl Phase 4. CLI always works without AI |
| Sync adapter pattern | `src/sync/adapter.ts` interface, SQLite impl now, swap later |
| TDD for normalization | High value, deterministic, many edge cases |

---

## Shell RC Modification Strategy

### Industry Research Findings

| Tool | Creates Backup | Idempotent | Approach |
|------|--------------|-----------|----------|
| **Starship** | No | N/A | Prints instructions only; user manually adds to rc |
| **Zinit** | No | Yes | Checks for existing entry, skips if found |
| **Direnv** | No | No | Prints instructions; user manually adds |
| **Autojump** | No | No | Appends to rc file; can duplicate |

### Best Practice Consensus

**Modern approach**: Idempotent installs with detection, not backups.

1. **Detection over backup**: Check if entry exists, skip if present (zinit pattern)
2. **Append-only**: Add to end of file, never overwrite
3. **Backup is user responsibility**: Documentation should instruct users to backup first
4. **Starship/Direnv model (best)**: Don't touch rc files — print instructions

### Recall's Two-Mode Approach

```
Option A (Default - Starship model):
  recall init
  → Prints: 'eval "$(recall hook zsh)"'
  → User manually adds to their ~/.zshrc

Option B (Opt-in --auto flag - Zinit pattern):
  recall init --auto
  → Greps for existing entry, skips if found
  → Appends safely if not present
```

**Rationale:** Respects both power users (manual) and convenience seekers (auto with safety).

---

## History File Location Strategy

### Standard HISTFILE Locations

**Bash:**
- Default: `~/.bash_history`
- Set via `$HISTFILE` environment variable

**Zsh:**
- No built-in default — must be explicitly configured
- Common defaults:
  - `~/.histfile` (zsh setup wizard)
  - `~/.zhistory` (Oh-My-Zsh)
  - `~/.zsh_history` (many systems)
- Requires `HISTFILE` + `SAVEHIST` (non-zero) to persist

### Recall's Detection Order

```typescript
const getHistoryFiles = (shell: 'zsh' | 'bash'): string[] => {
  if (shell === 'bash') {
    const histfile = Bun.env.HISTFILE;
    if (histfile) return [histfile];
    return [Bun.env.HOME + '/.bash_history'];
  }

  // zsh: check ZDOTDIR, then HOME
  const zdotdir = Bun.env.ZDOTDIR || Bun.env.HOME;
  const histfile = Bun.env.HISTFILE;
  if (histfile) return [histfile];

  // zsh uses these common names — try in order
  return [
    `${zdotdir}/.zsh_history`,
    `${zdotdir}/.zhistory`,      // Oh-My-Zsh
    `${zdotdir}/.histfile`,       // zsh setup wizard
  ];
};
```

**Rationale:** Respects user configuration ($HISTFILE, $ZDOTDIR) while providing smart fallbacks.

---

## Command Normalization Rules

### Industry Research Findings

| Tool | Normalization | Case | Window |
|------|--------------|------|--------|
| fzf | Strip line numbers | Case-sensitive | All-time |
| fish-shell | Exact match with dedup | Case-sensitive | Session |
| bash HISTCONTROL | ignoredups (consecutive), erasedups (all) | Case-sensitive | Configurable |

### Recall's Layered Normalization

| Stage | Transform | Example |
|-------|-----------|---------|
| 1. Trim | Leading/trailing whitespace | `"  ls  "` → `"ls"` |
| 2. Collapse | Multiple spaces → one | `"ls   -la"` → `"ls -la"` |
| 3. Expand tilde | `~` → `$HOME` | `"ls ~/foo"` → `"ls $HOME/foo"` |
| 4. Case | **Case-sensitive** | `ls` ≠ `LS` |
| 5. Skip prefix | Commands starting with space | Respects `HISTCONTROL=ignorespace` |
| 6. Deduplicate | Against last 100 commands | Keeps most recent |

**Rationale:**
- Case-sensitive: CLI tools ARE case-sensitive, preserving user intent
- 100-command window: Avoids session-wide dedup issues while preventing spam
- Tilde expansion: `~/foo` and `$HOME/foo` ARE the same command
- Skip prefix: Respects user's `HISTCONTROL` settings

**Future upgrade path:** Layer BM25/fuzzy search on top of exact-match normalization for Phase 4 (semantic recall).

---

## Project Structure

```
src/
├── cli/                    # CAC commands, pure functions
│   ├── init.ts             # Onboarding wizard
│   ├── search.ts           # recall search
│   ├── recent.ts           # recall recent
│   ├── project.ts          # recall project
│   ├── hook.ts             # recall hook capture
│   ├── uninstall.ts        # recall uninstall
│   ├── doctor.ts           # recall doctor
│   └── forgotten-tools.ts   # recall forgotten-tools
│
├── db/                     # SQLite layer — no AI knowledge
│   ├── index.ts            # Connection, migrations
│   ├── schema.sql          # Table definitions
│   ├── commands.ts         # Command CRUD
│   ├── repos.ts            # Repo CRUD
│   └── tools.ts            # Tool CRUD
│
├── hooks/                  # Shell capture — pure functions
│   ├── zsh-snippet.ts     # Zsh hook generation
│   ├── bash-snippet.ts    # Bash hook generation
│   └── detect.ts           # Install detection (idempotent)
│
├── import/                  # History import
│   ├── history-parser.ts   # Parse zsh/bash history formats
│   └── normalizer.ts      # Layered normalization (TDD)
│
├── repos/                  # Project memory
│   └── detector.ts         # Git root detection
│
├── tools/                  # Tool scanner
│   └── scanner.ts          # brew/npm/cargo inventory
│
├── sync/                   # Team sync (interface + SQLite impl)
│   └── adapter.ts          # SyncAdapter interface + LocalSync impl
│
└── ai/                     # AI layer (stub now, impl Phase 4)
    └── adapter.ts           # AI provider abstraction, no-op fallback

tests/
├── db/                     # DB layer tests
├── import/                 # Normalizer tests (TDD)
└── repos/                  # Git detector tests
```

**Key principle:** Every AI feature has a "dumb fallback" CLI-only path. `recall search` always works without AI. AI just adds semantic search in Phase 4.

---

## Sync Strategy

### Phase 1-3: Local SQLite Only
Ship fast, validate product, zero infrastructure.

### Phase 5+ (Team): Design for Swap

**Interface:**
```typescript
// src/sync/adapter.ts
interface SyncAdapter {
  push(commands: Command[]): Promise<void>
  pull(): Promise<Command[]>
  subscribe(callback: (cmd: Command) => void): Unsubscribe
}

// src/sync/local.ts — shipped in Phase 1
class LocalSyncAdapter implements SyncAdapter {
  push() { /* noop */ }
  pull() { return [] }
  subscribe() { return () => {} }
}

// Future options when team features proven:
class ConvexSyncAdapter implements SyncAdapter { /* ... */ }
class CRDTSyncAdapter implements SyncAdapter { /* ... */ }
```

**Why not Convex now:**
- Violates local-first promise (data leaves user's machine)
- Shell history is sensitive — privacy concern
- Vendor lock-in (Convex is managed, not self-hostable)
- Complexity and cost for unproven features

**Phase 5 options (when team features proven):**
| Option | Approach | Tradeoff |
|--------|----------|----------|
| ElectricSQL | Postgres + local-first | Adds DB server,成熟的 |
| CRDTs | Automerge, Yjs | Complex, but peer-to-peer |
| Self-hosted | SQLite → git-like sync | Simple, git-like workflow |
| Export/Import | Manual pack files | No realtime, dead simple |

---

## Testing Strategy

### TDD for: Deterministic, High-Value Components

| Component | Why TDD |
|----------|---------|
| `import/normalizer.ts` | Many edge cases, deterministic, high value |
| `import/history-parser.ts` | Multiple formats to handle |
| `hooks/detect.ts` | Grep logic testable |
| `repos/detector.ts` | Git paths deterministic |
| `db/commands.ts` | CRUD operations |

### Integration Tests for: CLI Commands

```typescript
// tests/cli/search.test.ts
// Uses test DB, invokes CLI commands
```

### Manual Testing for: Shell Hooks

Shell behavior is hard to unit test. Verify:
- Hook captures commands in new shell session
- Hook doesn't break existing sessions
- Uninstall cleanly removes snippet

---

## Database Schema

### commands table
```sql
CREATE TABLE commands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raw_command TEXT NOT NULL,
  normalized_command TEXT NOT NULL,
  cwd TEXT NOT NULL,
  repo_path_hash TEXT,
  exit_code INTEGER,
  duration_ms INTEGER,
  shell TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_commands_created_at ON commands(created_at DESC);
CREATE INDEX idx_commands_repo ON commands(repo_path_hash);
CREATE INDEX idx_commands_normalized ON commands(normalized_command);
```

### repos table
```sql
CREATE TABLE repos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_path_hash TEXT NOT NULL UNIQUE,
  repo_name TEXT NOT NULL,
  repo_root TEXT NOT NULL,
  last_opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  startup_commands_json TEXT
);
```

### tools table
```sql
CREATE TABLE tools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_name TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL CHECK(source IN ('brew', 'npm', 'cargo')),
  installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP,
  usage_count INTEGER DEFAULT 0
);
```

### errors table
```sql
CREATE TABLE errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  error_signature TEXT NOT NULL,
  command_id INTEGER REFERENCES commands(id),
  fix_summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Dependency Graph

```
Database Schema & Migrations
    │
    ├── CLI Framework Setup
    │       │
    │       ├── Core Commands (search, recent, project)
    │       │
    │       └── Hook Capture Command
    │
    ├── Sync Adapter (interface + local impl)
    │
    ├── Shell Hooks (zsh first)
    │       │
    │       └── Bash support
    │
    ├── History Import
    │       │
    │       └── Parser / Normalizer (TDD)
    │
    ├── Project Memory
    │       │
    │       └── Git root detection
    │
    └── Onboarding Wizard
            │
            └── Tool Scanner (brew/npm/cargo)
```

---

## Task List

### Phase 1: Foundation

#### Task 1: Project Setup & CLI Scaffold
**Size:** S (1-2 files)

**Description:** Initialize Bun + TypeScript project with CAC CLI framework, folder structure, and basic help command.

**Acceptance criteria:**
- [ ] `bun run dev` starts CLI in dev mode
- [ ] `recall --help` shows usage info
- [ ] `recall --version` shows version
- [ ] Project structure follows module boundaries (src/commands, src/db, src/hooks, etc.)

**Verification:**
- [ ] Build succeeds: `bun run build`
- [ ] CLI responds to `--help`

**Dependencies:** None

**Files likely touched:**
- `package.json`
- `src/index.ts` (entry point)
- `src/cli/` (directory)
- `src/db/` (directory structure)

---

#### Task 2: Database Schema & Migrations
**Size:** M (3-5 files)

**Description:** Set up Bun SQLite with migrations system and all tables (commands, repos, tools, errors).

**Acceptance criteria:**
- [ ] `db/migrations/001_initial_schema.sql` creates all tables
- [ ] `db/commands.ts` exposes typed helpers (insertCommand, getCommands, etc.)
- [ ] `db/repos.ts` exposes typed helpers
- [ ] `db/tools.ts` exposes typed helpers
- [ ] Indexes created on foreign keys and query columns
- [ ] Migrations run on first startup

**Verification:**
- [ ] `bun test` passes DB connection test
- [ ] Manual: `recall` creates `.recall/recall.db` on first run

**Dependencies:** Task 1

**Files likely touched:**
- `src/db/schema.sql`
- `src/db/migrations.ts`
- `src/db/commands.ts`
- `src/db/repos.ts`
- `src/db/tools.ts`
- `src/db/index.ts`
- `src/sync/adapter.ts` (SyncAdapter interface + LocalSync impl)

---

#### Task 3: Core CLI Commands — search, recent
**Size:** S (1-2 files)

**Description:** Implement `recall search <query>` and `recall recent` commands with SQLite full-text search.

**Acceptance criteria:**
- [ ] `recall search <term>` returns matching commands with cwd, timestamp
- [ ] `recall recent` returns last 20 commands
- [ ] Output format: readable table or line-by-line
- [ ] Search is case-insensitive
- [ ] Results include: command, cwd, date, exit code

**Verification:**
- [ ] Insert test command via SQL, recall it via CLI
- [ ] `recall recent` returns commands sorted by created_at DESC

**Dependencies:** Task 2

**Files likely touched:**
- `src/commands/search.ts`
- `src/commands/recent.ts`

---

#### Task 16: CLI Design System (UI Module)
**Size:** S (3-5 files)

**Description:** Build `src/ui/` module for consistent, delightful CLI output — colors, icons, spinners, formatting. Default icons on, `--no-icons` flag to disable (eza pattern). Respects `NO_COLOR` env var.

**Acceptance criteria:**
- [ ] `src/ui/colors.ts` — semantic ANSI wrappers (path, success, error, dim)
- [ ] `src/ui/icons.ts` — UTF-8 icon constants (⚡📁📦🔍🔧✓✗→⊙)
- [ ] `src/ui/spinner.ts` — ora wrapper with preset configs
- [ ] `src/ui/format.ts` — command/cwd/time formatting with truncation
- [ ] `NO_COLOR=1` outputs plain text, no ANSI codes
- [ ] `--no-icons` flag disables icon output
- [ ] Default: icons + colors enabled

**Verification:**
- [ ] `NO_COLOR=1 bun run dev` → plain text output
- [ ] `bun run dev -- --no-icons` → no icons in output
- [ ] `bun run dev` → colored output with icons
- [ ] Spinner shows during import (test with 1000+ commands)

**Dependencies:** Task 1 (logger already configured)

**Files likely touched:**
- `src/ui/index.ts`
- `src/ui/colors.ts`
- `src/ui/icons.ts`
- `src/ui/spinner.ts`
- `src/ui/format.ts`

---

### Phase 1 Checkpoint: Foundation
- [ ] Database works with all tables
- [ ] Basic CLI commands functional
- [ ] Build passes cleanly

---

### Phase 2: Shell Hook Capture

#### Task 4: Hook Capture Command
**Size:** S (1 file)

**Description:** Create `recall hook capture` command that receives preexec/precmd data and writes to DB.

**Acceptance criteria:**
- [ ] `recall hook capture --raw-command "..." --start-time 123... --cwd "..." --shell zsh` inserts command
- [ ] `recall hook capture --exit-code 0 --duration-ms 150 --command-id N` updates command
- [ ] Idempotent: same command_id won't duplicate
- [ ] Returns fast (<50ms)

**Verification:**
- [ ] Manual: invoke with test payload, verify in DB
- [ ] Concurrent invocations handled correctly

**Dependencies:** Task 2

**Files likely touched:**
- `src/commands/hook.ts`

---

#### Task 5: Zsh Hook Snippet
**Size:** M (3-5 files)

**Description:** Create the zsh hook snippet that calls `recall hook capture` on preexec/precmd.

**Acceptance criteria:**
- [ ] `recall init` generates proper zsh snippet
- [ ] Snippet captures: raw command, start time, cwd, shell
- [ ] precmd calls capture with exit code + duration
- [ ] Non-interactive shells handled (guards on $?)
- [ ] **Idempotent install** (grep for existing entry before appending)
- [ ] **Default: print-only mode** (Starship model) — shows `eval "$(recall hook zsh)"` for manual add
- [ ] **Opt-in --auto flag** for automatic append with detection

**Verification:**
- [ ] After `recall init`, new zsh session captures commands
- [ ] Existing shell sessions not affected

**Dependencies:** Task 4

**Files likely touched:**
- `src/hooks/zsh-snippet.ts`
- `src/hooks/detect.ts` (checks for existing entry)
- `src/commands/init.ts`

---

#### Task 6: Bash Hook Support
**Size:** S (1-2 files)

**Description:** Extend to bash PROMPT_COMMAND for bash users.

**Acceptance criteria:**
- [ ] `recall init` detects bash and appends to ~/.bashrc
- [ ] Same payload format as zsh
- [ ] Install is idempotent (checks for existing snippet)

**Verification:**
- [ ] `recall init` on bash machine works
- [ ] Commands captured in bash session

**Dependencies:** Task 5

**Files likely touched:**
- `src/hooks/bash-snippet.ts`

---

### Phase 2 Checkpoint: Shell Hooks
- [ ] `recall init` installs hooks correctly
- [ ] Commands captured with timing data
- [ ] `recall search` finds captured commands

---

### Phase 3: History Import & Parser

#### Task 7: Shell History Import
**Size:** M (3-5 files)

**Description:** Import existing ~/.zsh_history and ~/.bash_history on `recall init`.

**Acceptance criteria:**
- [ ] Import respects HISTFILE location (env var + $ZDOTDIR for zsh)
- [ ] Parses zsh history format (semicolon separators)
- [ ] Parses bash history format (colon prefixes or raw)
- [ ] Deduplicates against existing DB entries (last 100 commands)
- [ ] Respects date filters (last 30 days, all)
- [ ] **Normalized** per Recall's rules (trim, collapse, tilde-expand)
- [ ] Batch inserts (1000/batch) with progress indicator

**Verification:**
- [ ] Import 1000 commands, verify count in DB
- [ ] Deduplication: running import twice doesn't double entries
- [ ] **TDD:** Normalizer tests pass (trim, collapse, tilde-expand, dedup window)

**Dependencies:** Task 2

**Files likely touched:**
- `src/import/history-parser.ts`
- `src/import/normalizer.ts`
- `src/commands/init.ts` (extend)

---

### Phase 3 Checkpoint: History Import
- [ ] Existing history searchable via `recall search`
- [ ] Import completes in <10s for 10k entries

---

### Phase 4: Project Memory

#### Task 8: Git Root Detection & Repo Tracking
**Size:** S (1-2 files)

**Description:** Detect git root from any cwd, store repo metadata in repos table.

**Acceptance criteria:**
- [ ] `detectGitRoot(cwd: string): string | null` finds .git parent or null
- [ ] Repos table updated on first command from new repo
- [ ] `last_opened_at` updated when detecting repo

**Verification:**
- [ ] From /project/subdir, detects /project as repo root
- [ ] Outside git repo, returns null gracefully

**Dependencies:** Task 2

**Files likely touched:**
- `src/repos/detector.ts`
- `src/repos/index.ts`

---

#### Task 9: Project Context Command
**Size:** S (1 file)

**Description:** Implement `recall project` showing context for current repo.

**Acceptance criteria:**
- [ ] `recall project` shows:
  - Repo name
  - Last 5 commands in this repo
  - Common startup commands (if detected)
- [ ] Falls back gracefully when not in git repo
- [ ] Shows "No data yet" state cleanly

**Verification:**
- [ ] From inside a git repo, `recall project` shows relevant info
- [ ] From outside git repo, shows helpful message

**Dependencies:** Task 8

**Files likely touched:**
- `src/commands/project.ts`

---

### Phase 4 Checkpoint: Project Memory
- [ ] `recall project` works from within git repos
- [ ] Recent commands grouped by repo

---

### Phase 5: Onboarding & Tool Scanner

#### Task 10: Onboarding Wizard
**Size:** M (3-5 files)

**Description:** Interactive `recall init` wizard with privacy info and value preview.

**Acceptance criteria:**
- [ ] Step-by-step prompts with clear defaults
- [ ] Shell detection and hook install (print-only default, --auto opt-in)
- [ ] History import offer (30 days / all / skip)
- [ ] Tool scan offer
- [ ] Privacy info shown clearly
- [ ] Instant value preview (top commands, top repos)

**Verification:**
- [ ] Fresh install: `recall init` completes in <2 mins
- [ ] First wow moment: user sees their commands immediately after init

**Dependencies:** Tasks 4, 5, 7

**Files likely touched:**
- `src/commands/init.ts` (wizard logic)
- `src/wizard/screens.ts`

---

#### Task 11: Tool Scanner (brew/npm/cargo)
**Size:** S (1-2 files)

**Description:** Scan installed tools and track in tools table.

**Acceptance criteria:**
- [ ] `bun run scan:tools` (or internal) runs:
  - `brew list` for macOS
  - `npm list -g --depth=0`
  - `cargo install --list`
- [ ] Results stored in tools table
- [ ] Tool detection: ripgrep vs grep, etc.

**Verification:**
- [ ] Scan completes and shows installed tool count
- [ ] Tools table populated with sources

**Dependencies:** Task 2

**Files likely touched:**
- `src/tools/scanner.ts`
- `src/commands/forgotten-tools.ts`

---

#### Task 12: Forgotten Tools Command
**Size:** S (1 file)

**Description:** Surface tools that are installed but rarely used.

**Acceptance criteria:**
- [ ] `recall forgotten-tools` shows tools with low usage count
- [ ] Compares against available commands in history
- [ ] Shows context: "You have ripgrep installed but use grep instead"

**Verification:**
- [ ] With brew ripgrep installed but never used, shows in list
- [ ] Tool usage count is accurate

**Dependencies:** Task 11

**Files likely touched:**
- `src/commands/forgotten-tools.ts`

---

### Phase 5 Checkpoint: Onboarding Complete
- [ ] `recall init` completes fully with all options
- [ ] User sees immediate value (their commands, tools, repos)
- [ ] Uninstall command exists and works

---

### Phase 6: Polish & Launch Prep

#### Task 13: Error Handling & Edge Cases
**Size:** S (scattered)

**Description:** Comprehensive error handling for all commands.

**Acceptance criteria:**
- [ ] Database locked errors handled gracefully
- [ ] Shell detection fails gracefully on unknown shell
- [ ] No crash on malformed hook payloads (Zod validation)
- [ ] Clear error messages for users

**Verification:**
- [ ] Inject bad data, verify no crashes
- [ ] Error messages are user-friendly (not stack traces)

**Dependencies:** All prior tasks

**Files likely touched:**
- Various command files (add error handling)

---

#### Task 14: Uninstall Command
**Size:** S (1 file)

**Description:** `recall uninstall` cleanly removes hooks and optionally data.

**Acceptance criteria:**
- [ ] Removes hook snippet from ~/.zshrc / ~/.bashrc
- [ ] Idempotent (safe to run twice)
- [ ] Option to keep or delete database
- [ ] Clear confirmation before destructive actions

**Verification:**
- [ ] After uninstall, shell sessions don't capture
- [ ] Hook snippet completely removed from rc files

**Dependencies:** Task 5

**Files likely touched:**
- `src/commands/uninstall.ts`

---

#### Task 15: Doctor Command
**Size:** S (1 file)

**Description:** `recall doctor` for debugging installation issues.

**Acceptance criteria:**
- [ ] Checks: shell hook installed?
- [ ] Checks: database accessible?
- [ ] Checks: hook binary in PATH?
- [ ] Reports status with fix suggestions

**Verification:**
- [ ] On healthy install: all checks pass
- [ ] On broken install: shows what's wrong and how to fix

**Dependencies:** Tasks 1, 5

**Files likely touched:**
- `src/commands/doctor.ts`

---

### Final Checkpoint: MVP Complete
- [ ] All commands functional: init, search, recent, project, forgotten-tools, uninstall, doctor
- [ ] Build succeeds: `bun run build`
- [ ] Can install on clean machine in <2 mins
- [ ] Search returns results in <100ms
- [ ] Privacy: all data local, no network calls

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Shell rc corruption | High | **Idempotent detection** (zinit pattern), Starship-print-model default |
| Duplicate history entries | Medium | **Layered normalization** (trim, collapse, tilde-expand, window dedup) |
| Missing HISTFILE env | Medium | **$HISTFILE respect** with $ZDOTDIR fallback chain |
| Hook reliability | High | **Test matrix** + graceful degradation + install verification |
| Large history import slow | Med | **Batch inserts** (1k/batch) + streaming parse + progress |
| Unclear value prop | High | **First-run demo** with actual user data visible immediately |
| User data loss fear | High | **Local-only** messaging, no cloud, explicit privacy |

---

## CLI Output Wireframes

### 1. recall init — Onboarding Wizard

**Screen 1: Welcome**
```
╔══════════════════════════════════════════════════════════════╗
║                      Recall v0.1.0                        ║
║            Your terminal remembers what you forget.          ║
║                                                              ║
║  Let's get started in under 2 minutes.                      ║
║                                                              ║
║  [Press Enter to continue]                                   ║
╚══════════════════════════════════════════════════════════════╝
```

**Screen 2: Shell Detection**
```
╔══════════════════════════════════════════════════════════════╗
║  Shell Detection                                             ║
║  ─────────────────────────────────────────────────────────  ║
║  ✓ Detected: zsh                                           ║
║                                                              ║
║  Install shell hook to capture commands?                      ║
║                                                              ║
║  Option A: Manual (Recommended)                              ║
║    └─ We'll show you one command to add to ~/.zshrc         ║
║                                                              ║
║  Option B: Auto                                             ║
║    └─ We'll add it for you (safe, idempotent)               ║
║                                                              ║
║  [A/b]                                                      ║
╚══════════════════════════════════════════════════════════════╝
```

**Screen 3: Manual Hook Install (if Option A)**
```
╔══════════════════════════════════════════════════════════════╗
║  Shell Hook Setup                                           ║
║  ─────────────────────────────────────────────────────────  ║
║                                                              ║
║  Add this line to your ~/.zshrc:                             ║
║                                                              ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ eval "$(recall hook zsh)"                               │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  Then restart your shell or run: source ~/.zshrc             ║
║                                                              ║
║  [Press Enter when done]                                     ║
╚══════════════════════════════════════════════════════════════╝
```

**Screen 4: History Import**
```
╔══════════════════════════════════════════════════════════════╗
║  Import Shell History                                        ║
║  ─────────────────────────────────────────────────────────  ║
║                                                              ║
║  Found: ~/.zsh_history                                       ║
║  Approx: 2,847 commands                                      ║
║                                                              ║
║  Import options:                                             ║
║                                                              ║
║  [1] Last 30 days (~420 commands)                           ║
║  [2] Last 90 days (~1,200 commands)                          ║
║  [3] All history (~2,847 commands)                          ║
║  [4] Skip (import later with recall import)                  ║
║                                                              ║
║  [1/2/3/4]                                                  ║
╚══════════════════════════════════════════════════════════════╝
```

**Screen 5: Tool Scan**
```
╔══════════════════════════════════════════════════════════════╗
║  Tool Scanner                                                ║
║  ─────────────────────────────────────────────────────────  ║
║                                                              ║
║  Scan installed tools (brew/npm/cargo)?                      ║
║                                                              ║
║  This helps us suggest:                                      ║
║  • Tools you installed but rarely use                        ║
║  • Better alternatives to what you're using                 ║
║                                                              ║
║  [Y/n]                                                      ║
╚══════════════════════════════════════════════════════════════╝
```

**Screen 6: Privacy**
```
╔══════════════════════════════════════════════════════════════╗
║  Your Privacy                                                ║
║  ─────────────────────────────────────────────────────────  ║
║                                                              ║
║  ✓ All data stored locally in ~/.recall/                    ║
║  ✓ No cloud sync (unless you enable team features later)    ║
║  ✓ AI features disabled by default                          ║
║  ✓ No telemetry or tracking                                  ║
║                                                              ║
║  Your shell history is personal. It stays personal.          ║
║                                                              ║
║  [Press Enter to continue]                                   ║
╚══════════════════════════════════════════════════════════════╝
```

**Screen 7: First Value**
```
╔══════════════════════════════════════════════════════════════╗
║  ✓ Setup Complete!                                           ║
║  ─────────────────────────────────────────────────────────  ║
║                                                              ║
║  You're ready to recall. Here's what we found:               ║
║                                                              ║
║  Commands captured:     47                                    ║
║  Repos detected:        3    → ~/projects/recall            ║
║                                   ~/projects/api             ║
║                                   ~/dotfiles                 ║
║                                                              ║
║  Forgot these tools:   12    → ripgrep (installed 90d ago)  ║
║                                   fd (installed 60d ago)     ║
║                                                              ║
║  Next: Try 'recall search <query>' or 'recall recent'       ║
╚══════════════════════════════════════════════════════════════╝
```

---

### 2. recall search

**Normal Output**
```
╔══════════════════════════════════════════════════════════════╗
║  recall search "docker prune"                               ║
║  ─────────────────────────────────────────────────────────  ║
║                                                              ║
║  Found 3 matching commands:                                   ║
║                                                              ║
║  1. docker system prune -a                                   ║
║     cwd: ~/projects/api                                      ║
║     14 days ago · exit: 0 · 2.3s                            ║
║                                                              ║
║  2. docker volume prune                                      ║
║     cwd: ~/projects/api                                      ║
║     21 days ago · exit: 0 · 0.8s                            ║
║                                                              ║
║  3. docker image prune -a                                    ║
║     cwd: ~/                                                 ║
║     45 days ago · exit: 0 · 1.1s                            ║
║                                                              ║
║  [Use ↑↓ to navigate, Enter to copy, q to quit]            ║
╚══════════════════════════════════════════════════════════════╝
```

**Empty State: No Results**
```
╔══════════════════════════════════════════════════════════════╗
║  recall search "xyzzy"                                       ║
║  ─────────────────────────────────────────────────────────  ║
║                                                              ║
║  No matching commands found.                                  ║
║                                                              ║
║  Tips:                                                       ║
║  • Check spelling                                            ║
║  • Try partial words (e.g., 'dock' instead of 'docker')    ║
║  • Use 'recall recent' to see all recent commands          ║
║                                                              ║
║  First time? Run 'recall import' to bring in history       ║
╚══════════════════════════════════════════════════════════════╝
```

**Empty State: No History Yet**
```
╔══════════════════════════════════════════════════════════════╗
║  recall search "docker"                                      ║
║  ─────────────────────────────────────────────────────────  ║
║                                                              ║
║  No commands captured yet.                                    ║
║                                                              ║
║  Make sure the shell hook is installed:                      ║
║  1. Check ~/.zshrc has the recall hook                      ║
║  2. Restart your shell or run: source ~/.zshrc              ║
║  3. Run a few commands, then search again                    ║
║                                                              ║
║  Or import existing history: recall init                     ║
╚══════════════════════════════════════════════════════════════╝
```

---

### 3. recall recent

**Normal Output**
```
╔══════════════════════════════════════════════════════════════╗
║  recall recent                                              ║
║  ─────────────────────────────────────────────────────────  ║
║                                                              ║
║  Last 20 commands:                                           ║
║                                                              ║
║  1. git status                      ~/projects/recall  2m ago ║
║  2. bun run dev                     ~/projects/recall  5m ago ║
║  3. docker compose up -d            ~/projects/api    12m ago║
║  4. npm test                        ~/projects/api    18m ago║
║  5. cargo build --release           ~/dotfiles        34m ago║
║  ...                                                            ║
║                                                              ║
║  [Use ↑↓ to navigate, Enter to copy, q to quit]            ║
╚══════════════════════════════════════════════════════════════╝
```

**Empty State**
```
╔══════════════════════════════════════════════════════════════╗
║  recall recent                                              ║
║  ─────────────────────────────────────────────────────────  ║
║                                                              ║
║  No commands yet.                                            ║
║                                                              ║
║  Commands you run after setup will appear here.              ║
║                                                              ║
║  Run 'recall init' if you haven't set up yet.               ║
╚══════════════════════════════════════════════════════════════╝
```

---

### 4. recall project

**Normal Output (Inside Git Repo)**
```
╔══════════════════════════════════════════════════════════════╗
║  recall project                                             ║
║  ─────────────────────────────────────────────────────────  ║
║                                                              ║
║  📁 ~/projects/recall (git repo)                            ║
║                                                              ║
║  Last 5 commands in this repo:                               ║
║  ├─ git status                      2m ago                  ║
║  ├─ bun run dev                     5m ago                  ║
║  ├─ bun test                       12m ago                 ║
║  ├─ git add -A                     1h ago                  ║
║  └─ git commit -m "fix auth"       1h ago                 ║
║                                                              ║
║  Startup patterns detected:                                  ║
║  ├─ bun install (usually first after clone)                 ║
║  └─ bun run dev (usually to start work)                    ║
║                                                              ║
║  [Press Enter to close]                                      ║
╚══════════════════════════════════════════════════════════════╝
```

**Empty State: Not in Git Repo**
```
╔══════════════════════════════════════════════════════════════╗
║  recall project                                             ║
║  ─────────────────────────────────────────────────────────  ║
║                                                              ║
║  Not in a git repository.                                    ║
║                                                              ║
║  cd into a project to see:                                   ║
║  • Recent commands in this project                           ║
║  • Startup patterns                                         ║
║  • Repo-specific memory                                     ║
╚══════════════════════════════════════════════════════════════╝
```

**Empty State: No Data for Repo**
```
╔══════════════════════════════════════════════════════════════╗
║  recall project                                             ║
║  ─────────────────────────────────────────────────────────  ║
║                                                              ║
║  📁 ~/projects/new-project (git repo)                       ║
║                                                              ║
║  No commands captured for this project yet.                   ║
║                                                              ║
║  Commands run in this directory will be tracked.            ║
╚══════════════════════════════════════════════════════════════╝
```

---

### 5. recall forgotten-tools

**Normal Output**
```
╔══════════════════════════════════════════════════════════════╗
║  recall forgotten-tools                                      ║
║  ─────────────────────────────────────────────────────────  ║
║                                                              ║
║  You have tools installed but rarely use:                    ║
║                                                              ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ ⚡ ripgrep        brew    installed 90d ago           │  ║
║  │   You use 'grep' instead. rg is 10x faster.           │  ║
║  │   → alias grep='rg'                                   │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ ⚡ fd              brew    installed 60d ago           │  ║
║  │   You use 'find' instead. fd is faster & prettier.     │  ║
║  │   → alias find='fd'                                   │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ ⚡ exa              npm     installed 45d ago          │  ║
║  │   You use 'ls' instead. exa has color & git support.  │  ║
║  │   → alias ll='exa -la'                                │  ║
║  └────────────────────────────────────────────────────────┘  ║
║                                                              ║
║  [Press Enter to close]                                      ║
╚══════════════════════════════════════════════════════════════╝
```

**Empty State: No Dormant Tools**
```
╔══════════════════════════════════════════════════════════════╗
║  recall forgotten-tools                                      ║
║  ─────────────────────────────────────────────────────────  ║
║                                                              ║
║  ✓ All your installed tools are being used!                 ║
║                                                              ║
║  (or we haven't scanned enough commands yet)                ║
╚══════════════════════════════════════════════════════════════╝
```

---

### 6. recall uninstall

**Confirmation**
```
╔══════════════════════════════════════════════════════════════╗
║  recall uninstall                                           ║
║  ─────────────────────────────────────────────────────────  ║
║                                                              ║
║  This will:                                                  ║
║                                                              ║
║  ✗ Remove shell hook from ~/.zshrc                           ║
║  ✗ Stop capturing new commands                               ║
║                                                              ║
║  Options:                                                    ║
║                                                              ║
║  [1] Keep database (~/.recall/recall.db)                   ║
║      └─ You can re-install later and keep your history       ║
║                                                              ║
║  [2] Delete database                                        ║
║      └─ Removes all captured commands (permanent!)           ║
║                                                              ║
║  [3] Cancel                                                 ║
║                                                              ║
║  [1/2/3]                                                    ║
╚══════════════════════════════════════════════════════════════╝
```

**Success Output**
```
╔══════════════════════════════════════════════════════════════╗
║  ✓ Uninstall Complete                                       ║
║  ─────────────────────────────────────────────────────────  ║
║                                                              ║
║  Removed:                                                    ║
║  ✓ Shell hook from ~/.zshrc                                  ║
║  ✓ Command references                                        ║
║                                                              ║
║  Kept:                                                      ║
║  ✓ Database at ~/.recall/recall.db                           ║
║                                                              ║
║  To reinstall: brew reinstall recall && recall init           ║
╚══════════════════════════════════════════════════════════════╝
```

---

### 7. recall doctor

**Healthy Output**
```
╔══════════════════════════════════════════════════════════════╗
║  recall doctor                                              ║
║  ─────────────────────────────────────────────────────────  ║
║                                                              ║
║  Checking Recall installation...                              ║
║                                                              ║
║  ✓ Shell hook installed    ~/.zshrc has recall hook         ║
║  ✓ Database accessible     ~/.recall/recall.db (4.2 MB)     ║
║  ✓ Binary in PATH         recall v0.1.0                    ║
║  ✓ Commands captured       847 commands stored               ║
║                                                              ║
║  Status: All good!                                          ║
╚══════════════════════════════════════════════════════════════╝
```

**Issues Found**
```
╔══════════════════════════════════════════════════════════════╗
║  recall doctor                                              ║
║  ─────────────────────────────────────────────────────────  ║
║                                                              ║
║  Checking Recall installation...                              ║
║                                                              ║
║  ✗ Shell hook NOT found    ~/.zshrc missing recall hook     ║
║  ✓ Database accessible     ~/.recall/recall.db               ║
║  ✓ Binary in PATH         recall v0.1.0                    ║
║  ✓ Commands captured       42 commands stored                ║
║                                                              ║
║  Issues found: 1                                             ║
║                                                              ║
║  Fix: Run 'recall init' or manually add to ~/.zshrc:        ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │ eval "$(recall hook zsh)"                               │  ║
║  └────────────────────────────────────────────────────────┘  ║
╚══════════════════════════════════════════════════════════════╝
```

---

## CLI Design System

### Philosophy: Delight Through Clarity

CLI tools don't have gradients or hover animations. **Delight = speed + information density + scanability + zero friction.** The best CLIs (eza, bat, fd, fzf) use color sparingly to encode meaning — never decoration.

`★ Insight ─────────────────────────────────────`
**Terminal ANSI colors** are limited (16-color palette) but more legible than any web gradient. Use them to encode status (success=green, error=red) not to decorate. Icons add visual anchors that make output scannable at a glance.
`─────────────────────────────────────────────────`

### Color Palette

Uses `picocolors` (lightweight, Bun-native, respects `NO_COLOR`):

| Token | ANSI | Use |
|-------|------|-----|
| `cyan` | `\x1b[36m` | Paths, repo names |
| `green` | `\x1b[32m` | Success, ✓ marks |
| `yellow` | `\x1b[33m` | Warnings, ⚠ marks |
| `red` | `\x1b[31m` | Errors, ✗ marks |
| `dim` | `\x1b[2m` | Secondary text, timestamps |
| `bold` | `\x1b[1m` | Headings, emphasis |
| `reset` | `\x1b[0m` | Always reset after color |

**Usage:** Semantic tokens only. Never use raw hex or "looks nice" coloring.

```typescript
// src/ui/colors.ts
export const colors = {
  path: (s: string) => picocolors.cyan(s),
  success: (s: string) => picocolors.green(s),
  warning: (s: string) => picocolors.yellow(s),
  error: (s: string) => picocolors.red(s),
  dim: (s: string) => picocolors.dim(s),
  bold: (s: string) => picocolors.bold(s),
};
```

### Icon System

**Default: icons enabled.** `--no-icons` flag to disable (eza pattern).

Icons are **UTF-8 glyphs** from Nerd Font set. They serve as **visual anchors** for quick scanning:

| Icon | Glyph | Use |
|------|-------|-----|
| ⚡ | `\u26A1` | Commands (fast, electric) |
| 📁 | `\u{1F4C1}` | Directories, repos |
| 📦 | `\u{1F4E6}` | Packages, npm/brew |
| 🔍 | `\u{1F50D}` | Search, recall |
| 🔧 | `\u{1F527}` | Tools, wrench |
| ⚠ | `\u26A0` | Warnings |
| ✓ | `\u2713` | Success |
| ✗ | `\u2717` | Error/Failure |
| → | `\u2192` | Arrow, then |
| ⊙ | `\u2299` | Recent, current |

```typescript
// src/ui/icons.ts
export const icons = {
  cmd: '⚡',      // Executed command
  dir: '📁',      // Directory/repo
  pkg: '📦',      // Package (brew/npm/cargo)
  search: '🔍',  // Search
  tool: '🔧',     // Tool (ripgrep, etc)
  warn: '⚠',      // Warning
  check: '✓',     // Success
  cross: '✗',     // Error/fail
  arrow: '→',     // Arrow
  recent: '⊙',    // Recent/now
};
```

**Output Example:**
```
⚡ git push origin main    📁 ~/projects/recall  ⊙ 2m ago
📦 bun add zod            📁 ~/projects/api     ⊙ 5m ago
🔍 recall search auth     —                  ⊙ just now
```

### Spinners & Loading States

Uses `ora` for async operations:

| Context | Spinner | Message |
|---------|---------|---------|
| Search | `dots` | "Searching..." |
| Import | `line` | "Importing 847 commands..." |
| Tool scan | `dots` | "Scanning installed tools..." |
| Doctor | `line` | "Running diagnostics..." |

```typescript
// src/ui/spinner.ts
const spinner = ora({
  text: 'Searching...',
  color: 'cyan',
  spinner: 'dots',
}).start();

spinner.succeed('Found 3 matches');  // green
spinner.fail('Search failed');       // red
spinner.warn('No results');         // yellow
```

### Output Formatting

**Line-based (not TUI/pagers):** Each result on its own line for easy grep/pipes.

```
# recall search "docker"
⚡ docker system prune -a       📁 ~/projects/api  ⊙ 14d · ✓ · 2.3s
⚡ docker volume prune          📁 ~/projects/api  ⊙ 21d · ✓ · 0.8s
⚡ docker image prune -a        📁 ~/          ⊙ 45d · ✓ · 1.1s
```

**Width-aware:** Respects terminal width. Long commands truncated with `…`.

```typescript
// src/ui/format.ts
export function formatCommand(cmd: string, maxWidth: number): string {
  if (cmd.length <= maxWidth) return cmd;
  return cmd.slice(0, maxWidth - 1) + '…';
}
```

### No-Color Support

Respects `NO_COLOR` env var (de facto standard):

```typescript
// src/ui/index.ts
const useColor = !Bun.env.NO_COLOR && process.stdout.isTTY;

export const ui = {
  colors: useColor ? picocolors : noopColors,
  icons: useColor ? iconSet : noopIcons,
  spinner: useColor ? ora : noopSpinner,
};
```

### Icon Flag Implementation

**eza pattern (recommended):**
- `--icons` flag: explicitly enable icons (default ON)
- `--no-icons` flag: disable icons

Or simpler: `--icons` as default, `--no-icons` to disable.

```typescript
// src/cli/search.ts
cac.option('--no-icons', 'Disable icon output')
```

### Module Structure

```
src/ui/
├── index.ts          # Re-exports, env detection
├── colors.ts        # Semantic ANSI color wrappers
├── icons.ts         # UTF-8 icon constants
├── spinner.ts        # ora wrapper with preset configs
├── format.ts         # Command/cwd/time formatting
└── table.ts          # Column-based output (if needed)
```

### Verification
- [ ] `NO_COLOR=1 recall search` outputs plain text (no ANSI)
- [ ] `recall search --no-icons` outputs without icons
- [ ] `recall search` outputs with icons + colors
- [ ] Spinner shows during >200ms operations
- [ ] Output readable at 80-char width

---

## MVP Commands

### Must-have
- [x] `recall init` — onboarding wizard
- [ ] `recall search <query>` — search past commands
- [ ] `recall recent` — show recent commands
- [ ] `recall project` — project memory context
- [ ] `recall forgotten-tools` — surfacing unused tools
- [ ] `recall uninstall` — clean removal
- [ ] `recall doctor` — debug installation issues

### Nice later (Phase 3+)
- [ ] `recall workflow` — workflow automation
- [ ] `recall ask` — AI natural language recall

---

## Testing Checklist

### TDD Tests (write before implementation)
- [ ] `tests/import/normalizer.test.ts` — trim, collapse, tilde-expand, case-sensitive, skip-prefix, dedup window
- [ ] `tests/import/history-parser.test.ts` — zsh format, bash format, dedup
- [ ] `tests/hooks/detect.test.ts` — grep detection logic
- [ ] `tests/repos/detector.test.ts` — git root detection edge cases

### Critical
- [ ] Shell hook reliability
- [ ] Duplicate prevention
- [ ] Command timing accuracy
- [ ] SQLite writes
- [ ] Onboarding rollback

### User tests
- [ ] Install in under 2 mins
- [ ] First wow moment visible

---

## Research Sources

1. Starship install.sh — https://github.com/starship/starship/blob/master/install/install.sh
2. Zinit install.sh — https://raw.githubusercontent.com/zdharma-continuum/zinit/HEAD/scripts/install.sh
3. Direnv hook docs — https://direnv.net/docs/hook.html
4. Autojump install.py — https://github.com/wting/autojump/blob/master/install.py
5. Bash History Facilities — https://www.gnu.org/s/bash/manual/html_node/Bash-History-Facilities.html
6. fzf deduplication PRs — https://github.com/junegunn/fzf/pull/1940
7. fish-shell history.rs — https://github.com/fish-shell/fish-shell/blob/a6959aba/src/history/history.rs
8. Baeldung: Remove Duplicate Bash History — https://www.baeldung.com/linux/history-remove-avoid-duplicates
9. peff/fuzzydups — https://github.com/peff/fuzzydups
10. Stack Overflow: Default zsh history file — https://stackoverflow.com/questions/35190034/where-is-the-default-zsh-history-file
11. Unix StackExchange: Zsh history location — https://unix.stackexchange.com/questions/111718/command-history-in-zsh

---

## Document History

- Created: 2026-04-14
- Based on: recall_prd_and_technical_implementation_plan.md
- Research added: Shell RC backup strategies, HISTFILE standards, Command normalization

## Updates (2026-04-15)

### Added
- **Project structure** — explicit folder layout showing CLI/AI/sync separation
- **Sync adapter pattern** — interface now, SQLite impl, swap later (Convex/CRDTs in Phase 5)
- **Testing strategy** — TDD for deterministic components (normalizer, parser, detector)
- **AI layer separated** — `src/ai/` stub, CLI works without AI
- **SyncAdapter interface** — `push/pull/subscribe`, LocalSync noop impl now
- **CLI Output Wireframes** — all commands with normal/empty/error states for every command

### Key Decisions
1. **CLI/AI separation:** AI is a future feature layer, CLI works standalone
2. **Sync design:** Ship SQLite now, design interface for swap later
3. **TDD approach:** TDD for normalizer/parser/detector, integration for CLI, manual for hooks
4. **UI coverage:** Every command has empty state and error state wireframes
5. **CLI Design System:** Icons default ON, `--no-icons` flag (eza pattern), respects `NO_COLOR`

### Updates (2026-04-15)

#### Added: CLI Design System
- **Design philosophy**: Delight through clarity — speed + scanability + zero friction
- **Color palette**: Semantic ANSI tokens (cyan=paths, green=success, red=errors)
- **Icon system**: UTF-8 glyphs as visual anchors (⚡📁📦🔍🔧✓✗→⊙), default ON
- **Spinner system**: ora-based loading states for async ops
- **Flag pattern**: `--no-icons` to disable (eza-style), respects `NO_COLOR` env var
- **Task 16**: CLI Design System (src/ui/ module with colors/icons/spinner/format)
