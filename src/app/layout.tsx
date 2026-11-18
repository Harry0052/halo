import type { Metadata } from "next";
import { Newsreader, Outfit } from "next/font/google";
import { SiteFooter } from "@/components/shell/site-footer";
import { SiteHeader } from "@/components/shell/site-header";
import { ToastProvider } from "@/components/ui/toast";
import { readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
});

export const metadata: Metadata = {
  title: {
    default: "Halo",
    template: "%s · Halo",
  },
  description:
    "Ask an enrolled contact to confirm a suspicious request from their own passkey. Halo does not prove someone is safe and does not send money.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await readSessionUser(getDb());

  return (
    <html lang="en" className={`${outfit.variable} ${newsreader.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans text-midnight antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-pale focus:px-4 focus:py-2 focus:text-midnight"
        >
          Skip to content
        </a>
        <SiteHeader displayName={user?.displayName ?? null} />
        <ToastProvider>
          <div className="flex-1">{children}</div>
        </ToastProvider>
        <SiteFooter />
      </body>
    </html>
  );
}
