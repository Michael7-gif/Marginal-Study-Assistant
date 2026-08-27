
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { fileURLToPath } from "url";
import path from "path";

const serverDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

dotenv.config({
  path: path.join(serverDir, ".env"),
});

const apiKey = process.env.GEMINI_API_KEY;
const MODEL =
  process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

if (!apiKey) {
  throw new Error(
    "GEMINI_API_KEY was not found. Add it to server/.env."
  );
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

    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    return text;
  } catch (error) {
    console.error(
      "Gemini request failed:",
      error?.message || error
    );

    throw new Error(
      error?.message ||
        "Gemini could not process the document."
    );
  }
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch {
    console.error(
      `Gemini returned invalid ${label} JSON:`
    );
    console.error(text);

    throw new Error(
      `The AI returned an invalid ${label} response.`
    );
  }
}

function normalizeQuestion(question) {
  if (!question || typeof question !== "object") {
    return null;
  }

  const normalized = {
    question: String(question.question || "").trim(),
    type: String(question.type || "")
      .trim()
      .toLowerCase(),
    difficulty: String(question.difficulty || "")
      .trim()
      .toLowerCase(),
    answer: String(question.answer || "").trim(),
  };

  if (
    !normalized.question ||
    !normalized.answer
  ) {
    return null;
  }

  const allowedTypes = [
    "multiple-choice",
    "true-false",
    "short-answer",
    "essay",
  ];

  if (!allowedTypes.includes(normalized.type)) {
    return null;
  }

  if (
    !["easy", "medium", "hard"].includes(
      normalized.difficulty
    )
  ) {
    normalized.difficulty = "medium";
  }

  if (normalized.type === "multiple-choice") {
    if (
      !Array.isArray(question.options) ||
      question.options.length !== 4
    ) {
      return null;
    }

    normalized.options = question.options.map((option) =>
      String(option).trim()
    );

    if (
      normalized.options.some(
        (option) => !option
      )
    ) {
      return null;
    }

    const correctOption = normalized.options.find(
      (option) =>
        option.toLowerCase() ===
        normalized.answer.toLowerCase()
    );

    if (!correctOption) {
      return null;
    }

    normalized.answer = correctOption;
  }

  if (normalized.type === "true-false") {
    normalized.options = ["True", "False"];

    const answer = normalized.answer.toLowerCase();

    if (!["true", "false"].includes(answer)) {
      return null;
    }

    normalized.answer =
      answer === "true" ? "True" : "False";
  }

  return normalized;
}

function questionKey(question) {
  return String(question.question || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function removeDuplicateQuestions(questions) {
  const seen = new Set();
  const unique = [];

  for (const question of questions) {
    const key = questionKey(question);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(question);
  }

  return unique;
}

function getTypeInstructions(type) {
  switch (type) {
    case "multiple-choice":
      return `
Generate only multiple-choice questions.

Each question MUST:
- have type "multiple-choice"
- contain exactly 4 options
- contain one correct answer
- have the answer exactly match one option
`;

    case "true-false":
      return `
Generate only true-false questions.

Each question MUST:
- have type "true-false"
- have options ["True", "False"]
- have answer "True" or "False"
`;

    case "short-answer":
      return `
Generate only short-answer questions.

Each question MUST:
- have type "short-answer"
- have a concise answer
`;

    case "essay":
      return `
Generate only essay questions.

Each question MUST:
- have type "essay"
- have a model answer supported by the document
`;

    default:
      return `
Generate a mixture of:
- multiple-choice
- true-false
- short-answer
- essay

Distribute the question types reasonably.
`;
  }
}

function getDifficultyInstructions(level) {
  if (level === "mixed") {
    return `
Use a mixture of easy, medium, and hard questions.
`;
  }

  return `
Every question must be ${level} difficulty.
`;
}

function buildPreviousQuestions(existingQuestions) {
  if (!existingQuestions?.length) {
    return "";
  }

  const recent = existingQuestions.slice(-20);

  return `
Some questions have already been generated.

DO NOT repeat these questions:

${recent
  .map(
    (q, index) =>
      `${index + 1}. ${q.question}`
  )
  .join("\n")}
`;
}

async function generateQuizBatch({
  text,
  batchSize,
  questionType,
  difficulty,
  existingQuestions,
}) {
  const prompt = `
You are Marginal, an AI study assistant.

Generate exactly ${batchSize} UNIQUE quiz questions.

The questions must be based ONLY on the document.

QUESTION TYPE:
${questionType}

${getTypeInstructions(questionType)}

DIFFICULTY:
${difficulty}

${getDifficultyInstructions(difficulty)}

${buildPreviousQuestions(existingQuestions)}

IMPORTANT RULES:

1. Generate exactly ${batchSize} questions.
2. Every question must be meaningfully different.
3. Do not repeat or closely rephrase previous questions.
4. Do not invent information.
5. Every answer must be supported by the document.
6. Cover different concepts, definitions, examples, processes,
   relationships, comparisons, facts, applications, and explanations.
7. Avoid asking the same fact in different wording.
8. Return ONLY JSON.
9. Do not use markdown.
10. Do not add commentary.

Return this exact structure:

{
  "questions": [
    {
      "question": "Question",
      "type": "multiple-choice",
      "difficulty": "easy",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "answer": "Option A"
    }
  ]
}

For true-false:

{
  "question": "Question",
  "type": "true-false",
  "difficulty": "medium",
  "options": ["True", "False"],
  "answer": "True"
}

For short-answer:

{
  "question": "Question",
  "type": "short-answer",
  "difficulty": "medium",
  "answer": "Correct answer"
}

For essay:

{
  "question": "Question",
  "type": "essay",
  "difficulty": "hard",
  "answer": "Model answer based only on the document"
}

DOCUMENT:
${text}
`;

  const raw = await generateJson(prompt);
  const parsed = parseJson(raw, "quiz");

  if (!Array.isArray(parsed?.questions)) {
    throw new Error(
      "The AI did not return a valid questions array."
    );
  }

  const normalized = parsed.questions
    .map(normalizeQuestion)
    .filter(Boolean);

  return removeDuplicateQuestions(normalized);
}

export async function generateQuiz(
  text,
  questionCount = 10,
  questionType = "mixed",
  difficulty = "mixed"
) {
  if (!text?.trim()) {
    throw new Error(
      "No document text was provided."
    );
  }

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

  const count = allowedCounts.includes(
    Number(questionCount)
  )
    ? Number(questionCount)
    : 10;

  const allowedTypes = [
    "multiple-choice",
    "true-false",
    "short-answer",
    "essay",
    "mixed",
  ];

  const type = allowedTypes.includes(questionType)
    ? questionType
    : "mixed";

  const allowedDifficulties = [
    "easy",
    "medium",
    "hard",
    "mixed",
  ];

  const level = allowedDifficulties.includes(
    difficulty
  )
    ? difficulty
    : "mixed";

  let questions = [];

  const batchSize = count >= 50 ? 10 : 5;
  const maxAttempts = 20;

  let attempts = 0;

  while (
    questions.length < count &&
    attempts < maxAttempts
  ) {
    attempts++;

    const remaining = count - questions.length;
    const requested = Math.min(
      batchSize,
      remaining
    );

    console.log(
      `Generating quiz batch ${attempts}: ${questions.length}/${count}`
    );

    try {
      const batch = await generateQuizBatch({
        text,
        batchSize: requested,
        questionType: type,
        difficulty: level,
        existingQuestions: questions,
      });

      const existingKeys = new Set(
        questions.map(questionKey)
      );

      const newQuestions = batch.filter(
        (question) =>
          !existingKeys.has(
            questionKey(question)
          )
      );

      if (newQuestions.length > 0) {
        questions = removeDuplicateQuestions([
          ...questions,
          ...newQuestions,
        ]);
      }

      console.log(
        `Quiz progress: ${questions.length}/${count}`
      );
    } catch (error) {
      console.error(
        `Quiz batch ${attempts} failed:`,
        error?.message || error
      );
    }
  }

  questions = removeDuplicateQuestions(
    questions
  );

  if (questions.length < count) {
    throw new Error(
      `Could not generate enough unique questions. Generated ${questions.length} of ${count}. Please try again or choose a smaller quiz size.`
    );
  }

  return JSON.stringify({
    questions: questions.slice(0, count),
  });
}

export async function generateSummary(text) {
  if (!text?.trim()) {
    throw new Error(
      "No document text was provided."
    );
  }

  const prompt = `
You are Marginal, an AI study assistant.

Analyze the student's document carefully.

Create study material based ONLY on the document.

Return ONLY valid JSON:

{
  "shortSummary": "A concise summary.",
  "detailedSummary": "A detailed explanation.",
  "keyPoints": [
    "Important point 1",
    "Important point 2"
  ],
  "importantTerms": [
    {
      "term": "Term",
      "meaning": "Meaning based on the document"
    }
  ],
  "questions": [
    {
      "question": "Question based on the document",
      "answer": "Correct answer based on the document"
    }
  ]
}

Generate exactly 10 study questions.

DOCUMENT:
${text}
`;

  return generateJson(prompt);
}

export async function generateQA(
  text,
  question
) {
  if (!text?.trim()) {
    throw new Error(
      "No document text was provided."
    );
  }

  if (!question?.trim()) {
    throw new Error(
      "No question was provided."
    );
  }

  const prompt = `
You are Marginal, an AI study assistant.

Answer the student's question using ONLY the document.

If the document does not provide enough information,
say so clearly.

Return ONLY valid JSON:

{
  "answer": "Your answer based only on the document.",
  "source": "A short description of where the answer came from."
}

DOCUMENT:
${text}

STUDENT QUESTION:
${question}
`;

  return generateJson(prompt);
}

export async function generateGlossary(text) {
  if (!text?.trim()) {
    throw new Error(
      "No document text was provided."
    );
  }

  const prompt = `
You are Marginal, an AI study assistant.

Create a useful academic glossary using ONLY information
found in the document.

Return ONLY valid JSON:

{
  "terms": [
    {
      "term": "Important term",
      "definition": "Clear definition based only on the document.",
      "importance": "Why this term matters for studying this document."
    }
  ]
}

Generate between 5 and 20 meaningful terms when supported
by the document.

DOCUMENT:
${text}
`;

  return generateJson(prompt);
}

export async function generateSections(text) {
  if (!text?.trim()) {
    throw new Error(
      "No document text was provided."
    );
  }

  const prompt = `
You are Marginal, an AI study assistant.

Organize the document into meaningful academic study
sections using ONLY information contained in the document.

Return ONLY valid JSON:

{
  "sections": [
    {
      "title": "Section title",
      "description": "Short explanation of what this section covers.",
      "keyPoints": [
        "Important point from this section",
        "Another important point"
      ]
    }
  ]
}

Keep the number of sections reasonable and group related
information.

DOCUMENT:
${text}
`;

  return generateJson(prompt);
}

