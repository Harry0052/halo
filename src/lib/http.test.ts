import { describe, expect, it } from "vitest";
import { clientIp, jsonError, publicOrigin, sameOrigin } from "./http";

describe("http helpers", () => {
  it("rejects a missing or mismatched origin", () => {
    const ok = new Request("http://127.0.0.1:3000/api/profile", {
      headers: { origin: "http://127.0.0.1:3000", host: "127.0.0.1:3000" },
    });
    const bad = new Request("http://127.0.0.1:3000/api/profile", {
      headers: { origin: "https://evil.example", host: "127.0.0.1:3000" },
    });
    expect(sameOrigin(ok)).toBe(true);
    expect(sameOrigin(bad)).toBe(false);
  });

  it("returns a typed error body", async () => {
    const response = jsonError(400, "invalid", "Check the name.", { displayName: "Use at least 2 characters." });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "invalid",
        message: "Check the name.",
        fields: { displayName: "Use at least 2 characters." },
      },
    });
  });

  it("reads only the first forwarded address", () => {
    const request = new Request("http://127.0.0.1/api/profile", {
      headers: { "x-forwarded-for": "203.0.113.4, 10.0.0.1" },
    });
    expect(clientIp(request)).toBe("203.0.113.4");
  });

  it("builds the public origin from forwarded host and proto", () => {
    const request = new Request("http://127.0.0.1:3000/verify", {
      headers: { "x-forwarded-host": "halo.example", "x-forwarded-proto": "https" },
    });
    expect(publicOrigin(request)).toBe("https://halo.example");
  });
});
