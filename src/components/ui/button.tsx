import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-base font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      variant: {
        primary: "bg-teal text-midnight hover:bg-[#5ed9cb]",
        secondary: "border border-midnight/15 bg-white text-midnight hover:bg-pale",
        ghost: "bg-transparent text-pale hover:bg-white/10",
        danger: "bg-clay text-white hover:bg-[#642f28]",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function buttonClass(
  variant: "primary" | "secondary" | "ghost" | "danger" = "primary",
  className?: string,
) {
  return cn(buttonVariants({ variant }), className);
}

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant ?? "primary", className)} {...props} />;
}
