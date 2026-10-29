import { Request, Response } from "express";
import { AdminService } from "../services/adminService";
import { asyncHandler } from "../utils/asyncHandler";

const service = new AdminService();

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(await service.getStats());
});

export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(await service.listUsers());
});

export const updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.updateUserStatus(req.auth!.userId, req.params.userId, req.body.status);
  res.status(200).json(result);
});

export const listActiveStudentsToday = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(await service.listActiveStudentsToday());
});

export const listSubjects = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(await service.listSubjects());
});

export const listCareers = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(await service.listCareers());
});

export const listUniversities = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(await service.listUniversities());
});
