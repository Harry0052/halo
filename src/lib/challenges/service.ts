import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { recordEvent } from "@/lib/audit";
import { statusReason, statusWord, type ChallengeStatus } from "@/lib/challenges/display";
import type { HaloDb } from "@/lib/db/client";
import { challenges, users } from "@/lib/db/schema";
import { addMinutes, isPast, nowIso } from "@/lib/time";
import { canReceiveChallenge } from "@/lib/trust/service";
import { SAMPLE_CHALLENGE_ID } from "@/lib/trust/sample";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const NOT_FOUND = "That check is not on this server.";

export type ChallengeView = {
  id: string;
  role: "requester" | "contact";
  purpose: string;
  code: string;
  status: ChallengeStatus;
  statusWord: "Pending" | "Confirmed" | "Could not verify";
  reason: string;
  expiresAt: string;
  createdAt: string;
  resolvedAt: string | null;
  requesterName: string;
  contactName: string;
  sample: boolean;
};

function shortCode() {
  const bytes = randomBytes(8);
  let raw = "";
  for (const byte of bytes) raw += ALPHABET[byte % ALPHABET.length];
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

function nonceHash() {
  return createHash("sha256").update(randomBytes(32)).digest("hex");
}

function expireIfNeeded(db: HaloDb, row: typeof challenges.$inferSelect, now: Date) {
  if (row.status === "pending" && isPast(row.expiresAt, now)) {
    const resolvedAt = nowIso(now);
    db.update(challenges)
      .set({ status: "expired", resolvedAt })
      .where(and(eq(challenges.id, row.id), eq(challenges.status, "pending")))
      .run();
    recordEvent(db, row.requesterId, "challenge_expired", { challengeId: row.id });
    return { ...row, status: "expired", resolvedAt };
  }
  return row;
}

function viewFor(
  db: HaloDb,
  row: typeof challenges.$inferSelect,
  viewerId: string | null,
): ChallengeView | null {
  if (viewerId && viewerId !== row.requesterId && viewerId !== row.contactId) return null;
  const requester = db.select().from(users).where(eq(users.id, row.requesterId)).get();
  const contact = db.select().from(users).where(eq(users.id, row.contactId)).get();
  if (!requester || !contact) return null;
  const status = row.status as ChallengeStatus;
  return {
    id: row.id,
    role: viewerId === row.contactId ? "contact" : "requester",
    purpose: row.purpose,
    code: row.code,
    status,
    statusWord: statusWord(status),
    reason: statusReason(status),
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    resolvedAt: row.resolvedAt,
    requesterName: requester.displayName,
    contactName: contact.displayName,
    sample: row.id === SAMPLE_CHALLENGE_ID || requester.kind === "demo" || contact.kind === "demo",
  };
}

export function createChallenge(
  db: HaloDb,
  requesterId: string,
  input: { contactId: string; purpose: string; expiresInMinutes: 5 | 15 | 30; idempotencyKey: string },
  now = new Date(),
) {
  const existing = db
    .select()
    .from(challenges)
    .where(and(eq(challenges.requesterId, requesterId), eq(challenges.idempotencyKey, input.idempotencyKey)))
    .get();
  if (existing) {
    if (existing.contactId !== input.contactId || existing.purpose !== input.purpose) {
      return {
        ok: false as const,
        code: "idempotent" as const,
        message: "That submit was already saved as a different check. Start again.",
      };
    }
    const view = viewFor(db, expireIfNeeded(db, existing, now), requesterId);
    if (!view) return { ok: false as const, code: "not_found" as const, message: NOT_FOUND };
    return { ok: true as const, challenge: view, reused: true };
  }
  if (!canReceiveChallenge(db, requesterId, input.contactId)) {
    return {
      ok: false as const,
      code: "not_trusted" as const,
      message: "That person is not an accepted contact.",
    };
  }
  const id = randomUUID();
  const createdAt = nowIso(now);
  db.insert(challenges)
    .values({
      id,
      requesterId,
      contactId: input.contactId,
      purpose: input.purpose,
      nonceHash: nonceHash(),
      code: shortCode(),
      expiresAt: addMinutes(createdAt, input.expiresInMinutes),
      status: "pending",
      idempotencyKey: input.idempotencyKey,
      createdAt,
      resolvedAt: null,
    })
    .run();
  recordEvent(db, requesterId, "challenge_created", { challengeId: id });
  const row = db.select().from(challenges).where(eq(challenges.id, id)).get();
  if (!row) return { ok: false as const, code: "not_found" as const, message: NOT_FOUND };
  const view = viewFor(db, row, requesterId);
  if (!view) return { ok: false as const, code: "not_found" as const, message: NOT_FOUND };
  return { ok: true as const, challenge: view, reused: false };
}

export function readChallenge(db: HaloDb, challengeId: string, viewerId: string, now = new Date()) {
  const row = db.select().from(challenges).where(eq(challenges.id, challengeId)).get();
  if (!row || (row.requesterId !== viewerId && row.contactId !== viewerId)) {
    return { ok: false as const, message: NOT_FOUND };
  }
  const view = viewFor(db, expireIfNeeded(db, row, now), viewerId);
  if (!view) return { ok: false as const, message: NOT_FOUND };
  return { ok: true as const, challenge: view };
}

export function readSampleChallenge(db: HaloDb, now = new Date()) {
  const row = db.select().from(challenges).where(eq(challenges.id, SAMPLE_CHALLENGE_ID)).get();
  if (!row) return null;
  return viewFor(db, expireIfNeeded(db, row, now), null);
}

export function listChallenges(db: HaloDb, userId: string, role: "requester" | "contact", now = new Date()) {
  const rows = db
    .select()
    .from(challenges)
    .where(role === "requester" ? eq(challenges.requesterId, userId) : eq(challenges.contactId, userId))
    .orderBy(desc(challenges.createdAt))
    .all();
  return rows.flatMap((row) => {
    const view = viewFor(db, expireIfNeeded(db, row, now), userId);
    return view ? [view] : [];
  });
}

export type GateCode = "not_found" | "expired" | "used" | "passkey_required" | "sample";

/**
 * Stage 3 does not confirm a check. A pending check stays pending until a passkey
 * answer exists. Expired, cancelled, denied, and already confirmed checks are refused.
 */
export function confirmationGate(db: HaloDb, challengeId: string, actorId: string, now = new Date()) {
  const row = db.select().from(challenges).where(eq(challenges.id, challengeId)).get();
  if (!row || row.contactId !== actorId) {
    return { ok: false as const, code: "not_found" as const, message: NOT_FOUND };
  }
  const current = expireIfNeeded(db, row, now);
  if (current.id === SAMPLE_CHALLENGE_ID) {
    return { ok: false as const, code: "sample" as const, message: "Sample checks cannot be confirmed." };
  }
  const requester = db.select().from(users).where(eq(users.id, current.requesterId)).get();
  const contact = db.select().from(users).where(eq(users.id, current.contactId)).get();
  if (!requester || !contact || requester.kind === "demo" || contact.kind === "demo") {
    return { ok: false as const, code: "sample" as const, message: "Sample checks cannot be confirmed." };
  }
  if (current.status === "expired") {
    return { ok: false as const, code: "expired" as const, message: statusReason("expired") };
  }
  if (current.status !== "pending") {
    return { ok: false as const, code: "used" as const, message: "This check was already finished." };
  }
  return { ok: false as const, code: "passkey_required" as const, message: statusReason("pending") };
}

export function cancelChallenge(db: HaloDb, challengeId: string, requesterId: string, now = new Date()) {
  const row = db.select().from(challenges).where(eq(challenges.id, challengeId)).get();
  if (!row || row.requesterId !== requesterId) {
    return { ok: false as const, message: NOT_FOUND };
  }
  const current = expireIfNeeded(db, row, now);
  if (current.status === "expired") {
    return { ok: false as const, message: statusReason("expired") };
  }
  if (current.status !== "pending") {
    return { ok: false as const, message: "This check was already finished." };
  }
  const resolvedAt = nowIso(now);
  const updated = db
    .update(challenges)
    .set({ status: "cancelled", resolvedAt })
    .where(and(eq(challenges.id, challengeId), eq(challenges.status, "pending")))
    .run();
  if (updated.changes !== 1) {
    return { ok: false as const, message: "This check was already finished." };
  }
  recordEvent(db, requesterId, "challenge_cancelled", { challengeId });
  const view = readChallenge(db, challengeId, requesterId, now);
  if (!view.ok) return view;
  return { ok: true as const, challenge: view.challenge };
}
