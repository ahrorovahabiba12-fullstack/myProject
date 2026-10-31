import { z } from "zod";

export const startQuizSchema = z.object({
  body: z.object({
    topicId: z.string().uuid(),
  }),
});

export const listTopicsSchema = z.object({
  query: z.object({
    subject: z.string().min(1).max(40),
    grade: z.coerce.number().int().min(1).max(11),
  }),
});

export const submitQuizSchema = z.object({
  body: z.object({
    // Echoed back from startQuiz's response — the signed record of which
    // questions (subject/grade) were served and when; see QuizService.submitQuiz.
    quizToken: z.string().min(1),
    answers: z
      .array(z.object({ questionId: z.string().uuid(), selectedIndex: z.number().int().min(0).max(3) }))
      .min(1),
  }),
});
