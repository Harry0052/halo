import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { readSessionUser } from "@/lib/auth/session";
import { respondToChallenge } from "@/lib/challenges/respond";
import { onlyKeys, relyingParty } from "@/lib/credentials/rp";
import { getDb } from "@/lib/db/client";
import { jsonError, sameOrigin } from "@/lib/http";
import { logFailure } from "@/lib/observability";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return jsonError(403, "origin", "Open Halo in this browser and try again.");
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "json", "Halo could not read that answer.");
  }
  if (!onlyKeys(payload, ["decision", "assertion"])) {
    return jsonError(400, "invalid", "Halo will not accept another person's id in this answer.");
  }
  const decision = (payload as { decision?: unknown }).decision;
  const assertion = (payload as { assertion?: AuthenticationResponseJSON }).assertion;
  if ((decision !== "confirm" && decision !== "deny") || !assertion?.response?.clientDataJSON || !assertion.response.signature) {
    return jsonError(400, "invalid", "Choose confirm or deny, then use your passkey.");
  }
  const { id } = await context.params;
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) return jsonError(404, "not_found", "That check is not on this server.");
  try {
    const answered = await respondToChallenge(db, user.id, id, assertion, relyingParty(request));
    if (!answered.ok) {
      const status = answered.message.includes("not on this server") ? 404 : 400;
      return jsonError(status, "answer", answered.message);
    }
    return Response.json({ challenge: answered.challenge });
  } catch (error) {
    logFailure({ scope: "challenge", code: "answer_failed", detail: error instanceof Error ? error.name : "error" });
    return jsonError(500, "answer", "Halo could not record that answer. Nothing was confirmed.");
  }
}
