"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";

type ContactOption = { id: string; displayName: string };

export function ChallengeForm({ contacts }: { contacts: ContactOption[] }) {
  const router = useRouter();
  const idempotencyKey = useRef(crypto.randomUUID());
  const [contactId, setContactId] = useState(contacts[0]?.id ?? "");
  const [purpose, setPurpose] = useState("");
  const [expiresInMinutes, setExpiresInMinutes] = useState<5 | 15 | 30>(15);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/challenges", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contactId, purpose, expiresInMinutes, idempotencyKey: idempotencyKey.current }),
      });
      const body = (await response.json().catch(() => null)) as {
        challenge?: { id: string };
        error?: { message?: string; fields?: Record<string, string> };
      } | null;
      if (!response.ok || !body?.challenge?.id) {
        setError(body?.error?.fields?.purpose ?? body?.error?.message ?? "Halo could not save that check.");
        idempotencyKey.current = crypto.randomUUID();
        return;
      }
      router.push(`/verify/${body.challenge.id}`);
    } catch {
      setError("Halo could not reach this server. Nothing was saved. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-[1.4rem] bg-white p-5 shadow-sm ring-1 ring-line sm:p-6" noValidate>
      <h2 className="font-display text-3xl tracking-tight">Ask them to confirm</h2>
      <p className="mt-2 text-base leading-7 text-muted">
        A passkey answer is not available yet. This check stays Pending until it expires or you cancel it. Halo will
        not mark it confirmed on its own.
      </p>
      <label className="mt-5 block text-sm font-semibold" htmlFor="contact-id">
        Who should answer?
      </label>
      <select
        id="contact-id"
        value={contactId}
        onChange={(event) => setContactId(event.target.value)}
        className={`${fieldClass()} mt-2`}
      >
        {contacts.map((contact) => (
          <option key={contact.id} value={contact.id}>
            {contact.displayName}
          </option>
        ))}
      </select>
      <label className="mt-4 block text-sm font-semibold" htmlFor="purpose">
        What was the request?
      </label>
      <textarea
        id="purpose"
        value={purpose}
        onChange={(event) => setPurpose(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby="purpose-hint"
        className={`${fieldClass(Boolean(error))} mt-2 min-h-28 py-3`}
        maxLength={160}
        required
        placeholder="A caller asked me to buy gift cards and said they were you."
      />
      <p id="purpose-hint" className="mt-2 text-sm leading-6 text-muted">
        Leave out card numbers, account numbers, and passwords. Halo stores this sentence so your contact can read it.
      </p>
      <fieldset className="mt-4">
        <legend className="text-sm font-semibold">How long should it stay open?</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[5, 15, 30].map((minutes) => (
            <label key={minutes} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-line bg-pale px-2 text-sm font-semibold">
              <input
                type="radio"
                name="expiresInMinutes"
                value={minutes}
                checked={expiresInMinutes === minutes}
                onChange={() => setExpiresInMinutes(minutes as 5 | 15 | 30)}
              />
              {minutes} min
            </label>
          ))}
        </div>
      </fieldset>
      <p className="mt-4 rounded-2xl bg-pale px-4 py-3 text-sm leading-6 text-midnight">
        A later confirmation would only mean this contact used their passkey. It would not mean they are safe, and Halo
        never sends money.
      </p>
      {error ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-clay">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="mt-5 w-full sm:w-auto" disabled={pending || contacts.length === 0}>
        {pending ? "Saving…" : "Ask them to confirm"}
      </Button>
    </form>
  );
}
