import { randomUUID } from "node:crypto";
import type { HaloDb } from "@/lib/db/client";
import { securityEvents } from "@/lib/db/schema";
import { nowIso } from "@/lib/time";

const FORBIDDEN_KEYS = new Set([
  "purpose",
  "token",
  "email",
  "phone",
  "ip",
  "nonce",
  "secret",
  "password",
  "signature",
  "publickey",
  "public_key",
]);

export type SafeMetadata = Record<string, string | number | boolean | null>;

export function safeMetadata(input: SafeMetadata): SafeMetadata {
  const clean: SafeMetadata = {};
  for (const [key, value] of Object.entries(input)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) continue;
    if (typeof value === "string") clean[key] = value.slice(0, 80);
    else clean[key] = value;
  }
  return clean;
}

export function recordEvent(db: HaloDb, userId: string | null, kind: string, metadata: SafeMetadata = {}) {
  db.insert(securityEvents)
    .values({
      id: randomUUID(),
      userId,
      kind,
      metadataJson: JSON.stringify(safeMetadata(metadata)),
      createdAt: nowIso(),
    })
    .run();
}
