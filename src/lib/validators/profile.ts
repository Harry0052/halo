import { z } from "zod";

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Use at least 2 characters.")
  .max(40, "Use 40 characters or fewer.")
  .regex(
    /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} .'-]*$/u,
    "Use letters, numbers, spaces, apostrophes, or hyphens.",
  )
  .refine((value) => !value.includes("@"), "Leave out an email address. Halo does not look people up that way.");

export const profileBodySchema = z
  .object({
    displayName: displayNameSchema,
  })
  .strict();
