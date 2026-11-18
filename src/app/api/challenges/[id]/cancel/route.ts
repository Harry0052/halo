import { readSessionUser } from "@/lib/auth/session";
import { cancelChallenge } from "@/lib/challenges/service";
import { getDb } from "@/lib/db/client";
import { jsonError, sameOrigin } from "@/lib/http";
import { logFailure } from "@/lib/observability";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return jsonError(403, "origin", "Open Halo in this browser and try again.");
  const { id } = await context.params;
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) return jsonError(404, "not_found", "That check is not on this server.");
  try {
    const cancelled = cancelChallenge(db, id, user.id);
    if (!cancelled.ok) return jsonError(409, "finished", cancelled.message);
    return Response.json({ challenge: cancelled.challenge });
  } catch (error) {
    logFailure({ scope: "challenge", code: "cancel_failed", detail: error instanceof Error ? error.name : "error" });
    return jsonError(500, "cancel_failed", "Halo could not cancel that check. Refresh and look again.");
  }
}
