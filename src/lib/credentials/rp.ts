import { requestIsSecure } from "@/lib/http";

export type RelyingParty = {
  rpID: string;
  rpName: "Halo";
  origin: string;
};

export function relyingParty(request: Request): RelyingParty {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  const hostname = host.split(":")[0] || "localhost";
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || (requestIsSecure(request) ? "https" : url.protocol.replace(":", ""));
  return {
    rpID: process.env.HALO_RP_ID?.trim() || hostname,
    rpName: "Halo",
    origin: process.env.HALO_ORIGIN?.trim() || `${proto}://${host}`,
  };
}

export function bytesToBase64url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url");
}

export function base64urlToBytes(value: string) {
  return new Uint8Array(Buffer.from(value, "base64url"));
}

export function challengeFromClientData(clientDataJSON: string) {
  try {
    const json = JSON.parse(Buffer.from(clientDataJSON, "base64url").toString("utf8")) as { challenge?: unknown };
    return typeof json.challenge === "string" ? json.challenge : null;
  } catch {
    return null;
  }
}

export function onlyKeys(value: unknown, allowed: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.keys(value).every((key) => allowed.includes(key));
}
