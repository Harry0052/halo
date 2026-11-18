import { readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { jsonError, sameOrigin } from "@/lib/http";
import { logFailure } from "@/lib/observability";
import { acceptInvite } from "@/lib/trust/service";
import { confirmInviteSchema } from "@/lib/validators/trust";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError(403, "origin", "Open Halo in this browser and try again.");
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "json", "Halo could not read that form.");
  }
  const parsed = confirmInviteSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError(400, "invalid", "This invite link is not valid.");
  }
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) return jsonError(401, "auth", "Save your name on this page before accepting the invite.");
  try {
    const accepted = acceptInvite(db, parsed.data.token, user.id);
    if (!accepted.ok) return jsonError(400, "invite", accepted.message);
    return Response.json({ contactName: accepted.contactName });
  } catch (error) {
    logFailure({ scope: "trust", code: "accept_failed", detail: error instanceof Error ? error.name : "error" });
    return jsonError(500, "accept_failed", "Halo could not accept that invite. Try again.");
  }
}
