import { z } from "zod";
import { CAREER_TEST } from "../constants/careerTest";
import { REGION_CODES } from "../constants/regions";

export const submitCareerTestSchema = z.object({
  body: z.object({
    answers: z.array(z.number().int().min(0).max(2)).length(CAREER_TEST.length),
  }),
});

export const studyCentersSchema = z.object({
  query: z.object({
    subject: z.string().min(1).max(40),
    region: z.enum(REGION_CODES as [string, ...string[]]).optional(),
  }),
});
