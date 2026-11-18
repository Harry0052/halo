import { describe, expect, it } from "vitest";
import { checkInviteToken, hashInviteToken, issueInviteToken } from "./tokens";

describe("invite tokens", () => {
  it("accepts a token it just issued and rejects a tampered one", () => {
    const issued = issueInviteToken("00000000-0000-4000-8000-0000000000aa");
    expect(checkInviteToken(issued.token).ok).toBe(true);
    expect(issued.tokenHash).toBe(hashInviteToken(issued.token));
    expect(issued.token.includes(issued.tokenHash)).toBe(false);
    const [id, nonce, mac] = issued.token.split(".");
    expect(checkInviteToken(`${id}.${nonce}.${mac.slice(0, -2)}aa`).ok).toBe(false);
    expect(checkInviteToken("not-a-token").ok).toBe(false);
  });
});
