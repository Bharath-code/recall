import { Database } from 'bun:sqlite';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import embeddedSchemaPath from './schema.sql' with { type: 'file' };

const RECALL_DIR = join(process.env.HOME ?? homedir(), '.recall');
const DB_PATH = join(RECALL_DIR, 'recall.db');
const SCHEMA_PATH = embeddedSchemaPath;

let _db: Database | null = null;

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
}

function runMigrations(db: Database): void {
  const schemaPath = existsSync(SCHEMA_PATH)
    ? SCHEMA_PATH
    : join(import.meta.dir, 'schema.sql');

  if (!existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }

  const schema = readFileSync(schemaPath, 'utf-8');

  // Split on semicolons but preserve content inside triggers/virtual tables
  const statements = splitStatements(schema);

  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA synchronous = NORMAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');

  for (const stmt of statements) {
    const trimmed = stmt.trim();
    if (trimmed && !trimmed.startsWith('--')) {
      try {
        db.exec(trimmed);
      } catch (err) {
        // Ignore "already exists" errors during migration
        const msg = err instanceof Error ? err.message : String(err);
        const canDeferSourceIndex =
          trimmed.includes('idx_commands_source') && msg.includes('no such column: source');
        if (!msg.includes('already exists') && !canDeferSourceIndex) {
          throw err;
        }
      }
    }
  }

  applyCompatibilityMigrations(db);
}

function applyCompatibilityMigrations(db: Database): void {
  const columns = db.prepare('PRAGMA table_info(commands)').all() as { name: string }[];
  const hasSource = columns.some(column => column.name === 'source');

  if (!hasSource) {
    db.exec("ALTER TABLE commands ADD COLUMN source TEXT NOT NULL DEFAULT 'hook' CHECK(source IN ('hook', 'import'))");
    db.exec("UPDATE commands SET source = 'import' WHERE session_id IS NULL AND exit_code IS NULL AND duration_ms IS NULL");
  }

  db.exec('CREATE INDEX IF NOT EXISTS idx_commands_source ON commands(source)');
}

function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inTrigger = false;

  for (const line of sql.split('\n')) {
    const trimmed = line.trim();

    if (trimmed.startsWith('--')) {
      continue;
    }

    if (/^CREATE\s+TRIGGER/i.test(trimmed)) {
      inTrigger = true;
    }

    current += line + '\n';

    if (inTrigger && /^END;/i.test(trimmed)) {
      statements.push(current.trim());
      current = '';
      inTrigger = false;
    } else if (!inTrigger && trimmed.endsWith(';')) {
      statements.push(current.trim());
      current = '';
    }
  }

  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements;
}

export function getDb(): Database {
  if (_db) return _db;

  ensureDir(RECALL_DIR);

  _db = new Database(DB_PATH, { create: true });
  runMigrations(_db);

  return _db;
}

export function getDbPath(): string {
  return DB_PATH;
}

export function getRecallDir(): string {
  return RECALL_DIR;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

// For testing — override the singleton with an in-memory DB
export function setDb(db: Database): void {
  _db = db;
}

// For testing — use in-memory database
export function createTestDb(): Database {
  const db = new Database(':memory:');
  const schemaPath = existsSync(SCHEMA_PATH)
    ? SCHEMA_PATH
    : join(import.meta.dir, 'schema.sql');

  if (existsSync(schemaPath)) {
    const schema = readFileSync(schemaPath, 'utf-8');
    const statements = splitStatements(schema);

    db.exec('PRAGMA foreign_keys = ON');

    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (trimmed && !trimmed.startsWith('--')) {
        try {
          db.exec(trimmed);
        } catch {
          // Ignore errors in test DB setup
        }
      }
    }
    applyCompatibilityMigrations(db);
  }

  return db;
}
