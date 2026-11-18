import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import type { HaloDb } from "@/lib/db/client";
import { challenges, trustEdges, users } from "@/lib/db/schema";
import {
  SAMPLE_ALEX_ID,
  SAMPLE_CHALLENGE_ID,
  SAMPLE_EDGE_ALEX_JORDAN,
  SAMPLE_EDGE_JORDAN_ALEX,
  SAMPLE_JORDAN_ID,
} from "@/lib/trust/sample";

const SEEDED_AT = "2026-11-18T15:00:00.000Z";

export function seedDemo(db: HaloDb) {
  const existing = db.select().from(users).where(eq(users.id, SAMPLE_ALEX_ID)).get();
  if (!existing) {
  db.insert(users)
    .values([
      {
        id: SAMPLE_ALEX_ID,
        displayName: "Alex (sample)",
        kind: "demo",
        textScale: "1",
        contrast: "standard",
        createdAt: SEEDED_AT,
      },
      {
        id: SAMPLE_JORDAN_ID,
        displayName: "Jordan (sample)",
        kind: "demo",
        textScale: "1",
        contrast: "standard",
        createdAt: SEEDED_AT,
      },
    ])
    .run();
  }

  const edge = db.select().from(trustEdges).where(eq(trustEdges.id, SAMPLE_EDGE_ALEX_JORDAN)).get();
  if (!edge) {
  db.insert(trustEdges)
    .values([
      {
        id: SAMPLE_EDGE_ALEX_JORDAN,
        requesterId: SAMPLE_ALEX_ID,
        contactId: SAMPLE_JORDAN_ID,
        status: "accepted",
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
      },
      {
        id: SAMPLE_EDGE_JORDAN_ALEX,
        requesterId: SAMPLE_JORDAN_ID,
        contactId: SAMPLE_ALEX_ID,
        status: "accepted",
        createdAt: SEEDED_AT,
        updatedAt: SEEDED_AT,
      },
    ])
    .run();
  }

  const sampleCheck = db.select().from(challenges).where(eq(challenges.id, SAMPLE_CHALLENGE_ID)).get();
  if (!sampleCheck) {
    db.insert(challenges)
      .values({
        id: SAMPLE_CHALLENGE_ID,
        requesterId: SAMPLE_ALEX_ID,
        contactId: SAMPLE_JORDAN_ID,
        purpose: "Sample: a caller asked for gift cards and said they were Jordan.",
        nonceHash: createHash("sha256").update("halo-sample-nonce").digest("hex"),
        code: "SAMP-LE00",
        expiresAt: "2099-01-01T00:00:00.000Z",
        status: "pending",
        idempotencyKey: "sample-challenge",
        createdAt: SEEDED_AT,
        resolvedAt: null,
      })
      .run();
  }
}
