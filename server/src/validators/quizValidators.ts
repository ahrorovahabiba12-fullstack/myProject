import { z } from "zod";

export const startQuizSchema = z.object({
  body: z.object({
    subjectId: z.string().uuid(),
    grade: z.number().int().min(1).max(11),
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
