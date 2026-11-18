import Link from "next/link";
import { notFound } from "next/navigation";
import { ChallengeLive } from "@/components/product/challenge-live";
import { readSessionUser } from "@/lib/auth/session";
import { challengeQrSvg } from "@/lib/challenges/qr";
import { readChallenge } from "@/lib/challenges/service";
import { getDb } from "@/lib/db/client";
import { formatUtc } from "@/lib/time";
import { publicOriginFromHeaders } from "@/lib/http-origin";

export const metadata = { title: "Check" };

export default async function VerifyChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) notFound();
  const found = readChallenge(db, id, user.id);
  if (!found.ok || found.challenge.role !== "requester") notFound();
  const challenge = found.challenge;
  const origin = await publicOriginFromHeaders();
  const svg = await challengeQrSvg(`${origin}/requests/${challenge.id}`);

  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-deep">Your check</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Ask {challenge.contactName} about this request</h1>
      <p className="mt-4 text-lg leading-8 text-midnight">{challenge.purpose}</p>
      <div className="mt-6">
        <ChallengeLive initial={challenge} canCancel />
      </div>
      <section className="mt-6 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="w-44 rounded-2xl bg-white p-3 ring-1 ring-line" dangerouslySetInnerHTML={{ __html: svg }} />
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">Matching code</p>
          <p className="mt-2 font-mono text-4xl tracking-[0.18em] text-midnight">{challenge.code}</p>
          <p className="mt-3 text-base leading-7 text-muted">
            {challenge.status === "pending"
              ? `Show this code to ${challenge.contactName}. The code is not a passkey and it does not confirm the request. Expires ${formatUtc(challenge.expiresAt)}.`
              : "This code only identifies the check. The result above is the passkey record."}
          </p>
        </div>
      </section>
      <p className="mt-6 text-sm leading-6 text-muted">
        Started {formatUtc(challenge.createdAt)}.
        {challenge.resolvedAt ? ` Finished ${formatUtc(challenge.resolvedAt)}.` : " Still open on the server."}
      </p>
      <Link href="/requests" className="mt-6 inline-flex min-h-12 items-center font-semibold text-teal-deep">
        Their inbox is under Requests
      </Link>
    </main>
  );
}
