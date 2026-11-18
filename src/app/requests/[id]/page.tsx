import Link from "next/link";
import { notFound } from "next/navigation";
import { AnswerActions } from "@/components/product/answer-actions";
import { ChallengeLive } from "@/components/product/challenge-live";
import { PasskeyManager } from "@/components/product/passkey-manager";
import { readSessionUser } from "@/lib/auth/session";
import { readChallenge } from "@/lib/challenges/service";
import { listCredentials } from "@/lib/credentials/service";
import { getDb } from "@/lib/db/client";
import { formatUtc } from "@/lib/time";

export const metadata = { title: "Request" };

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) notFound();
  const found = readChallenge(db, id, user.id);
  if (!found.ok || found.challenge.role !== "contact") notFound();
  const challenge = found.challenge;
  const credentials = listCredentials(db, user.id);
  const hasPasskey = credentials.some((item) => !item.revokedAt);

  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-deep">For you to answer</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">{challenge.requesterName} asked you to confirm a request</h1>
      <p className="mt-4 text-lg leading-8 text-midnight">{challenge.purpose}</p>
      <div className="mt-6">
        <ChallengeLive initial={challenge} canCancel={false} />
        {challenge.status === "pending" ? (
          hasPasskey ? (
            <AnswerActions challengeId={challenge.id} hasPasskey />
          ) : (
            <div className="mt-4">
              <PasskeyManager credentials={credentials} />
            </div>
          )
        ) : null}
      </div>
      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-muted">Matching code</p>
      <p className="mt-2 font-mono text-4xl tracking-[0.18em]">{challenge.code}</p>
      <p className="mt-4 max-w-xl text-base leading-7 text-muted">
        Compare this code with the one on their screen. Expires {formatUtc(challenge.expiresAt)}. A confirmation only
        means your passkey was used. It does not mean you are safe, and Halo does not send money.
      </p>
      <Link href="/requests" className="mt-8 inline-flex min-h-12 items-center font-semibold text-teal-deep">
        Back to Requests
      </Link>
    </main>
  );
}
