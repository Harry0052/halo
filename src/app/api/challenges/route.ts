import { readSessionUser } from "@/lib/auth/session";
import { createChallenge } from "@/lib/challenges/service";
import { getDb } from "@/lib/db/client";
import { clientIp, jsonError, sameOrigin } from "@/lib/http";
import { logFailure } from "@/lib/observability";
import { consumeRateLimit, LIMITS } from "@/lib/security/rate-limit";
import { createChallengeSchema } from "@/lib/validators/challenges";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError(403, "origin", "Open Halo in this browser and try again.");
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "json", "Halo could not read that form.");
  }
  const parsed = createChallengeSchema.safeParse(payload);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Check the form and try again.";
    const field = parsed.error.issues[0]?.path[0];
    const fields = typeof field === "string" ? { [field]: message } : undefined;
    return jsonError(400, "invalid", message, fields);
  }
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) return jsonError(401, "auth", "Save your name on Verify before asking for a check.");
  const allowed = consumeRateLimit(db, `challenge:${user.id}`, LIMITS.challenge.limit, LIMITS.challenge.windowMs);
  const ipAllowed = consumeRateLimit(
    db,
    `challenge-ip:${clientIp(request)}`,
    LIMITS.challenge.limit,
    LIMITS.challenge.windowMs,
  );
  if (!allowed || !ipAllowed) {
    return jsonError(429, "rate", "Too many checks from this browser. Wait an hour and try again.");
  }
  try {
    const created = createChallenge(db, user.id, parsed.data);
    if (!created.ok) {
      const status = created.code === "not_trusted" ? 403 : created.code === "idempotent" ? 409 : 400;
      return jsonError(status, created.code, created.message);
    }
    return Response.json({ challenge: created.challenge, reused: created.reused });
  } catch (error) {
    logFailure({ scope: "challenge", code: "create_failed", detail: error instanceof Error ? error.name : "error" });
    return jsonError(500, "create_failed", "Halo could not save that check. Try again.");
  }
}
