# Recall
**Your terminal remembers what you forget.**

**History is strings. Recall is context.**

Recall is a **local-first** command & workflow memory for developers. It captures the commands you run (with context like repo + cwd), so you can **find the exact thing you did last time** and rebuild project context fast—without sending your history to the cloud.

> Status: **pre-alpha** (code not shipped yet). This repo is the product + UX spec, architecture, and implementation plan.

---

## Why Recall exists
Terminal work is high-leverage… and strangely ephemeral:

- you re-google commands you *know* you’ve run before
- you forget the “first 3 commands after cloning” for each repo
- you install great tools, then keep using the old ones out of habit
- you repeat the same workflows across projects

Recall is built to fix that with a simple promise:

**capture → search → project memory → (later) workflow automation**

---

## What it does (the wedge)
- **Repo-aware command recall**: search what you ran, *in this repo*, with timestamps and cwd context
- **Project memory**: quickly rehydrate “how we run this project” (startup patterns, recent commands)
- **Local-first by default**: your data stays on your machine (SQLite), no accounts, no telemetry

Planned later:
- **Forgotten tools**: surface tools you installed but don’t use (brew/npm/cargo)
- **Workflow replay**: detect common command sequences and run them as a bundle
- **Optional AI layer**: semantic recall *only when you enable it* (CLI always works without AI)

---

## 10-second demo (what you’ll be able to do)
Once implemented, the core experience looks like this:

```bash
# Find the exact command you ran last time
recall search "docker prune"

# See recent commands (with context)
recall recent

# Repo-aware context: last commands + startup patterns
recall project
```

**GIF placeholder:** add a 10–20s terminal clip here showing `recall search` → copy → run.

---

## Install (planned)
Recall will ship as a single binary (Bun compile) with a Homebrew tap.

Planned install targets:
- macOS (Homebrew)
- Linux (curl installer / package managers)

Until the binary exists, this repo is the reference spec. If you want to help implement it, see “Contributing”.

---

## Trust & privacy (non-negotiable)
Shell history is personal. Recall is designed to earn trust first.

- **Local-first storage**: commands live in a local SQLite DB (no cloud sync in early phases)
- **No telemetry** by default (no tracking, no hidden network calls)
- **Hook install is two-mode**:
  - **Default: print-only** (Starship-style) — shows you the line to add to your shell rc
  - **Opt-in: `--auto`** — safe append-only install with idempotent detection (zinit pattern)
- **CLI always works without AI**: AI is an optional layer planned for later phases

---

## Competitors (and why Recall is still needed)
Most “command recall” solutions optimize for **searching strings**. Recall is optimizing for **recreating context**.

| Alternative | Great at | Missing piece | Why Recall |
|---|---|---|---|
| `history` / `history \| fzf` | Fast fuzzy search | No durable **project context** (repo/cwd/exit/duration) | Recall makes “what did I run in *this repo*?” a first-class query |
| `ripgrep` in notes/dotfiles | Searching what’s written down | Doesn’t capture what you **actually executed** | Recall captures executions + context automatically |
| Atuin (sync-first history) | Powerful search + cross-machine sync | For some users: cloud/account concerns; history-first, not project-memory-first | Recall is **local-first by default** and centered on repo/project memory (team features later) |
| “AI terminal agents” | Generating new commands | Not deterministic; trust/reliability gaps for “what happened” | Recall starts with **truthful memory**, then adds optional AI later |

### The bottom line
If you only need “find a command string”, existing tools are already excellent.
If you need **repo-aware recall + project memory** (and later workflows) with a **local-first trust posture**, that’s what Recall is built for.

---

## Why not `history | fzf` / ripgrep / Atuin? (quick version)
Those tools are great. Recall is aiming at a different abstraction level:

- **Beyond raw history**: stores *context* (repo, cwd, timestamps, exit code, duration)
- **Project memory**: helps you rehydrate “how we run this repo” (not just “what command strings exist”)
- **Local-first + calm UX**: no accounts, no cloud by default, no spammy suggestions
- **Future workflow layer**: not just search—detect and replay repeated sequences

If you just want fast fuzzy history search, `fzf` (and friends) may already be enough.
If you want **repo-aware recall + project memory**, Recall is the bet.

---

## Roadmap (phases)
Recall is intentionally phased to avoid feature bloat and earn trust.

- **Phase 1 — Trust / Memory**
  - shell capture (zsh + bash)
  - history import
  - local SQLite store
  - `recall search`, `recall recent`, basic `recall project`
- **Phase 2 — Delight / Tool rediscovery**
  - installed tool scanner (brew/npm/cargo)
  - dormant tool detection + suggestions
  - weekly digest (local)
- **Phase 3 — Workflow automation**
  - detect repeated command chains
  - save + replay workflows
- **Phase 4 — Optional AI**
  - semantic recall and contextual suggestions (opt-in)
- **Phase 5 — Team (monetization later)**
  - shared workflows + onboarding packs

---

## Contributing
This project is early. Contributions that move the needle most:

- Implement the Phase 1 MVP (shell capture → SQLite → search)
- Tighten the trust story (hook safety, secret redaction rules, uninstall/doctor UX)
- Produce the first “10-second demo” clip once CLI exists

Then open an issue with:
- what you plan to build
- which files you’ll touch
- how you’ll test it (Bun test)

---

## License
Not chosen yet.

If you’re serious about OSS growth + corporate adoption, a permissive license (MIT/Apache-2.0) usually reduces friction.

