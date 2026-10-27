"""Only the backend opens SQLite. Paths do not depend on the shell directory."""
import os
import sqlite3
from pathlib import Path
from contextlib import contextmanager
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = Path(os.environ.get('APP_DB_PATH', ROOT / 'data/app.sqlite3')).resolve()

def now():
    return datetime.now(timezone.utc).isoformat()

@contextmanager
def connect(readonly=False):
    conn = sqlite3.connect(f'{DB_PATH.as_uri()}?mode=ro', uri=True) if readonly else sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys=ON')
    try:
        yield conn
        if not readonly:
            conn.commit()
    finally:
        conn.close()

def initialize():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect() as db:
        db.executescript('''
        CREATE TABLE IF NOT EXISTS conversations(id TEXT PRIMARY KEY, created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS messages(
          id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id),
          request_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL,
          created_at TEXT NOT NULL, status TEXT NOT NULL, source TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions(
          id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id),
          skill_name TEXT NOT NULL DEFAULT 'Paced Breathing (4–6)', start_time TEXT NOT NULL,
          end_time TEXT, duration_ms INTEGER, status TEXT NOT NULL, reason TEXT,
          client_duration_ms INTEGER);
        CREATE TABLE IF NOT EXISTS preferences(
          conversation_id TEXT PRIMARY KEY REFERENCES conversations(id), reduced_motion INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS retrievals(
          request_id TEXT PRIMARY KEY, proposed_sql TEXT NOT NULL, status TEXT NOT NULL, row_count INTEGER);
        CREATE TABLE IF NOT EXISTS model_calls(
          id TEXT PRIMARY KEY, host_session TEXT NOT NULL, created_at TEXT NOT NULL, purpose TEXT NOT NULL);
        ''')
        # A process restart cannot prove a previously active exercise finished.
        db.execute("UPDATE sessions SET status='interrupted', reason='server_restart' WHERE status='active'")

def require_conversation(cid):
    with connect() as db:
        return db.execute('SELECT 1 FROM conversations WHERE id=?', (cid,)).fetchone() is not None

SESSION_QUERY = "SELECT skill_name, status, duration_ms FROM sessions WHERE conversation_id = ? ORDER BY start_time DESC LIMIT 3"
MESSAGE_QUERY = "SELECT role, content FROM messages WHERE conversation_id = ? AND status = 'succeeded' ORDER BY created_at DESC LIMIT 4"
ALLOWED_QUERIES = (SESSION_QUERY, MESSAGE_QUERY)

def retrieve(proposed_sql, cid):
    # Exact allowlist is deliberately narrower than arbitrary SELECT validation.
    if proposed_sql not in ALLOWED_QUERIES:
        raise ValueError('Retrieval query is outside the reviewed allowlist')
    with connect(readonly=True) as db:
        db.execute('PRAGMA query_only=ON')
        db.set_progress_handler(lambda: 1, 10000)
        return [dict(row) for row in db.execute(proposed_sql, (cid,)).fetchall()]
