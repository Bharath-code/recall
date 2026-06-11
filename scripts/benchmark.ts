#!/usr/bin/env bun
/**
 * Recall Performance Benchmarks
 *
 * Measures three critical performance dimensions:
 *   1. Hook Latency   — capture + update round-trip
 *   2. Search Speed   — FTS and keyword search at various DB sizes
 *   3. Import Throughput — batch vs sequential insert rates
 *
 * Usage:
 *   bun run scripts/benchmark.ts           # Full benchmarks (10K commands)
 *   bun run scripts/benchmark.ts --quick    # Small-scale (100 commands)
 *   bun run scripts/benchmark.ts --search   # Search only
 *   bun run scripts/benchmark.ts --hook     # Hook only
 *   bun run scripts/benchmark.ts --import   # Import only
 */

import { setDb, createTestDb, closeDb, getDb } from '../src/db/index.ts';
import { insertCommand, searchCommands, searchCommandsKeyword, getRecentCommands, getCommandCount } from '../src/db/commands.ts';

// ─── Config ─────────────────────────────────────────────────────────────────

const DB_SIZES = [100, 1000, 10000, 100000];
const QUERIES_FTS = ['git status', 'npm install', 'docker compose up', 'bun test'];
const QUERIES_PARTIAL = ['install', 'git', 'docker', 'npm'];
const SEED_COMMANDS = [
  'npm install', 'npm test', 'npm run build', 'npm run dev', 'npm start',
  'git status', 'git add .', 'git commit -m "fix"', 'git push', 'git pull',
  'bun install', 'bun test', 'bun run dev', 'bun run build', 'bunx create',
  'docker ps', 'docker compose up', 'docker build', 'docker exec', 'docker logs',
  'cat package.json', 'ls -la', 'pwd', 'cd src', 'mkdir -p dist',
  'echo hello', 'grep -r foo src/', 'find . -name "*.ts"', 'cp -r dist/ release/', 'rm -rf node_modules/',
];

const args = process.argv.slice(2);
const QUICK = args.includes('--quick');
const RUN_HOOK = args.includes('--hook') || (!args.includes('--search') && !args.includes('--import'));
const RUN_SEARCH = args.includes('--search') || (!args.includes('--hook') && !args.includes('--import'));
const RUN_IMPORT = args.includes('--import') || (!args.includes('--hook') && !args.includes('--search'));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n < 1000 ? `${n}ms` : `${(n / 1000).toFixed(2)}s`;
}

function fmtThroughput(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K/s` : `${n}/s`;
}

function stats(label: string, times: number[]): void {
  const sorted = [...times].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const avg = Math.round(sorted.reduce((s, t) => s + t, 0) / sorted.length);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  console.log(`  ${label.padEnd(40)} ${fmt(min).padStart(8)} min  ${fmt(avg).padStart(8)} avg  ${fmt(max).padStart(8)} max  p50=${fmt(p50)}  p95=${fmt(p95)}  (${times.length} runs)`);
}

function seedDb(count: number): void {
  closeDb();
  setDb(createTestDb());

  const t0 = performance.now();
  for (let i = 0; i < count; i++) {
    const cmd = SEED_COMMANDS[i % SEED_COMMANDS.length];
    insertCommand({
      raw_command: `${cmd} #${i}`,
      normalized_command: cmd,
      cwd: '/tmp',
      shell: 'zsh',
      exit_code: i % 10 === 0 ? 1 : 0,
    });
  }
  const elapsed = performance.now() - t0;
  console.log(`  [DB seeded: ${count.toLocaleString()} commands in ${fmt(Math.round(elapsed))}]`);
}

function warmup(count: number = 100): void {
  const t0 = performance.now();
  for (let i = 0; i < count; i++) {
    getCommandCount();
  }
  const elapsed = performance.now() - t0;
  if (elapsed > 50) console.log(`  [Warmup: ${fmt(Math.round(elapsed))}]`);
}

// ─── 1. Hook Latency ─────────────────────────────────────────────────────────

async function benchHook(): Promise<void> {
  console.log('\n━━━ 1. Hook Latency ━━━\n');

  seedDb(100);
  warmup();

  // Measure direct function calls (no subprocess overhead)
  const N = 10;
  const cmd = SEED_COMMANDS[0];

  let times: number[] = [];

  // insertCommand only
  for (let i = 0; i < N; i++) {
    const t0 = performance.now();
    insertCommand({
      raw_command: cmd,
      normalized_command: cmd,
      cwd: '/tmp',
      shell: 'zsh',
    });
    times.push(Math.round(performance.now() - t0));
  }
  stats('insertCommand (no repo, no session)', times);

  // insertCommand with all fields
  times = [];
  for (let i = 0; i < N; i++) {
    const t0 = performance.now();
    insertCommand({
      raw_command: cmd,
      normalized_command: cmd,
      cwd: '/Users/user/project',
      repo_path_hash: 'abc123def456',
      exit_code: 0,
      duration_ms: 42,
      shell: 'zsh',
      session_id: 'bench-session',
      stderr_output: null,
    });
    times.push(Math.round(performance.now() - t0));
  }
  stats('insertCommand (all fields)', times);

  // getCommandCount
  times = [];
  for (let i = 0; i < N; i++) {
    const t0 = performance.now();
    getCommandCount();
    times.push(Math.round(performance.now() - t0));
  }
  stats('getCommandCount', times);

  // Simulate full hook pipeline with a batch
  const BATCH = 25;
  const t0 = performance.now();
  for (let i = 0; i < BATCH; i++) {
    const id = insertCommand({
      raw_command: `echo cmd-${i}`,
      normalized_command: 'echo',
      cwd: '/tmp',
      shell: 'zsh',
    });
    // Simulate update (just an UPDATE)
    getDb().prepare('UPDATE commands SET exit_code = 0, duration_ms = 5 WHERE id = ?').run(id);
  }
  const elapsed = Math.round(performance.now() - t0);
  console.log(`  Round-trip batch (${BATCH}): ${fmt(elapsed)} total  ${fmt(Math.round(elapsed / BATCH))} per cmd`);
}

// ─── 2. Search Speed ─────────────────────────────────────────────────────────

async function benchSearch(): Promise<void> {
  console.log('\n━━━ 2. Search Speed ━━━\n');

  const sizes = QUICK ? [100, 1000] : DB_SIZES;

  for (const size of sizes) {
    console.log(`──────────────────── ${size.toLocaleString()} commands ────────────────────`);
    seedDb(size);
    warmup();

    // FTS search - exact match
    for (const query of QUERIES_FTS) {
      const times: number[] = [];
      for (let r = 0; r < 3; r++) {
        const t0 = performance.now();
        searchCommands({ query, limit: 20 });
        times.push(Math.round(performance.now() - t0));
      }
      stats(`FTS: "${query}"`, times);
    }

    // FTS search - partial match (high cardinality)
    for (const query of QUERIES_PARTIAL) {
      const times: number[] = [];
      for (let r = 0; r < 3; r++) {
        const t0 = performance.now();
        searchCommands({ query, limit: 20 });
        times.push(Math.round(performance.now() - t0));
      }
      stats(`FTS: "${query}"`, times);
    }

    // Keyword LIKE fallback
    for (const query of ['install', 'git']) {
      const times: number[] = [];
      for (let r = 0; r < 3; r++) {
        const t0 = performance.now();
        searchCommandsKeyword(query, 20);
        times.push(Math.round(performance.now() - t0));
      }
      stats(`LIKE: "${query}"`, times);
    }

    // getRecentCommands
    let times: number[] = [];
    for (let r = 0; r < 3; r++) {
      const t0 = performance.now();
      getRecentCommands({ limit: 20 });
      times.push(Math.round(performance.now() - t0));
    }
    stats('getRecentCommands(20)', times);

    // getCommandCount
    times = [];
    for (let r = 0; r < 3; r++) {
      const t0 = performance.now();
      getCommandCount();
      times.push(Math.round(performance.now() - t0));
    }
    stats('getCommandCount', times);
  }
}

// ─── 3. Import Throughput ────────────────────────────────────────────────────

async function benchImport(): Promise<void> {
  console.log('\n━━━ 3. Import Throughput ━━━\n');

  const sizes = QUICK ? [100, 1000] : [1000, 10000];

  for (const n of sizes) {
    console.log(`──────────────────── ${n.toLocaleString()} commands ────────────────────`);

    // Batch insert (single transaction)
    closeDb();
    setDb(createTestDb());
    const db = getDb();

    const t0 = performance.now();
    db.transaction(() => {
      for (let i = 0; i < n; i++) {
        const cmd = SEED_COMMANDS[i % SEED_COMMANDS.length];
        insertCommand({
          raw_command: `${cmd} #${i}`,
          normalized_command: cmd,
          cwd: '/tmp',
          shell: 'zsh',
          exit_code: 0,
        });
      }
    })();
    const batchElapsed = Math.round(performance.now() - t0);
    const batchThroughput = Math.round(n / (batchElapsed / 1000));
    console.log(`  Batch (transaction):    ${fmt(batchElapsed)} total  ${fmtThroughput(batchThroughput)}`);

    // Sequential insert (no transaction)
    closeDb();
    setDb(createTestDb());

    const t1 = performance.now();
    for (let i = 0; i < n; i++) {
      const cmd = SEED_COMMANDS[i % SEED_COMMANDS.length];
      insertCommand({
        raw_command: `${cmd} #${i}`,
        normalized_command: cmd,
        cwd: '/tmp',
        shell: 'zsh',
        exit_code: 0,
      });
    }
    const seqElapsed = Math.round(performance.now() - t1);
    const seqThroughput = Math.round(n / (seqElapsed / 1000));
    console.log(`  Sequential (no tx):     ${fmt(seqElapsed)} total  ${fmtThroughput(seqThroughput)}`);
    console.log(`  Transaction speedup:    ${Math.round(seqElapsed / batchElapsed)}x`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║   Recall Performance Benchmark                      ║');
console.log(`║   ${new Date().toISOString().replace('T', ' ').slice(0, 16)}                           ║`);
console.log('╚══════════════════════════════════════════════════════╝');

if (RUN_HOOK) await benchHook();
if (RUN_SEARCH) await benchSearch();
if (RUN_IMPORT) await benchImport();

closeDb();
console.log('\n━━━ Benchmark Complete ━━━');
