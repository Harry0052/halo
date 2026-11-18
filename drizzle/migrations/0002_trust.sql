CREATE TABLE trust_invitations (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users (id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  accepted_by TEXT REFERENCES users (id),
  revoked_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX trust_invitations_owner_idx ON trust_invitations (owner_id, created_at);

CREATE TABLE trust_edges (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL REFERENCES users (id),
  contact_id TEXT NOT NULL REFERENCES users (id),
  status TEXT NOT NULL CHECK (status IN ('accepted', 'blocked', 'removed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (requester_id, contact_id)
);

CREATE INDEX trust_edges_requester_idx ON trust_edges (requester_id, status);
CREATE INDEX trust_edges_contact_idx ON trust_edges (contact_id, status);
