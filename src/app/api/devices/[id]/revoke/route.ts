import { readSessionUser } from "@/lib/auth/session";
import { revokeCredential } from "@/lib/credentials/service";
import { getDb } from "@/lib/db/client";
import { jsonError, sameOrigin } from "@/lib/http";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return jsonError(403, "origin", "Open Halo in this browser and try again.");
  const { id } = await context.params;
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) return jsonError(401, "auth", "Save your name on Verify first.");
  const revoked = revokeCredential(db, user.id, id);
  if (!revoked.ok) return jsonError(404, "not_found", revoked.message);
  return Response.json({ ok: true });
}
