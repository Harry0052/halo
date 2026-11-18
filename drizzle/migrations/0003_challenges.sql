CREATE TABLE challenges (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL REFERENCES users (id),
  contact_id TEXT NOT NULL REFERENCES users (id),
  purpose TEXT NOT NULL,
  nonce_hash TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'denied', 'expired', 'cancelled')),
  idempotency_key TEXT,
  created_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE INDEX challenges_requester_idx ON challenges (requester_id, created_at);
CREATE INDEX challenges_contact_idx ON challenges (contact_id, status, created_at);
CREATE UNIQUE INDEX challenges_idempotency_idx ON challenges (requester_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
