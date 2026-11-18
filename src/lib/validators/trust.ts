import { z } from "zod";

export const confirmInviteSchema = z
  .object({
    token: z.string().trim().min(20).max(500),
  })
  .strict();
