# Recall

> **Give your AI coding agent a memory of how you actually work.**  
> *Local-first command history, exposed to Claude Code and Cursor over MCP.*

[![CI](https://img.shields.io/github/actions/workflow/status/bharath/recall-cli/ci.yml?branch=main&label=CI&logo=github)](https://github.com/bharath/recall-cli/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Bun](https://img.shields.io/badge/Bun-1.2%2B-gray?logo=bun)](https://bun.sh)
![Tests](https://img.shields.io/badge/tests-205%20passing-brightgreen)

---

Your agent keeps asking how to deploy this repo, which flags that script needs, why that error happened last time. You already know — it's in your shell history. **Recall gives the agent that memory.**

![Recall demo](assets/demo.gif)

```jsonc
// ~/.claude.json (or .cursor/mcp.json) — one-time setup
{
  "mcpServers": {
    "recall": { "command": "recall", "args": ["mcp"] }
  }
}
```

```
You: how do I deploy this repo?

Claude Code: [calls recall_search("deploy")]
  → Found: "docker compose -f docker.prod.yml up -d" — ran 2 days ago in
    this repo, exited 0, took 4.1s. That's your last successful deploy.
```

No re-explaining your workflow every session. No stale docs. The agent reads what you actually ran, not what a README claims you should run.

## Features

### MCP Server (Claude Code, Cursor)

Expose your command history to AI agents via Model Context Protocol:

```bash
recall mcp
```

See [docs/MCP_SETUP.md](docs/MCP_SETUP.md) for Claude Code, Claude Desktop, and Cursor configuration.

### Repo-Aware Command Recall

Search by what you ran, **in which project**, with full context — timestamp, working directory, exit code, and duration.

```bash
recall search "deploy" --repo <hash>
recall search "kubectl" --since 2025-01-01
recall recent --failed-only
```

### Project Memory

Rehydrate project context instantly — startup patterns, recent commands, and known errors for any repo.

When you `cd` into a git repo, Recall shows a brief hint (recent commands, startup pattern, last failure) — at most once every 5 minutes per repo.

```bash
recall project                # Current repo context
recall project --json         # Machine-readable output
recall config --set cd_hints_enabled=false   # Disable auto hints on cd
```

### Tool Rediscovery

Find tools you installed but forgot to use. Surface alternatives to deprecated tools.

```bash
recall forgotten-tools        # Installed but unused
recall digest                  # Weekly terminal activity summary
```

### Optional AI Semantic Search

Natural language querying with a **provider-agnostic adapter** — bring your own API key (OpenAI, Anthropic, Google, Cohere, Ollama).

```bash
recall ask "how do I clean up docker images"
recall ask "what was that kubectl command from last week"
```

### Privacy-First by Design

- **Local-only storage** — SQLite on your machine, nothing leaves
- **Zero telemetry** — no tracking, no hidden network calls
- **AI disabled by default** — requires explicit opt-in
- **Capture controls** — pause, ignore patterns, redact secrets, delete data

```bash
recall config --set capture_enabled=false
recall ignore add "git push*"
recall delete --all --yes
```

## Quick Start

### Homebrew (macOS / Linux)

```bash
brew tap bharath-code/recall
brew install recall
recall init        # Run the setup wizard
```

### From Source

```bash
git clone https://github.com/bharath/recall-cli.git
cd recall-cli
bun install
bun run dev        # Run via Bun
bun run build      # Compile to bin/recall
```

Then open a new terminal and start working. Recall captures every command automatically.

## Commands

| Command | Description |
|---------|-------------|
| `recall init` | Onboarding wizard (shell hook, history import, tool scan) |
| `recall search <query>` | Search captured commands with FTS5 |
| `recall recent` | Show recent commands |
| `recall project` | Current repo context (startup patterns, recent activity) |
| `recall session` | Session timeline view |
| `recall ask <question>` | AI-powered semantic search |
| `recall digest` | Weekly terminal activity summary |
| `recall workflows` | Detect repeated command sequences |
| `recall restore` | Replay a stored workflow |
| `recall fix` | Show known fixes for recent errors |
| `recall forgotten-tools` | Find installed but unused tools |
| `recall ignore` | Manage capture ignore patterns |
| `recall delete` | Remove captured data |
| `recall config` | View / update settings |
| `recall export` | Export data to JSON |
| `recall import` | Import from export or shell history |
| `recall pick` | Interactive command picker |
| `recall doctor` | Diagnose installation health |
| `recall uninstall` | Remove Recall from your system |
| `recall pause / resume` | Pause / resume command capture |
| `recall completions <shell>` | Generate shell completions |
| `recall mcp` | Start MCP server for AI tool integration |

## Built With

| Technology | Purpose |
|------------|---------|
| [Bun](https://bun.sh) | Runtime, bundler, package manager, test runner |
| [TypeScript](https://www.typescriptlang.org/) | Type safety across the entire codebase |
| [Bun SQLite](https://bun.sh/docs/api/sqlite) | Zero-config local database |
| [FTS5](https://www.sqlite.org/fts5.html) | Full-text search engine (4–15ms at 100K rows) |
| [CAC](https://github.com/cacjs/cac) | CLI framework (lighter than Commander) |
| [Zod](https://zod.dev) | Runtime schema validation |
| [@clack/prompts](https://github.com/natemoo-re/clack) | Interactive terminal prompts |
| [AI SDK](https://sdk.vercel.ai) | Provider-agnostic AI adapter |

## Architecture

```
recall
├── src/
│   ├── cli/         # 25+ command handlers
│   ├── db/          # SQLite schema, migrations, CRUD
│   ├── hooks/       # Shell hook snippets (zsh + bash)
│   ├── ui/          # Colors, icons, spinners, formatting
│   ├── ai/          # Provider-agnostic AI adapter
│   ├── import/      # History parser + normalizer
│   ├── workflows/   # Workflow detection + execution
│   ├── repos/       # Git repo detection
│   ├── tools/       # Tool scanners (brew, npm, cargo, pip…)
│   ├── errors/      # Error signature matching
│   └── sync/        # Sync adapter interface (Phase 2)
├── tests/           # 202+ unit tests
├── landing/         # Marketing site (Astro + Tailwind)
└── scripts/         # Build + demo helpers
```

## Performance

| Operation | 100 commands | 1K | 10K | 100K |
|-----------|-------------|----|-----|------|
| Hook capture | ~0ms | ~0ms | — | — |
| FTS search | ~0ms | ~0ms | 0–1ms | **4–15ms** |
| Keyword fallback | ~0ms | ~0ms | ~3ms | **27–30ms** |
| `recall recent` (limit 20) | ~0ms | ~1ms | ~7ms | **~70ms** |
| Import throughput | 20K/s | 20K/s | 20K/s | — |

## Why Recall?

| Tool | Great at | Recall's edge |
|------|----------|--------------|
| `history \| fzf` | Fast fuzzy search | **Repo-aware context** — project memory, not just strings |
| Atuin | Cross-machine sync | **Local-first by default** + project-centered design |
| ripgrep | Searching written docs | **Captures actual executions** automatically |
| AI agents | Generating commands | **Truthful record** of what actually happened |

## Recall vs Atuin

Both tools capture shell history with context. They solve different primary jobs.

| | **Atuin** | **Recall** |
|---|-----------|------------|
| **Primary job** | Sync history across machines | Remember what you did **in this project** |
| **Search** | Excellent TUI + fuzzy | Keyword/FTS + `recall pick` |
| **Sync** | Free E2EE hosted sync | Local-only (no sync yet) |
| **Project memory** | Directory filter | `recall project` — startup patterns, failures, workflows |
| **Unique features** | Stats, sync | Forgotten tools, workflow detection, MCP server |
| **AI** | Atuin AI | `recall ask` (BYOK, keyword fallback) |

**Use Atuin** if you need history on every machine. **Use Recall** if you need repo context, workflow patterns, and agent memory. Many developers use both.

## Roadmap

| Phase | Status | Focus |
|-------|--------|-------|
| **1 — Memory** | ✅ Live | Shell capture, search, project context |
| **2 — Discovery** | ✅ Live | Tool scanning, forgotten tools, digest |
| **3 — Workflows** | ✅ Live | Sequence detection, replay |
| **4 — AI** | ✅ Live | Semantic search (opt-in, bring your own key) |
| **5 — Team** | 🔜 Planned | Shared workflows, onboarding packs |

## Contributing

```bash
bun test              # 205+ tests
bun run lint          # tsc --noEmit
bun run build         # Compile to bin/recall
```

Open an issue or PR. All contributions welcome.

## License

MIT — see [LICENSE](LICENSE).

---

Built with Bun, TypeScript, and a terminal obsession.
