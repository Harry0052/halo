import { cn } from "@/lib/cn";

const tones = {
  neutral: "bg-pale text-midnight",
  sample: "bg-white text-midnight ring-1 ring-line",
  waiting: "bg-midnight text-pale",
  accepted: "bg-teal text-midnight",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
}) {
  return (
    <span className={cn("inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}
