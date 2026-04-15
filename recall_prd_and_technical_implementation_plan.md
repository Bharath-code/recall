# Recall — Detailed PRD & Technical Implementation Plan

## 1. Vision
Recall is a local-first developer workflow memory assistant that helps users remember past commands, restore project context, rediscover forgotten tools, and gradually automate repetitive workflows.

### Product promise
Your terminal remembers what you forget.

### Why this matters
Developers repeatedly:
- re-google commands
- forget useful tools they installed
- lose project setup context
- repeat tedious workflows

Recall reduces this friction without disrupting terminal flow.

---

## 2. Product principles

### UX principles
- invisible until valuable
- local-first and privacy-respecting
- fast startup and responses
- low-friction install
- CLI-first, optional richer UI later
- AI is assistive, never noisy

### Product principles
- trust before automation
- suggestions before actions
- explainability before agents
- user control over all changes

---

## 3. Target users

### Primary
- individual developers using terminal daily
- macOS / Linux power users
- brew-heavy users
- freelancers / indie hackers

### Secondary
- small engineering teams
- startups onboarding new devs

---

## 4. Success metrics

### MVP metrics
- setup completion rate > 70%
- weekly active users > 40%
- command recall usage > 3/week/user
- forgotten tools feature usage > 1/week/user

### retention metrics
- D7 retention > 35%
- D30 retention > 20%

### delight metrics
- % users enabling suggestions
- NPS from early users

---

## 5. Product roadmap by phase

# PHASE 1 — TRUST / MEMORY (Weeks 1–4)

## Goal
Provide instant value by reducing command recall friction.

## Features
### 1. Shell history capture
Capture:
- command
- cwd
- repo path
- timestamp
- exit code
- duration

Implementation:
- zsh preexec / precmd hooks
- bash PROMPT_COMMAND

Bun tools:
- Bun.file for shell rc edits
- Bun.$ for shell checks

### 2. Shell history import
Import:
- ~/.zsh_history
- ~/.bash_history

Implementation:
- parse history file
- normalize entries
- dedupe

Bun tools:
- Bun.file
- Bun.Glob

### 3. Local memory database
Store:
- commands
- repos
- errors

Implementation:
- Bun SQLite
- indexed tables

### 4. CLI search
Commands:
- recall search <query>
- recall recent

Implementation:
- keyword search
- fuzzy matching

### 5. Project memory
When entering repo:
- show last used commands
- common startup flow

Implementation:
- detect git root
- store repo metadata

## AI usage
NONE in phase 1.

## Why useful
- immediate value
- no learning curve
- trust building

---

# PHASE 2 — DELIGHT / TOOL REDISCOVERY (Month 2)

## Goal
Help users rediscover value from their existing setup.

## Features
### 1. Installed tool scanner
Scan:
- brew list
- npm global packages
- cargo install

Implementation:
- Bun.$ commands
- normalize tool list

### 2. Dormant tool detection
Detect:
- installed but unused tools
- suboptimal habits

Examples:
- using grep despite ripgrep installed

### 3. Weekly digest
Summary:
- forgotten tools
- repeated commands
- quick wins

Implementation:
- scheduled local summary
- optional email later

Bun tools:
- Bun.write cache
- Bun cron equivalent (local scheduler wrapper)

## AI usage
Optional lightweight ranking:
- prioritize useful suggestions

Using:
- Vercel AI SDK
- cheap small model

## Why useful
- surprise delight
- helps users improve

---

# PHASE 3 — WORKFLOW AUTOMATION (Month 3–4)

## Goal
Reduce repetitive work.

## Features
### 1. Workflow detection
Detect:
- repeated command chains
- startup patterns

Implementation:
- sequence analysis
- frequency thresholds

### 2. Workflow save / bundle
Users can:
- save workflow
- run in one command

Example:
recall workflow run startup

### 3. Session restore
Restore:
- recent commands
- startup scripts

Implementation:
- repo snapshots
- command templates

Bun tools:
- Bun.$ safe execution
- Bun.file snapshots

## AI usage
AI helps:
- name workflow
- summarize suggestions

Using:
- Vercel AI SDK
- provider abstraction

## Why useful
- strong habit loop
- daily time savings

---

# PHASE 4 — AGENTIC / CONTEXTUAL ASSIST (Month 5+)

## Goal
Provide contextual help without noise.

## Features
### 1. Error memory suggestions
When same error:
- suggest prior fix

### 2. Context-aware suggestions
Examples:
- missing tool
- next likely command

### 3. AI natural language recall
Examples:
recall ask "how did I fix docker last time"

Implementation:
- semantic search
- embeddings later

AI stack:
- Vercel AI SDK
- support:
  - OpenAI
  - Anthropic
  - Gemini
  - local Ollama later

## Safety
- never auto-run destructive commands
- always confirm actions

## Why useful
- increases stickiness
- feels magical

---

# PHASE 5 — TEAM / NETWORK EFFECTS (Later)

## Features
- shared workflows
- onboarding packs
- trusted recommendations marketplace

Monetization:
- team plans
- sponsored tools (clearly labeled)

---

## 6. Tech stack (exact)

## Runtime
- Bun

Why:
- TS native
- fast startup
- built-in tools

## Language
- TypeScript

## DB
- Bun SQLite

Tables:
- commands
- tools
- workflows
- repos
- errors

## CLI framework
- Commander / CAC

## Validation
- Zod

## Logging
- Pino

## Testing
- Bun test

## Packaging
- bun build --compile
- Homebrew tap

## AI
- Vercel AI SDK

Why:
- provider flexibility
- future local model support

---

## 7. Bun tools usage plan

## Bun SQLite
Use:
- local DB

## Bun.$
Use:
- shell commands
- brew scans
- automation

## Bun.file / Bun.write
Use:
- shell config edits
- local cache
- digests

## Bun.Glob
Use:
- project detection
- config scan

## Bun build --compile
Use:
- standalone binary release

## Bun test
Use:
- unit tests
- parser tests
- workflow engine tests

## Bun.secrets (later)
Use:
- AI keys

---

## 8. Core system modules

### A. Capture layer
Responsibilities:
- shell hooks
- command events

### B. Storage layer
Responsibilities:
- command history
- tool usage

### C. Intelligence engine
Responsibilities:
- recall search
- workflow detection
- rediscovery

### D. Suggestion engine
Responsibilities:
- context prompts
- digest

### E. AI adapter
Responsibilities:
- provider abstraction
- semantic recall

---

## 9. UX documents needed

Required docs:
- onboarding UX spec
- shell hook UX flows
- command UX copy guidelines
- suggestion timing rules
- privacy policy
- local data handling policy

---

## 10. Go-to-market docs needed

Required:
- landing page messaging
- onboarding emails
- launch checklist
- HN launch copy
- Reddit launch posts
- early user feedback script

---

## 11. Biggest risks and mitigation

## Risk: noisy UX
Mitigation:
- suggestion thresholds

## Risk: trust/privacy
Mitigation:
- local-first default

## Risk: AI hallucination
Mitigation:
- AI only optional

## Risk: feature bloat
Mitigation:
- strict phase gates

---

## 12. Execution discipline

Rule:
Ship phase 1 fast.

Do not build:
- TUI early
- dashboards early
- cloud sync early
- agents early

Goal:
Get first 50 users.

Watch:
- which feature they use daily
- what surprises them
- where they churn

Then iterate.

Recall wins by being:
- trustworthy
- fast
- calm
- genuinely useful

Not by being flashy.

