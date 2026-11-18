import { describe, expect, it } from "vitest";
import { addMinutes, formatUtc, isPast } from "./time";

describe("time", () => {
  it("formats an instant in UTC and labels the zone", () => {
    expect(formatUtc("2026-11-18T21:40:05.000Z")).toBe("18 Nov 2026, 21:40:05 UTC");
  });

  it("adds minutes on the UTC clock", () => {
    expect(addMinutes("2026-11-18T21:40:00.000Z", 15)).toBe("2026-11-18T21:55:00.000Z");
  });

  it("treats the exact expiry instant as past", () => {
    expect(isPast("2026-11-18T21:40:00.000Z", new Date("2026-11-18T21:40:00.000Z"))).toBe(true);
    expect(isPast("2026-11-18T21:40:01.000Z", new Date("2026-11-18T21:40:00.000Z"))).toBe(false);
  });
});
