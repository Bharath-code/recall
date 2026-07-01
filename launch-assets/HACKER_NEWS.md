# Show HN — Recall

Post when README demo GIF is ready and `brew install` works.

## Title (pick one)

1. **Show HN: Recall – repo-aware shell command memory (local SQLite, MCP for Claude Code)**
2. **Show HN: A CLI that shows project context when you cd into a git repo**

## Post body

```
Recall captures shell commands with full context (repo, cwd, exit code, duration) and makes them searchable — locally, in SQLite.

Unlike history sync tools, Recall is built around project memory:
- cd into a repo → brief hint with recent commands and last failure
- recall project → startup patterns, workflows, failures for this repo
- recall forgotten-tools → installed brew/npm tools you never use
- recall mcp → expose history to Claude Code / Cursor via MCP

Install:
  brew tap bharath-code/recall
  brew install recall
  recall init --auto

Source: https://github.com/bharath/recall-cli

Limitations: no cross-machine sync yet, Bun-compiled binary, pre-1.0. Feedback welcome — especially from Atuin users who want project context without giving up sync.
```

## First comment (post immediately as author)

```
Author here. I built Recall because Ctrl+R only searches strings — I kept losing *which project* I ran a command in, and whether it succeeded.

The feature I'm most proud of: when you cd into a repo, Recall shows a one-line hint (recent commands, startup pattern, last failure) — throttled to once per 5 minutes so it stays quiet.

Happy to answer questions about shell hooks, SQLite FTS, or the MCP integration.
```

## Timing

- Post Tuesday–Thursday, 8–10am US Eastern
- Have GitHub Issues enabled
- Monitor comments for 2 hours after posting

## Cross-post (same day)

- r/commandline — shorter version, focus on `cd` hints
- r/zsh — shell hook technical details
- Twitter/X thread — link to HN + demo GIF