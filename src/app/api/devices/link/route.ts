import { readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { jsonError, sameOrigin } from "@/lib/http";
import { consumeRateLimit, LIMITS } from "@/lib/security/rate-limit";
import { createDeviceLink } from "@/lib/safety/service";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError(403, "origin", "Open Halo in this browser and try again.");
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) return jsonError(401, "auth", "Save your name before linking a browser.");
  if (!consumeRateLimit(db, `link:${user.id}`, LIMITS.deviceLink.limit, LIMITS.deviceLink.windowMs)) {
    return jsonError(429, "rate", "Too many link codes. Wait an hour and try again.");
  }
  const created = createDeviceLink(db, user.id);
  return Response.json(created);
}
