-- ============================================================
-- YouTube Summarizer Agent - Turso / libSQL schema
-- Apply with: npm run db:migrate  (in backend/)
-- ============================================================

-- Users: manual (email/password) + OAuth (google/github) accounts.
-- password_hash is NULL for OAuth-only accounts.
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  name          TEXT,
  provider      TEXT NOT NULL DEFAULT 'email',   -- email | google | github
  provider_id   TEXT,
  avatar_url    TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_users_provider ON users (provider, provider_id);

-- Per-user chat sessions. `messages` is a JSON array of {role, content}.
-- `summary` stores the structured summary generated from the transcript.
CREATE TABLE IF NOT EXISTS chats (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  video_id      TEXT NOT NULL,
  video_title   TEXT,
  video_url     TEXT,
  thumbnail_url TEXT,
  channel_name  TEXT,
  transcript    TEXT NOT NULL,
  summary       TEXT NOT NULL,
  summary_tone  TEXT DEFAULT 'Bullet points',
  structured    TEXT,
  messages      TEXT NOT NULL DEFAULT '[]',
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_chats_user_updated ON chats (user_id, updated_at DESC);

-- User preferences: summary tone + UI theme.
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id    TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  tone       TEXT NOT NULL DEFAULT 'Bullet points',  -- Bullet points | Detailed | Gen-Z | Formal
  theme      TEXT NOT NULL DEFAULT 'dark',           -- dark | light
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- B2B API keys. Only the SHA-256 hash of the key is stored; the plain key
-- is shown to the owner exactly once at creation time.
CREATE TABLE IF NOT EXISTS api_keys (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  key_prefix   TEXT NOT NULL,        -- e.g. 'yt_live_a1b2...' for display
  key_hash     TEXT NOT NULL UNIQUE, -- SHA-256 hex digest
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_used_at TEXT,
  usage_count  INTEGER NOT NULL DEFAULT 0,
  revoked      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys (user_id);
