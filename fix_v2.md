### Current state (correctness + intended functionality)

- **Core loop works as intended**: shell hook capture → SQLite → `recall recent` / `recall search` / `recall project`.
  - Evidence: `bun test` passes (41/41) when run in a normal environment; `scripts/demo-dogfood.sh` and `scripts/smoke-zsh.sh` both pass and show the expected outputs (capture, recent, search, project, ignore, delete).
- **Spec/README/DOGFOOD alignment is broadly strong**: two-mode hook install, local-first defaults, ignore/delete controls, FTS-backed search with fallback.

### Gaps / issues I’d fix (UX + trust)

- **`recall init` advertises commands that may not exist**: it prints “Quick commands” including `recall ask` and `recall fix`, but those commands are **only registered when `RECALL_EXPERIMENTAL=1`**. This is a confusing first-run moment.
- **`recall doctor` has a meaningless check**: `binaryFound` is effectively always true, so it can’t actually tell you “is recall on PATH?” (which is *the* common install failure mode).
- **Config keys not wired to behavior/UI yet** (some are fine as “future” but they currently read like promises):
  - `show_icons` isn’t used (only `--no-icons` works).
  - `capture_stderr`, `embed_interval_ms`, `preferred_shell`, `last_digest_at` aren’t meaningfully enforced/used yet.

### UI/UX quality (what’s already good)

- **Empty states are calm and actionable** (`recent`, `project`, `search`).
- **Output formatting is consistent** (header rule, relative time, exit/duration tokens).
- **Hook reliability posture is correct**: hook actions fail silently so you don’t break the user’s shell.

### “Market-capture” feature research (what users expect in 2026)

Tools like Atuin / hishtory / pxh have trained users to expect:
- **Ctrl‑R interactive search UI** (TUI/fullscreen picker, execute/edit on enter)
- **Fast filters** (current dir/repo/session, exit code, time range)
- **Import/export + maintenance/doctor that actually fixes things**
- Optional sync (even if you choose not to compete there)

So to *win*, Recall needs to be **materially better at “project context”**, while matching the baseline “interactive recall” experience.

### Highest-ROI features to add (prioritized)

- **1) Interactive recall UI (must-have wedge)**  
  Add a command like `recall recall` (or `recall pick`) that opens an interactive picker (fzf-style) and returns/executes the selection. Then ship an **optional Ctrl‑R bind** for zsh/bash. This is table-stakes for adoption.

- **2) Project memory that’s truly distinct (your moat)**  
  Make `recall project` produce a “rehydrate this repo” panel:
  - detected “startup commands” (first ~N commands after `cd`/first activity)
  - common workflows (top sequences)
  - “last known good” commands (exit=0) vs “recent failures”
  - a one-liner “copyable runbook snippet” per repo

- **3) A “golden path” onboarding that proves value in 30 seconds**  
  After `init`, guide users to run 3 commands and then show them via `recent` immediately (tight feedback loop). Also fix the `init` “Quick commands” list to only show what’s actually enabled.

- **4) Trust features that reduce fear**  
  - Stronger secret handling UX: `recall doctor` should explicitly verify redaction is on, show ignored patterns, and warn if risky settings are enabled.
  - Add `recall pause` / `recall resume` as shortcuts (instead of config editing).

- **5) Export/import + portability**  
  `recall export` (JSON/CSV) and `recall import` (history files) so users feel ownership and can migrate (this is surprisingly important for trust + OSS adoption).

### What I’d do next (concrete plan)

- **Ship-next (1–2 weeks)**: interactive picker + Ctrl‑R binding, fix `init`/`doctor` correctness, wire `show_icons`, add export.
- **Then (2–4 weeks)**: project runbook/startup patterns + workflow detection output (even if replay is “dry-run preview” first).
- **Then**: optional AI layer only after the “dumb but magical” UX is already dominant.

If you want, I can implement the highest-impact fixes first (the `init` misleading quick commands + a real `doctor` PATH check), then build the interactive picker command and zsh widget so Recall feels instantly competitive.