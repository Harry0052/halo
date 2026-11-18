import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-col px-4 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-deep">404</p>
      <h1 className="mt-3 font-display text-5xl tracking-tight text-midnight">That page is not in Halo</h1>
      <p className="mt-4 max-w-xl text-lg leading-8 text-muted">
        The address does not match a screen. Nothing was confirmed, denied, or sent.
      </p>
      <Link href="/" className={`${buttonClass("primary")} mt-8 w-fit`}>
        Back to Verify
      </Link>
    </main>
  );
}
