# Recall MCP Demo — 60 Seconds

> Generated 2026-07-16

This is the real `recall_search` MCP tool, called against a live
`recall mcp` server subprocess — not a mockup.

---

## The setup (one time)

```jsonc
// .mcp.json
{ "mcpServers": { "recall": { "command": "recall", "args": ["mcp"] } } }
```

## The exchange

```
You: how do I deploy this repo?

Claude Code: [calls recall_search({ "query": "deploy", "limit": 3 })]
```

## Real tool response

```json
[
  {
    "id": 7,
    "raw_command": "./scripts/deploy.sh --env production",
    "normalized_command": "./scripts/deploy.sh --env production",
    "cwd": "~/demo-project",
    "repo_path_hash": "22e1a1773fccb748",
    "exit_code": 0,
    "duration_ms": 4100,
    "shell": "zsh",
    "stderr_output": null,
    "session_id": "mcp-demo",
    "source": "hook",
    "created_at": "2026-07-16T13:19:42.033Z"
  }
]
```

Claude Code reads the top hit — the successful `./scripts/deploy.sh
--env production` run — and answers from it, not a guess.
