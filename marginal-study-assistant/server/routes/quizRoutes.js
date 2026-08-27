import express from "express";
import { generateQuiz } from "../services/aiService.js";
import { requireAuth } from "../auth.js";
import { getOwnedDocument } from "../services/documentService.js";

const router = express.Router();

router.use(requireAuth);

router.post("/generate", async (req, res) => {
  try {
    const {
      documentId,
      questionCount = 10,
      questionType = "mixed",
      difficulty = "mixed",
    } = req.body || {};

    const numericDocumentId = Number(documentId);

    if (
      !documentId ||
      !Number.isInteger(numericDocumentId) ||
      numericDocumentId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid document ID. Please open the document again.",
      });
    }

    const numericQuestionCount = Number(questionCount);

    const allowedCounts = [
      10,
      20,
      30,
      40,
      50,
      60,
      70,
      80,
      90,
      100,
    ];

    if (!allowedCounts.includes(numericQuestionCount)) {
      return res.status(400).json({
        success: false,
        message:
          "Question count must be between 10 and 100.",
      });
    }

    const doc = await getOwnedDocument(
      numericDocumentId,
      req.user.id
    );

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    if (!doc.text?.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "This document does not contain enough text to generate a quiz.",
      });
    }

    const result = await generateQuiz(
      doc.text,
      numericQuestionCount,
      questionType,
      difficulty
    );

    let data;

    try {
      data = JSON.parse(result);
    } catch {
      return res.status(500).json({
        success: false,
        message:
          "The AI returned an invalid quiz response.",
      });
    }

    if (!Array.isArray(data?.questions)) {
      return res.status(500).json({
        success: false,
        message:
          "The AI did not return valid quiz questions.",
      });
    }

    if (
      data.questions.length !== numericQuestionCount
    ) {
      return res.status(500).json({
        success: false,
        message:
          `Could not generate exactly ${numericQuestionCount} questions. Please try again.`,
      });
    }

    return res.json({
      success: true,
      data: {
        questions: data.questions,
      },
    });
  } catch (error) {
    console.error(
      "Quiz generation error:",
      error
    );

    return res.status(error.status || 500).json({
      success: false,
      message:
        error?.message ||
        "Could not generate quiz questions.",
    });
  }
});

export default router;
