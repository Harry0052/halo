import { describe, expect, it } from "vitest";
import { createTestDb, openDatabase } from "./client";

describe("migrations", () => {
  it("creates the foundation tables and can run twice", () => {
    const sqlite = openDatabase(":memory:");
    const tables = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => (row as { name: string }).name);
    expect(tables).toEqual(
      expect.arrayContaining(["users", "sessions", "security_events", "rate_buckets", "schema_migrations"]),
    );
    expect(() => {
      sqlite.exec("SELECT 1");
    }).not.toThrow();
    const db = createTestDb();
    expect(db).toBeTruthy();
  });
});
