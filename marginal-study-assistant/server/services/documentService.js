import db from "../db.js";

export async function getOwnedDocument(
  documentId,
  userId
) {
  const result = await db.query(
    `
      SELECT
        id,
        user_id,
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
      Number(documentId),
      Number(userId),
    ]
  );

  const row = result.rows[0];

  if (!row) {
    const error = new Error(
      "Document not found or you do not have access to it."
    );

    error.status = 404;

    throw error;
  }

  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    name: row.name,
    size: Number(row.size),
    mimeType: row.mime_type,
    type: row.type,
    format: row.format,
    pageCount: Number(row.page_count),
    pages: JSON.parse(row.pages_json || "[]"),
    text: row.text,
    uploadedAt: row.uploaded_at,
  };
}