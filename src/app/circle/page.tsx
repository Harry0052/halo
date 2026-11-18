import Link from "next/link";
import { InvitePanel } from "@/components/product/invite-panel";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { inviteSigning } from "@/lib/trust/tokens";
import { listCircle, samplePeople } from "@/lib/trust/service";

export const metadata = { title: "Circle" };

export default async function CirclePage() {
  const db = getDb();
  const user = await readSessionUser(db);
  const circle = user ? listCircle(db, user.id) : { invites: [], contacts: [] };
  const samples = samplePeople(db);
  const localSigning = inviteSigning().source === "local-fallback";
  const accepted = circle.contacts.filter((contact) => contact.status === "accepted");

  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-deep">Trusted circle</p>
      <h1 className="mt-3 font-display text-5xl tracking-tight">People who can confirm a request.</h1>
      <p className="mt-4 text-lg leading-8 text-muted">
        Someone who has not accepted cannot be asked to confirm a request. Halo does not look people up by phone or
        email.
      </p>
      {localSigning ? (
        <p className="mt-4 rounded-2xl bg-midnight px-4 py-3 text-sm leading-6 text-pale">
          Invite links on this server are signed with the local development key. Set HALO_INVITE_SECRET before anyone
          else can reach this server.
        </p>
      ) : null}
      <div className="mt-8 space-y-6">
        {user ? (
          <InvitePanel invites={circle.invites} />
        ) : (
          <div className="rounded-[1.4rem] border border-dashed border-line bg-white px-5 py-8">
            <h2 className="font-display text-3xl tracking-tight">Save your name first</h2>
            <p className="mt-2 text-base leading-7 text-muted">An invite has to come from a name stored on this server.</p>
            <Link href="/" className={`${buttonClass("primary")} mt-5`}>
              Go to Verify
            </Link>
          </div>
        )}
        <section aria-labelledby="accepted-heading">
          <h2 id="accepted-heading" className="font-display text-3xl tracking-tight">
            Accepted
          </h2>
          {accepted.length === 0 ? (
            <p className="mt-3 rounded-[1.4rem] border border-dashed border-line bg-white px-5 py-6 text-base leading-7 text-muted">
              No one has accepted yet. An invite link is not a trusted contact.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {accepted.map((contact) => (
                <li key={contact.id} className="flex items-center justify-between gap-3 rounded-[1.4rem] bg-white px-5 py-4 ring-1 ring-line">
                  <p className="text-lg font-semibold">{contact.displayName}</p>
                  <Badge tone="accepted">Accepted</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="sample-heading">
          <div className="flex items-center gap-3">
            <h2 id="sample-heading" className="font-display text-3xl tracking-tight">
              Sample
            </h2>
            <Badge tone="sample">Sample</Badge>
          </div>
          <p className="mt-2 text-base leading-7 text-muted">
            Alex and Jordan are sample data. They are not in your circle, and you cannot ask them to confirm a request.
          </p>
          {samples.length === 0 ? (
            <p className="mt-3 text-sm text-muted">The sample circle is not on this server.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {samples.map((person) => (
                <li key={person.id} className="flex items-center justify-between gap-3 rounded-[1.4rem] bg-white px-5 py-4 ring-1 ring-line">
                  <p className="text-lg font-semibold">{person.displayName}</p>
                  <Badge tone="sample">Not your contact</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
