import { describe, expect, it } from "vitest";
import { STATUS_WORDS } from "./status-words";

describe("status words", () => {
  it("uses Pending, Confirmed, and Could not verify, and never Verified", () => {
    expect(STATUS_WORDS.map((item) => item.word)).toEqual(["Pending", "Confirmed", "Could not verify"]);
    const blob = JSON.stringify(STATUS_WORDS);
    expect(blob.includes("Verified")).toBe(false);
    expect(STATUS_WORDS[0]?.detail.includes("Confirmed")).toBe(false);
  });
});
