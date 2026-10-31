import { Router } from "express";
import * as quizController from "../controllers/quizController";
import { validate } from "../middleware/validate";
import { listTopicsSchema, startQuizSchema, submitQuizSchema } from "../validators/quizValidators";
import { requireAuth } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";

export const quizRouter = Router();

quizRouter.use(requireAuth, requireRole("STUDENT"));
quizRouter.get("/subjects", quizController.subjects);
quizRouter.get("/topics", validate(listTopicsSchema), quizController.topics);
quizRouter.post("/start", validate(startQuizSchema), quizController.start);
quizRouter.post("/submit", validate(submitQuizSchema), quizController.submit);
