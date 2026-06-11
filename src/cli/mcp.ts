/**
 * recall mcp — Start MCP server for AI tool integration
 *
 * Starts a Model Context Protocol server over stdio, exposing Recall's
 * command memory as tools for Claude Code, Cursor, and other MCP clients.
 *
 * Usage:
 *   recall mcp                              # Start server (stdio)
 *
 * Claude Desktop config:
 *   {
 *     "mcpServers": {
 *       "recall": {
 *         "command": "recall",
 *         "args": ["mcp"]
 *       }
 *     }
 *   }
 */

import { startMcpServer } from '../mcp/index.ts';

export async function handleMcp(): Promise<void> {
  try {
    await startMcpServer();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[recall] MCP server failed: ${msg}`);
    process.exit(1);
  }
}
