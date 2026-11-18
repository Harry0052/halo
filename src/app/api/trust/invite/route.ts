import { readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { clientIp, jsonError, publicOrigin, sameOrigin } from "@/lib/http";
import { logFailure } from "@/lib/observability";
import { consumeRateLimit, LIMITS } from "@/lib/security/rate-limit";
import { createInvite } from "@/lib/trust/service";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError(403, "origin", "Open Halo in this browser and try again.");
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) return jsonError(401, "auth", "Save your name on Verify before creating an invite.");
  const allowed = consumeRateLimit(db, `invite:${user.id}`, LIMITS.invite.limit, LIMITS.invite.windowMs);
  const ipAllowed = consumeRateLimit(db, `invite-ip:${clientIp(request)}`, LIMITS.invite.limit, LIMITS.invite.windowMs);
  if (!allowed || !ipAllowed) {
    return jsonError(429, "rate", "Too many invite links from this browser. Wait an hour and try again.");
  }
  try {
    const created = createInvite(db, user.id);
    if (!created.ok) return jsonError(400, "invite", created.message);
    const url = `${publicOrigin(request)}/circle/invite/${encodeURIComponent(created.token)}`;
    return Response.json({
      invitationId: created.invitationId,
      url,
      expiresAt: created.expiresAt,
    });
  } catch (error) {
    logFailure({ scope: "trust", code: "invite_failed", detail: error instanceof Error ? error.name : "error" });
    return jsonError(500, "invite_failed", "Halo could not create that invite. Try again.");
  }
}
