import { Request, Response } from "express";
import { CareerService } from "../services/careerService";
import { CareerChoiceService } from "../services/careerChoiceService";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

const service = new CareerService();

export const getRecommendations = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.auth?.studentId;
  if (!studentId) throw AppError.forbidden();
  res.status(200).json(await service.getCareerRecommendations(studentId, req.lang));
});

export const getRoadmap = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.auth?.studentId;
  if (!studentId) throw AppError.forbidden();
  res.status(200).json(await service.listRoadmap(studentId, req.params.careerCode, req.lang));
});

export const getUniversities = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.auth?.studentId;
  if (!studentId) throw AppError.forbidden();
  res.status(200).json(await service.listUniversities(studentId, req.lang));
});

export const getCatalog = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(await service.listCareerCatalog(req.lang));
});

const choice = new CareerChoiceService();

export const getTest = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(choice.getTest(req.lang));
});

export const submitTest = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.auth?.studentId;
  if (!studentId) throw AppError.forbidden();
  res.status(200).json(await choice.submitTest(studentId, req.body.answers, req.lang));
});

export const latestTest = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.auth?.studentId;
  if (!studentId) throw AppError.forbidden();
  res.status(200).json(await choice.latest(studentId, req.lang));
});

export const getDetails = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.auth?.studentId;
  if (!studentId) throw AppError.forbidden();
  res.status(200).json(await choice.careerDetails(studentId, req.params.careerCode, req.lang));
});

export const getStudyCenters = asyncHandler(async (req: Request, res: Response) => {
  const region = req.query.region ? String(req.query.region) : undefined;
  res.status(200).json(await choice.studyCenters(String(req.query.subject), region, req.lang));
});
