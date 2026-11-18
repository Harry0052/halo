import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { readSessionUser } from "@/lib/auth/session";
import { finishRegistration } from "@/lib/credentials/service";
import { onlyKeys, relyingParty } from "@/lib/credentials/rp";
import { getDb } from "@/lib/db/client";
import { jsonError, sameOrigin } from "@/lib/http";
import { logFailure } from "@/lib/observability";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError(403, "origin", "Open Halo in this browser and try again.");
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "json", "Halo could not read that passkey.");
  }
  if (!onlyKeys(payload, ["id", "rawId", "type", "response", "clientExtensionResults", "authenticatorAttachment"])) {
    return jsonError(400, "invalid", "Halo could not read that passkey.");
  }
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) return jsonError(401, "auth", "Save your name before adding a passkey.");
  try {
    const saved = await finishRegistration(db, user.id, payload as RegistrationResponseJSON, relyingParty(request));
    if (!saved.ok) return jsonError(400, "passkey", saved.message);
    return Response.json({ credentialId: saved.credentialId });
  } catch (error) {
    logFailure({ scope: "passkey", code: "register_failed", detail: error instanceof Error ? error.name : "error" });
    return jsonError(500, "passkey", "The passkey was not saved. Nothing was confirmed.");
  }
}
