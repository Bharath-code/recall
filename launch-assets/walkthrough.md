# Recall Walkthrough

> Generated 2026-06-11

This walkthrough demonstrates all major Recall features.
Each section shows the command and its terminal output.

---


## Quick Start

```
$ recall init --help 2>/dev/null | head -20
recall/0.1.0

Usage:
  $ recall init

Options:
  --auto      Auto-install shell hooks without prompting 
  --no-icons  Disable icons in output (default: true)
  -h, --help  Display this message 
```


## Search Commands

```
$ recall search docker --no-icons --limit 5
 recall search "docker"
──────────────────────────────────────────────────

  Found 2 matches:

   1.  recall search docker   ~/recall-demo   just now  ✓  50ms
   2.  docker compose up -d postgres   ~/recall-demo   just now  ✓  2.0s

```


## Search with Filters

```
$ recall search git --no-icons --failed-only

 No matches for "git"

Try different search terms or use broader keywords.

Next steps:
  • recall recent — View all recent commands
  • recall search "dock" — Search with partial words
  • recall project — View project context

```


## Smart Search

```
$ recall search 'prisma migrate' --no-icons
 recall search "prisma migrate"
──────────────────────────────────────────────────

  Found 1 match:

   1.  npx prisma migrate dev   ~/recall-demo   just now  ✓  8.0s

```


## Recent Commands

```
$ recall recent --no-icons --limit 5
 recall recent
──────────────────────────────────────────────────

  Last 5 commands:

   1.  recall session   ~/recall-demo   just now  ✓  30ms
   2.  recall search docker   ~/recall-demo   just now  ✓  50ms
   3.  git push origin feat/dashboard   ~/recall-demo   just now  ✓  4.0s
   4.  git commit -m 'feat: add dashboard api'   ~/recall-demo   just now  ✓  100ms
   5.  git add src/   ~/recall-demo   just now  ✓  50ms

```


## Project Context

```
$ cd '~/demo-project' && recall project --no-icons 2>/dev/null
 recall project
──────────────────────────────────────────────────

   ~/.recall (git repo)


Startup commands
──────────────────────────────────────────────────
   docker compose up -d postgres  just now
   bun run dev  just now
   npm install --legacy-peer-deps  just now
   npm install  just now
   git checkout -b feat/dashboard  just now


Recent failures
──────────────────────────────────────────────────
   npm install  exit 1 just now

  Last known good:
   recall session  just now


Recent commands
──────────────────────────────────────────────────
   recall session  just now
   recall search docker  just now
   git push origin feat/dashboard  just now
   git commit -m 'feat: add dashboard api'  just now
   git add src/  just now

  Runbook snippet:
   docker compose up -d postgres && bun run dev && npm install --legacy-peer-deps

```


## Session Timeline

```
$ recall session --no-icons --limit 3
 Session Timeline
──────────────────────────────────────────────────

  Session #1  ·  12 commands  ·  1s  ·  just now
  ──────────────────────────────────────────────
     1.  git checkout -b feat/dashboard   ~/recall-demo   just now  ✓  150ms
     2.  npm install   ~/recall-demo   just now  ✗ 1  3.0s
     3.  npm install --legacy-peer-deps   ~/recall-demo   just now  ✓  4.5s
     4.  bun run dev   ~/recall-demo   just now  ✓  500ms
     5.  docker compose up -d postgres   ~/recall-demo   just now  ✓  2.0s
     6.  npx prisma migrate dev   ~/recall-demo   just now  ✓  8.0s
     7.  curl http://localhost:3000/api/health   ~/recall-demo   just now  ✓  230ms
     8.  git add src/   ~/recall-demo   just now  ✓  50ms
     9.  git commit -m 'feat: add dashboard api'   ~/recall-demo   just now  ✓  100ms
    10.  git push origin feat/dashboard   ~/recall-demo   just now  ✓  4.0s
    11.  recall search docker   ~/recall-demo   just now  ✓  50ms
    12.  recall session   ~/recall-demo   just now  ✓  30ms

```


## Health Check & Insight

```
$ recall doctor --no-icons
 recall doctor
──────────────────────────────────────────────────


Installation
──────────────────────────────────────────────────
   Binary accessible (recall not in PATH)
   Database exists (~/.recall/recall.db)
   Data directory (~/.recall)

Shell Integration
──────────────────────────────────────────────────
   Shell: zsh
   Shell hook installed (~/.zshrc)

Statistics
──────────────────────────────────────────────────
  Commands: 12
  Repos   : 1
  Tools   : 0
  Errors  : 0 (0 fixed)

AI Configuration
──────────────────────────────────────────────────
  AI provider: none

Privacy Settings
──────────────────────────────────────────────────
   Capture enabled
   Secret redaction
   No ignored patterns


Summary
──────────────────────────────────────────────────
   2 issue(s) found.
    Run 'recall init' to fix common issues.

```


## Programmatic Output (JSON)

```
$ recall recent --limit 2 --json 2>/dev/null | head -30
[
  {
    "id": 12,
    "raw_command": "recall session",
    "normalized_command": "recall session",
    "cwd": "~/demo-project",
    "repo_path_hash": "b1a21a038768d537",
    "exit_code": 0,
    "duration_ms": 30,
    "shell": "zsh",
    "stderr_output": null,
    "session_id": "walkthrough-session",
    "source": "hook",
    "created_at": "2026-06-11T17:34:03.705Z"
  },
  {
    "id": 11,
    "raw_command": "recall search docker",
    "normalized_command": "recall search docker",
    "cwd": "~/demo-project",
    "repo_path_hash": "b1a21a038768d537",
    "exit_code": 0,
    "duration_ms": 50,
    "shell": "zsh",
    "stderr_output": null,
    "session_id": "walkthrough-session",
    "source": "hook",
    "created_at": "2026-06-11T17:34:03.629Z"
  }
]
```

