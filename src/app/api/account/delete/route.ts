import { cookies } from "next/headers";
import { deleteAccount } from "@/lib/account/privacy";
import { readSessionUser, SESSION_COOKIE } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { jsonError, requestIsSecure, sameOrigin } from "@/lib/http";
import { logFailure } from "@/lib/observability";
import { z } from "zod";

const schema = z.object({ confirm: z.literal("delete my halo data") }).strict();

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError(403, "origin", "Open Halo in this browser and try again.");
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "json", "Halo could not read that request.");
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return jsonError(400, "invalid", "Type delete my halo data to confirm. Nothing was deleted.");
  }
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) return jsonError(401, "auth", "Save your name before deleting data.");
  try {
    const deleted = deleteAccount(db, user.id);
    if (!deleted.ok) return jsonError(400, "delete", deleted.message);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      secure: requestIsSecure(request),
    });
    return Response.json({ ok: true });
  } catch (error) {
    logFailure({ scope: "account", code: "delete_failed", detail: error instanceof Error ? error.name : "error" });
    return jsonError(500, "delete", "Halo could not delete that data. Try again.");
  }
}
