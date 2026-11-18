import Link from "next/link";
import { PrimaryNav } from "@/components/shell/primary-nav";
import type { NavItem } from "@/components/shell/nav";

export function SiteHeader({ displayName, items }: { displayName: string | null; items: NavItem[] }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-midnight text-pale">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex min-h-12 items-center gap-2.5 rounded-full" aria-label="Halo home">
            <span className="halo-mark" aria-hidden>
              <span />
            </span>
            <span className="font-display text-[1.85rem] leading-none tracking-tight">Halo</span>
          </Link>
          <PrimaryNav items={items} variant="desktop" />
        </div>
        {displayName ? (
          <p className="max-w-[8rem] truncate text-sm font-semibold text-pale sm:max-w-xs">{displayName}</p>
        ) : (
          <p className="text-sm text-pale/80">Not named yet</p>
        )}
      </div>
    </header>
  );
}
