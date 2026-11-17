-- Sliding In licence + lesson-grant service
-- Apply with:  wrangler d1 execute sliding-in --file=schema.sql --remote

CREATE TABLE IF NOT EXISTS licences (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  licence_key  TEXT NOT NULL,
  product_key  TEXT NOT NULL,
  product_name TEXT,
  variant      TEXT,
  uses         INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  UNIQUE (licence_key, product_key)
);

CREATE TABLE IF NOT EXISTS grants (
  nonce      TEXT PRIMARY KEY,
  deck       TEXT NOT NULL,
  lesson     TEXT NOT NULL,
  licence_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS redemptions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nonce      TEXT NOT NULL,
  device     TEXT,
  created_at TEXT NOT NULL
);

-- Paid payloads, encrypted under the master key. Never shipped in the app repos.
CREATE TABLE IF NOT EXISTS payloads (
  deck       TEXT PRIMARY KEY,
  ciphertext TEXT NOT NULL,
  nonce      TEXT NOT NULL,
  version    TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_grants_licence ON grants (licence_key);
CREATE INDEX IF NOT EXISTS idx_redemptions_nonce ON redemptions (nonce);
