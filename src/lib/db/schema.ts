import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  kind: text("kind").notNull(),
  textScale: text("text_scale").notNull(),
  contrast: text("contrast").notNull(),
  notifyInApp: integer("notify_in_app").notNull().default(1),
  createdAt: text("created_at").notNull(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    tokenHash: text("token_hash").notNull().unique(),
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at").notNull(),
  },
  (table) => [index("sessions_user_idx").on(table.userId)],
);

export const securityEvents = sqliteTable(
  "security_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id),
    kind: text("kind").notNull(),
    metadataJson: text("metadata_json").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("security_events_user_idx").on(table.userId, table.createdAt)],
);

export const rateBuckets = sqliteTable("rate_buckets", {
  bucketKey: text("bucket_key").primaryKey(),
  windowStart: text("window_start").notNull(),
  count: integer("count").notNull(),
});

export const trustInvitations = sqliteTable(
  "trust_invitations",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: text("expires_at").notNull(),
    acceptedAt: text("accepted_at"),
    acceptedBy: text("accepted_by").references(() => users.id),
    revokedAt: text("revoked_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("trust_invitations_owner_idx").on(table.ownerId, table.createdAt)],
);

export const trustEdges = sqliteTable(
  "trust_edges",
  {
    id: text("id").primaryKey(),
    requesterId: text("requester_id")
      .notNull()
      .references(() => users.id),
    contactId: text("contact_id")
      .notNull()
      .references(() => users.id),
    status: text("status").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("trust_edges_pair_idx").on(table.requesterId, table.contactId),
    index("trust_edges_requester_idx").on(table.requesterId, table.status),
    index("trust_edges_contact_idx").on(table.contactId, table.status),
  ],
);

export const challenges = sqliteTable(
  "challenges",
  {
    id: text("id").primaryKey(),
    requesterId: text("requester_id")
      .notNull()
      .references(() => users.id),
    contactId: text("contact_id")
      .notNull()
      .references(() => users.id),
    purpose: text("purpose").notNull(),
    nonceHash: text("nonce_hash").notNull(),
    code: text("code").notNull(),
    expiresAt: text("expires_at").notNull(),
    status: text("status").notNull(),
    idempotencyKey: text("idempotency_key"),
    createdAt: text("created_at").notNull(),
    resolvedAt: text("resolved_at"),
  },
  (table) => [
    index("challenges_requester_idx").on(table.requesterId, table.createdAt),
    index("challenges_contact_idx").on(table.contactId, table.status, table.createdAt),
  ],
);

export const deviceCredentials = sqliteTable(
  "device_credentials",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    publicKey: text("public_key").notNull(),
    counter: integer("counter").notNull(),
    transports: text("transports"),
    deviceType: text("device_type"),
    backedUp: integer("backed_up").notNull(),
    label: text("label").notNull(),
    demo: integer("demo").notNull(),
    createdAt: text("created_at").notNull(),
    revokedAt: text("revoked_at"),
  },
  (table) => [index("device_credentials_user_idx").on(table.userId, table.createdAt)],
);

export const webauthnChallenges = sqliteTable(
  "webauthn_challenges",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    purpose: text("purpose").notNull(),
    challenge: text("challenge").notNull().unique(),
    haloChallengeId: text("halo_challenge_id"),
    decision: text("decision"),
    nonceHash: text("nonce_hash"),
    expiresAt: text("expires_at").notNull(),
    usedAt: text("used_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("webauthn_challenges_user_idx").on(table.userId, table.purpose, table.createdAt)],
);

export const abuseReports = sqliteTable(
  "abuse_reports",
  {
    id: text("id").primaryKey(),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => users.id),
    subjectUserId: text("subject_user_id").references(() => users.id),
    challengeId: text("challenge_id"),
    reason: text("reason").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("abuse_reports_reporter_idx").on(table.reporterId, table.createdAt)],
);

export const deviceLinks = sqliteTable("device_links", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  codeHash: text("code_hash").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
  createdAt: text("created_at").notNull(),
});

export const challengeResponses = sqliteTable("challenge_responses", {
  id: text("id").primaryKey(),
  challengeId: text("challenge_id")
    .notNull()
    .unique()
    .references(() => challenges.id),
  credentialId: text("credential_id")
    .notNull()
    .references(() => deviceCredentials.id),
  signature: text("signature").notNull(),
  decision: text("decision").notNull(),
  createdAt: text("created_at").notNull(),
});
