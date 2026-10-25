import { Request, Response } from "express";
import { StudentService } from "../services/studentService";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

const service = new StudentService();

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.auth?.studentId;
  if (!studentId) throw AppError.forbidden();
  res.status(200).json(await service.getProfile(studentId, req.lang));
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.auth?.studentId;
  if (!studentId) throw AppError.forbidden();
  res.status(200).json(await service.updateProfile(studentId, req.body));
});

export const linkParent = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.auth?.studentId;
  if (!studentId) throw AppError.forbidden();
  res.status(200).json(await service.linkParent(studentId, req.body.parentEmail));
});

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.auth?.studentId;
  if (!studentId) throw AppError.forbidden();
  res.status(200).json(await service.getDashboardSummary(studentId));
});
