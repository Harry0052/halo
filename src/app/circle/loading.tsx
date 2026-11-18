import { Skeleton } from "@/components/ui/skeleton";

export default function CircleLoading() {
  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-14 w-full max-w-md" />
      <Skeleton className="mt-8 h-48 w-full" />
    </main>
  );
}
