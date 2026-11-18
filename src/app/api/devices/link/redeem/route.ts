import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { jsonError, requestIsSecure, sameOrigin } from "@/lib/http";
import { redeemDeviceLink } from "@/lib/safety/service";
import { z } from "zod";

const schema = z.object({ code: z.string().trim().min(8).max(20) }).strict();

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError(403, "origin", "Open Halo in this browser and try again.");
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "json", "Halo could not read that code.");
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return jsonError(400, "invalid", "That code is not valid.");
  const redeemed = redeemDeviceLink(getDb(), parsed.data.code);
  if (!redeemed.ok) return jsonError(400, "invalid", redeemed.message);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, redeemed.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: requestIsSecure(request),
  });
  return Response.json({ displayName: redeemed.displayName });
}
