import express from "express";
import { generateSummary } from "../services/aiService.js";
import { requireAuth } from "../auth.js";
import { getOwnedDocument } from "../services/documentService.js";

const router = express.Router();

router.use(requireAuth);

router.post("/summarize", async (req, res) => {
  try {
    const { documentId } = req.body || {};

    const doc = await getOwnedDocument(
      documentId,
      req.user.id
    );

    const result = await generateSummary(
      doc.text
    );

    let data;

    try {
      data = JSON.parse(result);
    } catch {
      return res.status(500).json({
        success: false,
        message:
          "The AI returned an invalid summary response.",
      });
    }

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Summary error:", error);

    return res.status(
      error.status || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Could not generate the summary.",
    });
  }
});

export default router;