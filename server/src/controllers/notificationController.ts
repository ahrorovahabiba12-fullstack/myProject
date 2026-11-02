import { Request, Response } from "express";
import { NotificationService } from "../services/notificationService";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

const service = new NotificationService();

export const list = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth?.userId;
  if (!userId) throw AppError.unauthorized();
  res.status(200).json(await service.list(userId, req.lang));
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth?.userId;
  if (!userId) throw AppError.unauthorized();
  res.status(200).json(await service.markRead(req.params.id, userId));
});

export const unreadCount = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth?.userId;
  if (!userId) throw AppError.unauthorized();
  res.status(200).json({ count: await service.unreadCount(userId) });
});
