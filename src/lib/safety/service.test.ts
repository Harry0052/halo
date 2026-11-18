import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createMemberRecord } from "@/lib/auth/users";
import { createChallenge } from "@/lib/challenges/service";
import { commitResponse } from "@/lib/challenges/respond";
import { revokeCredential } from "@/lib/credentials/service";
import { createTestDb } from "@/lib/db/client";
import { abuseReports, deviceCredentials, deviceLinks } from "@/lib/db/schema";
import { consumeRateLimit, LIMITS } from "@/lib/security/rate-limit";
import { nowIso } from "@/lib/time";
import { acceptInvite, blockContact, canReceiveChallenge, createInvite } from "@/lib/trust/service";
import { createDeviceLink, fileReport, redeemDeviceLink } from "./service";

describe("recovery and abuse", () => {
  it("stops a revoked passkey and a blocked contact, and a spammer hits the limit", () => {
    const db = createTestDb();
    const owner = createMemberRecord(db, "Alex Rivera");
    const contact = createMemberRecord(db, "Jordan Lee");
    if (!owner.ok || !contact.ok) throw new Error("members");
    const invite = createInvite(db, owner.user.id);
    if (!invite.ok) throw new Error(invite.message);
    if (!acceptInvite(db, invite.token, contact.user.id).ok) throw new Error("accept");
    const credentialId = randomUUID();
    db.insert(deviceCredentials)
      .values({
        id: credentialId,
        userId: contact.user.id,
        publicKey: Buffer.from("key").toString("base64url"),
        counter: 0,
        transports: null,
        deviceType: null,
        backedUp: 0,
        label: "This device",
        demo: 0,
        createdAt: nowIso(),
        revokedAt: null,
      })
      .run();
    expect(revokeCredential(db, owner.user.id, credentialId).ok).toBe(false);
    expect(revokeCredential(db, contact.user.id, credentialId).ok).toBe(true);
    const created = createChallenge(db, owner.user.id, {
      contactId: contact.user.id,
      purpose: "A caller asked for gift cards today.",
      expiresInMinutes: 15,
      idempotencyKey: randomUUID(),
    });
    if (!created.ok) throw new Error(created.message);
    const revoked = commitResponse(db, contact.user.id, {
      challengeId: created.challenge.id,
      decision: "confirm",
      credentialId,
      signature: "sig",
      newCounter: 1,
    });
    expect(revoked.ok).toBe(false);
    expect(created.challenge.status).toBe("pending");

    expect(blockContact(db, owner.user.id, contact.user.id).ok).toBe(true);
    expect(canReceiveChallenge(db, owner.user.id, contact.user.id)).toBe(false);
    const afterBlock = createChallenge(db, owner.user.id, {
      contactId: contact.user.id,
      purpose: "A caller asked for gift cards today.",
      expiresInMinutes: 15,
      idempotencyKey: randomUUID(),
    });
    expect(afterBlock.ok).toBe(false);
    const freshKey = randomUUID();
    db.insert(deviceCredentials)
      .values({
        id: freshKey,
        userId: contact.user.id,
        publicKey: Buffer.from("fresh").toString("base64url"),
        counter: 0,
        transports: null,
        deviceType: null,
        backedUp: 0,
        label: "Replacement",
        demo: 0,
        createdAt: nowIso(),
        revokedAt: null,
      })
      .run();
    const blockedAnswer = commitResponse(db, contact.user.id, {
      challengeId: created.challenge.id,
      decision: "confirm",
      credentialId: freshKey,
      signature: "sig",
      newCounter: 1,
    });
    expect(blockedAnswer.ok).toBe(false);

    const now = Date.parse("2026-11-18T12:00:00.000Z");
    for (let index = 0; index < LIMITS.challenge.limit; index += 1) {
      expect(consumeRateLimit(db, "challenge:spammer", LIMITS.challenge.limit, LIMITS.challenge.windowMs, now)).toBe(
        true,
      );
    }
    expect(consumeRateLimit(db, "challenge:spammer", LIMITS.challenge.limit, LIMITS.challenge.windowMs, now)).toBe(
      false,
    );
  });

  it("stores a report and only a hash of a device-link code", () => {
    const db = createTestDb();
    const owner = createMemberRecord(db, "Alex Rivera");
    if (!owner.ok) throw new Error(owner.message);
    const report = fileReport(db, owner.user.id, { reason: "They kept sending checks I did not ask for." });
    expect(report.ok).toBe(true);
    expect(db.select().from(abuseReports).all()).toHaveLength(1);
    const link = createDeviceLink(db, owner.user.id, new Date("2026-11-18T12:00:00.000Z"));
    expect(link.ok).toBe(true);
    if (!link.ok) return;
    const stored = db.select().from(deviceLinks).all();
    expect(JSON.stringify(stored).includes(link.code)).toBe(false);
    expect(redeemDeviceLink(db, "NOPE-CODE", new Date("2026-11-18T12:01:00.000Z")).ok).toBe(false);
    const redeemed = redeemDeviceLink(db, link.code.toLowerCase(), new Date("2026-11-18T12:01:00.000Z"));
    expect(redeemed.ok && redeemed.displayName).toBe("Alex Rivera");
    expect(redeemDeviceLink(db, link.code, new Date("2026-11-18T12:02:00.000Z")).ok).toBe(false);
    expect(db.select().from(deviceLinks).where(eq(deviceLinks.userId, owner.user.id)).get()?.usedAt).toBeTruthy();
  });
});
