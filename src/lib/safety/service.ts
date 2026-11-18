import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { recordEvent } from "@/lib/audit";
import type { HaloDb } from "@/lib/db/client";
import { deviceLinks, sessions, users } from "@/lib/db/schema";
import { abuseReports } from "@/lib/db/schema";
import { addMinutes, isPast, nowIso } from "@/lib/time";
import { hashToken } from "@/lib/auth/users";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVALID_CODE = "That code is not valid.";

function linkCode() {
  const bytes = randomBytes(8);
  let raw = "";
  for (const byte of bytes) raw += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

export function setNotifications(db: HaloDb, userId: string, notifyInApp: boolean) {
  db.update(users)
    .set({ notifyInApp: notifyInApp ? 1 : 0 })
    .where(eq(users.id, userId))
    .run();
  recordEvent(db, userId, "notifications_updated", { notifyInApp });
  return { ok: true as const, notifyInApp };
}

export function fileReport(
  db: HaloDb,
  reporterId: string,
  input: { reason: string; subjectUserId?: string | null; challengeId?: string | null },
) {
  const id = randomUUID();
  db.insert(abuseReports)
    .values({
      id,
      reporterId,
      subjectUserId: input.subjectUserId ?? null,
      challengeId: input.challengeId ?? null,
      reason: input.reason,
      createdAt: nowIso(),
    })
    .run();
  recordEvent(db, reporterId, "report_filed", { reportId: id });
  return { ok: true as const, id };
}

export function createDeviceLink(db: HaloDb, userId: string, now = new Date()) {
  const code = linkCode();
  const createdAt = nowIso(now);
  db.insert(deviceLinks)
    .values({
      id: randomUUID(),
      userId,
      codeHash: createHash("sha256").update(code).digest("hex"),
      expiresAt: addMinutes(createdAt, 10),
      usedAt: null,
      createdAt,
    })
    .run();
  recordEvent(db, userId, "device_link_created", {});
  return { ok: true as const, code, expiresAt: addMinutes(createdAt, 10) };
}

export function redeemDeviceLink(db: HaloDb, code: string, now = new Date()) {
  const codeHash = createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
  const row = db.select().from(deviceLinks).where(eq(deviceLinks.codeHash, codeHash)).get();
  if (!row || row.usedAt || isPast(row.expiresAt, now)) {
    return { ok: false as const, message: INVALID_CODE };
  }
  const user = db.select().from(users).where(eq(users.id, row.userId)).get();
  if (!user || user.kind !== "member") return { ok: false as const, message: INVALID_CODE };
  const token = randomBytes(32).toString("base64url");
  const createdAt = nowIso(now);
  db.transaction((tx) => {
    const current = tx.select().from(deviceLinks).where(and(eq(deviceLinks.id, row.id), isNull(deviceLinks.usedAt))).get();
    if (!current || isPast(current.expiresAt, now)) return;
    tx.update(deviceLinks).set({ usedAt: createdAt }).where(eq(deviceLinks.id, row.id)).run();
    tx.insert(sessions)
      .values({
        id: randomUUID(),
        userId: user.id,
        tokenHash: hashToken(token),
        createdAt,
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .run();
  });
  const used = db.select().from(deviceLinks).where(eq(deviceLinks.id, row.id)).get();
  if (!used?.usedAt) return { ok: false as const, message: INVALID_CODE };
  recordEvent(db, user.id, "device_linked", {});
  return { ok: true as const, token, displayName: user.displayName };
}
