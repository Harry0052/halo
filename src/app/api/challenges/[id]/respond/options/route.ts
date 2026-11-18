import { readSessionUser } from "@/lib/auth/session";
import { readChallenge } from "@/lib/challenges/service";
import { beginResponse } from "@/lib/credentials/service";
import { relyingParty } from "@/lib/credentials/rp";
import { getDb } from "@/lib/db/client";
import { challenges } from "@/lib/db/schema";
import { jsonError, sameOrigin } from "@/lib/http";
import { consumeRateLimit, LIMITS } from "@/lib/security/rate-limit";
import { eq } from "drizzle-orm";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return jsonError(403, "origin", "Open Halo in this browser and try again.");
  const { id } = await context.params;
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "json", "Halo could not read that answer.");
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonError(400, "invalid", "Choose confirm or deny. Halo will not read any other field.");
  }
  const decision = (payload as { decision?: unknown }).decision;
  if ((decision !== "confirm" && decision !== "deny") || Object.keys(payload).some((key) => key !== "decision")) {
    return jsonError(400, "invalid", "Choose confirm or deny. Halo will not read any other field.");
  }
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) return jsonError(404, "not_found", "That check is not on this server.");
  if (!consumeRateLimit(db, `respond:${user.id}`, LIMITS.respond.limit, LIMITS.respond.windowMs)) {
    return jsonError(429, "rate", "Too many answers from this browser. Wait an hour and try again.");
  }
  const found = readChallenge(db, id, user.id);
  if (!found.ok || found.challenge.role !== "contact") {
    return jsonError(404, "not_found", "That check is not on this server.");
  }
  if (found.challenge.sample) return jsonError(403, "sample", "Sample checks cannot be confirmed.");
  if (found.challenge.status === "expired") return jsonError(409, "expired", found.challenge.reason);
  if (found.challenge.status !== "pending") return jsonError(409, "used", "This check was already finished.");
  const row = db.select().from(challenges).where(eq(challenges.id, id)).get();
  if (!row) return jsonError(404, "not_found", "That check is not on this server.");
  const started = await beginResponse(db, user.id, id, decision, row.nonceHash, relyingParty(request));
  if (!started.ok) return jsonError(400, "passkey", started.message);
  return Response.json({ options: started.options });
}
