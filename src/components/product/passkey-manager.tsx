"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { formatUtc } from "@/lib/time";

type Credential = { id: string; label: string; createdAt: string; revokedAt: string | null };

export function PasskeyManager({ credentials }: { credentials: Credential[] }) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const active = credentials.filter((item) => !item.revokedAt);

  async function addPasskey() {
    if (typeof window.PublicKeyCredential === "undefined") {
      setError("This browser cannot create a passkey. Halo will not pretend a confirmation worked.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const optionsResponse = await fetch("/api/credentials/register/options", { method: "POST" });
      const optionsBody = (await optionsResponse.json().catch(() => null)) as {
        options?: unknown;
        error?: { message?: string };
      } | null;
      if (!optionsResponse.ok || !optionsBody?.options) {
        setError(optionsBody?.error?.message ?? "Halo could not start the passkey. Nothing was saved.");
        return;
      }
      const { startRegistration } = await import("@simplewebauthn/browser");
      const attestation = await startRegistration({ optionsJSON: optionsBody.options as never });
      const saved = await fetch("/api/credentials/register/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(attestation),
      });
      const savedBody = (await saved.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!saved.ok) {
        setError(savedBody?.error?.message ?? "The passkey was not saved. Nothing was confirmed.");
        return;
      }
      toast("Passkey saved on this device. It can confirm requests.");
      router.refresh();
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      console.error(name || "passkey");
      setError(
        name === "NotAllowedError"
          ? "The passkey prompt was closed. Nothing was saved."
          : name === "SecurityError"
            ? "This address cannot create a passkey. Open Halo at localhost, then try again. Nothing was saved."
            : "The passkey was not saved. Nothing was confirmed.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-[1.4rem] bg-white p-5 ring-1 ring-line" aria-labelledby="passkey-heading">
      <h2 id="passkey-heading" className="font-display text-3xl tracking-tight">
        Passkey on this device
      </h2>
      <p className="mt-2 text-base leading-7 text-muted">
        Confirm and deny both use this passkey. A person who only has the screen open cannot answer for you.
      </p>
      {active.length === 0 ? (
        <p className="mt-3 text-sm font-semibold text-midnight">No passkey on this server for this browser yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {active.map((item) => (
            <li key={item.id} className="text-sm leading-6">
              <span className="font-semibold">{item.label}</span>
              <span className="text-muted"> · saved {formatUtc(item.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
      <Button type="button" className="mt-4" onClick={addPasskey} disabled={pending}>
        {pending ? "Waiting for the passkey…" : "Add a passkey"}
      </Button>
      {error ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-clay">
          {error}
        </p>
      ) : null}
    </section>
  );
}
