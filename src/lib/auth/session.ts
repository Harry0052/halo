import { cookies } from "next/headers";
import { createMemberRecord, readUserByToken, updateDisplayName, type PublicUser } from "@/lib/auth/users";
import type { HaloDb } from "@/lib/db/client";

export const SESSION_COOKIE = "halo_session";
const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

export async function readSessionUser(db: HaloDb): Promise<PublicUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return readUserByToken(db, token);
}

export async function saveDisplayName(db: HaloDb, displayName: string, secure: boolean) {
  const existing = await readSessionUser(db);
  if (!existing) {
    const created = createMemberRecord(db, displayName);
    if (!created.ok) return created;
    const jar = await cookies();
    jar.set(SESSION_COOKIE, created.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: THIRTY_DAYS_SECONDS,
      secure,
    });
    return { ok: true as const, user: created.user };
  }
  return updateDisplayName(db, existing.id, displayName);
}
