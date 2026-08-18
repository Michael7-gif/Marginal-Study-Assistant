import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { fileURLToPath } from "url";
import path from "path";

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(serverDir, ".env") });

const apiKey = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

if (!apiKey) {
  throw new Error("GEMINI_API_KEY was not found. Add it to server/.env.");
}

const ai = new GoogleGenAI({ apiKey });

async function generateJson(prompt) {
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response?.text?.trim();
    if (!text) throw new Error("Gemini returned an empty response.");
    return text;
  } catch (error) {
    console.error("Gemini request failed:", error?.message || error);
    throw new Error(
      error?.message ||
      "Gemini could not process the document. Check the API key, model access, and server configuration."
    );
  }
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch {
    console.error(`Gemini returned invalid ${label} JSON:`);
    console.error(text);
    throw new Error(`The AI returned an invalid ${label} response.`);
  }
}

export async function generateSummary(text) {
  if (!text?.trim()) throw new Error("No document text was provided.");

  const prompt = `
You are Marginal, an AI study assistant.
Analyze the student's document carefully and create study material based ONLY on the document.
Return ONLY valid JSON using exactly this structure:
{
  "shortSummary": "A concise summary.",
  "detailedSummary": "A detailed explanation.",
  "keyPoints": ["Important point 1", "Important point 2"],
  "importantTerms": [{"term":"Term","meaning":"Meaning based on the document"}],
  "questions": [{"question":"Question based on the document","answer":"Correct answer based on the document"}]
}
Requirements:
- Generate exactly 10 study questions.
- Questions must be based ONLY on the document.
- Do not invent information.
- Return ONLY JSON.
DOCUMENT:
${text}
`;

  return generateJson(prompt);
}

export async function generateQuiz(text, questionCount = 10, questionType = "mixed", difficulty = "mixed") {
  if (!text?.trim()) throw new Error("No document text was provided.");

  const allowedCounts = [10,20,30,40,50,60,70,80,90,100];
  const count = allowedCounts.includes(Number(questionCount)) ? Number(questionCount) : 10;
  const allowedTypes = ["multiple-choice", "true-false", "short-answer", "essay", "mixed"];
  const type = allowedTypes.includes(questionType) ? questionType : "mixed";
  const allowedDifficulties = ["easy", "medium", "hard", "mixed"];
  const level = allowedDifficulties.includes(difficulty) ? difficulty : "mixed";

  const typeInstructions = {
    "multiple-choice": `Use only multiple-choice questions. Each must have type "multiple-choice", exactly four options, and answer equal to the exact correct option.`,
    "true-false": `Use only true/false questions. Each must have type "true-false", options ["True","False"], and answer exactly "True" or "False".`,
    "short-answer": `Use only short-answer questions. Each must have type "short-answer" and a concise answer.`,
    essay: `Use only essay questions. Each must have type "essay" and a model answer based only on the document.`,
    mixed: `Use a balanced mixture of multiple-choice, true-false, short-answer, and essay questions. Every question must contain its type.`,
  }[type];

  const difficultyInstructions = level === "mixed"
    ? "Use a sensible mixture of easy, medium, and hard questions."
    : `All questions must be ${level} difficulty.`;

  const prompt = `
You are Marginal, an AI study assistant.
Create a quiz from the student's document.

ABSOLUTE REQUIREMENT: return EXACTLY ${count} questions in the questions array. Never return more than ${count}. Never return fewer than ${count}.

QUESTION TYPE: ${type}
${typeInstructions}

DIFFICULTY: ${level}
${difficultyInstructions}

Rules:
- Every question must be supported ONLY by the document.
- Do not invent facts.
- Avoid duplicates.
- Cover different parts of the document when possible.
- Every question must have a correct answer.
- Return ONLY valid JSON. No markdown or commentary.

Return exactly:
{
  "questions": [
    {
      "question": "Question",
      "type": "multiple-choice",
      "difficulty": "easy",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Correct option"
    }
  ]
}

DOCUMENT:
${text}
`;

  const parsed = parseJson(await generateJson(prompt), "quiz");
  if (!Array.isArray(parsed?.questions)) throw new Error("The AI did not return a valid questions array.");

 
  const questions = parsed.questions.slice(0, count);
  if (questions.length !== count) {
    throw new Error(`The AI generated ${questions.length} questions instead of ${count}. Please try again.`);
  }

  return JSON.stringify({ questions });
}

export async function generateQA(text, question) {
  if (!text?.trim()) throw new Error("No document text was provided.");
  if (!question?.trim()) throw new Error("No question was provided.");
  const prompt = `
You are Marginal, an AI study assistant.
Answer the student's question using ONLY the document.
If the document does not provide enough information, say so clearly.
Return ONLY valid JSON in exactly this structure:
{"answer":"Your answer based only on the document.","source":"A short description of where the answer came from in the document."}
DOCUMENT:
${text}
STUDENT QUESTION:
${question}
`;
  return generateJson(prompt);
}

export async function generateGlossary(text) {
  if (!text?.trim()) throw new Error("No document text was provided.");
  const prompt = `
You are Marginal, an AI study assistant.
Create a useful academic glossary from the document using ONLY information found in it.
Return ONLY valid JSON:
{"terms":[{"term":"Important term","definition":"Clear definition based only on the document.","importance":"Why this term matters for studying this document."}]}
Generate between 5 and 20 meaningful terms when the document supports them.
DOCUMENT:
${text}
`;
  return generateJson(prompt);
}

export async function generateSections(text) {
  if (!text?.trim()) throw new Error("No document text was provided.");
  const prompt = `
You are Marginal, an AI study assistant.
Organize the document into meaningful academic study sections using ONLY information contained in the document.
Return ONLY valid JSON:
{"sections":[{"title":"Section title","description":"Short explanation of what this section covers.","keyPoints":["Important point from this section","Another important point"]}]}
Keep the number of sections reasonable and group related information.
DOCUMENT:
${text}
`;
  return generateJson(prompt);
}
