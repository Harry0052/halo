import { readSessionUser } from "@/lib/auth/session";
import { readChallenge } from "@/lib/challenges/service";
import { getDb } from "@/lib/db/client";
import { jsonError } from "@/lib/http";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) return jsonError(404, "not_found", "That check is not on this server.");
  const found = readChallenge(db, id, user.id);
  if (!found.ok) return jsonError(404, "not_found", found.message);
  return Response.json({ challenge: found.challenge });
}
