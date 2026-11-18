import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { accountStillHasSecrets, deleteAccount, exportAccount } from "@/lib/account/privacy";
import { createMemberRecord, readUserByToken } from "@/lib/auth/users";
import { createChallenge, readChallenge } from "@/lib/challenges/service";
import { createTestDb } from "@/lib/db/client";
import { acceptInvite, createInvite } from "@/lib/trust/service";

describe("account privacy", () => {
  it("exports one person's checks and leaves out secrets", () => {
    const db = createTestDb();
    const owner = createMemberRecord(db, "Alex Rivera");
    const contact = createMemberRecord(db, "Jordan Lee");
    const stranger = createMemberRecord(db, "Sam Quinn");
    if (!owner.ok || !contact.ok || !stranger.ok) throw new Error("members");
    const invite = createInvite(db, owner.user.id);
    if (!invite.ok || !acceptInvite(db, invite.token, contact.user.id).ok) throw new Error("circle");
    const created = createChallenge(db, owner.user.id, {
      contactId: contact.user.id,
      purpose: "<script>alert(1)</script> was the caller's line today",
      expiresInMinutes: 15,
      idempotencyKey: randomUUID(),
    });
    if (!created.ok) throw new Error(created.message);
    expect(created.challenge.purpose).toContain("<script>alert(1)</script>");
    expect(readChallenge(db, created.challenge.id, stranger.user.id).ok).toBe(false);

    const exported = exportAccount(db, owner.user.id);
    expect(exported?.person.displayName).toBe("Alex Rivera");
    expect(exported?.checks).toHaveLength(1);
    expect(accountStillHasSecrets(exported)).toBe(false);
    expect(exportAccount(db, stranger.user.id)?.checks).toHaveLength(0);

    expect(deleteAccount(db, owner.user.id).ok).toBe(true);
    expect(readUserByToken(db, owner.token)).toBeNull();
    const stillThere = readChallenge(db, created.challenge.id, contact.user.id);
    expect(stillThere.ok && stillThere.challenge.requesterName).toBe("Deleted person");
    expect(deleteAccount(db, owner.user.id).ok).toBe(false);
  });
});
