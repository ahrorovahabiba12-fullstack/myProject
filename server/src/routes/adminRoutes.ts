import { Router } from "express";
import * as adminController from "../controllers/adminController";
import { requireAuth } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";
import { validate } from "../middleware/validate";
import { updateUserStatusSchema } from "../validators/adminValidators";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("ADMIN"));
adminRouter.get("/stats", adminController.getStats);
adminRouter.get("/users", adminController.listUsers);
adminRouter.patch("/users/:userId/status", validate(updateUserStatusSchema), adminController.updateUserStatus);
adminRouter.get("/active-students-today", adminController.listActiveStudentsToday);
adminRouter.get("/subjects", adminController.listSubjects);
adminRouter.get("/careers", adminController.listCareers);
adminRouter.get("/universities", adminController.listUniversities);
