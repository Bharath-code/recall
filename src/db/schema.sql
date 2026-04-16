-- Recall Database Schema
-- Version: 1
-- All tables use INTEGER PRIMARY KEY for rowid alias (Bun SQLite optimization)

CREATE TABLE IF NOT EXISTS commands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raw_command TEXT NOT NULL,
  normalized_command TEXT NOT NULL,
  cwd TEXT NOT NULL,
  repo_path_hash TEXT,
  exit_code INTEGER,
  duration_ms INTEGER,
  shell TEXT NOT NULL DEFAULT 'unknown',
  stderr_output TEXT,
  session_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_commands_created_at ON commands(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commands_repo ON commands(repo_path_hash);
CREATE INDEX IF NOT EXISTS idx_commands_normalized ON commands(normalized_command);
CREATE INDEX IF NOT EXISTS idx_commands_session ON commands(session_id);
CREATE INDEX IF NOT EXISTS idx_commands_exit_code ON commands(exit_code);

-- Full-text search index for fast keyword search
CREATE VIRTUAL TABLE IF NOT EXISTS commands_fts USING fts5(
  raw_command,
  normalized_command,
  cwd,
  content='commands',
  content_rowid='id',
  tokenize='porter unicode61'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS commands_ai AFTER INSERT ON commands BEGIN
  INSERT INTO commands_fts(rowid, raw_command, normalized_command, cwd)
  VALUES (new.id, new.raw_command, new.normalized_command, new.cwd);
END;

CREATE TRIGGER IF NOT EXISTS commands_ad AFTER DELETE ON commands BEGIN
  INSERT INTO commands_fts(commands_fts, rowid, raw_command, normalized_command, cwd)
  VALUES ('delete', old.id, old.raw_command, old.normalized_command, old.cwd);
END;

CREATE TRIGGER IF NOT EXISTS commands_au AFTER UPDATE ON commands BEGIN
  INSERT INTO commands_fts(commands_fts, rowid, raw_command, normalized_command, cwd)
  VALUES ('delete', old.id, old.raw_command, old.normalized_command, old.cwd);
  INSERT INTO commands_fts(rowid, raw_command, normalized_command, cwd)
  VALUES (new.id, new.raw_command, new.normalized_command, new.cwd);
END;

-- Repos table
CREATE TABLE IF NOT EXISTS repos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_path_hash TEXT NOT NULL UNIQUE,
  repo_name TEXT NOT NULL,
  repo_root TEXT NOT NULL,
  last_opened_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  startup_commands_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_repos_hash ON repos(repo_path_hash);

-- Tools table
CREATE TABLE IF NOT EXISTS tools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_name TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL CHECK(source IN ('brew', 'npm', 'cargo', 'manual')),
  installed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_used_at TEXT,
  usage_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tools_name ON tools(tool_name);
CREATE INDEX IF NOT EXISTS idx_tools_usage ON tools(usage_count);

-- Errors table — error→fix memory graph
CREATE TABLE IF NOT EXISTS errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  error_signature TEXT NOT NULL,
  error_message TEXT,
  command_id INTEGER REFERENCES commands(id) ON DELETE SET NULL,
  fix_command_id INTEGER REFERENCES commands(id) ON DELETE SET NULL,
  fix_summary TEXT,
  confidence REAL DEFAULT 0.0,
  occurrences INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_errors_signature ON errors(error_signature);
CREATE INDEX IF NOT EXISTS idx_errors_command ON errors(command_id);

-- Workflows table — detected command sequences
CREATE TABLE IF NOT EXISTS workflows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  sequence_json TEXT NOT NULL,
  repo_path_hash TEXT,
  frequency INTEGER NOT NULL DEFAULT 1,
  confidence REAL DEFAULT 0.0,
  last_used_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_workflows_repo ON workflows(repo_path_hash);
CREATE INDEX IF NOT EXISTS idx_workflows_frequency ON workflows(frequency DESC);

-- Embeddings table — vector store for semantic search
CREATE TABLE IF NOT EXISTS embeddings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  command_id INTEGER UNIQUE REFERENCES commands(id) ON DELETE CASCADE,
  vector BLOB NOT NULL,
  model TEXT NOT NULL DEFAULT 'all-MiniLM-L6-v2',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_embeddings_command ON embeddings(command_id);

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT OR IGNORE INTO schema_version (version) VALUES (1);
