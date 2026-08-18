import express from "express";

import db from "../db.js";

import { requireAuth } from "../auth.js";

const router = express.Router();

router.use(requireAuth);

function serialize(row, includeText = false) {
  return {
    id: Number(row.id),

    name: row.name,

    size: Number(row.size),

    mimeType: row.mime_type,

    type: row.type,

    format: row.format,

    pageCount: Number(row.page_count),

    pages: JSON.parse(row.pages_json || "[]"),

    uploadedAt: row.uploaded_at,

    ...(includeText
      ? { text: row.text }
      : {}),
  };
}

router.get("/", async (req, res) => {
  try {
    const result = await db.query(
      `
        SELECT
          id,
          name,
          size,
          mime_type,
          type,
          format,
          page_count,
          pages_json,
          uploaded_at
        FROM documents
        WHERE user_id = $1
        ORDER BY uploaded_at DESC
      `,
      [req.user.id]
    );

    res.json({
      success: true,
      data: result.rows.map((row) =>
        serialize(row)
      ),
    });
  } catch (error) {
    console.error("Get documents error:", error);

    res.status(500).json({
      success: false,
      message: "Could not load documents.",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await db.query(
      `
        SELECT
          id,
          name,
          size,
          mime_type,
          type,
          format,
          page_count,
          pages_json,
          text,
          uploaded_at
        FROM documents
        WHERE id = $1
          AND user_id = $2
      `,
      [
        Number(req.params.id),
        req.user.id,
      ]
    );

    const row = result.rows[0];

    if (!row) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    res.json({
      success: true,
      data: serialize(row, true),
    });
  } catch (error) {
    console.error("Get document error:", error);

    res.status(500).json({
      success: false,
      message: "Could not load document.",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      name,
      size,
      mimeType,
      type,
      format,
      pageCount,
      pages,
      text,
    } = req.body || {};

    if (
      !name ||
      !text ||
      !String(text).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A document name and readable text are required.",
      });
    }

    const result = await db.query(
      `
        INSERT INTO documents (
          user_id,
          name,
          size,
          mime_type,
          type,
          format,
          page_count,
          pages_json,
          text
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9
        )
        RETURNING
          id,
          name,
          size,
          mime_type,
          type,
          format,
          page_count,
          pages_json,
          uploaded_at
      `,
      [
        req.user.id,

        String(name).slice(0, 500),

        Math.max(
          0,
          Number(size) || 0
        ),

        String(mimeType || ""),

        String(type || "unknown"),

        String(format || "Document"),

        Math.max(
          0,
          Number(pageCount) || 0
        ),

        JSON.stringify(
          Array.isArray(pages)
            ? pages
            : []
        ),

        String(text),
      ]
    );

    res.status(201).json({
      success: true,
      data: serialize(result.rows[0]),
    });
  } catch (error) {
    console.error(
      "Create document error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Could not save the document.",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await db.query(
      `
        DELETE FROM documents
        WHERE id = $1
          AND user_id = $2
      `,
      [
        Number(req.params.id),
        req.user.id,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    res.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Delete document error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Could not delete the document.",
    });
  }
});

export default router;