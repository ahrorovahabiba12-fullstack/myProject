import { Router } from "express";
import * as studentController from "../controllers/studentController";
import { requireAuth } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";
import { validate } from "../middleware/validate";
import { linkParentSchema, updateProfileSchema } from "../validators/studentValidators";

export const studentRouter = Router();
studentRouter.use(requireAuth, requireRole("STUDENT"));
studentRouter.get("/me", studentController.getProfile);
studentRouter.patch("/me", validate(updateProfileSchema), studentController.updateProfile);
studentRouter.put("/me/parent", validate(linkParentSchema), studentController.linkParent);
studentRouter.get("/dashboard", studentController.getDashboard);
