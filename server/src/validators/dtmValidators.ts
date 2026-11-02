import { z } from "zod";

export const startDtmSchema = z.object({
  body: z.object({
    subject: z.string().min(1).max(40),
    block: z.enum(["first", "second", "compulsory"]),
  }),
});

export const submitDtmSchema = z.object({
  body: z.object({
    dtmToken: z.string().min(1),
    answers: z.array(z.object({ questionId: z.string().uuid(), selectedIndex: z.number().int().min(0).max(5) })).max(30),
  }),
});
