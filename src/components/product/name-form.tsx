"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

export function NameForm({ initialName }: { initialName: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(initialName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const describedBy = error ? "name-error" : "name-hint";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: name }),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: { message?: string; fields?: { displayName?: string } };
        user?: { displayName?: string };
      } | null;
      if (!response.ok || !body?.user?.displayName) {
        setError(body?.error?.fields?.displayName ?? body?.error?.message ?? "Halo could not save that name.");
        return;
      }
      setName(body.user.displayName);
      toast(`Saved on this server as ${body.user.displayName}.`);
      router.refresh();
    } catch {
      setError("Halo could not reach this server. Nothing was saved. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-[1.4rem] bg-white p-5 shadow-sm ring-1 ring-line sm:p-6" noValidate>
      <h2 className="font-display text-3xl tracking-tight text-midnight">
        {initialName ? "Your name on this server" : "What should your contacts call you?"}
      </h2>
      <p id="name-hint" className="mt-2 text-base leading-7 text-muted">
        Halo stores this name with your browser session. It is not looked up against a phone number or an email
        address. Email delivery is disabled.
      </p>
      <label className="mt-5 block text-sm font-semibold text-midnight" htmlFor="display-name">
        Name
      </label>
      <input
        id="display-name"
        name="displayName"
        aria-label="What should your contacts call you?"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        autoComplete="nickname"
        value={name}
        onChange={(event) => setName(event.target.value)}
        className={`${fieldClass(Boolean(error))} mt-2`}
        maxLength={40}
        required
      />
      {error ? (
        <p id="name-error" role="alert" className="mt-2 text-sm font-semibold text-clay">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="mt-5 w-full sm:w-auto" disabled={pending}>
        {pending ? "Saving…" : "Save name"}
      </Button>
    </form>
  );
}
