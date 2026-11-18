import { readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { clientIp, jsonError, sameOrigin } from "@/lib/http";
import { consumeRateLimit, LIMITS } from "@/lib/security/rate-limit";
import { fileReport } from "@/lib/safety/service";
import { purposeSchema } from "@/lib/validators/challenges";
import { z } from "zod";

const reportSchema = z
  .object({
    reason: purposeSchema,
    subjectUserId: z.string().uuid().nullable().optional(),
  })
  .strict();

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError(403, "origin", "Open Halo in this browser and try again.");
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "json", "Halo could not read that report.");
  }
  const parsed = reportSchema.safeParse(payload);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Describe what happened, without account numbers.";
    return jsonError(400, "invalid", message, { reason: message });
  }
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) return jsonError(401, "auth", "Save your name before filing a report.");
  if (!consumeRateLimit(db, `report:${user.id}`, LIMITS.report.limit, LIMITS.report.windowMs)) {
    return jsonError(429, "rate", "Too many reports from this browser. Wait an hour and try again.");
  }
  if (!consumeRateLimit(db, `report-ip:${clientIp(request)}`, LIMITS.report.limit, LIMITS.report.windowMs)) {
    return jsonError(429, "rate", "Too many reports from this network. Wait an hour and try again.");
  }
  const saved = fileReport(db, user.id, {
    reason: parsed.data.reason,
    subjectUserId: parsed.data.subjectUserId ?? null,
  });
  return Response.json({ id: saved.id, message: "Saved on this server. Nobody is emailed." });
}
