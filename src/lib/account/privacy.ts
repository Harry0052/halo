import { and, eq, or } from "drizzle-orm";
import type { HaloDb } from "@/lib/db/client";
import {
  abuseReports,
  challenges,
  deviceCredentials,
  deviceLinks,
  securityEvents,
  sessions,
  trustEdges,
  trustInvitations,
  users,
} from "@/lib/db/schema";
import { nowIso } from "@/lib/time";

export function confirmedChecksStarted(db: HaloDb, userId: string) {
  return db
    .select()
    .from(challenges)
    .where(and(eq(challenges.requesterId, userId), eq(challenges.status, "confirmed")))
    .all().length;
}

export function exportAccount(db: HaloDb, userId: string) {
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user || user.kind === "deleted") return null;
  const contacts = db
    .select({ edge: trustEdges, person: users })
    .from(trustEdges)
    .innerJoin(users, eq(users.id, trustEdges.contactId))
    .where(eq(trustEdges.requesterId, userId))
    .all()
    .map((row) => ({
      name: row.person.displayName,
      status: row.edge.status,
      updatedAt: row.edge.updatedAt,
    }));
  const checks = db
    .select()
    .from(challenges)
    .where(or(eq(challenges.requesterId, userId), eq(challenges.contactId, userId)))
    .all()
    .map((row) => ({
      id: row.id,
      role: row.requesterId === userId ? "requester" : "contact",
      purpose: row.purpose,
      code: row.code,
      status: row.status,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      resolvedAt: row.resolvedAt,
    }));
  const passkeys = db
    .select()
    .from(deviceCredentials)
    .where(eq(deviceCredentials.userId, userId))
    .all()
    .map((row) => ({
      id: row.id,
      label: row.label,
      createdAt: row.createdAt,
      revokedAt: row.revokedAt,
    }));
  const reports = db
    .select()
    .from(abuseReports)
    .where(eq(abuseReports.reporterId, userId))
    .all()
    .map((row) => ({ id: row.id, reason: row.reason, createdAt: row.createdAt }));
  return {
    exportedAt: nowIso(),
    product: "Halo",
    person: {
      id: user.id,
      displayName: user.displayName,
      createdAt: user.createdAt,
      notifyInApp: user.notifyInApp === 1,
    },
    contacts,
    checks,
    passkeys,
    reports,
    omitted: ["session tokens", "invite tokens", "nonce hashes", "passkey public keys", "signatures"],
  };
}

export function deleteAccount(db: HaloDb, userId: string) {
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user || user.kind === "deleted") return { ok: false as const, message: "That profile is already gone." };
  const now = nowIso();
  db.transaction((tx) => {
    tx.update(users)
      .set({ displayName: "Deleted person", kind: "deleted", notifyInApp: 0 })
      .where(eq(users.id, userId))
      .run();
    tx.delete(sessions).where(eq(sessions.userId, userId)).run();
    tx.update(deviceCredentials).set({ revokedAt: now }).where(eq(deviceCredentials.userId, userId)).run();
    tx.delete(deviceLinks).where(eq(deviceLinks.userId, userId)).run();
    tx.delete(abuseReports).where(eq(abuseReports.reporterId, userId)).run();
    tx.delete(trustInvitations).where(eq(trustInvitations.ownerId, userId)).run();
    tx.update(trustEdges)
      .set({ status: "removed", updatedAt: now })
      .where(or(eq(trustEdges.requesterId, userId), eq(trustEdges.contactId, userId)))
      .run();
    tx.insert(securityEvents)
      .values({
        id: crypto.randomUUID(),
        userId,
        kind: "account_deleted",
        metadataJson: "{}",
        createdAt: now,
      })
      .run();
  });
  return { ok: true as const };
}

export function accountStillHasSecrets(record: ReturnType<typeof exportAccount>) {
  const blob = JSON.stringify(record);
  return /"nonceHash"|"publicKey"|"tokenHash"|"signature"/.test(blob);
}
