import express from "express";

import protect from "../middleware/authMiddleware.js";
import audioUpload from "../middleware/audioUploadMiddleware.js";
import {
  generateMeetingSummary,
  transcribeMeetingChunk,
  finalizeMeetingAI,
} from "../controllers/aiController.js";

const router = express.Router();

const handleAudioUpload = (req, res, next) => {
  audioUpload.single("audio")(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        message: err.message || "Audio upload failed",
      });
    }
    next();
  });
};

// New AI pipeline: audio chunk -> speech-to-text -> transcript storage.
router.post(
  "/meetings/:id/transcript-chunk",
  protect,
  handleAudioUpload,
  transcribeMeetingChunk,
);

// Final transcript -> structured AI analysis.
router.post(
  "/meetings/:id/finalize",
  protect,
  finalizeMeetingAI,
);

// Backward-compatible endpoint used by the existing Meeting Details page.
router.post("/meetings/:id/summary", protect, generateMeetingSummary);

export default router;
