import { cn } from "@/lib/cn";

export function fieldClass(invalid = false, className?: string) {
  return cn(
    "min-h-12 w-full rounded-2xl border bg-white px-4 text-base text-midnight placeholder:text-muted/70",
    invalid ? "border-clay" : "border-line",
    className,
  );
}
