import { Request, Response } from "express";
import { QuizService } from "../services/quizService";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

const quizService = new QuizService();

export const start = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.auth?.studentId;
  if (!studentId) throw AppError.forbidden("Faqat student test boshlashi mumkin");
  const { subjectId, grade } = req.body;
  const result = await quizService.startQuiz(studentId, subjectId, grade, req.lang);
  res.status(200).json(result);
});

export const submit = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.auth?.studentId;
  if (!studentId) throw AppError.forbidden("Faqat student test topshira oladi");
  const { quizToken, answers } = req.body;
  const result = await quizService.submitQuiz(studentId, quizToken, answers, req.lang);
  res.status(200).json(result);
});
