import { Router } from "express";
import * as careerController from "../controllers/careerController";
import { requireAuth } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";
import { validate } from "../middleware/validate";
import { studyCentersSchema, submitCareerTestSchema } from "../validators/careerValidators";

export const careerRouter = Router();
careerRouter.use(requireAuth, requireRole("STUDENT"));
careerRouter.get("/recommendations", careerController.getRecommendations);
careerRouter.get("/roadmap/:careerCode", careerController.getRoadmap);
careerRouter.get("/universities", careerController.getUniversities);
careerRouter.get("/catalog", careerController.getCatalog);
// "Kasb tanlash": interest test -> careers -> career page with exams, universities, study centres.
careerRouter.get("/test", careerController.getTest);
careerRouter.get("/test/latest", careerController.latestTest);
careerRouter.post("/test", validate(submitCareerTestSchema), careerController.submitTest);
careerRouter.get("/study-centers", validate(studyCentersSchema), careerController.getStudyCenters);
careerRouter.get("/details/:careerCode", careerController.getDetails);
