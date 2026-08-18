import { extractPdfText } from "./pdfService";
import * as mammoth from "mammoth";

export const SUPPORTED_DOCUMENTS = [
  { extension: ".pdf", label: "PDF" },
  { extension: ".docx", label: "Word" },
  { extension: ".txt", label: "Text" },
  { extension: ".md", label: "Markdown" },
  { extension: ".rtf", label: "Rich Text" },
];

export const ACCEPTED_DOCUMENTS = SUPPORTED_DOCUMENTS.map((item) => item.extension).join(",");

function getExtension(name = "") {
  const lastDot = name.lastIndexOf(".");
  return lastDot >= 0 ? name.slice(lastDot).toLowerCase() : "";
}

export function getDocumentType(file) {
  const extension = getExtension(file?.name);
  if (extension === ".pdf") return "pdf";
  if (extension === ".docx") return "docx";
  if (extension === ".txt") return "txt";
  if (extension === ".md") return "md";
  if (extension === ".rtf") return "rtf";
  return "unknown";
}

export function getDocumentLabel(type) {
  return { pdf: "PDF", docx: "Word", txt: "Text", md: "Markdown", rtf: "Rich Text" }[type] || "Document";
}

function cleanText(text = "") {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function stripRtf(text = "") {
  return text.replace(/\\'[0-9a-fA-F]{2}/g, "").replace(/\\u-?\d+\??/g, "").replace(/\\[a-zA-Z]+-?\d* ?/g, "").replace(/[{}]/g, "").replace(/\n+/g, "\n").trim();
}

async function extractWordText(file) {
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return { text: cleanText(result.value), pages: [], pageCount: 0 };
}

async function extractPlainText(file) {
  return { text: cleanText(await file.text()), pages: [], pageCount: 0 };
}

async function extractRtfText(file) {
  return { text: cleanText(stripRtf(await file.text())), pages: [], pageCount: 0 };
}

export async function extractDocument(file) {
  if (!file) throw new Error("No document was selected.");
  const type = getDocumentType(file);
  if (type === "unknown") throw new Error("Unsupported file type. Please choose a PDF, Word (.docx), TXT, Markdown, or RTF document.");

  let extracted;
  if (type === "pdf") extracted = await extractPdfText(file);
  else if (type === "docx") extracted = await extractWordText(file);
  else if (type === "txt" || type === "md") extracted = await extractPlainText(file);
  else extracted = await extractRtfText(file);

  const text = cleanText(extracted?.text || "");
  if (!text) throw new Error("No readable text was found in this document. If it is a scanned PDF or image-only file, Marginal cannot extract its text yet.");

  return { type, format: getDocumentLabel(type), pageCount: extracted?.pageCount || 0, pages: extracted?.pages || [], text };
}
