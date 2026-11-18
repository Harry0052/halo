import { readSessionUser } from "@/lib/auth/session";
import { exportAccount } from "@/lib/account/privacy";
import { getDb } from "@/lib/db/client";
import { jsonError } from "@/lib/http";

export async function GET() {
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) return jsonError(401, "auth", "Save your name before downloading data.");
  const data = exportAccount(db, user.id);
  if (!data) return jsonError(404, "not_found", "That profile is not on this server.");
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": "attachment; filename=\"halo-export.json\"",
      "cache-control": "no-store",
    },
  });
}
