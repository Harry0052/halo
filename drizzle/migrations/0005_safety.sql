ALTER TABLE users ADD COLUMN notify_in_app INTEGER NOT NULL DEFAULT 1 CHECK (notify_in_app IN (0, 1));

CREATE TABLE abuse_reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users (id),
  subject_user_id TEXT REFERENCES users (id),
  challenge_id TEXT,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX abuse_reports_reporter_idx ON abuse_reports (reporter_id, created_at);

CREATE TABLE device_links (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id),
  code_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);
