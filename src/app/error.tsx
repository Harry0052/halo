"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-col px-4 py-16">
      <h1 className="font-display text-5xl tracking-tight text-midnight">This screen did not finish loading</h1>
      <p className="mt-4 max-w-xl text-lg leading-8 text-muted">
        Halo did not change a check. Anything already saved is still on this server. Try the screen again.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-12 items-center rounded-full bg-teal px-5 font-semibold text-midnight"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex min-h-12 items-center rounded-full border border-line bg-white px-5 font-semibold text-midnight"
        >
          Back to Verify
        </Link>
      </div>
    </main>
  );
}
