import { readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { jsonError, sameOrigin } from "@/lib/http";
import { blockContact } from "@/lib/trust/service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return jsonError(403, "origin", "Open Halo in this browser and try again.");
  const { id } = await context.params;
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) return jsonError(401, "auth", "Save your name on Verify first.");
  const blocked = blockContact(db, user.id, id);
  if (!blocked.ok) return jsonError(400, "block", blocked.message);
  return Response.json({ ok: true });
}
