import { describe, expect, it } from "vitest";
import { statusReason, statusWord } from "./display";

describe("challenge status words", () => {
  it("never calls a pending check Confirmed or Verified", () => {
    expect(statusWord("pending")).toBe("Pending");
    expect(statusWord("pending")).not.toBe("Confirmed");
    expect(statusReason("pending").includes("Verified")).toBe(false);
    expect(statusReason("pending").includes("Confirmed")).toBe(false);
    expect(statusWord("expired")).toBe("Could not verify");
    expect(statusWord("cancelled")).toBe("Could not verify");
    expect(statusWord("denied")).toBe("Could not verify");
    expect(statusWord("confirmed")).toBe("Confirmed");
  });
});
