import { readSessionUser } from "@/lib/auth/session";
import { beginRegistration } from "@/lib/credentials/service";
import { relyingParty } from "@/lib/credentials/rp";
import { getDb } from "@/lib/db/client";
import { jsonError, sameOrigin } from "@/lib/http";
import { consumeRateLimit, LIMITS } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError(403, "origin", "Open Halo in this browser and try again.");
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) return jsonError(401, "auth", "Save your name before adding a passkey.");
  if (!consumeRateLimit(db, `passkey:${user.id}`, 10, LIMITS.respond.windowMs)) {
    return jsonError(429, "rate", "Too many passkey attempts. Wait an hour and try again.");
  }
  const started = await beginRegistration(db, user.id, relyingParty(request));
  if (!started.ok) return jsonError(400, "passkey", started.message);
  return Response.json({ options: started.options });
}
