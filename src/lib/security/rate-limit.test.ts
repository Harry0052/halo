import { describe, expect, it } from "vitest";
import { createTestDb } from "@/lib/db/client";
import { consumeRateLimit } from "./rate-limit";

describe("rate limit", () => {
  it("blocks the request after the window is full", () => {
    const db = createTestDb();
    const now = Date.parse("2026-11-18T21:00:00.000Z");
    expect(consumeRateLimit(db, "challenge:user", 2, 60_000, now)).toBe(true);
    expect(consumeRateLimit(db, "challenge:user", 2, 60_000, now + 1000)).toBe(true);
    expect(consumeRateLimit(db, "challenge:user", 2, 60_000, now + 2000)).toBe(false);
    expect(consumeRateLimit(db, "challenge:user", 2, 60_000, now + 61_000)).toBe(true);
  });
});
