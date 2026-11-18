import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createMemberRecord } from "@/lib/auth/users";
import { createChallenge } from "@/lib/challenges/service";
import { commitResponse, respondToChallenge } from "@/lib/challenges/respond";
import { onlyKeys } from "@/lib/credentials/rp";
import { createTestDb } from "@/lib/db/client";
import { deviceCredentials } from "@/lib/db/schema";
import { nowIso } from "@/lib/time";
import { acceptInvite, createInvite } from "@/lib/trust/service";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

function pair() {
  const db = createTestDb();
  const owner = createMemberRecord(db, "Alex Rivera");
  const contact = createMemberRecord(db, "Jordan Lee");
  const other = createMemberRecord(db, "Sam Quinn");
  if (!owner.ok || !contact.ok || !other.ok) throw new Error("members");
  const invite = createInvite(db, owner.user.id, new Date("2026-11-18T12:00:00.000Z"));
  if (!invite.ok) throw new Error(invite.message);
  if (!acceptInvite(db, invite.token, contact.user.id, new Date("2026-11-18T12:01:00.000Z")).ok) {
    throw new Error("accept");
  }
  return { db, owner: owner.user, contact: contact.user, other: other.user };
}

function enroll(db: ReturnType<typeof createTestDb>, userId: string, revokedAt: string | null = null) {
  const id = randomUUID();
  db.insert(deviceCredentials)
    .values({
      id,
      userId,
      publicKey: Buffer.from(`key-${id}`).toString("base64url"),
      counter: 0,
      transports: null,
      deviceType: "singleDevice",
      backedUp: 0,
      label: "Test passkey",
      demo: 0,
      createdAt: nowIso(),
      revokedAt,
    })
    .run();
  return id;
}

function checkFor(db: ReturnType<typeof createTestDb>, ownerId: string, contactId: string) {
  const created = createChallenge(
    db,
    ownerId,
    {
      contactId,
      purpose: "A caller asked for gift cards today.",
      expiresInMinutes: 15,
      idempotencyKey: randomUUID(),
    },
    new Date("2026-11-18T12:10:00.000Z"),
  );
  if (!created.ok) throw new Error(created.message);
  return created.challenge.id;
}

describe("credential-bound answers", () => {
  it("rejects another person's passkey and a body that names a different user", () => {
    expect(onlyKeys({ decision: "confirm", assertion: {}, userId: "someone-else" }, ["decision", "assertion"])).toBe(
      false,
    );
    const { db, owner, contact, other } = pair();
    const contactKey = enroll(db, contact.id);
    const otherKey = enroll(db, other.id);
    const id = checkFor(db, owner.id, contact.id);
    const forged = commitResponse(
      db,
      contact.id,
      { challengeId: id, decision: "confirm", credentialId: otherKey, signature: "sig", newCounter: 1 },
      new Date("2026-11-18T12:11:00.000Z"),
    );
    expect(forged.ok).toBe(false);
    const asOwner = commitResponse(
      db,
      owner.id,
      { challengeId: id, decision: "confirm", credentialId: contactKey, signature: "sig", newCounter: 1 },
      new Date("2026-11-18T12:11:00.000Z"),
    );
    expect(asOwner.ok).toBe(false);
    const revokedId = enroll(db, contact.id, nowIso());
    const revoked = commitResponse(
      db,
      contact.id,
      { challengeId: id, decision: "confirm", credentialId: revokedId, signature: "sig", newCounter: 1 },
      new Date("2026-11-18T12:11:00.000Z"),
    );
    expect(revoked.ok).toBe(false);
  });

  it("records a denial as Could not verify and refuses a second answer", async () => {
    const { db, owner, contact } = pair();
    const credentialId = enroll(db, contact.id);
    const deniedId = checkFor(db, owner.id, contact.id);
    const denied = commitResponse(
      db,
      contact.id,
      { challengeId: deniedId, decision: "deny", credentialId, signature: "sig-deny", newCounter: 1 },
      new Date("2026-11-18T12:12:00.000Z"),
    );
    expect(denied.ok && denied.challenge.status).toBe("denied");
    expect(denied.ok && denied.challenge.statusWord).toBe("Could not verify");
    const again = commitResponse(
      db,
      contact.id,
      { challengeId: deniedId, decision: "confirm", credentialId, signature: "sig-2", newCounter: 2 },
      new Date("2026-11-18T12:13:00.000Z"),
    );
    expect(again.ok).toBe(false);

    const confirmedId = checkFor(db, owner.id, contact.id);
    const confirmed = commitResponse(
      db,
      contact.id,
      { challengeId: confirmedId, decision: "confirm", credentialId, signature: "sig-ok", newCounter: 2 },
      new Date("2026-11-18T12:14:00.000Z"),
    );
    expect(confirmed.ok && confirmed.challenge.statusWord).toBe("Confirmed");
    expect(confirmed.ok && confirmed.challenge.reason.includes("does not mean they are safe")).toBe(true);

    const garbage = {
      id: credentialId,
      rawId: credentialId,
      type: "public-key",
      response: {
        clientDataJSON: Buffer.from("{}").toString("base64url"),
        authenticatorData: "aa",
        signature: "bb",
      },
      clientExtensionResults: {},
    } as AuthenticationResponseJSON;
    const unverified = await respondToChallenge(
      db,
      contact.id,
      confirmedId,
      garbage,
      { rpID: "127.0.0.1", rpName: "Halo", origin: "http://127.0.0.1:3000" },
      new Date("2026-11-18T12:15:00.000Z"),
    );
    expect(unverified.ok).toBe(false);
  });
});
