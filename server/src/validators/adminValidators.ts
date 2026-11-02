import { z } from "zod";

export const updateUserStatusSchema = z.object({
  params: z.object({ userId: z.string().uuid() }),
  body: z.object({ status: z.enum(["ACTIVE", "BLOCKED"]) }),
});

export const sendNotificationSchema = z.object({
  body: z
    .object({
      title: z.string().trim().min(1).max(120),
      body: z.string().trim().min(1).max(1000),
      titleRu: z.string().trim().max(120).optional().default(""),
      bodyRu: z.string().trim().max(1000).optional().default(""),
      audience: z.enum(["STUDENTS", "PARENTS", "ALL"]).default("ALL"),
      grade: z.coerce.number().int().min(1).max(11).optional(),
      email: z.string().trim().email().optional(),
    })
    .strict(),
});
