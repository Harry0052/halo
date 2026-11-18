import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { recordEvent } from "@/lib/audit";
import type { HaloDb } from "@/lib/db/client";
import { trustEdges, trustInvitations, users } from "@/lib/db/schema";
import { addHours, isPast, nowIso } from "@/lib/time";
import { INVALID_INVITE, SAMPLE_ALEX_ID, SAMPLE_JORDAN_ID } from "@/lib/trust/sample";
import { checkInviteToken, issueInviteToken } from "@/lib/trust/tokens";

const INVITE_HOURS = 24 * 7;

export type CircleInvite = {
  id: string;
  status: "pending" | "expired";
  expiresAt: string;
  createdAt: string;
};

export type CircleContact = {
  id: string;
  displayName: string;
  status: "accepted" | "blocked" | "removed";
  sample: boolean;
};

export function createInvite(db: HaloDb, ownerId: string, now = new Date()) {
  const owner = db.select().from(users).where(eq(users.id, ownerId)).get();
  if (!owner || owner.kind !== "member") {
    return { ok: false as const, message: "Save your name on Verify before creating an invite." };
  }
  const id = randomUUID();
  const issued = issueInviteToken(id);
  const createdAt = nowIso(now);
  db.insert(trustInvitations)
    .values({
      id,
      ownerId,
      tokenHash: issued.tokenHash,
      expiresAt: addHours(createdAt, INVITE_HOURS),
      acceptedAt: null,
      acceptedBy: null,
      revokedAt: null,
      createdAt,
    })
    .run();
  recordEvent(db, ownerId, "invite_created", { invitationId: id });
  return {
    ok: true as const,
    invitationId: id,
    token: issued.token,
    expiresAt: addHours(createdAt, INVITE_HOURS),
  };
}

export function listCircle(db: HaloDb, userId: string, now = new Date()) {
  const invites = db
    .select()
    .from(trustInvitations)
    .where(eq(trustInvitations.ownerId, userId))
    .orderBy(desc(trustInvitations.createdAt))
    .all()
    .filter((row) => !row.revokedAt && !row.acceptedAt)
    .map((row): CircleInvite => ({
      id: row.id,
      status: isPast(row.expiresAt, now) ? "expired" : "pending",
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    }));

  const edges = db
    .select({ edge: trustEdges, contact: users })
    .from(trustEdges)
    .innerJoin(users, eq(users.id, trustEdges.contactId))
    .where(eq(trustEdges.requesterId, userId))
    .all();

  const contacts: CircleContact[] = edges
    .filter((row) => row.edge.status !== "removed")
    .map((row) => ({
      id: row.contact.id,
      displayName: row.contact.displayName,
      status: row.edge.status as CircleContact["status"],
      sample: row.contact.kind === "demo",
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return { invites, contacts };
}

export function samplePeople(db: HaloDb) {
  return db
    .select()
    .from(users)
    .where(eq(users.kind, "demo"))
    .all()
    .filter((row) => row.id === SAMPLE_ALEX_ID || row.id === SAMPLE_JORDAN_ID)
    .map((row) => ({ id: row.id, displayName: row.displayName }));
}

function inviteFailure() {
  return { ok: false as const, message: INVALID_INVITE };
}

export function previewInvite(db: HaloDb, token: string, viewerId: string | null, now = new Date()) {
  const checked = checkInviteToken(token);
  if (!checked.ok) return inviteFailure();
  const row = db.select().from(trustInvitations).where(eq(trustInvitations.id, checked.invitationId)).get();
  if (!row || row.tokenHash !== checked.tokenHash) return inviteFailure();
  if (row.revokedAt || row.acceptedAt || isPast(row.expiresAt, now)) return inviteFailure();
  const owner = db.select().from(users).where(eq(users.id, row.ownerId)).get();
  if (!owner || owner.kind === "deleted") return inviteFailure();
  return {
    ok: true as const,
    invitationId: row.id,
    ownerName: owner.displayName,
    own: viewerId === owner.id,
  };
}

export function acceptInvite(db: HaloDb, token: string, viewerId: string, now = new Date()) {
  const viewer = db.select().from(users).where(eq(users.id, viewerId)).get();
  if (!viewer || viewer.kind !== "member") {
    return { ok: false as const, message: "Save your name on Verify before accepting an invite." };
  }
  const preview = previewInvite(db, token, viewerId, now);
  if (!preview.ok) return preview;
  if (preview.own) {
    return {
      ok: false as const,
      message: "You created this invite. The other person opens it on their own browser.",
    };
  }
  const checked = checkInviteToken(token);
  if (!checked.ok) return inviteFailure();
  const createdAt = nowIso(now);

  const result = db.transaction((tx) => {
    const row = tx.select().from(trustInvitations).where(eq(trustInvitations.id, preview.invitationId)).get();
    if (!row || row.tokenHash !== checked.tokenHash || row.revokedAt || row.acceptedAt || isPast(row.expiresAt, now)) {
      return inviteFailure();
    }
    const owner = tx.select().from(users).where(eq(users.id, row.ownerId)).get();
    if (!owner || owner.kind !== "member") return inviteFailure();
    const blocked = tx
      .select()
      .from(trustEdges)
      .where(
        and(
          eq(trustEdges.status, "blocked"),
          eq(trustEdges.requesterId, owner.id),
          eq(trustEdges.contactId, viewer.id),
        ),
      )
      .get();
    const blockedBack = tx
      .select()
      .from(trustEdges)
      .where(
        and(
          eq(trustEdges.status, "blocked"),
          eq(trustEdges.requesterId, viewer.id),
          eq(trustEdges.contactId, owner.id),
        ),
      )
      .get();
    if (blocked || blockedBack) return inviteFailure();

    const upsert = (requesterId: string, contactId: string) => {
      tx.insert(trustEdges)
        .values({
          id: randomUUID(),
          requesterId,
          contactId,
          status: "accepted",
          createdAt,
          updatedAt: createdAt,
        })
        .onConflictDoUpdate({
          target: [trustEdges.requesterId, trustEdges.contactId],
          set: { status: "accepted", updatedAt: createdAt },
        })
        .run();
    };
    upsert(owner.id, viewer.id);
    upsert(viewer.id, owner.id);
    tx.update(trustInvitations)
      .set({ acceptedAt: createdAt, acceptedBy: viewer.id })
      .where(eq(trustInvitations.id, row.id))
      .run();
    return { ok: true as const, contactName: owner.displayName, contactId: owner.id };
  });

  if (result.ok) {
    recordEvent(db, viewerId, "invite_accepted", { invitationId: preview.invitationId });
    recordEvent(db, result.contactId, "invite_accepted", { invitationId: preview.invitationId });
  }
  return result;
}

export function revokeInvite(db: HaloDb, ownerId: string, invitationId: string, now = new Date()) {
  const row = db.select().from(trustInvitations).where(eq(trustInvitations.id, invitationId)).get();
  if (!row || row.ownerId !== ownerId) {
    return { ok: false as const, code: "not_found" as const, message: "That invite is not on this server." };
  }
  if (row.acceptedAt || row.revokedAt) {
    return { ok: false as const, code: "not_found" as const, message: "That invite is not on this server." };
  }
  db.update(trustInvitations)
    .set({ revokedAt: nowIso(now) })
    .where(eq(trustInvitations.id, invitationId))
    .run();
  recordEvent(db, ownerId, "invite_revoked", { invitationId });
  return { ok: true as const };
}

/**
 * A person can be asked to confirm a request only after they have accepted.
 * Demo rows are never a real contact. Pending invites do not count.
 */
export function blockContact(db: HaloDb, actorId: string, contactId: string, now = new Date()) {
  if (actorId === contactId) return { ok: false as const, message: "You cannot block yourself." };
  const contact = db.select().from(users).where(eq(users.id, contactId)).get();
  const related = db
    .select()
    .from(trustEdges)
    .where(
      and(
        eq(trustEdges.requesterId, actorId),
        eq(trustEdges.contactId, contactId),
      ),
    )
    .get();
  if (!contact || contact.kind === "demo" || !related) {
    return { ok: false as const, message: "That person is not an accepted contact." };
  }
  const updatedAt = nowIso(now);
  const setBlocked = (requesterId: string, otherId: string) => {
    db.update(trustEdges)
      .set({ status: "blocked", updatedAt })
      .where(and(eq(trustEdges.requesterId, requesterId), eq(trustEdges.contactId, otherId)))
      .run();
  };
  setBlocked(actorId, contactId);
  setBlocked(contactId, actorId);
  recordEvent(db, actorId, "contact_blocked", { contactId });
  return { ok: true as const };
}

export function canReceiveChallenge(db: HaloDb, requesterId: string, contactId: string) {
  if (!requesterId || !contactId || requesterId === contactId) return false;
  const requester = db.select().from(users).where(eq(users.id, requesterId)).get();
  const contact = db.select().from(users).where(eq(users.id, contactId)).get();
  if (!requester || !contact) return false;
  if (requester.kind !== "member" || contact.kind !== "member") return false;
  const edge = db
    .select()
    .from(trustEdges)
    .where(
      and(
        eq(trustEdges.requesterId, requesterId),
        eq(trustEdges.contactId, contactId),
        eq(trustEdges.status, "accepted"),
      ),
    )
    .get();
  return Boolean(edge);
}
