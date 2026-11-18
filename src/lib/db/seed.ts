import { eq } from "drizzle-orm";
import type { HaloDb } from "@/lib/db/client";
import { trustEdges, users } from "@/lib/db/schema";
import {
  SAMPLE_ALEX_ID,
  SAMPLE_EDGE_ALEX_JORDAN,
  SAMPLE_EDGE_JORDAN_ALEX,
  SAMPLE_JORDAN_ID,
} from "@/lib/trust/sample";

const SEEDED_AT = "2026-11-18T15:00:00.000Z";

export function seedDemo(db: HaloDb) {
  const existing = db.select().from(users).where(eq(users.id, SAMPLE_ALEX_ID)).get();
  if (existing) return;

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
