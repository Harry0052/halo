"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function AnswerActions({ challengeId, hasPasskey }: { challengeId: string; hasPasskey: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"confirm" | "deny" | null>(null);

  async function answer(decision: "confirm" | "deny") {
    if (!hasPasskey) return;
    if (typeof window.PublicKeyCredential === "undefined") {
      setError("This browser cannot use a passkey. Halo will not pretend a confirmation worked.");
      return;
    }
    setPending(decision);
    setError(null);
    try {
      const optionsResponse = await fetch(`/api/challenges/${challengeId}/respond/options`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const optionsBody = (await optionsResponse.json().catch(() => null)) as {
        options?: unknown;
        error?: { message?: string };
      } | null;
      if (!optionsResponse.ok || !optionsBody?.options) {
        setError(optionsBody?.error?.message ?? "Halo could not start the passkey. Nothing was changed.");
        return;
      }
      const { startAuthentication } = await import("@simplewebauthn/browser");
      const assertion = await startAuthentication({ optionsJSON: optionsBody.options as never });
      const saved = await fetch(`/api/challenges/${challengeId}/respond`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, assertion }),
      });
      const savedBody = (await saved.json().catch(() => null)) as {
        challenge?: { statusWord?: string };
        error?: { message?: string };
      } | null;
      if (!saved.ok || !savedBody?.challenge?.statusWord) {
        setError(savedBody?.error?.message ?? "The passkey did not match this check. Nothing was confirmed.");
        return;
      }
      toast(
        savedBody.challenge.statusWord === "Confirmed"
          ? "Recorded as Confirmed. This does not mean they are safe."
          : "Recorded as Could not verify.",
      );
      router.refresh();
    } catch {
      setError(decision === "confirm" ? "The passkey was not used. Nothing was confirmed." : "The passkey was not used. Nothing was denied.");
    } finally {
      setPending(null);
    }
  }

  if (!hasPasskey) {
    return (
      <p className="mt-4 text-base leading-7 text-muted">
        Add a passkey on this device before you answer. Until then, this check stays pending.
      </p>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <Button type="button" onClick={() => answer("confirm")} disabled={pending !== null}>
        {pending === "confirm" ? "Waiting for the passkey…" : "Confirm with passkey"}
      </Button>
      <Button type="button" variant="danger" onClick={() => answer("deny")} disabled={pending !== null}>
        {pending === "deny" ? "Waiting for the passkey…" : "Deny with passkey"}
      </Button>
      {error ? (
        <p role="alert" className="basis-full text-sm font-semibold text-clay">
          {error}
        </p>
      ) : null}
    </div>
  );
}
