import Link from "next/link";
import { NameForm } from "@/components/product/name-form";
import { StatusLegend } from "@/components/product/status-legend";
import { buttonClass } from "@/components/ui/button";
import { readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { listCircle } from "@/lib/trust/service";

export default async function HomePage() {
  const db = getDb();
  const user = await readSessionUser(db);
  const accepted = user ? listCircle(db, user.id).contacts.filter((contact) => contact.status === "accepted") : [];

  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:gap-12">
        <section>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-deep">For a suspicious request</p>
          <h1 className="mt-3 max-w-xl font-display text-[2.6rem] leading-[1.05] tracking-tight text-midnight sm:text-6xl">
            Ask the real person to confirm it.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
            When a call, text, or message claims to be someone you trust, Halo is how you ask that person to answer.
            What works today is your name and your circle. A passkey confirmation is not on this screen yet.
          </p>
          {user ? (
            <p className="mt-5 text-base font-semibold text-midnight">Welcome back. This browser is saved as {user.displayName}.</p>
          ) : (
            <p className="mt-5 text-base leading-7 text-muted">
              Start by saving the name your contacts already use. Then add one person on Circle.
            </p>
          )}
          {accepted.length > 0 ? (
            <p className="mt-4 text-base leading-7 text-midnight">
              Accepted in your circle: {accepted.map((contact) => contact.displayName).join(", ")}.
            </p>
          ) : (
            <p className="mt-4 text-base leading-7 text-muted">No accepted contact yet. A waiting invite cannot confirm a request.</p>
          )}
          <Link href="/circle" className={`${buttonClass("secondary")} mt-5`}>
            {accepted.length > 0 ? "Open your circle" : "Add a trusted contact"}
          </Link>
          <ul className="mt-6 max-w-xl space-y-2 text-base leading-7 text-midnight">
            <li>Halo will not send money.</li>
            <li>Halo will not call, text, or email anyone. Those deliveries are disabled.</li>
            <li>A confirmation will not mean the person is physically safe.</li>
          </ul>
        </section>
        <NameForm initialName={user?.displayName ?? null} />
      </div>
      <StatusLegend />
    </main>
  );
}
