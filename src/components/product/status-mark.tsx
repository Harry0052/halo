import type { ChallengeView } from "@/lib/challenges/service";

export function StatusMark({
  challenge,
  refreshError,
}: {
  challenge: Pick<ChallengeView, "statusWord" | "reason" | "sample">;
  refreshError?: string | null;
}) {
  return (
    <section className="rounded-[1.4rem] bg-midnight px-5 py-6 text-pale" aria-labelledby="check-status">
      {challenge.sample ? (
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal">Sample</p>
      ) : null}
      <p id="check-status" aria-live="polite" className="font-display text-5xl leading-none tracking-tight text-teal sm:text-6xl">
        {challenge.statusWord}
      </p>
      <p className="mt-4 max-w-xl text-base leading-7 text-pale/85">{challenge.reason}</p>
      {refreshError ? (
        <p role="alert" className="mt-4 text-sm font-semibold text-pale">
          {refreshError}
        </p>
      ) : null}
    </section>
  );
}
