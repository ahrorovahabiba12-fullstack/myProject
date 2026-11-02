import { Router } from "express";
import * as dtmController from "../controllers/dtmController";
import { requireAuth } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";
import { validate } from "../middleware/validate";
import { startDtmSchema, submitDtmSchema } from "../validators/dtmValidators";

// "Namunaviy DTM testlari": DTM-format practice blocks per subject.
export const dtmRouter = Router();
dtmRouter.use(requireAuth, requireRole("STUDENT"));
dtmRouter.get("/subjects", dtmController.subjects);
dtmRouter.post("/start", validate(startDtmSchema), dtmController.start);
dtmRouter.post("/submit", validate(submitDtmSchema), dtmController.submit);
