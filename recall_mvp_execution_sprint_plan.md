# Recall — MVP Execution Sprint Plan

## Goal
Ship Phase 1 MVP in 3 weeks:
- reliable shell hook capture
- local command memory
- fast search / recall
- project memory basics
- low-friction onboarding

---

# 1. Database Schema (Concrete)

## commands table
Purpose: core memory log

Fields:
- id (PK)
- raw_command (text)
- normalized_command (text)
- cwd (text)
- repo_path_hash (text)
- exit_code (int)
- duration_ms (int)
- shell (text)
- created_at (timestamp)

Indexes:
- created_at
- repo_path_hash
- normalized_command

## repos table
Purpose: repo context

Fields:
- id
- repo_path_hash
- repo_name
- repo_root
- last_opened_at
- startup_commands_json

Indexes:
- repo_path_hash unique

## tools table
Purpose: installed tool inventory

Fields:
- id
- tool_name
- source (brew/npm/cargo)
- installed_at
- last_used_at
- usage_count

Indexes:
- tool_name unique

## errors table
Purpose: repeated issue memory

Fields:
- id
- error_signature
- command_id
- fix_summary
- created_at

---

# 2. Shell Hook Spec (Concrete)

## zsh support (priority)
Use:
- preexec() → capture command start
- precmd() → capture finish / exit code

Flow:
1. user runs command
2. preexec stores:
   - raw command
   - start time
   - cwd
3. precmd captures:
   - exit code
   - duration
4. sends payload to Recall CLI

Command:
recall hook capture --payload

## bash support
Use:
- PROMPT_COMMAND

## Hook install flow
recall init:
- detect shell
- backup rc file
- append minimal hook snippet

Rules:
- idempotent install
- clean uninstall command

Files touched:
- ~/.zshrc
- ~/.bashrc

---

# 3. Onboarding Flow (Exact UX)

## Step 1: install
brew install recall

## Step 2: init
recall init

## Wizard flow
Screen 1:
Welcome to Recall
Your terminal memory assistant.

Screen 2:
✓ detected shell: zsh
Install shell hooks? [Y]

Screen 3:
Import history?
- last 30 days
- all history

Screen 4:
Scan installed tools? [Y]

Screen 5:
Privacy:
- data stored locally only
- AI disabled by default

Screen 6: instant value
Show:
- top 10 commands
- repeated repos
- forgotten tools

Goal:
User feels value in first 2 mins.

---

# 4. MVP Sprint Plan (3 weeks)

## WEEK 1 — Core capture + DB

### Day 1–2
- repo setup (Bun + TS)
- CLI scaffold
- sqlite setup
- migration scripts

Deliverable:
local DB working

### Day 3–4
- zsh shell hook install
- capture command start/end
- payload logging

Deliverable:
commands captured reliably

### Day 5–7
- shell history import
- parser normalization
- basic search

Deliverable:
recall search works

Success:
Can recall past command instantly

---

## WEEK 2 — project memory + onboarding

### Day 8–10
- git root detection
- repo grouping
- project metadata

### Day 11–12
- onboarding wizard
- shell hook installer UX

### Day 13–14
- install tool scanner
- brew / npm / cargo support

Deliverable:
usable local memory MVP

Success:
User can:
- install
- search
- see repo context

---

## WEEK 3 — delight + launch prep

### Day 15–17
- forgotten tools logic
- underused tool surfacing

### Day 18–19
- polish output / copy
- reduce noise
- error handling

### Day 20–21
- package binary
- brew tap
- landing page
- demo gif

Deliverable:
launchable MVP

---

# 5. MVP commands to support

Must-have:
- recall init
- recall search <query>
- recall recent
- recall project
- recall forgotten-tools
- recall uninstall

Nice later:
- recall workflow
- recall ask

---

# 6. Testing checklist

Critical:
- shell hook reliability
- duplicate prevention
- command timing accuracy
- sqlite writes
- onboarding rollback

User tests:
- install in under 2 mins
- first wow moment visible

---

# 7. Launch checklist

Before launch:
- stable install
- clear uninstall
- privacy messaging
- demo gif
- docs

Launch channels:
- Hacker News Show HN
- Reddit r/commandline
- X dev community

Goal:
first 50 users + feedback loop

