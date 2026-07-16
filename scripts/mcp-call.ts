#!/usr/bin/env bun
/**
 * Minimal MCP client: spawns `recall mcp` and calls one tool.
 * Usage: bun scripts/mcp-call.ts <tool_name> '<json_args>'
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { join } from 'node:path';

const [toolName, argsJson] = process.argv.slice(2);
if (!toolName) {
  console.error('Usage: bun scripts/mcp-call.ts <tool_name> [json_args]');
  process.exit(1);
}

const root = join(import.meta.dir, '..');
const transport = new StdioClientTransport({
  command: 'bun',
  args: [join(root, 'src/index.ts'), 'mcp'],
  env: process.env as Record<string, string>,
});

const client = new Client({ name: 'recall-demo-client', version: '1.0.0' }, { capabilities: {} });
await client.connect(transport);

const result = await client.callTool({
  name: toolName,
  arguments: argsJson ? JSON.parse(argsJson) : {},
});

const text = (result.content as Array<{ type: string; text?: string }>)
  .filter(c => c.type === 'text')
  .map(c => c.text)
  .join('\n');

console.log(text);
await client.close();
process.exit(0);
