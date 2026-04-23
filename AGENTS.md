# AGENTS.md

Compact guidance for OpenCode sessions working on Recall.

## Project

Recall — local-first CLI that captures shell commands to SQLite so developers can search past work by repo/cwd/context.

- **Runtime**: Bun 1.2+
- **CLI framework**: CAC (not Commander)
- **DB**: Bun SQLite (`bun:sqlite`)
- **Validation**: Zod
- **Test runner**: `bun:test`
- **Packaging**: `bun build --compile` + macOS ad-hoc signing

## Monorepo boundaries

```
/               → CLI package (recall-cli)
landing/        → Astro + Tailwind marketing site (workspace)
src/            → CLI source
scripts/        → Build helpers (macOS signing)
tests/          → Bun test suites
types/          → Ambient type declarations
```

- Run landing separately: `bun run landing:dev`, `bun run landing:build`

## Developer commands

```bash
bun install
bun run dev           # run src/index.ts directly
bun run build         # compile to bin/recall + run scripts/sign-macos.sh
bun test              # run all tests
bun test tests/import/normalizer.test.ts   # single test file
bun run lint          # tsc --noEmit only
bun run clean         # rm -rf bin/ node_modules/
```

Build quirks:
- `bun run build` runs `scripts/sign-macos.sh`, which calls `codesign` on macOS. On non-macOS it no-ops.
- Compiled output goes to `bin/recall`.

## TypeScript paths (tsconfig)

```
@/*       → ./src/*
@db/*     → ./src/db/*
@cli/*    → ./src/cli/*
@ui/*     → ./src/ui/*
@hooks/*  → ./src/hooks/*
@import/* → ./src/import/*
@repos/*  → ./src/repos/*
@tools/*  → ./src/tools/*
@ai/*     → ./src/ai/*
@errors/* → ./src/errors/*
@workflows/* → ./src/workflows/*
```

## Testing patterns

- Import from `bun:test`.
- Database tests use in-memory SQLite via `createTestDb()` + `setDb()` from `src/db/index.ts`.
- `beforeEach`/`afterEach` reset the DB singleton to avoid cross-test pollution.
- Coverage is disabled in `bunfig.toml`.

## CLI entrypoint (`src/index.ts`)

- Registers commands with CAC; lazy-loads handlers via dynamic `import()`.
- Global `--no-icons` flag; respects `NO_COLOR`.
- Experimental commands are hidden unless `RECALL_EXPERIMENTAL=1` is set:
  - `ask`, `fix`, `replay`, `forgotten-tools`, `embed`

## Key conventions

- **Every AI feature must have a dumb CLI-only fallback.** The CLI works without AI or network.
- **Shell hook install is two-mode:** default prints the hook line (Starship model); `--auto` appends to shell rc with idempotent detection. No backups.
- **HISTFILE handling:** respect `$HISTFILE`, then for zsh check `$ZDOTDIR`, then fall back `~/.zsh_history` → `~/.zhistory` → `~/.histfile`.
- **Command normalization order:** trim → collapse whitespace (preserve quoted strings) → expand `~` to `$HOME` → case-sensitive. Skip commands starting with space (HISTCONTROL).
- **Icons default ON:** `--no-icons` to disable; `NO_COLOR` disables colors.
- **Semantic colors:** cyan=paths, green=success, red=errors, dim=secondary.

## Database notes (`src/db/index.ts`)

- Schema is loaded from `src/db/schema.sql` using `with { type: 'file' }` import attribute.
- Runtime compatibility migrations exist (e.g., adding `source` column to commands, recreating `tools` table without restrictive CHECK constraint). These run automatically on `getDb()`.
- `createTestDb()` sets up an in-memory instance with the same schema + migrations.
- Data directory: `~/.recall/` (mode `0o700`).

## What not to build early

- No TUI, dashboards, or cloud sync in Phase 1.
- AI features stay behind `RECALL_EXPERIMENTAL=1` until explicitly promoted.

## Verified references

- `README.md` — install from source, trust story, competitor comparison
- `SPEC.md` — implementation spec (source of truth)
- `src/db/schema.sql` — actual DB schema
- `src/index.ts` — command registry and experimental gating
