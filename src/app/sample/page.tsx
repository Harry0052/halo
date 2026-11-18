import Link from "next/link";
import { StatusMark } from "@/components/product/status-mark";
import { buttonClass } from "@/components/ui/button";
import { challengeQrSvg } from "@/lib/challenges/qr";
import { readSampleChallenge } from "@/lib/challenges/service";
import { getDb } from "@/lib/db/client";
import { publicOriginFromHeaders } from "@/lib/http-origin";
import { formatUtc } from "@/lib/time";

export const metadata = { title: "Sample check" };

export default async function SamplePage() {
  const challenge = readSampleChallenge(getDb());
  const origin = await publicOriginFromHeaders();
  const svg = challenge ? await challengeQrSvg(`${origin}/sample`) : null;

  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-deep">Sample</p>
      <h1 className="mt-3 font-display text-5xl tracking-tight">A sample check, not yours</h1>
      <p className="mt-4 text-lg leading-8 text-muted">
        Alex and Jordan are sample people. This check cannot be confirmed, and it is not part of your circle.
      </p>
      {!challenge || !svg ? (
        <p className="mt-6 text-base text-muted">The sample check is not on this server.</p>
      ) : (
        <div className="mt-6 space-y-6">
          <p className="text-lg leading-8 text-midnight">{challenge.purpose}</p>
          <StatusMark challenge={challenge} />
          <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="w-44 rounded-2xl bg-white p-3 ring-1 ring-line" dangerouslySetInnerHTML={{ __html: svg }} />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">Sample code</p>
              <p className="mt-2 font-mono text-4xl tracking-[0.18em]">{challenge.code}</p>
              <p className="mt-3 text-sm leading-6 text-muted">
                The sample is set to expire {formatUtc(challenge.expiresAt)} so the screen can stay on Pending. It is
                not a live check.
              </p>
            </div>
          </div>
        </div>
      )}
      <Link href="/" className={`${buttonClass("primary")} mt-8`}>
        Back to Verify
      </Link>
    </main>
  );
}
