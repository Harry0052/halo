import Link from "next/link";
import { eq } from "drizzle-orm";
import { confirmedChecksStarted } from "@/lib/account/privacy";
import { DeleteAccount } from "@/components/product/delete-account";
import { SafetyPanel } from "@/components/product/safety-panel";
import { buttonClass } from "@/components/ui/button";
import { readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export const metadata = { title: "Safety" };

export default async function SafetyPage() {
  const db = getDb();
  const user = await readSessionUser(db);
  const row = user ? db.select().from(users).where(eq(users.id, user.id)).get() : null;
  const confirmed = user ? confirmedChecksStarted(db, user.id) : 0;

  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-deep">Safety</p>
      <h1 className="mt-3 font-display text-5xl tracking-tight">What Halo can and cannot do</h1>
      <div className="mt-6 space-y-4 text-base leading-7 text-midnight">
        <p>
          A common scam is a call or message that sounds like someone you know and asks for money, gift cards, or a
          code. Halo lets you ask that person, on a different channel, to answer with the passkey on their own device.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>A Confirmed result means their enrolled passkey was used before the check expired.</li>
          <li>It does not mean they are physically safe.</li>
          <li>It does not mean a payment, gift card, or transfer is legitimate.</li>
          <li>Halo never sends money.</li>
          <li>Email, texts, and push are disabled. Nothing in those channels is simulated.</li>
          <li>An unlocked device, or a passkey you have not revoked, can still answer.</li>
          <li>If a passkey is lost, revoke it here and add a new one on a device you still have.</li>
        </ul>
      </div>
      {user ? (
        <p className="mt-6 rounded-2xl bg-white px-5 py-4 text-base leading-7 ring-1 ring-line">
          Confirmed checks you started: <span className="font-semibold">{confirmed}</span>. This counts passkey answers
          recorded before expiry. It is not a count of fraud caught, and it is only for this browser&apos;s name.
        </p>
      ) : null}
      <p className="mt-6">
        <Link href="/requests" className={buttonClass("secondary")}>
          Manage passkeys
        </Link>
      </p>
      {user && row ? (
        <div className="mt-8 space-y-6">
          <SafetyPanel notifyInApp={row.notifyInApp !== 0} />
          <DeleteAccount />
        </div>
      ) : (
        <p className="mt-8 text-base leading-7 text-muted">
          <Link href="/" className="font-semibold text-teal-deep">
            Save your name
          </Link>{" "}
          before you change settings or file a report.
        </p>
      )}
    </main>
  );
}
