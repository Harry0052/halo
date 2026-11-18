import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createTestDb } from "@/lib/db/client";
import { sessions } from "@/lib/db/schema";
import { createMemberRecord, hashToken, readUserByToken, updateDisplayName } from "./users";

describe("members", () => {
  it("stores a hash of the session token and restores the name", () => {
    const db = createTestDb();
    const created = createMemberRecord(db, "Nora Alvarez");
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const stored = db.select().from(sessions).where(eq(sessions.userId, created.user.id)).get();
    expect(stored?.tokenHash).toBe(hashToken(created.token));
    expect(stored?.tokenHash).not.toBe(created.token);
    expect(readUserByToken(db, created.token)?.displayName).toBe("Nora Alvarez");
    expect(readUserByToken(db, "not-a-session")).toBeNull();
  });

  it("renames the same person and rejects an email-shaped name", () => {
    const db = createTestDb();
    const created = createMemberRecord(db, "Nora Alvarez");
    if (!created.ok) throw new Error(created.message);
    const renamed = updateDisplayName(db, created.user.id, "Nora A.");
    expect(renamed.ok && renamed.user.displayName).toBe("Nora A.");
    const rejected = updateDisplayName(db, created.user.id, "nora@example.com");
    expect(rejected.ok).toBe(false);
    expect(readUserByToken(db, created.token)?.displayName).toBe("Nora A.");
  });
});
