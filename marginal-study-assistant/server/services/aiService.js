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
        "Gemini could not process the document. Check the API key, model access, and server configuration."
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

export async function generateSummary(text) {
  if (!text?.trim()) {
    throw new Error("No document text was provided.");
  }

  const prompt = `
You are Marginal, an AI study assistant.

Analyze the student's document carefully and create study material based ONLY on the document.

Return ONLY valid JSON using exactly this structure:

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

function normalizeQuestion(question) {
  if (!question || typeof question !== "object") {
    return null;
  }

  const normalized = {
    question: String(question.question || "").trim(),
    type: String(question.type || "").trim(),
    difficulty: String(
      question.difficulty || ""
    ).trim(),
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

  const allowedDifficulties = [
    "easy",
    "medium",
    "hard",
  ];

  if (
    !allowedDifficulties.includes(
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

    normalized.options = question.options.map(
      (option) => String(option).trim()
    );

    if (
      normalized.options.some(
        (option) => !option
      )
    ) {
      return null;
    }

    if (
      !normalized.options.includes(
        normalized.answer
      )
    ) {
      return null;
    }
  }

  if (normalized.type === "true-false") {
    normalized.options = ["True", "False"];

    if (
      !["True", "False"].includes(
        normalized.answer
      )
    ) {
      return null;
    }
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
  if (type === "multiple-choice") {
    return `
Use only multiple-choice questions.

Every question must:
- Have type "multiple-choice".
- Have exactly four options.
- Have one correct answer.
- Set answer to the exact text of the correct option.
`;
  }

  if (type === "true-false") {
    return `
Use only true/false questions.

Every question must:
- Have type "true-false".
- Have options ["True", "False"].
- Have answer exactly "True" or "False".
`;
  }

  if (type === "short-answer") {
    return `
Use only short-answer questions.

Every question must:
- Have type "short-answer".
- Have a concise correct answer.
`;
  }

  if (type === "essay") {
    return `
Use only essay questions.

Every question must:
- Have type "essay".
- Have a model answer based ONLY on the document.
`;
  }

  return `
Use a balanced mixture of:
- multiple-choice
- true-false
- short-answer
- essay

Every question must contain its type.
`;
}

function getDifficultyInstructions(level) {
  if (level === "mixed") {
    return `
Use a mixture of easy, medium, and hard questions.
`;
  }

  return `
All questions must be ${level} difficulty.
`;
}

function buildPreviousQuestionList(
  existingQuestions,
  maxQuestions = 30
) {
  if (!existingQuestions?.length) {
    return "";
  }

  const recent = existingQuestions.slice(
    -maxQuestions
  );

  return `
These questions have already been generated.

Do NOT repeat them or closely rephrase them:

${recent
  .map(
    (question, index) =>
      `${index + 1}. ${question.question}`
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
  const typeInstructions =
    getTypeInstructions(questionType);

  const difficultyInstructions =
    getDifficultyInstructions(difficulty);

  const previousQuestions =
    buildPreviousQuestionList(
      existingQuestions,
      30
    );

  const prompt = `
You are Marginal, an AI study assistant.

Generate EXACTLY ${batchSize} NEW quiz questions.

The questions must be based ONLY on the student's document.

IMPORTANT:
- Return exactly ${batchSize} questions.
- Do not return fewer.
- Do not return more.
- Return ONLY valid JSON.
- Do not include markdown.
- Do not include explanations outside JSON.
- Do not invent facts.
- Do not repeat existing questions.
- Do not closely rephrase existing questions.
- Each question must test a different aspect, fact, relationship, definition, explanation, comparison, application, or implication found in the document.
- Questions may examine the same topic from genuinely different angles.
- Make every question meaningfully different.
- Make sure every answer is directly supported by the document.

QUESTION TYPE:
${questionType}

${typeInstructions}

DIFFICULTY:
${difficulty}

${difficultyInstructions}

${previousQuestions}

Return exactly:

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
      "answer": "Correct option"
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

  return removeDuplicateQuestions(
    normalized
  );
}

async function generateReplacementQuestions({
  text,
  needed,
  questionType,
  difficulty,
  existingQuestions,
}) {
  const replacementBatchSize = Math.min(
    needed,
    5
  );

  return generateQuizBatch({
    text,
    batchSize: replacementBatchSize,
    questionType,
    difficulty,
    existingQuestions,
  });
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

  const type = allowedTypes.includes(
    questionType
  )
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

  const batchSize = 5;
  const maxBatchAttempts = 4;

  const maxTotalRequests =
    Math.max(10, count * 2);

  let totalRequests = 0;

  while (
    questions.length < count &&
    totalRequests < maxTotalRequests
  ) {
    const remaining =
      count - questions.length;

    const requested =
      Math.min(batchSize, remaining);

    let batchQuestions = [];

    for (
      let attempt = 1;
      attempt <= maxBatchAttempts;
      attempt++
    ) {
      totalRequests++;

      try {
        batchQuestions =
          await generateQuizBatch({
            text,
            batchSize: requested,
            questionType: type,
            difficulty: level,
            existingQuestions: questions,
          });

        const existingKeys = new Set(
          questions.map(questionKey)
        );

        batchQuestions =
          batchQuestions.filter(
            (question) =>
              !existingKeys.has(
                questionKey(question)
              )
          );

        if (
          batchQuestions.length >= requested
        ) {
          break;
        }

        console.warn(
          `Quiz batch returned ${batchQuestions.length}/${requested} unique valid questions. Retrying.`
        );
      } catch (error) {
        console.error(
          `Quiz generation attempt ${attempt} failed:`,
          error?.message || error
        );

        if (
          attempt === maxBatchAttempts
        ) {
          batchQuestions = [];
        }
      }

      if (totalRequests >= maxTotalRequests) {
        break;
      }
    }

    if (batchQuestions.length > 0) {
      questions.push(
        ...batchQuestions.slice(0, requested)
      );

      questions =
        removeDuplicateQuestions(
          questions
        );

      console.log(
        `Quiz progress: ${questions.length}/${count}`
      );
    }

    if (
      batchQuestions.length === 0 &&
      questions.length < count
    ) {
      try {
        const replacement =
          await generateReplacementQuestions({
            text,
            needed: remaining,
            questionType: type,
            difficulty: level,
            existingQuestions: questions,
          });

        const existingKeys = new Set(
          questions.map(questionKey)
        );

        const newQuestions =
          replacement.filter(
            (question) =>
              !existingKeys.has(
                questionKey(question)
              )
          );

        questions.push(...newQuestions);

        questions =
          removeDuplicateQuestions(
            questions
          );

        console.log(
          `Replacement progress: ${questions.length}/${count}`
        );
      } catch (error) {
        console.error(
          "Replacement generation failed:",
          error?.message || error
        );
      }
    }
  }

  questions =
    removeDuplicateQuestions(questions);

  if (questions.length < count) {
    throw new Error(
      `Could not generate exactly ${count} unique questions. Only ${questions.length} valid questions were generated. Please try again.`
    );
  }

  return JSON.stringify({
    questions: questions.slice(0, count),
  });
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

If the document does not provide enough information, say so clearly.

Return ONLY valid JSON in exactly this structure:

{
  "answer": "Your answer based only on the document.",
  "source": "A short description of where the answer came from in the document."
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

Create a useful academic glossary from the document using ONLY information found in it.

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

Generate between 5 and 20 meaningful terms when the document supports them.

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

Organize the document into meaningful academic study sections using ONLY information contained in the document.

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

Keep the number of sections reasonable and group related information.

DOCUMENT:
${text}
`;

  return generateJson(prompt);
}
