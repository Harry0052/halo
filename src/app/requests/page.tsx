import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { readSessionUser } from "@/lib/auth/session";
import { listChallenges } from "@/lib/challenges/service";
import { getDb } from "@/lib/db/client";
import { formatUtc } from "@/lib/time";

export const metadata = { title: "Requests" };

export default async function RequestsPage() {
  const db = getDb();
  const user = await readSessionUser(db);
  const incoming = user ? listChallenges(db, user.id, "contact") : [];
  const outgoing = user ? listChallenges(db, user.id, "requester") : [];

  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-deep">Requests</p>
      <h1 className="mt-3 font-display text-5xl tracking-tight">Checks waiting on you</h1>
      <p className="mt-4 text-lg leading-8 text-muted">
        A passkey answer is not available yet. You can read the request and the matching code. Nothing on this page
        confirms it.
      </p>
      {!user ? (
        <Link href="/" className={`${buttonClass("primary")} mt-6`}>
          Save your name first
        </Link>
      ) : null}
      <section className="mt-8" aria-labelledby="incoming-heading">
        <h2 id="incoming-heading" className="font-display text-3xl tracking-tight">
          For you to answer
        </h2>
        {incoming.length === 0 ? (
          <p className="mt-3 rounded-[1.4rem] border border-dashed border-line bg-white px-5 py-6 text-base leading-7 text-muted">
            Nothing is waiting for you.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {incoming.map((challenge) => (
              <li key={challenge.id}>
                <Link href={`/requests/${challenge.id}`} className="block rounded-[1.4rem] bg-white px-5 py-4 ring-1 ring-line">
                  <span className="flex items-start justify-between gap-3">
                    <span>
                      <span className="block text-lg font-semibold">{challenge.requesterName}</span>
                      <span className="mt-1 block text-sm leading-6 text-muted">{challenge.purpose}</span>
                    </span>
                    <Badge tone={challenge.status === "pending" ? "waiting" : "neutral"}>{challenge.statusWord}</Badge>
                  </span>
                  <span className="mt-2 block text-sm text-muted">Expires {formatUtc(challenge.expiresAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-8" aria-labelledby="outgoing-heading">
        <h2 id="outgoing-heading" className="font-display text-3xl tracking-tight">
          Checks you started
        </h2>
        {outgoing.length === 0 ? (
          <p className="mt-3 text-base leading-7 text-muted">You have not asked anyone yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {outgoing.map((challenge) => (
              <li key={challenge.id}>
                <Link href={`/verify/${challenge.id}`} className="block rounded-[1.4rem] bg-white px-5 py-4 ring-1 ring-line">
                  <span className="flex items-start justify-between gap-3">
                    <span className="font-semibold">{challenge.contactName}</span>
                    <Badge tone={challenge.status === "pending" ? "waiting" : "neutral"}>{challenge.statusWord}</Badge>
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-muted">{challenge.purpose}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="mt-8">
        <Link href="/sample" className="font-semibold text-teal-deep">
          See a sample check
        </Link>
      </p>
    </main>
  );
}
