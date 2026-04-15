# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Recall is a local-first developer workflow memory assistant built with Bun + TypeScript. It captures shell commands, stores them in local SQLite, and helps developers recall past commands, rediscover forgotten tools, and automate repetitive workflows.

Core promise: "Your terminal remembers what you forget."

## Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **Database**: Bun SQLite (local)
- **CLI Framework**: CAC (not Commander)
- **Validation**: Zod
- **Logging**: Pino
- **Testing**: Bun test
- **AI**: Vercel AI SDK (Phase 4+)
- **Packaging**: `bun build --compile`

## Project Structure

```
src/
├── cli/           # CAC commands, pure functions
├── db/            # SQLite layer — no AI knowledge
├── hooks/         # Shell capture, pure functions
├── import/        # History import (TDD)
├── repos/         # Git root detection
├── tools/         # Tool scanner
├── sync/          # SyncAdapter interface (Phase 5)
├── ui/            # CLI design system (colors, icons, spinners)
└── ai/            # AI layer (stub now, impl Phase 4)
```

**Key principle:** Every AI feature has a "dumb fallback" CLI-only path. CLI always works without AI.

## Key Decisions (Non-Negotiable)

### Shell Hook Install
- **Two-mode**: Default = print-only (Starship model), `--auto` flag for safe auto-append
- **Idempotent detection**: Check if entry exists, skip if found (zinit pattern)
- **NO backups**: Industry moved away from backup-then-modify

### HISTFILE Handling
- Respect `$HISTFILE` env var first
- For zsh, also check `$ZDOTDIR`
- Fallback chain: `~/.zsh_history` → `~/.zhistory` → `~/.histfile`

### Command Normalization (in order)
1. Trim leading/trailing whitespace
2. Collapse multiple spaces to single
3. Expand `~` to `$HOME`
4. Case-sensitive exact match
5. Skip commands starting with space (respects HISTCONTROL)
6. Deduplicate against sliding window of last 100 commands

### Sync Strategy
- Phase 1-3: Local SQLite only
- `src/sync/adapter.ts` interface now, swap later (Phase 5 options: Convex, CRDTs, ElectricSQL)
- NO vendor lock-in until team features proven

### Testing Strategy
- **TDD for**: normalizer, history-parser, hook detect, git detector
- **Integration tests for**: CLI commands
- **Manual for**: shell hook behavior

### CLI Design System
- **Icons default ON**: `--no-icons` flag to disable (eza pattern)
- **Respects `NO_COLOR`**: plain text fallback for CI/scripts
- **Semantic colors**: cyan=paths, green=success, red=errors, dim=secondary
- **ora spinners**: loading states for async ops
- **Module**: `src/ui/` with colors.ts, icons.ts, spinner.ts, format.ts

## Architecture

```
User Terminal → Shell Hook Layer → Recall Core Engine → Local SQLite
                                                      ↓
                        ┌────────────────────────────┴────────────────────────────┐
                        ↓                                                     ↓
                  CLI Query Layer                                        Digest/Insights
                  recall search                                           weekly tips
                  recall recent                                           workflow summary
```

### Core Modules

1. **Shell Capture Module** - zsh preexec/precmd, bash PROMPT_COMMAND hooks
2. **Parser** - command normalization, tool extraction
3. **Tool Scanner** - brew/npm/cargo inventory
4. **Workflow Engine** - repeated command chain detection
5. **Suggestion Engine** - forgotten tools, repeated pain points
6. **AI Layer** (Phase 4+) - natural language search, recommendations

### Database Schema

- **commands**: id, raw_command, normalized_command, cwd, repo_path_hash, exit_code, duration_ms, shell, created_at
- **repos**: id, repo_path_hash, repo_name, repo_root, last_opened_at, startup_commands_json
- **tools**: id, tool_name, source (brew/npm/cargo), installed_at, last_used_at, usage_count
- **workflows**: id, sequence_json, project_id, frequency
- **errors**: id, error_signature, command_id, fix_summary, created_at

## Commands

### Build & Run
```bash
bun run build     # compile CLI
bun run dev       # development mode
bun test          # run tests
```

### CLI Commands (all implemented)
- `recall init` - onboarding wizard
- `recall hook capture` - internal hook payload handler
- `recall search <query>` - search past commands
- `recall recent` - show recent commands
- `recall project` - project memory context
- `recall forgotten-tools` - surfacing unused tools
- `recall uninstall` - clean removal
- `recall doctor` - debug installation issues

## Development Phases

1. **Phase 1 (Trust/Memory)**: Shell hooks, history capture, recall search
2. **Phase 2 (Tool Rediscovery)**: Installed tool scanner, dormant tool detection, weekly digest
3. **Phase 3 (Workflow Automation)**: Workflow detection, session restore
4. **Phase 4 (AI Suggestions)**: Natural language recall, contextual help
5. **Phase 5 (Team)**: Shared workflows, onboarding packs

## Key Principles

- Local-first, privacy-respecting
- Invisible until valuable
- Fast (<100ms for common queries)
- No noisy interruptions
- AI only when helpful (disabled by default)
- Suggestion thresholds to prevent spam

## Reference Documents

- **Full Plan**: `IMPLEMENTATION_PLAN.md` — task breakdown, wireframes, research
- **Brand Guide**: `BRANDING.md` — logo, colors, typography, voice, copy examples
- **Marketing Plan**: `MARKETING_PLAN.md` — content strategy, launch plan, metrics
- **Audience Building**: `AUDIENCE_BUILDING_PLAN.md` — pre-launch Twitter strategy
- **Landing Page**: `LANDING_PAGE.md` — CRO-optimized design for email capture
- **PRD**: `recall_prd_and_technical_implementation_plan.md` — vision, phases, tech rationale
- **Architecture**: `architecture_high_level_UX_wireframe.md` — system design, user flows

## Important Notes

- First deliverable: shell hook capture + search + project memory
- Do not build TUI, dashboards, or cloud sync early
- Focus on trust and reliability over flashy features
- Bun.Glob NOT used — git root detection via `git rev-parse --show-toplevel`
- Bun.secrets NOT used yet — Phase 4+ AI feature