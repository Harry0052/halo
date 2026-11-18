import { describe, expect, it } from "vitest";
import { profileBodySchema } from "./profile";

describe("profile validation", () => {
  it("accepts a human name", () => {
    expect(profileBodySchema.safeParse({ displayName: " Nora Alvarez " }).success).toBe(true);
  });

  it("rejects an email and unknown fields", () => {
    const email = profileBodySchema.safeParse({ displayName: "nora@example.com" });
    expect(email.success).toBe(false);
    const extra = profileBodySchema.safeParse({ displayName: "Nora Alvarez", userId: "someone-else" });
    expect(extra.success).toBe(false);
  });
});
