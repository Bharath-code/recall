# MCP Setup for Recall

Recall exposes your local command history to AI assistants via the [Model Context Protocol](https://modelcontextprotocol.io).

## Start the server

```bash
recall mcp
```

The server uses stdio transport. Most clients launch it as a subprocess — you do not need to run it manually.

## Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or the equivalent path on your OS:

```json
{
  "mcpServers": {
    "recall": {
      "command": "recall",
      "args": ["mcp"]
    }
  }
}
```

If `recall` is not on your PATH, use the full path to the binary:

```json
{
  "mcpServers": {
    "recall": {
      "command": "/opt/homebrew/bin/recall",
      "args": ["mcp"]
    }
  }
}
```

Restart Claude Desktop after saving.

## Cursor

In Cursor settings, add an MCP server:

- **Name:** `recall`
- **Command:** `recall`
- **Args:** `mcp`

Or add to `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "recall": {
      "command": "recall",
      "args": ["mcp"]
    }
  }
}
```

## Available tools

| Tool | Description |
|------|-------------|
| `recall_search` | Search command history by keyword |
| `recall_recent` | List recent commands |
| `recall_project` | Current repo context |
| `recall_doctor` | Installation health check |
| `recall_workflows` | Detected command sequences |
| `recall_forgotten_tools` | Installed but unused tools |
| `recall_digest` | Weekly activity summary |
| `recall_fix` | Known fixes for recent errors |
| `recall_config` | View Recall settings |

## Example prompts

- "Search my history for docker compose commands in this project"
- "What did I run recently in this repo?"
- "What tools have I installed but never used?"
- "What workflows does Recall detect for this project?"

## Privacy

MCP tools only read your local SQLite database. No data is sent to Recall's servers — there are none. AI providers only see what your client sends when you ask a question.