import { z } from "zod";
import { REGION_CODES } from "../constants/regions";
import { emailField } from "./authValidators";

export const linkParentSchema = z.object({
  body: z.object({ parentEmail: emailField }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    interests: z.array(z.string()).max(20).optional(),
    favoriteSubjects: z.array(z.string()).max(20).optional(),
    goals: z.array(z.string()).max(20).optional(),
    careerInterests: z.array(z.string()).max(20).optional(),
    region: z.enum(REGION_CODES as [string, ...string[]]).nullable().optional(),
  }),
});
