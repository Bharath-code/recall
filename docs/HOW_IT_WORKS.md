# How Recall Works

Complete guide to Recall's architecture, features, and how to get maximum value from it.

---

## Table of Contents

1. [High-Level Overview](#high-level-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Technical Architecture](#technical-architecture)
4. [Core Features](#core-features)
5. [How to Get Maximum Value](#how-to-get-maximum-value)
6. [Data Privacy & Security](#data-privacy--security)
7. [Development Roadmap](#development-roadmap)

---

## High-Level Overview

**Recall** is a local-first developer workflow memory assistant that captures shell commands and helps you rediscover forgotten tools, recall past commands, and automate repetitive workflows.

### Core Promise

> "Your terminal remembers what you forget."

### What It Does

- **Captures** every shell command you run
- **Stores** them in a local SQLite database
- **Organizes** commands by project and context
- **Searches** your command history instantly
- **Surfaces** forgotten tools you've installed but rarely use
- **Detects** repeated workflows you could automate

### Key Principles

- **Local-first**: All data stays on your machine
- **Privacy-respecting**: No cloud sync, no data leaves your device
- **Invisible until valuable**: Runs silently in the background
- **Fast**: Searches return in <100ms
- **No noise**: No popups, no interruptions, no spam

---

## Architecture Diagram

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     USER TERMINAL SESSION                    │
│                                                               │
│  You type: git commit -m "fix bug"                           │
│  Shell executes command                                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  SHELL HOOK LAYER                            │
│                                                               │
│  zsh: preexec() fires before command execution               │
│  zsh: precmd() fires after command completes                 │
│  bash: PROMPT_COMMAND fires after each prompt                │
│                                                               │
│  Captures:                                                   │
│  - Raw command string                                        │
│  - Current working directory (cwd)                           │
│  - Exit code (success/failure)                               │
│  - Duration (how long command took)                          │
│  - Timestamp                                                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 RECALL CORE ENGINE                           │
│                                                               │
│  1. Command Normalization                                    │
│     - Trim whitespace                                        │
│     - Collapse multiple spaces                               │
│     - Expand ~ to $HOME                                      │
│     - Deduplicate (last 100 commands)                        │
│                                                               │
│  2. Context Detection                                        │
│     - Detect git repository root                             │
│     - Identify which project you're in                       │
│                                                               │
│  3. Tool Tracking                                             │
│     - Extract tool name from command                         │
│     - Update usage statistics                                │
│                                                               │
│  4. Workflow Detection                                       │
│     - Identify repeated command sequences                    │
│     - Detect startup patterns per project                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  LOCAL SQLITE DATABASE                       │
│  Location: ~/.recall/recall.db                               │
│                                                               │
│  Tables:                                                     │
│  • commands - Every command you've run                       │
│  • repos - Git repositories and their metadata               │
│  • tools - Installed tools (brew/npm/cargo)                  │
│  • workflows - Repeated command sequences                   │
│  • errors - Command errors and fixes                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌─────────────────────┐  ┌─────────────────────┐
│   CLI QUERY LAYER   │  │  DIGEST / INSIGHTS  │
│                     │  │                     │
│ recall search       │  │ Weekly tips         │
│ recall recent       │  │ Workflow summary    │
│ recall project      │  │ Forgotten tools     │
│ recall forgotten-   │  │                     │
│ tools               │  │                     │
└─────────────────────┘  └─────────────────────┘
```

### Data Flow Example

```
User Action: npm run dev

Step 1: Shell Hook Captures
├─ Raw command: "npm run dev"
├─ CWD: /Users/dev/my-project
├─ Shell: zsh
├─ Start time: 1713782400000

Step 2: Command Completes
├─ Exit code: 0 (success)
├─ Duration: 2500ms

Step 3: Recall Normalizes
├─ Normalized: "npm run dev"
├─ Git repo detected: /Users/dev/my-project
├─ Tool extracted: npm

Step 4: Stored in Database
├─ commands table: new row created
├─ repos table: last_opened_at updated
├─ tools table: npm usage_count incremented

Step 5: Available for Search
└─ Can now be found via: recall search "npm run dev"
```

---

## Technical Architecture

### Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| **Runtime** | Bun | Fast startup, built-in SQLite, TypeScript native |
| **Language** | TypeScript | Type safety, better developer experience |
| **Database** | Bun SQLite | Zero-config, local-only, no external dependencies |
| **CLI Framework** | CAC | Lightweight, better TypeScript support than Commander |
| **Validation** | Zod | Runtime type safety for shell input |
| **Logging** | Pino | Structured logs, low overhead |
| **Testing** | Bun test | Native test runner, fast |
| **Packaging** | `bun build --compile` | Single binary distribution |

### Project Structure

```
src/
├── cli/                    # CLI commands
│   ├── init.ts             # Onboarding wizard
│   ├── search.ts           # Search command history
│   ├── recent.ts           # Show recent commands
│   ├── project.ts          # Project context
│   ├── hook.ts             # Shell hook capture handler
│   ├── forgotten-tools.ts  # Surface unused tools
│   ├── ask.ts              # AI-powered natural language search
│   ├── fix.ts              # AI-powered error fixing
│   ├── replay.ts           # Replay command sequences
│   └── ...                 # Other commands
│
├── db/                     # Database layer
│   ├── index.ts            # Connection & migrations
│   ├── schema.sql          # Table definitions
│   ├── commands.ts         # Command CRUD operations
│   ├── repos.ts            # Repository tracking
│   ├── tools.ts            # Tool tracking
│   └── errors.ts           # Error tracking
│
├── hooks/                  # Shell integration
│   ├── zsh-snippet.ts      # Zsh hook generation
│   ├── bash-snippet.ts     # Bash hook generation
│   └── detect.ts           # Hook installation detection
│
├── import/                 # History import
│   ├── history-parser.ts   # Parse shell history files
│   └── normalizer.ts       # Command normalization logic
│
├── repos/                  # Git repository detection
│   └── detector.ts         # Find git root from any directory
│
├── tools/                  # Tool scanning
│   └── scanner.ts          # Scan brew/npm/cargo installations
│
├── sync/                   # Sync adapter interface
│   └── adapter.ts          # Interface for future cloud sync
│
├── ai/                     # AI layer (optional)
│   ├── adapter.ts          # AI provider abstraction
│   └── local-embedder.ts   # Local embeddings for semantic search
│
├── ui/                     # CLI design system
│   ├── colors.ts           # Semantic ANSI colors
│   ├── icons.ts            # UTF-8 icons
│   ├── spinner.ts          # Loading spinners
│   └── format.ts           # Output formatting
│
└── index.ts                # Entry point
```

### Database Schema

#### Commands Table
```sql
CREATE TABLE commands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raw_command TEXT NOT NULL,              -- Exact command as typed
  normalized_command TEXT NOT NULL,       -- Cleaned/normalized version
  cwd TEXT NOT NULL,                      -- Working directory
  repo_path_hash TEXT,                    -- Git repository identifier
  exit_code INTEGER,                      -- 0 = success, non-zero = error
  duration_ms INTEGER,                    -- How long command took
  shell TEXT NOT NULL,                    -- zsh, bash, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast queries
CREATE INDEX idx_commands_created_at ON commands(created_at DESC);
CREATE INDEX idx_commands_repo ON commands(repo_path_hash);
CREATE INDEX idx_commands_normalized ON commands(normalized_command);
```

#### Repos Table
```sql
CREATE TABLE repos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_path_hash TEXT NOT NULL UNIQUE,   -- Hash of repo path
  repo_name TEXT NOT NULL,                -- Repository name
  repo_root TEXT NOT NULL,                -- Full path to git root
  last_opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  startup_commands_json TEXT              -- Common startup commands
);
```

#### Tools Table
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

#### Workflows Table
```sql
CREATE TABLE workflows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sequence_json TEXT NOT NULL,            -- JSON array of commands
  project_id INTEGER,                     -- Associated repository
  frequency INTEGER DEFAULT 1            -- How often this pattern occurs
);
```

#### Errors Table
```sql
CREATE TABLE errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  error_signature TEXT NOT NULL,          -- Hash of error pattern
  command_id INTEGER REFERENCES commands(id),
  fix_summary TEXT,                      -- Suggested fix
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Command Normalization Pipeline

Recall normalizes commands to improve search quality and reduce duplicates:

1. **Trim whitespace** - Remove leading/trailing spaces
2. **Collapse spaces** - Multiple spaces → single space
3. **Expand tilde** - `~/foo` → `$HOME/foo`
4. **Case-sensitive** - Preserve case (CLI tools are case-sensitive)
5. **Skip space-prefixed** - Respect `HISTCONTROL=ignorespace`
6. **Deduplicate** - Check against last 100 commands

Example:
```
Input:  "  git   push  origin  main  "
Output: "git push origin main"
```

---

## Core Features

### 1. Shell Hook Capture

**What it does:** Automatically captures every command you run in your terminal.

**How it works:**
- Installs a hook in your shell configuration (`~/.zshrc` or `~/.bashrc`)
- Uses shell hooks (`preexec`/`precmd` for zsh, `PROMPT_COMMAND` for bash)
- Captures command, directory, exit code, duration, timestamp
- Runs silently without affecting command execution

**Installation:**
```bash
recall init              # Interactive wizard
# Choose manual or automatic hook install
# Restart your shell
```

**What gets captured:**
- Raw command as you typed it
- Normalized version for search
- Working directory
- Git repository (if applicable)
- Exit code (success/failure)
- Duration (how long it took)
- Shell type (zsh/bash)

---

### 2. Command Search

**What it does:** Instantly search your entire command history.

**How to use:**
```bash
recall search "docker"        # Search for "docker"
recall search "git push"       # Search for exact phrase
recall search "npm" --limit 50 # Limit results
```

**What you see:**
- Matching commands
- When you ran them
- Which directory/project
- Exit code (if it failed)

**Search features:**
- Case-insensitive search
- Searches normalized commands
- Results ranked by recency
- <100ms response time

**Use cases:**
- "How did I configure Docker last month?"
- "What was that git command for force pushing?"
- "Show me all npm scripts I've run"

---

### 3. Recent Commands

**What it does:** Show your most recent commands.

**How to use:**
```bash
recall recent              # Last 20 commands
recall recent --limit 50   # Last 50 commands
```

**What you see:**
- Last N commands
- With timestamps and directories
- Exit codes highlighted

**Use cases:**
- Quick review of what you just did
- Find a command you ran 5 minutes ago
- See your recent work session

---

### 4. Project Memory

**What it does:** Provides context about the current git repository.

**How to use:**
```bash
recall project
```

**What you see:**
- Repository name
- Last 5 commands in this repo
- Common startup commands (if detected)
- When you last worked here

**Use cases:**
- "What was I working on in this project?"
- "How do I usually start this project?"
- "What commands are specific to this repo?"

**How it works:**
- Detects git repository using `git rev-parse --show-toplevel`
- Groups commands by repository
- Tracks last opened time
- Identifies startup patterns (commands you run every time)

---

### 5. Forgotten Tools

**What it does:** Surfaces tools you've installed but rarely use.

**How to use:**
```bash
recall forgotten-tools
```

**What you see:**
- Tools installed via brew/npm/cargo
- How long since you last used them
- Usage count
- Suggestions for better alternatives

**How it works:**
- Scans `brew list`, `npm list -g`, `cargo install --list`
- Cross-references with your command history
- Identifies tools with low usage

**Use cases:**
- "I installed ripgrep but still use grep"
- "What tools am I paying for but not using?"
- "Discover better alternatives to current tools"

---

### 6. History Import

**What it does:** Imports your existing shell history on first setup.

**How to use:**
```bash
recall import              # Import from shell history
recall import --days 30    # Import last 30 days
recall import --all        # Import everything
```

**What gets imported:**
- Commands from `~/.zsh_history` or `~/.bash_history`
- Respects `$HISTFILE` environment variable
- Normalizes commands using Recall's pipeline
- Deduplicates against existing data

**Use cases:**
- First-time setup - get immediate value
- Switched machines - bring your history
- Clean install - restore your command memory

---

### 7. Privacy Controls

**What it does:** Control what gets captured and stored.

**Features:**
```bash
recall ignore add "secret*"     # Ignore commands matching pattern
recall ignore remove "secret*"  # Remove ignore pattern
recall ignore list              # List all ignore patterns
recall pause                    # Pause capture temporarily
recall resume                   # Resume capture
```

**What you can ignore:**
- Commands matching patterns (e.g., `secret*`, `password*`)
- Specific directories
- Sensitive commands

**Use cases:**
- "Don't capture commands with API keys"
- "Ignore commands in /etc/"
- "Pause capture while working on sensitive project"

---

### 8. Export & Import

**What it does:** Backup and restore your command history.

**How to use:**
```bash
recall export backup.json       # Export all data
recall import backup.json       # Import from backup
```

**Use cases:**
- Backup before machine migration
- Share workflows with team
- Restore after data loss

---

### 9. AI-Powered Features (Experimental)

These features require `RECALL_EXPERIMENTAL=1` and are optional.

#### Natural Language Search
```bash
recall ask "how do I kill a port"
```
Uses AI to understand natural language queries and find relevant commands.

#### Error Fixing
```bash
recall fix
```
Analyzes the last failed command and suggests fixes.

#### Command Replay
```bash
recall replay "workflow name"
```
Replays a sequence of commands you've run before.

---

## How to Get Maximum Value

### Setup Phase (5 minutes)

1. **Install Recall**
   ```bash
   brew install recall  # Or download binary
   ```

2. **Run Onboarding Wizard**
   ```bash
   recall init
   ```
   - Install shell hook (automatic or manual)
   - Import existing history (last 30 days recommended)
   - Scan installed tools
   - See instant value: your top commands, repos, and forgotten tools

3. **Restart Your Shell**
   ```bash
   exec zsh  # or source ~/.zshrc
   ```

### Daily Usage

#### 1. Use Search Instead of Memory
Instead of trying to remember:
```bash
# ❌ Trying to remember
# "What was that docker cleanup command again?"

# ✅ Just search
recall search "docker cleanup"
```

#### 2. Check Project Context When Switching
```bash
cd my-project
recall project    # See what you usually do here
```

#### 3. Review Forgotten Tools Weekly
```bash
recall forgotten-tools    # Discover tools you're not using
```

#### 4. Use Recent for Quick Review
```bash
recall recent    # What did I just do?
```

### Advanced Workflows

#### 1. Build a Personal Command Library
Over time, Recall becomes your personal command library:
- Search for complex commands you use rarely
- Find commands you know you've used before
- Build muscle memory by reusing good commands

#### 2. Optimize Your Toolset
Regularly check forgotten tools:
```bash
recall forgotten-tools
```
- Remove unused tools
- Switch to better alternatives
- Clean up your development environment

#### 3. Project-Specific Workflows
Each project develops its own patterns:
```bash
cd project-a
recall project    # See startup commands
```
- Learn project-specific commands
- Identify repetitive tasks
- Consider automating frequent patterns

#### 4. Debug with History
When something breaks:
```bash
recall search "error"    # Find previous error fixes
recall recent            # What just changed?
```

### Best Practices

#### 1. Don't Rely Solely on Recall
Recall is a memory aid, not a replacement for:
- Documentation
- Shell aliases
- Shell history (Ctrl+R)
- Note-taking

#### 2. Use Ignore Patterns for Sensitive Data
```bash
recall ignore add "api_key*"
recall ignore add "password*"
recall ignore add "secret*"
```

#### 3. Regular Backups
```bash
recall export backup.json
```
Store backups in version control or cloud storage.

#### 4. Clean Up Periodically
```bash
recall delete --all --yes    # Start fresh (after export!)
```

#### 5. Use with Other Tools
Recall works great alongside:
- `fzf` for fuzzy shell history
- Shell aliases for frequent commands
- `atuin` for shell history sync (if you want cloud)
- Note apps for documentation

### Power User Tips

#### 1. Create Shell Aliases
```bash
# In ~/.zshrc
alias r='recall search'
alias rr='recall recent'
alias rp='recall project'
alias rf='recall forgotten-tools'
```

#### 2. Use with FZF
```bash
recall search "docker" | fzf
```

#### 3. Integrate with Git Hooks
Add to your git workflow:
```bash
# After git commit
recall project
```

#### 4. Automate Weekly Reviews
```bash
# Add to cron
0 9 * * 1 recall forgotten-tools >> ~/weekly-review.txt
```

---

## Data Privacy & Security

### Local-First Design

**All data stays on your machine:**
- Database: `~/.recall/recall.db`
- Config: `~/.recall/config.json`
- Logs: `~/.recall/logs/`

**No network calls:**
- No cloud sync
- No analytics
- No telemetry
- No API calls (unless you enable experimental AI features)

### What Gets Stored

**Stored:**
- Command strings (as you type them)
- Working directories
- Git repository paths
- Exit codes
- Timestamps
- Durations

**NOT stored:**
- Command output (stdout/stderr)
- Environment variables
- File contents
- Network traffic
- Keystrokes

### Sensitive Data Protection

**Built-in protections:**
- Ignore patterns for sensitive commands
- Pause capture for sensitive work
- Export/import for backup control
- Delete all data anytime

**Recommendations:**
- Add ignore patterns for secrets
- Use pause when working with sensitive data
- Regular backups
- Review export contents before sharing

### Security Considerations

**Database permissions:**
```bash
~/.recall/recall.db  # 600 (user read/write only)
```

**Shell hook safety:**
- Idempotent installation (won't duplicate)
- Manual mode available (you control what's added)
- Easy uninstall (`recall uninstall`)

**Audit trail:**
- All commands logged with timestamps
- Can export for review
- Can delete individual commands

---

## Development Roadmap

### Phase 1: Foundation ✅ (Complete)
- Shell hook capture
- Local SQLite storage
- Basic search and recent commands
- Project memory basics
- Onboarding wizard

### Phase 2: Tool Rediscovery 🚧 (In Progress)
- Tool scanner (brew/npm/cargo)
- Forgotten tools detection
- Weekly digest
- Usage statistics

### Phase 3: Workflow Automation 📋 (Planned)
- Workflow detection
- Command sequence replay
- Session restore
- Startup command automation

### Phase 4: AI Features 🔮 (Experimental)
- Natural language search (`recall ask`)
- Error fixing suggestions (`recall fix`)
- Semantic command search
- Contextual recommendations

### Phase 5: Team Features 🌐 (Future)
- Shared workflows
- Team command libraries
- Onboarding packs
- Export/import for sharing

### Phase 6: Advanced Integrations 💡 (Future)
- IDE integration
- CI/CD integration
- Documentation generation
- Workflow automation scripts

---

## Troubleshooting

### Hook Not Working

**Symptom:** Commands not being captured

**Diagnosis:**
```bash
recall doctor
```

**Fixes:**
- Restart your shell: `exec zsh`
- Check hook installation: `grep recall ~/.zshrc`
- Reinstall: `recall init`

### Search Slow

**Symptom:** Search takes >1 second

**Fixes:**
- Check database size: `ls -lh ~/.recall/recall.db`
- Vacuum database: `sqlite3 ~/.recall/recall.db VACUUM`
- Rebuild indexes: `recall doctor`

### Database Locked

**Symptom:** "database is locked" error

**Fixes:**
- Check for other Recall processes: `ps aux | grep recall`
- Kill stuck processes
- Restart shell

### Hook Slows Down Shell

**Symptom:** Shell feels slow after installing hook

**Fixes:**
- Check Recall binary location: `which recall`
- Ensure binary is in PATH
- Check for network calls (should be none)
- Report issue if persists

---

## FAQ

### Q: Is my data sent to the cloud?
**A:** No. All data is stored locally in `~/.recall/recall.db`. No network calls are made unless you enable experimental AI features.

### Q: Can I use Recall with multiple shells?
**A:** Yes. Recall supports zsh and bash. Install the hook in each shell's configuration file.

### Q: How much disk space does Recall use?
**A:** Approximately 100KB per 1,000 commands. A typical developer with 50,000 commands uses ~5MB.

### Q: Can I share my command history with my team?
**A:** Not directly yet. You can export your data and share the JSON file, but automatic team sync is planned for Phase 5.

### Q: Does Recall slow down my shell?
**A:** No. The hook adds <5ms overhead per command. You won't notice it.

### Q: What happens if I uninstall Recall?
**A:** Your data remains in `~/.recall/`. Use `recall uninstall --keep-data=false` to remove everything.

### Q: Can I use Recall without the shell hook?
**A:** Yes. You can import history manually and use search/recent, but you won't capture new commands.

### Q: Is Recall open source?
**A:** Yes. The code is available on GitHub. Contributions welcome.

---

## Getting Help

- **Documentation:** Check this file and `SPEC.md`
- **Issues:** Report bugs on GitHub
- **Doctor:** Run `recall doctor` for diagnostics
- **Community:** Join discussions on GitHub Discussions

---

## Summary

Recall is your terminal's external memory. It captures everything you do, organizes it by context, and makes it instantly searchable. Use it to:

1. **Never forget a command** - Search instead of memorize
2. **Rediscover tools** - Find what you've installed but stopped using
3. **Understand your workflows** - See patterns in how you work
4. **Debug faster** - Find how you fixed similar problems before
5. **Share knowledge** - Export workflows for your team

The more you use it, the more valuable it becomes. Start with `recall init` and build your command memory over time.

---

**Version:** 0.1.0  
**Last Updated:** 2026-04-22  
**Status:** Pre-Alpha
