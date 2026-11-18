import { saveDisplayName } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { clientIp, jsonError, requestIsSecure, sameOrigin } from "@/lib/http";
import { logFailure } from "@/lib/observability";
import { consumeRateLimit, LIMITS } from "@/lib/security/rate-limit";
import { profileBodySchema } from "@/lib/validators/profile";

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return jsonError(403, "origin", "Open Halo in this browser and try again.");
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "json", "Halo could not read that form.");
  }
  const parsed = profileBodySchema.safeParse(payload);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Enter a name people will recognize.";
    return jsonError(400, "invalid", message, { displayName: message });
  }
  const db = getDb();
  const allowed = consumeRateLimit(
    db,
    `profile:${clientIp(request)}`,
    LIMITS.profile.limit,
    LIMITS.profile.windowMs,
  );
  if (!allowed) {
    return jsonError(429, "rate", "Too many name saves from this network. Wait an hour and try again.");
  }
  try {
    const saved = await saveDisplayName(db, parsed.data.displayName, requestIsSecure(request));
    if (!saved.ok) return jsonError(400, "invalid", saved.message, { displayName: saved.message });
    return Response.json({
      user: { id: saved.user.id, displayName: saved.user.displayName },
    });
  } catch (error) {
    logFailure({ scope: "profile", code: "save_failed", detail: error instanceof Error ? error.name : "error" });
    return jsonError(500, "save_failed", "Halo could not save that name. Try again.");
  }
}
