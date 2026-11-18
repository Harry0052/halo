import { randomUUID } from "node:crypto";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { and, eq, isNull } from "drizzle-orm";
import { recordEvent } from "@/lib/audit";
import { readChallenge } from "@/lib/challenges/service";
import { verifyResponseAssertion } from "@/lib/credentials/service";
import type { RelyingParty } from "@/lib/credentials/rp";
import type { HaloDb } from "@/lib/db/client";
import { challengeResponses, challenges, deviceCredentials, webauthnChallenges } from "@/lib/db/schema";
import { isPast, nowIso } from "@/lib/time";

const NOT_FOUND = "That check is not on this server.";

export function commitResponse(
  db: HaloDb,
  actorId: string,
  input: {
    challengeId: string;
    decision: "confirm" | "deny";
    credentialId: string;
    signature: string;
    newCounter: number;
    ceremonyId?: string;
  },
  now = new Date(),
) {
  try {
    const committed = db.transaction((tx) => {
      const row = tx.select().from(challenges).where(eq(challenges.id, input.challengeId)).get();
      if (!row || row.contactId !== actorId) return { ok: false as const, message: NOT_FOUND };
      if (row.status === "pending" && isPast(row.expiresAt, now)) {
        tx.update(challenges)
          .set({ status: "expired", resolvedAt: nowIso(now) })
          .where(and(eq(challenges.id, row.id), eq(challenges.status, "pending")))
          .run();
        return { ok: false as const, message: "The time ran out before a passkey answer. Halo did not confirm it." };
      }
      if (row.status !== "pending") return { ok: false as const, message: "This check was already finished." };
      const credential = tx
        .select()
        .from(deviceCredentials)
        .where(eq(deviceCredentials.id, input.credentialId))
        .get();
      if (!credential || credential.userId !== actorId || credential.revokedAt || credential.demo === 1) {
        return { ok: false as const, message: "That passkey is not enrolled for you." };
      }
      if (credential.counter > 0 && input.newCounter > 0 && input.newCounter <= credential.counter) {
        return { ok: false as const, message: "That passkey answer was already used." };
      }
      const resolvedAt = nowIso(now);
      const status = input.decision === "confirm" ? "confirmed" : "denied";
      const updated = tx
        .update(challenges)
        .set({ status, resolvedAt })
        .where(and(eq(challenges.id, row.id), eq(challenges.status, "pending")))
        .run();
      if (updated.changes !== 1) return { ok: false as const, message: "This check was already finished." };
      tx.insert(challengeResponses)
        .values({
          id: randomUUID(),
          challengeId: row.id,
          credentialId: credential.id,
          signature: input.signature,
          decision: input.decision,
          createdAt: resolvedAt,
        })
        .run();
      tx.update(deviceCredentials)
        .set({ counter: input.newCounter })
        .where(and(eq(deviceCredentials.id, credential.id), isNull(deviceCredentials.revokedAt)))
        .run();
      if (input.ceremonyId) {
        tx.update(webauthnChallenges)
          .set({ usedAt: resolvedAt })
          .where(eq(webauthnChallenges.id, input.ceremonyId))
          .run();
      }
      return { ok: true as const, status };
    });
    if (!committed.ok) return committed;
    recordEvent(db, actorId, input.decision === "confirm" ? "challenge_confirmed" : "challenge_denied", {
      challengeId: input.challengeId,
    });
    return readChallenge(db, input.challengeId, actorId, now);
  } catch {
    return { ok: false as const, message: "This check was already finished." };
  }
}

export async function respondToChallenge(
  db: HaloDb,
  actorId: string,
  expectedChallengeId: string,
  assertion: AuthenticationResponseJSON,
  rp: RelyingParty,
  now = new Date(),
) {
  const verified = await verifyResponseAssertion(db, actorId, assertion, rp, now);
  if (!verified.ok) return verified;
  if (verified.haloChallengeId !== expectedChallengeId) {
    return { ok: false as const, message: "The passkey did not match this check." };
  }
  const row = db.select().from(challenges).where(eq(challenges.id, verified.haloChallengeId)).get();
  if (!row || row.nonceHash !== verified.nonceHash) {
    return { ok: false as const, message: "The passkey did not match this check." };
  }
  return commitResponse(
    db,
    actorId,
    {
      challengeId: verified.haloChallengeId,
      decision: verified.decision,
      credentialId: verified.credentialId,
      signature: verified.signature,
      newCounter: verified.newCounter,
      ceremonyId: verified.ceremonyId,
    },
    now,
  );
}
