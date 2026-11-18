"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function AcceptInvite({ token, ownerName }: { token: string; ownerName: string }) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function accept() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/trust/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = (await response.json().catch(() => null)) as {
        contactName?: string;
        error?: { message?: string };
      } | null;
      if (!response.ok) {
        setError(body?.error?.message ?? "Halo could not accept that invite.");
        return;
      }
      toast(`${body?.contactName ?? ownerName} is in your circle. Nothing was confirmed about a request.`);
      router.push("/circle");
      router.refresh();
    } catch {
      setError("Halo could not reach this server. You have not joined their circle.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-[1.4rem] bg-white p-5 shadow-sm ring-1 ring-line sm:p-6">
      <h1 className="font-display text-4xl tracking-tight">Join {ownerName}&apos;s circle</h1>
      <p className="mt-3 text-base leading-7 text-muted">
        Accepting means you can ask each other to confirm a suspicious request later. It does not confirm any request,
        and Halo does not send money.
      </p>
      <Button type="button" className="mt-5" onClick={accept} disabled={pending}>
        {pending ? "Saving…" : `Accept ${ownerName}`}
      </Button>
      {error ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-clay">
          {error}
        </p>
      ) : null}
    </div>
  );
}
