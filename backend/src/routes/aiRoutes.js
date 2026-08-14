import express from "express";

import protect from "../middleware/authMiddleware.js";
import { generateMeetingSummary } from "../controllers/aiController.js";

const router = express.Router();

router.post("/meetings/:id/summary", protect, generateMeetingSummary);

export default router;