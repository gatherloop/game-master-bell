import { z } from "zod";

/** Request body for `POST /call`. */
export const CallRequestSchema = z.object({
  tableCode: z.string().min(1),
});

export type CallRequest = z.infer<typeof CallRequestSchema>;
