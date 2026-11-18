import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createMemberRecord } from "@/lib/auth/users";
import { cancelChallenge, confirmationGate, createChallenge, readChallenge } from "@/lib/challenges/service";
import { createTestDb } from "@/lib/db/client";
import { challenges } from "@/lib/db/schema";
import { acceptInvite, createInvite } from "@/lib/trust/service";
import { SAMPLE_JORDAN_ID } from "@/lib/trust/sample";
import { seedDemo } from "@/lib/db/seed";

function pair() {
  const db = createTestDb();
  const owner = createMemberRecord(db, "Alex Rivera");
  const contact = createMemberRecord(db, "Jordan Lee");
  if (!owner.ok || !contact.ok) throw new Error("members");
  const invite = createInvite(db, owner.user.id, new Date("2026-11-18T12:00:00.000Z"));
  if (!invite.ok) throw new Error(invite.message);
  const accepted = acceptInvite(db, invite.token, contact.user.id, new Date("2026-11-18T12:05:00.000Z"));
  if (!accepted.ok) throw new Error(accepted.message);
  return { db, owner: owner.user, contact: contact.user };
}

describe("challenge lifecycle", () => {
  it("stores a nonce hash, stays pending, and refuses an unaccepted contact", () => {
    const { db, owner, contact } = pair();
    seedDemo(db);
    const stranger = createMemberRecord(db, "Sam Quinn");
    if (!stranger.ok) throw new Error(stranger.message);
    const refused = createChallenge(db, owner.id, {
      contactId: stranger.user.id,
      purpose: "A caller asked me to buy gift cards.",
      expiresInMinutes: 15,
      idempotencyKey: randomUUID(),
    });
    expect(refused.ok).toBe(false);
    const sample = createChallenge(db, owner.id, {
      contactId: SAMPLE_JORDAN_ID,
      purpose: "A caller asked me to buy gift cards.",
      expiresInMinutes: 15,
      idempotencyKey: randomUUID(),
    });
    expect(sample.ok).toBe(false);

    const key = randomUUID();
    const created = createChallenge(
      db,
      owner.id,
      {
        contactId: contact.id,
        purpose: "A caller asked me to buy gift cards.",
        expiresInMinutes: 15,
        idempotencyKey: key,
      },
      new Date("2026-11-18T12:10:00.000Z"),
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.challenge.statusWord).toBe("Pending");
    expect(created.challenge.status).toBe("pending");
    const row = db.select().from(challenges).where(eq(challenges.id, created.challenge.id)).get();
    expect(row?.nonceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(row?.code).not.toBe(row?.nonceHash);
    expect(JSON.stringify(created.challenge).includes(row?.nonceHash ?? "missing")).toBe(false);
    expect(row && "nonce" in row).toBe(false);

    const again = createChallenge(db, owner.id, {
      contactId: contact.id,
      purpose: "A caller asked me to buy gift cards.",
      expiresInMinutes: 15,
      idempotencyKey: key,
    });
    expect(again.ok && again.reused && again.challenge.id).toBe(created.challenge.id);
    expect(readChallenge(db, created.challenge.id, stranger.user.id).ok).toBe(false);
  });

  it("refuses expired and used checks and never marks them confirmed", () => {
    const { db, owner, contact } = pair();
    const created = createChallenge(
      db,
      owner.id,
      {
        contactId: contact.id,
        purpose: "They asked me to move money today.",
        expiresInMinutes: 5,
        idempotencyKey: randomUUID(),
      },
      new Date("2026-11-18T12:00:00.000Z"),
    );
    if (!created.ok) throw new Error("create");
    const pendingGate = confirmationGate(db, created.challenge.id, contact.id, new Date("2026-11-18T12:01:00.000Z"));
    expect(pendingGate.code).toBe("passkey_required");
    expect(readChallenge(db, created.challenge.id, owner.id, new Date("2026-11-18T12:01:00.000Z")).ok).toBe(true);

    const expiredGate = confirmationGate(db, created.challenge.id, contact.id, new Date("2026-11-18T12:06:00.000Z"));
    expect(expiredGate.code).toBe("expired");
    const expired = readChallenge(db, created.challenge.id, owner.id, new Date("2026-11-18T12:06:00.000Z"));
    expect(expired.ok && expired.challenge.status).toBe("expired");
    expect(expired.ok && expired.challenge.statusWord).toBe("Could not verify");

    const second = createChallenge(
      db,
      owner.id,
      {
        contactId: contact.id,
        purpose: "They asked me to move money today.",
        expiresInMinutes: 30,
        idempotencyKey: randomUUID(),
      },
      new Date("2026-11-18T12:10:00.000Z"),
    );
    if (!second.ok) throw new Error("second");
    const cancelled = cancelChallenge(db, second.challenge.id, owner.id, new Date("2026-11-18T12:11:00.000Z"));
    expect(cancelled.ok && cancelled.challenge.status).toBe("cancelled");
    expect(cancelled.ok && cancelled.challenge.statusWord).toBe("Could not verify");
    const used = confirmationGate(db, second.challenge.id, contact.id, new Date("2026-11-18T12:12:00.000Z"));
    expect(used.code).toBe("used");
    expect(confirmationGate(db, second.challenge.id, owner.id, new Date("2026-11-18T12:12:00.000Z")).code).toBe(
      "not_found",
    );
    const statuses = db
      .select()
      .from(challenges)
      .all()
      .map((row) => row.status);
    expect(statuses).not.toContain("confirmed");
  });
});
