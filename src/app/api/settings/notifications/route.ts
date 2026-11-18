import { readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { jsonError, sameOrigin } from "@/lib/http";
import { setNotifications } from "@/lib/safety/service";
import { z } from "zod";

const schema = z.object({ notifyInApp: z.boolean() }).strict();

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError(403, "origin", "Open Halo in this browser and try again.");
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "json", "Halo could not read that setting.");
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return jsonError(400, "invalid", "Choose whether in-app prompts stay on.");
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) return jsonError(401, "auth", "Save your name on Verify first.");
  const saved = setNotifications(db, user.id, parsed.data.notifyInApp);
  return Response.json(saved);
}
