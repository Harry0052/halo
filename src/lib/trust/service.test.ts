import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createMemberRecord } from "@/lib/auth/users";
import { createTestDb } from "@/lib/db/client";
import { trustInvitations } from "@/lib/db/schema";
import { seedDemo } from "@/lib/db/seed";
import { SAMPLE_JORDAN_ID } from "@/lib/trust/sample";
import { acceptInvite, canReceiveChallenge, createInvite, previewInvite, revokeInvite } from "./service";

function member(name: string) {
  const db = createTestDb();
  const created = createMemberRecord(db, name);
  if (!created.ok) throw new Error(created.message);
  return { db, user: created.user };
}

describe("trusted circle", () => {
  it("does not let an unaccepted contact receive a challenge", () => {
    const { db, user: owner } = member("Alex Rivera");
    const other = createMemberRecord(db, "Jordan Lee");
    if (!other.ok) throw new Error(other.message);
    const invite = createInvite(db, owner.id, new Date("2026-11-18T12:00:00.000Z"));
    if (!invite.ok) throw new Error(invite.message);

    expect(canReceiveChallenge(db, owner.id, other.user.id)).toBe(false);
    expect(canReceiveChallenge(db, other.user.id, owner.id)).toBe(false);

    const stored = db.select().from(trustInvitations).all();
    expect(JSON.stringify(stored).includes(invite.token)).toBe(false);

    const accepted = acceptInvite(db, invite.token, other.user.id, new Date("2026-11-18T12:05:00.000Z"));
    expect(accepted.ok).toBe(true);
    expect(canReceiveChallenge(db, owner.id, other.user.id)).toBe(true);
    expect(canReceiveChallenge(db, other.user.id, owner.id)).toBe(true);
    expect(canReceiveChallenge(db, owner.id, owner.id)).toBe(false);
  });

  it("uses the same invalid message for a bad, expired, revoked, or reused link", () => {
    const { db, user: owner } = member("Alex Rivera");
    const other = createMemberRecord(db, "Jordan Lee");
    if (!other.ok) throw new Error(other.message);
    const now = new Date("2026-11-18T12:00:00.000Z");
    const invite = createInvite(db, owner.id, now);
    if (!invite.ok) throw new Error(invite.message);

    const garbage = previewInvite(db, "not-a-real-invite-token", other.user.id, now);
    db.update(trustInvitations)
      .set({ expiresAt: "2026-11-17T12:00:00.000Z" })
      .where(eq(trustInvitations.id, invite.invitationId))
      .run();
    const expired = acceptInvite(db, invite.token, other.user.id, now);
    expect(garbage.ok).toBe(false);
    expect(expired.ok).toBe(false);
    if (!garbage.ok && !expired.ok) expect(garbage.message).toBe(expired.message);

    const fresh = createInvite(db, owner.id, now);
    if (!fresh.ok) throw new Error(fresh.message);
    expect(revokeInvite(db, other.user.id, fresh.invitationId, now).ok).toBe(false);
    expect(revokeInvite(db, owner.id, fresh.invitationId, now).ok).toBe(true);
    const revoked = acceptInvite(db, fresh.token, other.user.id, now);
    expect(revoked.ok).toBe(false);
    if (!revoked.ok && !garbage.ok) expect(revoked.message).toBe(garbage.message);
    expect(canReceiveChallenge(db, owner.id, other.user.id)).toBe(false);
  });

  it("refuses a sample contact and the owner's own invite", () => {
    const { db, user: owner } = member("Alex Rivera");
    seedDemo(db);
    expect(canReceiveChallenge(db, owner.id, SAMPLE_JORDAN_ID)).toBe(false);
    const invite = createInvite(db, owner.id);
    if (!invite.ok) throw new Error(invite.message);
    const own = acceptInvite(db, invite.token, owner.id);
    expect(own.ok).toBe(false);
    if (!own.ok) expect(own.message).toMatch(/other person/i);
  });
});
