For this product, your architecture should optimize for **trust, speed, and low friction** — not complexity.

Bun is a good fit because it gives you:

* fast CLI startup
* built-in SQLite for local memory
* shell execution via `Bun.$`
* file APIs for logs / snapshots
* standalone binary compilation for easy install ([OneUptime][1])

Below is the exact high-level architecture and user flow in wireframe form.

---

# architecture.md

```md
# Recall — Developer Workflow Memory Assistant

## 1. Product Goal

Recall helps developers:
- remember past commands
- restore project workflows
- rediscover forgotten tools
- reduce repeated terminal friction

Core promise:
"Your terminal remembers what you forget."

---

## 2. Product Principles

- Local-first
- Privacy-first
- Invisible until valuable
- Fast (<100ms for common queries)
- No noisy interruptions
- AI only when helpful

---

## 3. Tech Stack

## Runtime:
- Bun + TypeScript

## CLI:
- Commander / CAC

## Local Storage:
- Bun SQLite

## AI:
- Vercel AI SDK (optional layer)

## Shell:
- zsh / bash hooks

## Packaging:
- Bun build --compile

---

## 4. High-Level System Architecture

+--------------------------+
|     User Terminal        |
| zsh / bash / shell usage |
+------------+-------------+
             |
             v
+--------------------------+
|     Shell Hook Layer     |
| preexec / precmd hooks   |
| capture command events   |
+------------+-------------+
             |
             v
+--------------------------+
| Recall CLI Daemon / Core |
| event ingestion          |
| parser                   |
| command grouping         |
| tool scan                |
+------------+-------------+
             |
             v
+--------------------------+
| Local Memory Layer       |
| Bun SQLite               |
| commands                 |
| projects                 |
| tools                    |
| workflows                |
| errors                   |
+------------+-------------+
             |
             v
+--------------------------+
| Recall Intelligence      |
| - command recall         |
| - forgotten tools        |
| - workflow detection     |
| - project memory         |
+------------+-------------+
             |
      +------+------+
      |             |
      v             v
+-----------+   +----------------+
| CLI Query  |  | Weekly Digest   |
| responses  |  | tips / nudges   |
+-----------+   +----------------+

Optional later:
             |
             v
+--------------------------+
| AI Suggestion Layer       |
| Vercel AI SDK             |
| semantic search           |
| workflow coaching         |
+--------------------------+

---

## 5. Core Modules

## A. Shell Capture Module
Captures:
- raw command
- cwd
- repo path
- timestamp
- exit code
- duration

## B. Parser
Extract:
- command type
- flags
- tool used

## C. Tool Scanner
Scans:
- brew list
- npm global
- cargo install

## D. Workflow Engine
Detect:
- repeated command chains
- startup patterns

## E. Suggestion Engine
Surfacing:
- forgotten tools
- repeated pain points

## F. AI Layer (later)
Supports:
- natural language command search
- recommendations

---

## 6. Database Schema

## commands
- id
- command
- cwd
- repo_id
- exit_code
- duration
- timestamp

## projects
- id
- path_hash
- name
- last_opened

## tools
- id
- name
- source (brew/npm/cargo)
- installed_at
- last_used

## workflows
- id
- sequence_json
- project_id
- frequency

## errors
- id
- signature
- fix_command
- timestamp

---

## 7. Product Phases

Phase 1:
- shell hooks
- history capture
- recall search

Phase 2:
- forgotten tool rediscovery
- project memory

Phase 3:
- workflow automation

Phase 4:
- AI suggestions

Phase 5:
- team workflows

```

---

# High-Level System Design Wireframe

```text
┌────────────────────────────────────────────────────────────┐
│                    USER TERMINAL SESSION                   │
│                                                            │
│  user types command → shell executes → hook captures data │
└────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────┐
│                     SHELL HOOK LISTENER                    │
│                                                            │
│  - zsh preexec                                              │
│  - bash PROMPT_COMMAND                                      │
│  - captures: command / cwd / exit / time                    │
└────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────┐
│                      RECALL CORE ENGINE                    │
│                                                            │
│  1. normalize command                                       │
│  2. detect repo context                                     │
│  3. update tool usage                                       │
│  4. detect workflows                                        │
└────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────┐
│                     LOCAL SQLITE MEMORY                    │
│                                                            │
│  commands / tools / workflows / project memory             │
└────────────────────────────────────────────────────────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
┌─────────────────────────────┐    ┌─────────────────────────┐
│      CLI RESPONSE LAYER     │    │   DIGEST / INSIGHTS     │
│                             │    │                         │
│ recall search               │    │ weekly tips             │
│ recall project              │    │ workflow summary        │
│ recall forgotten-tools      │    │ underused tools         │
└─────────────────────────────┘    └─────────────────────────┘
```

---

# User Flow Wireframe (MVP)

## 1. Install / onboarding

```text
User:
brew install recall

↓

User:
recall init

↓

Recall setup wizard:
--------------------------------
✓ Detected zsh
✓ Add shell hook? [Y]
✓ Scan installed tools? [Y]
✓ Import shell history? [Y]
--------------------------------

↓

Instant wow:
--------------------------------
You have:
- 4 forgotten tools
- 3 repeated workflows
- 2 repos with startup patterns
--------------------------------
```

---

## 2. Daily command capture flow

```text
User:
npm run dev

↓

Recall silently captures:
- command
- repo
- duration
- result

↓

stores in sqlite
```

---

## 3. Command recall flow

```text
User:
recall search "docker cleanup"

↓

Recall:
--------------------------------
Found:
docker system prune -a
Used 14 days ago in project X
--------------------------------
```

---

## 4. Project memory flow

```text
User:
cd project-a

↓

Recall:
--------------------------------
Last time in this repo:
- bun dev
- docker compose up
- logs tail

Run startup workflow? [Y/n]
--------------------------------
```

---

## 5. Forgotten tools flow

```text
User:
recall forgotten-tools

↓

Recall:
--------------------------------
You installed:
- :contentReference[oaicite:1]{index=1} (unused 42 days)
- :contentReference[oaicite:2]{index=2} (unused 30 days)

Suggestion:
Alias grep → rg ?
--------------------------------
```

---

# UX rules (critical)

## Must:

* install < 2 mins
* instant first value
* quiet suggestions
* local-first trust

## Never:

* spam popups
* random AI chat
* auto-run risky commands

---

## My advice:

Start with:

* shell hooks
* recall search
* forgotten tools scan

That alone is enough to launch an MVP and validate demand.


