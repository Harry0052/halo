import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-4 h-16 w-full max-w-xl" />
      <Skeleton className="mt-4 h-24 w-full max-w-xl" />
      <Skeleton className="mt-8 h-56 w-full max-w-md" />
    </main>
  );
}
