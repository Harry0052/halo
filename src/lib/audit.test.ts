import { describe, expect, it } from "vitest";
import { safeMetadata } from "./audit";

describe("safe metadata", () => {
  it("drops secrets and purpose text", () => {
    expect(
      safeMetadata({
        challengeId: "abc",
        purpose: "gift cards",
        token: "secret-token",
        ip: "203.0.113.4",
        status: "pending",
      }),
    ).toEqual({ challengeId: "abc", status: "pending" });
  });
});
