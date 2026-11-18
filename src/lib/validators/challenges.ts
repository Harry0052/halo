import { z } from "zod";

export const purposeSchema = z
  .string()
  .trim()
  .min(8, "Say a little more about the request, at least 8 characters.")
  .max(160, "Keep it to 160 characters. Leave out account numbers.")
  .refine((value) => !/\d(?:[ -]*\d){11,}/.test(value), {
    message: "Leave out card numbers, account numbers, and long codes. Halo does not store payment details.",
  });

export const createChallengeSchema = z
  .object({
    contactId: z.string().uuid("Choose a person from your circle."),
    purpose: purposeSchema,
    expiresInMinutes: z.union([z.literal(5), z.literal(15), z.literal(30)]),
    idempotencyKey: z.string().uuid(),
  })
  .strict();
