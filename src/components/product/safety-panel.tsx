"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { formatUtc } from "@/lib/time";

export function SafetyPanel({ notifyInApp }: { notifyInApp: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [notify, setNotify] = useState(notifyInApp);
  const [reason, setReason] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [linkExpiry, setLinkExpiry] = useState<string | null>(null);
  const [redeemCode, setRedeemCode] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  async function saveNotify(next: boolean) {
    setNotify(next);
    try {
      const response = await fetch("/api/settings/notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notifyInApp: next }),
      });
      if (!response.ok) {
        setNotify(!next);
        toast("Halo could not save that setting.");
        return;
      }
      toast(next ? "In-app prompts are on." : "In-app prompts are off. The list still shows checks.");
      router.refresh();
    } catch {
      setNotify(!next);
      toast("Halo could not reach this server. The setting was not changed.");
    }
  }

  async function report(event: React.FormEvent) {
    event.preventDefault();
    setReportError(null);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const body = (await response.json().catch(() => null)) as { message?: string; error?: { message?: string } } | null;
      if (!response.ok) {
        setReportError(body?.error?.message ?? "Halo could not save that report.");
        return;
      }
      setReason("");
      toast(body?.message ?? "Saved on this server. Nobody is emailed.");
    } catch {
      setReportError("Halo could not reach this server. The report was not saved.");
    }
  }

  async function createLink() {
    setLinkError(null);
    try {
      const response = await fetch("/api/devices/link", { method: "POST" });
      const body = (await response.json().catch(() => null)) as {
        code?: string;
        expiresAt?: string;
        error?: { message?: string };
      } | null;
      if (!response.ok || !body?.code) {
        setLinkError(body?.error?.message ?? "Halo could not create a code.");
        return;
      }
      setLinkCode(body.code);
      setLinkExpiry(body.expiresAt ?? null);
    } catch {
      setLinkError("Halo could not reach this server. No code was created.");
    }
  }

  async function redeem(event: React.FormEvent) {
    event.preventDefault();
    setLinkError(null);
    try {
      const response = await fetch("/api/devices/link/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: redeemCode }),
      });
      const body = (await response.json().catch(() => null)) as {
        displayName?: string;
        error?: { message?: string };
      } | null;
      if (!response.ok) {
        setLinkError(body?.error?.message ?? "That code is not valid.");
        return;
      }
      toast(`This browser is now ${body?.displayName ?? "linked"}.`);
      router.push("/");
      router.refresh();
    } catch {
      setLinkError("Halo could not reach this server. This browser was not linked.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.4rem] bg-white p-5 ring-1 ring-line">
        <h2 className="font-display text-3xl tracking-tight">In-app prompts</h2>
        <p className="mt-2 text-base leading-7 text-muted">
          Email, texts, and push notifications are disabled. Halo cannot send them. This switch only controls whether
          this server treats new checks as something to draw attention to. The list still shows them.
        </p>
        <label className="mt-4 flex min-h-12 items-center gap-3 text-base font-semibold">
          <input type="checkbox" checked={notify} onChange={(event) => saveNotify(event.target.checked)} />
          Show in-app prompts
        </label>
      </section>
      <section className="rounded-[1.4rem] bg-white p-5 ring-1 ring-line">
        <h2 className="font-display text-3xl tracking-tight">Another browser</h2>
        <p className="mt-2 text-base leading-7 text-muted">
          A code links this name to another browser for 10 minutes. Halo stores only a hash of the code. The other
          browser still needs its own passkey.
        </p>
        <Button type="button" className="mt-4" onClick={createLink}>
          Create a link code
        </Button>
        {linkCode ? (
          <p className="mt-4 font-mono text-3xl tracking-[0.18em]" id="link-code">
            {linkCode}
          </p>
        ) : null}
        {linkExpiry ? <p className="mt-2 text-sm text-muted">Expires {formatUtc(linkExpiry)}.</p> : null}
        <form onSubmit={redeem} className="mt-4">
          <label className="text-sm font-semibold" htmlFor="redeem-code">
            Code from the other browser
          </label>
          <input
            id="redeem-code"
            value={redeemCode}
            onChange={(event) => setRedeemCode(event.target.value)}
            className={`${fieldClass()} mt-2 uppercase`}
            autoComplete="off"
          />
          <Button type="submit" variant="secondary" className="mt-3">
            Link this browser
          </Button>
        </form>
        {linkError ? <p className="mt-3 text-sm font-semibold text-clay">{linkError}</p> : null}
      </section>
      <form onSubmit={report} className="rounded-[1.4rem] bg-white p-5 ring-1 ring-line">
        <h2 className="font-display text-3xl tracking-tight">Report a problem</h2>
        <p className="mt-2 text-base leading-7 text-muted">
          This is saved on this server. Nobody is emailed, and Halo does not claim a person has reviewed it.
        </p>
        <label className="mt-4 block text-sm font-semibold" htmlFor="report-reason">
          What happened?
        </label>
        <textarea
          id="report-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className={`${fieldClass(Boolean(reportError))} mt-2 min-h-28 py-3`}
          required
        />
        {reportError ? <p className="mt-2 text-sm font-semibold text-clay">{reportError}</p> : null}
        <Button type="submit" className="mt-4">
          Save report
        </Button>
      </form>
    </div>
  );
}
