# Fix & Launch Plan — v0.1.0

Priority order: perf fix → reposition → ship → launch. Don't start Phase 2 until Phase 1 is green.

## Measured baseline (2026-07-16)

- Seeding 10K rows via `insertCommand`: **40.7s** (~4ms/insert — causes the 15s test timeout)
- `searchCommandsKeyword('perf-9999', 20)` at 10K rows: **170ms** (promise is <100ms)
- Failing test: `tests/cli/core.test.ts` — "search remains fast with ten thousand commands"

## Phase 1 — Perf regression (~2-3h) — DONE
Seed 10K rows: 40.7s → ~1.5s. Search: 170ms → ~10ms. `bun test`: 205 pass, 0 fail.


### 1a. Batch inserts not transactional — `src/db/commands.ts:76`
Every `insertCommand` re-prepares the statement and commits its own implicit transaction, firing the FTS trigger each time. `recall import` pays this in full.

- Cache prepared statements at module level (two variants: with/without `created_at`)
- Add `insertCommands(inputs[])` wrapping the loop in one `db.transaction()`; use from import path and the test
- Verify: seed time drops from ~40s to well under 1s

### 1b. Keyword search ignores FTS5 — `src/db/commands.ts:174`
FTS sync triggers are paid on every insert, but search uses `LIKE '%q%'` across 3 columns — unindexable full scan, grows linearly.

- Primary path: query `commands_fts` with quoted prefix match (`"perf-9999"*`), join back to `commands` on rowid, preserve source/order/limit semantics
- Keep LIKE only as catch-block fallback for queries FTS5 rejects
- Watch out: FTS5 tokenizer splits `perf-9999` on hyphen — quote the query; test hyphens, `"`, `*`
- Verify: search ~1-5ms; `bun test` fully green

### 1c. Guard
Tighten the test to assert seed time too (e.g. `seededMs < 5000`) so a transaction regression can't hide behind the timeout.

### Verification script
```sh
HOME=/tmp/perfhome bun --eval "
import { insertCommand, searchCommandsKeyword } from './src/db/commands.ts';
const t0 = performance.now();
for (let i = 0; i < 10000; i++) insertCommand({ raw_command: 'echo perf-'+i, normalized_command: 'echo perf-'+i, cwd: '/tmp', shell: 'zsh', exit_code: 0 });
const t1 = performance.now();
const r = searchCommandsKeyword('perf-9999', 20);
console.log(JSON.stringify({ seedMs: Math.round(t1-t0), searchMs: +(performance.now()-t1).toFixed(2), count: r.length }));
"
```

## Phase 2 — Reposition around agent memory (~1 day) — DONE

- README headline flipped to agent-memory framing; first code block is now the MCP config, `recall_search` transcript second, `recall search`/features moved below
- `docs/MCP_SETUP.md` gained a Claude Code section (`.mcp.json` / `claude mcp add`) ahead of Claude Desktop/Cursor
- Landing hero (`landing/src/components/Hero.astro`) headline + subhead inverted to the agent-memory promise; terminal now opens with the Claude Code exchange
- `landing/src/components/Features.astro` gained an "Agent Memory (MCP)" card as feature #1 (Smart Search demoted, not removed)
- `scripts/generate-mcp-demo.sh` + `scripts/mcp-call.ts`: seeds a temp repo, spawns the real `recall mcp` server via the MCP SDK client, calls `recall_search` for real, writes the actual JSON response into `launch-assets/mcp-demo.md` — not a mockup transcript

## Phase 3 — Ship v0.1.0 (~half day)

- `bun run build`; check compiled binary size and cold-start time (hook capture must be imperceptible)
- If AI SDK deps bloat the binary, lazy-import them so `hook capture` never loads them
- Tag v0.1.0, publish Homebrew tap (`homebrew/`), GitHub release with demo GIF

## Phase 4 — Launch (~1 day, spread over a week)

1. Submit to MCP server registries/directories first (free, uncontested distribution)
2. Show HN: framed as MCP/agent-memory angle, not "another shell history tool"; perf numbers + local-first privacy story in first comment
3. r/ClaudeAI + X thread with demo video
4. Writeup: "I gave Claude Code a memory of my terminal" — launch content + interview artifact for `JOB_APPLICATION_MATERIALS.md`

## Backlog (post-launch, from code review)

- `PRAGMA user_version` schema versioning before migration #4-5
- Audit 4 AI SDK provider packages' impact on compiled binary size
- Team memory / onboarding packs (Phase 5 spec) only if pull exists — the sole realistic monetization path
