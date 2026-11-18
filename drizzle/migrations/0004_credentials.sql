CREATE TABLE device_credentials (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id),
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL,
  transports TEXT,
  device_type TEXT,
  backed_up INTEGER NOT NULL DEFAULT 0,
  label TEXT NOT NULL,
  demo INTEGER NOT NULL DEFAULT 0 CHECK (demo IN (0, 1)),
  created_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE INDEX device_credentials_user_idx ON device_credentials (user_id, created_at);

CREATE TABLE webauthn_challenges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id),
  purpose TEXT NOT NULL CHECK (purpose IN ('register', 'respond')),
  challenge TEXT NOT NULL UNIQUE,
  halo_challenge_id TEXT,
  decision TEXT,
  nonce_hash TEXT,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX webauthn_challenges_user_idx ON webauthn_challenges (user_id, purpose, created_at);

CREATE TABLE challenge_responses (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL UNIQUE REFERENCES challenges (id),
  credential_id TEXT NOT NULL REFERENCES device_credentials (id),
  signature TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('confirm', 'deny')),
  created_at TEXT NOT NULL
);
