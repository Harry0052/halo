import { randomUUID } from "node:crypto";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { recordEvent } from "@/lib/audit";
import { bytesToBase64url, challengeFromClientData, type RelyingParty } from "@/lib/credentials/rp";
import type { HaloDb } from "@/lib/db/client";
import { deviceCredentials, users, webauthnChallenges } from "@/lib/db/schema";
import { addMinutes, isPast, nowIso } from "@/lib/time";

const CEREMONY_MINUTES = 5;

export type PublicCredential = {
  id: string;
  label: string;
  createdAt: string;
  revokedAt: string | null;
};

function transportsOf(value: string | null) {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : undefined;
  } catch {
    return undefined;
  }
}

export function listCredentials(db: HaloDb, userId: string): PublicCredential[] {
  return db
    .select()
    .from(deviceCredentials)
    .where(eq(deviceCredentials.userId, userId))
    .orderBy(desc(deviceCredentials.createdAt))
    .all()
    .filter((row) => row.demo !== 1)
    .map((row) => ({
      id: row.id,
      label: row.label,
      createdAt: row.createdAt,
      revokedAt: row.revokedAt,
    }));
}

export function activeCredentials(db: HaloDb, userId: string) {
  return db
    .select()
    .from(deviceCredentials)
    .where(and(eq(deviceCredentials.userId, userId), isNull(deviceCredentials.revokedAt), eq(deviceCredentials.demo, 0)))
    .all();
}

async function saveCeremony(
  db: HaloDb,
  input: {
    userId: string;
    purpose: "register" | "respond";
    challenge: string;
    haloChallengeId?: string | null;
    decision?: string | null;
    nonceHash?: string | null;
    now: Date;
  },
) {
  const createdAt = nowIso(input.now);
  db.insert(webauthnChallenges)
    .values({
      id: randomUUID(),
      userId: input.userId,
      purpose: input.purpose,
      challenge: input.challenge,
      haloChallengeId: input.haloChallengeId ?? null,
      decision: input.decision ?? null,
      nonceHash: input.nonceHash ?? null,
      expiresAt: addMinutes(createdAt, CEREMONY_MINUTES),
      usedAt: null,
      createdAt,
    })
    .run();
}

export async function beginRegistration(db: HaloDb, userId: string, rp: RelyingParty, now = new Date()) {
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user || user.kind !== "member") {
    return { ok: false as const, message: "Save your name before adding a passkey." };
  }
  const existing = activeCredentials(db, userId);
  const options = await generateRegistrationOptions({
    rpName: rp.rpName,
    rpID: rp.rpID,
    userName: user.displayName,
    userDisplayName: user.displayName,
    userID: new TextEncoder().encode(user.id),
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required",
    },
    excludeCredentials: existing.map((row) => ({
      id: row.id,
      transports: transportsOf(row.transports) as never,
    })),
  });
  await saveCeremony(db, { userId, purpose: "register", challenge: options.challenge, now });
  return { ok: true as const, options };
}

export async function finishRegistration(
  db: HaloDb,
  userId: string,
  response: RegistrationResponseJSON,
  rp: RelyingParty,
  now = new Date(),
) {
  const challenge = challengeFromClientData(response.response.clientDataJSON);
  if (!challenge) return { ok: false as const, message: "That passkey ceremony is not valid." };
  const row = db.select().from(webauthnChallenges).where(eq(webauthnChallenges.challenge, challenge)).get();
  if (!row || row.userId !== userId || row.purpose !== "register" || row.usedAt || isPast(row.expiresAt, now)) {
    return { ok: false as const, message: "That passkey ceremony expired. Start again." };
  }
  let verified = false;
  let info: Awaited<ReturnType<typeof verifyRegistrationResponse>>["registrationInfo"];
  try {
    const result = await verifyRegistrationResponse({
      response,
      expectedChallenge: row.challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      requireUserVerification: true,
    });
    verified = result.verified;
    info = result.registrationInfo;
  } catch {
    verified = false;
  }
  if (!verified || !info) return { ok: false as const, message: "The passkey was not saved. Nothing was confirmed." };
  const credential = info.credential;
  const createdAt = nowIso(now);
  db.transaction((tx) => {
    tx.update(webauthnChallenges).set({ usedAt: createdAt }).where(eq(webauthnChallenges.id, row.id)).run();
    tx.insert(deviceCredentials)
      .values({
        id: credential.id,
        userId,
        publicKey: bytesToBase64url(credential.publicKey),
        counter: credential.counter,
        transports: JSON.stringify(response.response.transports ?? credential.transports ?? []),
        deviceType: info?.credentialDeviceType ?? null,
        backedUp: info?.credentialBackedUp ? 1 : 0,
        label: "This device",
        demo: 0,
        createdAt,
        revokedAt: null,
      })
      .run();
  });
  recordEvent(db, userId, "credential_registered", { credentialId: credential.id.slice(0, 12) });
  return { ok: true as const, credentialId: credential.id };
}

export async function beginResponse(
  db: HaloDb,
  userId: string,
  haloChallengeId: string,
  decision: "confirm" | "deny",
  nonceHash: string,
  rp: RelyingParty,
  now = new Date(),
) {
  const creds = activeCredentials(db, userId);
  if (creds.length === 0) {
    return { ok: false as const, message: "Add a passkey on this device before you answer." };
  }
  const options = await generateAuthenticationOptions({
    rpID: rp.rpID,
    userVerification: "required",
    allowCredentials: creds.map((row) => ({
      id: row.id,
      transports: transportsOf(row.transports) as never,
    })),
  });
  await saveCeremony(db, {
    userId,
    purpose: "respond",
    challenge: options.challenge,
    haloChallengeId,
    decision,
    nonceHash,
    now,
  });
  return { ok: true as const, options };
}

export async function verifyResponseAssertion(
  db: HaloDb,
  userId: string,
  response: AuthenticationResponseJSON,
  rp: RelyingParty,
  now = new Date(),
) {
  const challenge = challengeFromClientData(response.response.clientDataJSON);
  if (!challenge) return { ok: false as const, message: "That passkey answer is not valid." };
  const ceremony = db.select().from(webauthnChallenges).where(eq(webauthnChallenges.challenge, challenge)).get();
  if (
    !ceremony ||
    ceremony.userId !== userId ||
    ceremony.purpose !== "respond" ||
    ceremony.usedAt ||
    isPast(ceremony.expiresAt, now) ||
    !ceremony.haloChallengeId ||
    (ceremony.decision !== "confirm" && ceremony.decision !== "deny")
  ) {
    return { ok: false as const, message: "That passkey ceremony expired. Start again." };
  }
  const credential = db
    .select()
    .from(deviceCredentials)
    .where(and(eq(deviceCredentials.id, response.id), eq(deviceCredentials.userId, userId), isNull(deviceCredentials.revokedAt)))
    .get();
  if (!credential || credential.demo === 1) {
    return { ok: false as const, message: "That passkey is not enrolled for you." };
  }
  if (response.response.userHandle) {
    const handle = Buffer.from(response.response.userHandle, "base64url").toString("utf8");
    if (handle !== userId) return { ok: false as const, message: "That passkey is not enrolled for you." };
  }
  try {
    const result = await verifyAuthenticationResponse({
      response,
      expectedChallenge: ceremony.challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      requireUserVerification: true,
      credential: {
        id: credential.id,
        publicKey: Uint8Array.from(Buffer.from(credential.publicKey, "base64url")),
        counter: credential.counter,
        transports: transportsOf(credential.transports) as never,
      },
    });
    if (!result.verified || result.authenticationInfo.credentialID !== credential.id) {
      return { ok: false as const, message: "The passkey did not match this check." };
    }
    if (credential.counter > 0 && result.authenticationInfo.newCounter > 0 && result.authenticationInfo.newCounter <= credential.counter) {
      return { ok: false as const, message: "That passkey answer was already used." };
    }
    return {
      ok: true as const,
      ceremonyId: ceremony.id,
      haloChallengeId: ceremony.haloChallengeId,
      decision: ceremony.decision as "confirm" | "deny",
      nonceHash: ceremony.nonceHash,
      credentialId: credential.id,
      signature: response.response.signature,
      newCounter: result.authenticationInfo.newCounter,
    };
  } catch {
    return { ok: false as const, message: "The passkey did not match this check." };
  }
}

export function markCeremonyUsed(db: HaloDb, ceremonyId: string, now = new Date()) {
  db.update(webauthnChallenges).set({ usedAt: nowIso(now) }).where(eq(webauthnChallenges.id, ceremonyId)).run();
}
