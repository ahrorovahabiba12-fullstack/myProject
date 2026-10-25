import { z } from "zod";

// Emails are stored and compared lowercased — "Ali@mail.uz" and "ali@mail.uz"
// are the same inbox, and treating them as different let the same person open
// two accounts, fail to log in with different casing, or silently miss linking
// to a parent whose email they typed with a capital letter.
export const emailField = z.string().trim().toLowerCase().email();

export const registerSchema = z.object({
  body: z.object({
    email: emailField,
    password: z.string().min(8, "Parol kamida 8 belgidan iborat bo'lishi kerak"),
    role: z.enum(["STUDENT", "PARENT"]),
    fullName: z.string().min(2),
    // Required only for STUDENT role; validated in the service layer
    // because cross-field rules don't belong in a shape-only schema.
    // 4-11 matches the grades that actually have quiz content (and the
    // Register page's own picker) — a grade 1-3 account would have nothing.
    grade: z.number().int().min(4).max(11).optional(),
    parentEmail: emailField.optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: emailField,
    password: z.string().min(1),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>["body"];
export type LoginInput = z.infer<typeof loginSchema>["body"];
