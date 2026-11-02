import { Request, Response } from "express";
import { QuizService } from "../services/quizService";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

const quizService = new QuizService();

export const start = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.auth?.studentId;
  if (!studentId) throw AppError.forbidden("Faqat student test boshlashi mumkin");
  const result = await quizService.startQuiz(studentId, req.body.topicId, req.lang);
  res.status(200).json(result);
});

export const submit = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.auth?.studentId;
  if (!studentId) throw AppError.forbidden("Faqat student test topshira oladi");
  const { quizToken, answers } = req.body;
  const result = await quizService.submitQuiz(studentId, quizToken, answers, req.lang);
  res.status(200).json(result);
});

export const subjects = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.auth?.studentId;
  if (!studentId) throw AppError.forbidden("Faqat student uchun");
  res.status(200).json(await quizService.listSubjects(studentId, req.lang));
});

export const topics = asyncHandler(async (req: Request, res: Response) => {
  const subject = String(req.query.subject);
  const grade = Number(req.query.grade);
  res.status(200).json(await quizService.listTopics(subject, grade, req.lang));
});
