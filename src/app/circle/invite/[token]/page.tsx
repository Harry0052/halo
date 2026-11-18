import Link from "next/link";
import { AcceptInvite } from "@/components/product/accept-invite";
import { NameForm } from "@/components/product/name-form";
import { buttonClass } from "@/components/ui/button";
import { readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { INVALID_INVITE } from "@/lib/trust/sample";
import { previewInvite } from "@/lib/trust/service";

export const metadata = { title: "Invite" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getDb();
  const user = await readSessionUser(db);
  const preview = previewInvite(db, token, user?.id ?? null);

  return (
    <main id="main" className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
      {!preview.ok ? (
        <>
          <h1 className="font-display text-5xl tracking-tight">Invite</h1>
          <p role="alert" className="mt-4 text-lg leading-8 text-muted">
            {INVALID_INVITE}
          </p>
          <Link href="/circle" className={`${buttonClass("primary")} mt-8`}>
            Back to Circle
          </Link>
        </>
      ) : preview.own ? (
        <>
          <h1 className="font-display text-5xl tracking-tight">This is your invite</h1>
          <p className="mt-4 text-lg leading-8 text-muted">
            You created this link. The other person opens it on their own browser. Accepting it yourself does not add a
            contact.
          </p>
          <Link href="/circle" className={`${buttonClass("primary")} mt-8`}>
            Back to Circle
          </Link>
        </>
      ) : (
        <div className="space-y-6">
          {user ? (
            <AcceptInvite token={token} ownerName={preview.ownerName} />
          ) : (
            <>
              <div>
                <h1 className="font-display text-5xl tracking-tight">{preview.ownerName} invited you</h1>
                <p className="mt-4 text-lg leading-8 text-muted">
                  Save the name they will see, on this page. Then you can accept. Halo does not create an account with
                  an email address.
                </p>
              </div>
              <NameForm initialName={null} />
            </>
          )}
        </div>
      )}
    </main>
  );
}
