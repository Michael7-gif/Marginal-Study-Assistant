import express from "express";

import {
  getProgress,
  getProgressStats,
  recordDocumentStudied,
  recordQuizResult,
  recordStudyActivity,
  clearProgress,
} from "../services/progressService.js";

import { requireAuth } from "../auth.js";

const router = express.Router();

router.use(requireAuth);




router.get("/", async (req, res) => {
  try {
    const data = await getProgress(
      req.user.id
    );

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "Get progress error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Could not load study progress.",
    });
  }
});




router.get("/stats", async (req, res) => {
  try {
    const data =
      await getProgressStats(
        req.user.id
      );

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "Get progress stats error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Could not load progress statistics.",
    });
  }
});




router.post("/document", async (req, res) => {
  try {
    await recordDocumentStudied(
      req.user.id,
      req.body?.document
    );

    res.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Record document progress error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Could not record document progress.",
    });
  }
});




router.post("/quiz", async (req, res) => {
  try {
    const result =
      await recordQuizResult({
        userId: req.user.id,

        document:
          req.body?.document,

        score:
          req.body?.score,

        totalQuestions:
          req.body?.totalQuestions,

        questionType:
          req.body?.questionType,

        difficulty:
          req.body?.difficulty,
      });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "Record quiz result error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Could not record quiz result.",
    });
  }
});




router.post("/activity", async (req, res) => {
  try {
    const result =
      await recordStudyActivity(
        req.user.id,
        {
          type:
            req.body?.type,

          title:
            req.body?.title,

          description:
            req.body?.description,
        }
      );

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "Record study activity error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Could not record study activity.",
    });
  }
});




router.delete("/", async (req, res) => {
  try {
    await clearProgress(
      req.user.id
    );

    res.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Clear progress error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Could not clear study progress.",
    });
  }
});


export default router;