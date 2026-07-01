# Recall

> **Your terminal remembers what you forget.**  
> *Local-first command memory for developers.*

[![CI](https://img.shields.io/github/actions/workflow/status/bharath/recall-cli/ci.yml?branch=main&label=CI&logo=github)](https://github.com/bharath/recall-cli/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Bun](https://img.shields.io/badge/Bun-1.2%2B-gray?logo=bun)](https://bun.sh)
![Tests](https://img.shields.io/badge/tests-205%20passing-brightgreen)

---

History is strings. **Recall is context.**

![Recall demo](assets/demo.gif)

```bash
# Search what you ran, in which project, with full context

$ recall search "docker compose"
  Found 3 matches:

   1.  docker compose up -d --env-file .env      ~/projects/api    3d ago  ✓  2.3s
   2.  docker compose logs -f --tail 100          ~/projects/web    1w ago  ✓  0.8s
   3.  docker compose -f docker.prod.yml up       ~/projects/web    2w ago  ✓  4.1s

$ recall recent --limit 3
  Recent commands:

  │  git push origin main                   ~/projects/recall    2m ago  ✓  1.2s
  │  bun test                               ~/projects/recall    5m ago  ✓  12.4s
  └─ recall search "docker prune"           ~/projects/recall   12m ago  ✓  0.3s

$ recall project
  Project context for ~/projects/recall (git repo)

  Startup commands:
  │  bun install
  │  bun run dev
  └─ bun test

  Recent failures:
  └─ docker compose up -d  exit 1  2h ago
     Last known good:
     ✓ docker compose up          2d ago
```

## Features

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

### MCP Server (Claude Code, Cursor)

Expose your command history to AI agents via Model Context Protocol:

```bash
recall mcp
```

See [docs/MCP_SETUP.md](docs/MCP_SETUP.md) for Claude Desktop and Cursor configuration.

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
