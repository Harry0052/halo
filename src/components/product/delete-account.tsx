"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";

export function DeleteAccount() {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const ready = confirm === "delete my halo data";

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm }),
      });
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!response.ok) {
        setError(body?.error?.message ?? "Halo could not delete that data.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Halo could not reach this server. Nothing was deleted.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-[1.4rem] bg-white p-5 ring-1 ring-line">
      <h2 className="font-display text-3xl tracking-tight">Download or delete</h2>
      <p className="mt-2 text-base leading-7 text-muted">
        The download is your name, your circle, your checks, and reports you filed. It leaves out session tokens, invite
        tokens, nonce hashes, passkey public keys, and signatures.
      </p>
      <a href="/api/account/export" className="mt-4 inline-flex min-h-12 items-center font-semibold text-teal-deep">
        Download my data
      </a>
      <label className="mt-5 block text-sm font-semibold" htmlFor="delete-confirm">
        Type delete my halo data
      </label>
      <input
        id="delete-confirm"
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
        className={`${fieldClass()} mt-2`}
        autoComplete="off"
      />
      <Button type="submit" variant="danger" className="mt-4" disabled={!ready || pending}>
        {pending ? "Deleting…" : "Delete my data"}
      </Button>
      {error ? <p className="mt-3 text-sm font-semibold text-clay">{error}</p> : null}
    </form>
  );
}
