import { Request, Response } from "express";
import { DtmService } from "../services/dtmService";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

const service = new DtmService();

export const subjects = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(await service.listSubjects(req.lang));
});

export const start = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.auth?.studentId;
  if (!studentId) throw AppError.forbidden();
  res.status(200).json(await service.start(studentId, req.body.subject, req.body.block, req.lang));
});

export const submit = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.auth?.studentId;
  if (!studentId) throw AppError.forbidden();
  res.status(200).json(await service.submit(studentId, req.body.dtmToken, req.body.answers, req.lang));
});
