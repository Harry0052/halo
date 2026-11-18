"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusMark } from "@/components/product/status-mark";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { ChallengeView } from "@/lib/challenges/service";

export function ChallengeLive({
  initial,
  canCancel,
}: {
  initial: ChallengeView;
  canCancel: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [challenge, setChallenge] = useState(initial);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (challenge.status !== "pending" || challenge.sample) return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/challenges/${challenge.id}/status`);
        if (!response.ok) throw new Error("status");
        const body = (await response.json()) as { challenge?: ChallengeView };
        if (!body.challenge) throw new Error("status");
        setChallenge(body.challenge);
        setRefreshError(null);
      } catch {
        setRefreshError("Could not refresh. The saved result is unchanged. Try again.");
      }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [challenge.id, challenge.sample, challenge.status]);

  async function cancel() {
    setPending(true);
    try {
      const response = await fetch(`/api/challenges/${challenge.id}/cancel`, { method: "POST" });
      const body = (await response.json().catch(() => null)) as {
        challenge?: ChallengeView;
        error?: { message?: string };
      } | null;
      if (!response.ok || !body?.challenge) {
        setRefreshError(body?.error?.message ?? "Halo could not cancel that check.");
        return;
      }
      setChallenge(body.challenge);
      setConfirmCancel(false);
      toast("Check cancelled. It was not confirmed.");
      router.refresh();
    } catch {
      setRefreshError("Could not reach Halo. The check was not cancelled.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <StatusMark challenge={challenge} refreshError={refreshError} />
      {canCancel && challenge.status === "pending" ? (
        confirmCancel ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="danger" onClick={cancel} disabled={pending}>
              {pending ? "Cancelling…" : "Cancel this check"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setConfirmCancel(false)}>
              Keep it pending
            </Button>
          </div>
        ) : (
          <Button type="button" variant="secondary" className="mt-4" onClick={() => setConfirmCancel(true)}>
            Cancel check
          </Button>
        )
      ) : null}
    </div>
  );
}
