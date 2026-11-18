"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { formatUtc } from "@/lib/time";
import type { CircleInvite } from "@/lib/trust/service";

const STORAGE_KEY = "halo.freshInvite";

type FreshInvite = { invitationId: string; url: string; expiresAt: string };

function readFresh(): FreshInvite | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FreshInvite;
    if (!parsed.url || !parsed.invitationId || !parsed.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function InvitePanel({ invites }: { invites: CircleInvite[] }) {
  const router = useRouter();
  const toast = useToast();
  const [fresh, setFresh] = useState<FreshInvite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  useEffect(() => {
    const stored = readFresh();
    if (!stored) return;
    const stillPending = invites.some((invite) => invite.id === stored.invitationId && invite.status === "pending");
    const timer = window.setTimeout(() => {
      if (!stillPending) {
        sessionStorage.removeItem(STORAGE_KEY);
        setFresh(null);
        return;
      }
      setFresh(stored);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [invites]);

  async function createInvite() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/trust/invite", { method: "POST" });
      const body = (await response.json().catch(() => null)) as {
        invitationId?: string;
        url?: string;
        expiresAt?: string;
        error?: { message?: string };
      } | null;
      if (!response.ok || !body?.url || !body.expiresAt || !body.invitationId) {
        setError(body?.error?.message ?? "Halo could not create that invite.");
        return;
      }
      const next = { invitationId: body.invitationId, url: body.url, expiresAt: body.expiresAt };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setFresh(next);
      toast("Invite link ready. Halo did not email it.");
      router.refresh();
    } catch {
      setError("Halo could not reach this server. No link was created.");
    } finally {
      setPending(false);
    }
  }

  async function copyLink() {
    if (!fresh) return;
    try {
      await navigator.clipboard.writeText(fresh.url);
      toast("Link copied. Send it yourself. Halo does not email it.");
    } catch {
      toast("Copy is blocked in this browser. Select the link and copy it.");
    }
  }

  async function revoke(id: string) {
    setError(null);
    try {
      const response = await fetch(`/api/trust/invitations/${id}/revoke`, { method: "POST" });
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!response.ok) {
        setError(body?.error?.message ?? "Halo could not revoke that link.");
        return;
      }
      if (fresh?.invitationId === id) {
        sessionStorage.removeItem(STORAGE_KEY);
        setFresh(null);
      }
      setConfirmRevoke(null);
      toast("Invite revoked. That link will not work.");
      router.refresh();
    } catch {
      setError("Halo could not reach this server. The link was not revoked.");
    }
  }

  return (
    <div className="rounded-[1.4rem] bg-white p-5 shadow-sm ring-1 ring-line sm:p-6">
      <h2 className="font-display text-3xl tracking-tight">Invite someone you already know</h2>
      <p className="mt-2 text-base leading-7 text-muted">
        Halo does not email or text this link. Copy it and send it yourself. This browser can show it again until you
        close the tab. The server keeps only a hash.
      </p>
      <Button type="button" className="mt-5" onClick={createInvite} disabled={pending}>
        {pending ? "Creating…" : "Create an invite link"}
      </Button>
      {error ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-clay">
          {error}
        </p>
      ) : null}
      {fresh ? (
        <div className="mt-5">
          <label htmlFor="invite-url" className="text-sm font-semibold">
            Invite link
          </label>
          <input id="invite-url" readOnly value={fresh.url} className={`${fieldClass()} mt-2`} />
          <p className="mt-2 text-sm text-muted">Expires {formatUtc(fresh.expiresAt)}.</p>
          <Button type="button" variant="secondary" className="mt-3" onClick={copyLink}>
            Copy link
          </Button>
        </div>
      ) : null}
      {invites.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {invites.map((invite) => (
            <li key={invite.id} className="rounded-2xl bg-pale px-4 py-3">
              <p className="font-semibold">{invite.status === "pending" ? "Waiting" : "Expired"}</p>
              <p className="text-sm leading-6 text-muted">
                {invite.status === "pending"
                  ? `The link was shown once and is not stored. It expires ${formatUtc(invite.expiresAt)}.`
                  : `This link expired ${formatUtc(invite.expiresAt)}. Create another if you still need it.`}
              </p>
              {invite.status === "pending" ? (
                confirmRevoke === invite.id ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" variant="danger" onClick={() => revoke(invite.id)}>
                      Revoke this link
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setConfirmRevoke(null)}>
                      Keep it
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="secondary" className="mt-3" onClick={() => setConfirmRevoke(invite.id)}>
                    Revoke link
                  </Button>
                )
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
