/**
 * MCP Server for Recall
 *
 * Exposes Recall's command memory as MCP tools for Claude Code, Cursor, and
 * other MCP-compatible AI assistants.
 *
 * Each tool shells out to `recall <command> --json`, capturing the already-
 * standardized JSON output. This avoids duplicating business logic.
 *
 * Usage:
 *   recall mcp                             # Start stdio server
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

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { resolveRecallBinary } from './binary.ts';

// ─── Tool Definitions ──────────────────────────────────────────────────────

interface ToolDefinition {
  tool: Tool;
  handler: (args: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>;
}

const tools: ToolDefinition[] = [
  // ── recall_search ─────────────────────────────────────────────────────
  {
    tool: {
      name: 'recall_search',
      description: 'Search your terminal command history by keyword. Returns matching commands with repo context, timestamps, and exit codes.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search keyword or phrase (e.g., "docker", "git push", "npm test")',
          },
          limit: {
            type: 'number',
            description: 'Maximum results to return (default: 20)',
            default: 20,
          },
        },
        required: ['query'],
      },
    },
    handler: async (args) => {
      const query = String(args.query ?? '');
      const extraArgs: string[] = ['--json'];
      if (args.limit) extraArgs.push('--limit', String(args.limit));
      const result = runRecall('search', query, ...extraArgs);
      return { content: [{ type: 'text', text: result }] };
    },
  },

  // ── recall_recent ─────────────────────────────────────────────────────
  {
    tool: {
      name: 'recall_recent',
      description: 'List recently executed terminal commands with repo context, timestamps, exit codes, and durations.',
      inputSchema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Number of recent commands to show (default: 20)',
            default: 20,
          },
          repo: {
            type: 'string',
            description: 'Filter by repo path hash (get from recall_project output)',
          },
        },
      },
    },
    handler: async (args) => {
      const extraArgs: string[] = [];
      if (args.limit) extraArgs.push('--limit', String(args.limit));
      if (args.repo) extraArgs.push('--repo', String(args.repo));
      const result = runRecall('recent', '--json', ...extraArgs);
      return { content: [{ type: 'text', text: result }] };
    },
  },

  // ── recall_project ────────────────────────────────────────────────────
  {
    tool: {
      name: 'recall_project',
      description: 'Get rich project context for the current git repository: recent commands, startup patterns, detected workflows, and failed commands. Call this when you need to understand how a project is run.',
      inputSchema: {
        type: 'object',
        properties: {
          repo_path: {
            type: 'string',
            description: 'Absolute path to the git repository (defaults to cwd)',
          },
        },
      },
    },
    handler: async () => {
      const result = runRecall('project', '--json');
      return { content: [{ type: 'text', text: result }] };
    },
  },

  // ── recall_doctor ─────────────────────────────────────────────────────
  {
    tool: {
      name: 'recall_doctor',
      description: 'Diagnose Recall installation: check if the binary, database, shell hook, and AI provider are properly configured.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    handler: async () => {
      const result = runRecall('doctor', '--json');
      return { content: [{ type: 'text', text: result }] };
    },
  },

  // ── recall_workflows ──────────────────────────────────────────────────
  {
    tool: {
      name: 'recall_workflows',
      description: 'Detect and list repeated command sequences across sessions. Useful for identifying common workflows like "commit → push → deploy".',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    handler: async () => {
      const result = runRecall('workflows', '--json');
      return { content: [{ type: 'text', text: result }] };
    },
  },

  // ── recall_forgotten_tools ────────────────────────────────────────────
  {
    tool: {
      name: 'recall_forgotten_tools',
      description: 'Find tools installed on the system (brew, npm, cargo, etc.) that you haven\'t used recently. Recommends modern alternatives when available.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    handler: async () => {
      const result = runRecall('forgotten-tools', '--json');
      return { content: [{ type: 'text', text: result }] };
    },
  },

  // ── recall_digest ─────────────────────────────────────────────────────
  {
    tool: {
      name: 'recall_digest',
      description: 'Weekly summary of terminal activity: most-used commands, forgotten tools, and repeated errors.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    handler: async () => {
      const result = runRecall('digest', '--json');
      return { content: [{ type: 'text', text: result }] };
    },
  },

  // ── recall_fix ────────────────────────────────────────────────────────
  {
    tool: {
      name: 'recall_fix',
      description: 'Find known fixes for recent command failures. Returns the error, the fix command, and confidence score.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    handler: async () => {
      const result = runRecall('fix', '--json');
      return { content: [{ type: 'text', text: result }] };
    },
  },

  // ── recall_config ─────────────────────────────────────────────────────
  {
    tool: {
      name: 'recall_config',
      description: 'View Recall configuration settings including capture state, AI provider, and ignore patterns.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    handler: async () => {
      const result = runRecall('config', '--json');
      return { content: [{ type: 'text', text: result }] };
    },
  },
];

// ─── Helper: shell out to recall binary ────────────────────────────────────

function runRecall(...args: string[]): string {
  const binary = resolveRecallBinary();

  // Handle dev mode: 'bun run src/index.ts' needs to be split into ['bun', 'run', 'src/index.ts']
  const cmd = binary.includes(' ') ? binary.split(' ') : [binary];

  // Ensure NO_COLOR is set so output is always clean JSON
  const env = { ...process.env, NO_COLOR: '1' };

  const proc = Bun.spawnSync([...cmd, ...args], {
    env,
    cwd: process.cwd(),
  });

  if (proc.exitCode !== 0) {
    const stderr = proc.stderr.toString().trim();
    throw new Error(`recall ${args.filter(a => !a.startsWith('--')).join(' ')} failed: ${stderr || 'unknown error'}`);
  }

  return proc.stdout.toString().trim();
}

// ─── Server Lifecycle ──────────────────────────────────────────────────────

const SERVER_INFO = {
  name: 'recall-mcp',
  version: '0.1.0',
};

export async function startMcpServer(): Promise<void> {
  const server = new Server(SERVER_INFO, {
    capabilities: { tools: {} },
  });

  // ── List tools ───────────────────────────────────────────────────────
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map(t => t.tool),
  }));

  // ── Call tool ────────────────────────────────────────────────────────
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find(t => t.tool.name === request.params.name);
    if (!tool) {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }

    try {
      return await tool.handler(request.params.arguments ?? {});
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  // ── Graceful shutdown ────────────────────────────────────────────────
  const shutdown = async () => {
    await server.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // ── Connect ───────────────────────────────────────────────────────────
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
