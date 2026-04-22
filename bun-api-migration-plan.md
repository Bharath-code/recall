# Feasibility Plan: Migrate Node.js APIs to Bun-Native APIs

## Executive Summary

**Feasible with low risk:** ~15% of Node API surface area  
**Feasible with moderate refactor:** ~25%  
**Not feasible / high risk:** ~60% (core infrastructure, security-critical path logic, crypto)

**Recommendation:** Migrate the easy wins now. Defer sync→async refactors until there's a compelling reason (performance bottleneck or Bun adds sync FS APIs).

---

## API-by-API Analysis

### 1. `node:child_process` — `execSync`

| File | Usage | Bun Replacement | Feasibility |
|------|-------|-----------------|-------------|
| `src/cli/doctor.ts:37` | `execSync('which recall')` to find binary in PATH | `Bun.which('recall')` | **High** — zero-risk drop-in |

`Bun.which()` is purpose-built for this, cross-platform (handles `where` on Windows automatically), and returns `string | null`.

### 2. `node:fs` — Read/Write Operations

| File | Function | Node API | Bun API | Sync? | Feasibility |
|------|----------|----------|---------|-------|-------------|
| `src/hooks/detect.ts:55` | `isHookInstalled()` | `readFileSync` | `Bun.file().text()` | Sync | **Medium** — fn is sync, used in async path too |
| `src/hooks/detect.ts:69` | `isHookInstalledAsync()` | *(already uses `Bun.file().text()`)* | — | Async | Already migrated ✓ |
| `src/hooks/detect.ts:82` | `appendHookToRc()` | `existsSync` + `Bun.file().text()` | `Bun.file().text()` + `Bun.write()` | Async | **High** — already async, just drop `existsSync` |
| `src/cli/init.ts:90` | History import | `readFileSync` | `Bun.file().text()` | Inside `async handleInit` | **High** — already async context |
| `src/cli/export.ts:94` | JSON export | `writeFileSync` | `await Bun.write()` | Inside sync `handleExport` | **Medium** — must make `handleExport` async |
| `src/cli/import.ts:74,110,135,217` | Import validation + read | `existsSync` + `readFileSync` | `await Bun.write()` / `Bun.file().text()` | Inside sync `handleImport` | **Medium** — must make `handleImport` async |
| `src/cli/doctor.ts:52,58` | DB/dir existence checks | `existsSync` | No clean equivalent | Sync | **Low** — `Bun.file().text()` is wasteful for existence checks |
| `src/cli/uninstall.ts:24,39` | Hook removal, data deletion | `existsSync`, `rmSync` | No sync equivalent | Inside async `handleUninstall` | **Low** — no native `rm` in Bun; shelling out (`Bun.$ rm -rf`) is less portable |
| `src/db/index.ts:14,20,24,28,140,143,144` | DB init, migrations, schema read | `existsSync`, `mkdirSync`, `readFileSync` | No sync equivalents | `getDb()` is sync | **Very Low** — would require making `getDb()` async, cascading to 50+ call sites |
| `src/config/index.ts:68,70,93,98` | Config load/save | `existsSync`, `readFileSync`, `writeFileSync`, `mkdirSync` | No sync equivalents | `loadConfig()` is sync | **Very Low** — would require making `loadConfig()` async, cascading to 30+ call sites |

### 3. `node:path` — `join`, `resolve`, `normalize`, `basename`

**Verdict: Do NOT migrate.**

Bun has no path manipulation API. `node:path` is security-critical in `src/cli/export.ts` and `src/cli/import.ts` (path traversal validation). Replacing it with string concatenation or custom logic would reintroduce the exact bugs the path validation was built to prevent.

Used in 8 source files + 3 test files. All usages are appropriate and should remain.

### 4. `node:os` — `homedir`, `tmpdir`

**Verdict: Do NOT migrate.**

Bun has no OS utility API. `homedir()` is the correct cross-platform abstraction (handles Windows `USERPROFILE`, macOS/Linux `HOME`). `tmpdir()` handles platform temp directories correctly.

We already fixed the `process.env.HOME ?? '~'` bug by importing `homedir` from `node:os`. This is the correct approach.

### 5. `node:crypto` — `createHash`

**Verdict: Do NOT migrate.**

Bun 1.1+ has `Bun.hash()` but it defaults to a non-cryptographic wyhash. For SHA-256, we'd need Web Crypto (`crypto.subtle.digest`), which is **async** — but `hashRepoPath()` is called synchronously in `getRepoContext()`. Making the repo detector async would cascade to `handleHookCapture`, which writes to stdout and needs to be fast.

Keep `node:crypto.createHash` for sync SHA-256.

---

## Recommended Migration Plan

### Phase 1: Zero-Risk Wins (Do Now)

**Target:** `src/cli/doctor.ts`

1. Replace `execSync('which recall')` with `Bun.which('recall')`
2. Remove `node:child_process` import

**Estimated effort:** 5 minutes. **Risk:** None.

### Phase 2: Async File I/O in Already-Async Paths (Do If Desired)

**Targets:**
- `src/cli/init.ts` — replace `readFileSync(histPath)` with `await Bun.file(histPath).text()`
- `src/hooks/detect.ts` — replace `existsSync` + `readFileSync` in `appendHookToRc` with pure `Bun.file().text()` + `Bun.write()`

**Rationale:** These functions are already `async`. The change is mechanical.

**Estimated effort:** 15 minutes. **Risk:** Low — but adds inconsistency (some code uses `node:fs`, some uses `Bun.file`).

### Phase 3: Sync→Async CLI Handler Refactor (Defer)

**Targets:**
- `src/cli/export.ts` — make `handleExport` async, replace `writeFileSync` with `await Bun.write()`
- `src/cli/import.ts` — make `handleImport` async, replace `readFileSync`/`existsSync` with `Bun.file()` + `Bun.write()`

**Blockers:**
- The CLI command dispatch in `src/index.ts` currently calls these synchronously. Would need to `await` the dispatch.
- Tests that invoke `handleExport`/`handleImport` directly would need to become async.

**Estimated effort:** 30–45 minutes. **Risk:** Medium — touches CLI dispatch layer and tests.

### Phase 4: Core Infrastructure (Do NOT Do)

**Targets:** `src/db/index.ts`, `src/config/index.ts`

**Why deferred indefinitely:**
- `getDb()` and `loadConfig()` are **synchronous singleton accessors** used by ~50 call sites across the codebase.
- Bun has **no synchronous file system APIs** (no `Bun.fileSync`, no `Bun.mkdirSync`, no `Bun.existsSync`).
- Converting these to async would require:
  - Making every DB operation async
  - Making every config read async
  - Updating 50+ call sites
  - Updating all tests
  - Potential race conditions in singleton initialization

**Benefit:** Negligible for a CLI tool. `node:fs` is fully supported in Bun and performs well.

### Phase 5: Path/OS/Crypto (Do NOT Do)

No Bun equivalents exist. These are correct as-is.

---

## Summary Table

| Phase | Scope | Effort | Risk | Recommendation |
|-------|-------|--------|------|----------------|
| 1 | `execSync` → `Bun.which()` | 5 min | None | **Do now** |
| 2 | Async read in already-async paths | 15 min | Low | Optional — consistency tradeoff |
| 3 | Sync→async CLI handlers | 45 min | Medium | Defer until needed |
| 4 | Core DB/config sync APIs | 4+ hrs | High | **Do not do** |
| 5 | Path / OS / Crypto | N/A | N/A | **Do not do** — no Bun equivalents |

---

## Bottom Line

> Bun's file APIs (`Bun.file`, `Bun.write`) are **async-only** and designed for I/O-heavy server workloads. Recall is a **synchronous CLI tool** where `node:fs` sync APIs are the pragmatic choice for boot-time initialization (DB, config). The only clear win is `Bun.which()` replacing `execSync('which')`. Everything else either has no Bun equivalent or requires massive architectural changes for marginal benefit.
