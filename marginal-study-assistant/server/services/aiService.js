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

/* =========================================================
   QUIZ HELPERS
========================================================= */

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

/* =========================================================
   QUIZ
========================================================= */

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

/* =========================================================
   SUMMARY HELPERS
========================================================= */

function cleanDocumentText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitIntoSentences(text) {
  return text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) =>
      sentence
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter((sentence) => {
      const words = sentence.split(/\s+/);

      return words.length >= 8;
    });
}

function getWords(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function calculateWordFrequency(sentences) {
  const frequency = new Map();

  const stopWords = new Set([
    "about",
    "after",
    "again",
    "against",
    "also",
    "because",
    "before",
    "being",
    "between",
    "could",
    "does",
    "during",
    "each",
    "from",
    "have",
    "having",
    "into",
    "more",
    "most",
    "other",
    "over",
    "same",
    "should",
    "some",
    "such",
    "than",
    "that",
    "their",
    "there",
    "these",
    "they",
    "this",
    "those",
    "through",
    "under",
    "using",
    "very",
    "were",
    "which",
    "while",
    "with",
    "would",
    "your",
    "what",
    "when",
    "where",
    "whose",
    "will",
    "then",
    "them",
    "only",
    "many",
    "much",
    "been",
    "within",
    "without",
    "often",
    "however",
    "thus",
    "therefore",
    "can",
    "may",
    "might",
    "must",
    "shall",
    "are",
    "was",
    "and",
    "but",
    "for",
    "not",
    "you",
    "our",
    "out",
    "how",
    "why",
    "who",
    "its",
    "it's",
    "has",
    "had",
    "did",
    "the",
    "a",
    "an",
    "in",
    "on",
    "at",
    "to",
    "of",
    "is",
    "it",
    "as",
    "or",
    "be",
    "by",
    "if",
    "we",
    "he",
    "she",
    "his",
    "her",
    "i",
    "me",
    "my",
    "mine",
    "ours",
    "theirs",
  ]);

  for (const sentence of sentences) {
    for (const word of getWords(sentence)) {
      if (
        word.length < 4 ||
        stopWords.has(word)
      ) {
        continue;
      }

      frequency.set(
        word,
        (frequency.get(word) || 0) + 1
      );
    }
  }

  return frequency;
}

function scoreSentence(
  sentence,
  index,
  totalSentences,
  frequency
) {
  const words = getWords(sentence);

  if (!words.length) {
    return 0;
  }

  let score = 0;

  for (const word of words) {
    score += frequency.get(word) || 0;
  }

  score =
    score / Math.sqrt(words.length);

  const importantWords = [
    "important",
    "definition",
    "defined",
    "means",
    "refers",
    "concept",
    "principle",
    "process",
    "method",
    "purpose",
    "result",
    "effect",
    "cause",
    "advantage",
    "disadvantage",
    "example",
    "include",
    "includes",
    "key",
    "main",
    "significant",
    "essential",
    "required",
    "known",
    "called",
    "consists",
    "types",
    "characteristics",
    "function",
    "features",
    "benefit",
    "problem",
    "solution",
    "relationship",
    "difference",
    "similar",
    "application",
    "used",
    "use",
  ];

  for (const word of importantWords) {
    if (words.includes(word)) {
      score += 3;
    }
  }

  if (
    index <
    Math.max(3, totalSentences * 0.1)
  ) {
    score += 2;
  }

  if (
    index >
    totalSentences -
      Math.max(3, totalSentences * 0.1)
  ) {
    score += 1;
  }

  if (sentence.includes(":")) {
    score += 1;
  }

  if (/\d/.test(sentence)) {
    score += 0.5;
  }

  return score;
}

function selectImportantSentences(
  sentences,
  maximum
) {
  if (sentences.length <= maximum) {
    return sentences;
  }

  const frequency =
    calculateWordFrequency(sentences);

  const scored = sentences.map(
    (sentence, index) => ({
      sentence,
      index,
      score: scoreSentence(
        sentence,
        index,
        sentences.length,
        frequency
      ),
    })
  );

  scored.sort(
    (a, b) => b.score - a.score
  );

  return scored
    .slice(0, maximum)
    .sort(
      (a, b) => a.index - b.index
    )
    .map(
      (item) => item.sentence
    );
}

/**
 * This is the step that fixes the "too similar to the original" problem.
 *
 * The sentences chosen by selectImportantSentences() are still VERBATIM
 * text lifted straight from the document. If we handed those straight to
 * the final "write the summary" prompt, the model has real, well-formed
 * source sentences sitting right there to lean on - and a small/cheap
 * model will often just lightly edit them instead of truly rewriting.
 *
 * So before we ever ask for the finalShortSummary/DetailedSummary/etc,
 * we ask Gemini to convert those extractive sentences into short,
 * already-paraphrased factual notes. The final synthesis step below
 * then only ever sees these notes - never the original sentences -
 * so there is nothing left to copy from.
 */
async function paraphraseExtractedSentences(
  selectedSentences
) {
  const numberedSentences = selectedSentences
    .map(
      (sentence, index) =>
        `${index + 1}. ${sentence}`
    )
    .join("\n");

  const prompt = `
You are Marginal, an academic study assistant.

Below is a numbered list of sentences taken directly from a
document.

Rewrite each sentence's IDEA as a short factual note in your
own words.

RULES:

1. Do not reuse the original sentence's wording or structure.

2. Do not copy any phrase of 5 or more words in a row from the
   original sentence.

3. Shorten and simplify where possible.

4. Combine two notes into one if they describe the same idea.

5. Remove filler, numbering artifacts, or incomplete fragments.

6. Do not add information that is not present in the sentences.

7. Each note should be one short, plain sentence.

Return ONLY valid JSON:

{
  "notes": [
    "Rewritten idea in new wording.",
    "Another rewritten idea in new wording."
  ]
}

SENTENCES:

${numberedSentences}
`;

  const raw = await generateJson(prompt);
  const parsed = parseJson(raw, "paraphrased notes");

  if (!Array.isArray(parsed?.notes)) {
    throw new Error(
      "The AI did not return valid paraphrased notes."
    );
  }

  const notes = parsed.notes
    .map((note) => String(note).trim())
    .filter(Boolean);

  if (!notes.length) {
    throw new Error(
      "The AI could not paraphrase the extracted sentences."
    );
  }

  return notes;
}

/* =========================================================
   SUMMARY
========================================================= */

export async function generateSummary(text) {
  const cleanedText =
    cleanDocumentText(text);

  if (!cleanedText) {
    throw new Error(
      "No document text was provided."
    );
  }

  const sentences =
    splitIntoSentences(cleanedText);

  if (!sentences.length) {
    throw new Error(
      "The document does not contain enough readable text to create a summary."
    );
  }

  console.log(
    "Starting AI summary generation..."
  );

  console.log(
    `Found ${sentences.length} usable sentences.`
  );

  const selectedSentences =
    selectImportantSentences(
      sentences,
      Math.min(
        35,
        Math.max(
          15,
          Math.ceil(
            sentences.length * 0.08
          )
        )
      )
    );

  console.log(
    `Selected ${selectedSentences.length} important sentences. Paraphrasing them before synthesis...`
  );

  const paraphrasedNotes =
    await paraphraseExtractedSentences(
      selectedSentences
    );

  console.log(
    `Paraphrased into ${paraphrasedNotes.length} rewritten study notes.`
  );

  const studyNotes = paraphrasedNotes
    .map(
      (note, index) =>
        `${index + 1}. ${note}`
    )
    .join("\n");

  const prompt = `
You are Marginal, an AI study assistant.

Create a clear academic study summary from the study
notes provided below.

The study notes have ALREADY been rewritten into new wording.
They are your only source material - the original document is
not provided here on purpose, so there is nothing to copy from.

IMPORTANT:

You MUST continue to write everything in your own words.

DO NOT copy the notes directly.

DO NOT simply shorten a note's existing wording.

Combine related ideas where appropriate.

The result should sound like a new explanation written
by a study assistant who understands the material.

Use ONLY information contained in the study notes.

Do not invent facts.

Do not add information that is not supported by the notes.

Return ONLY valid JSON.

Return exactly this structure:

{
  "shortSummary": "A concise summary written completely in your own words.",
  "detailedSummary": "A longer explanation of the major ideas written completely in your own words.",
  "keyPoints": [
    "Important idea rewritten in your own words.",
    "Another important idea rewritten in your own words."
  ],
  "importantTerms": [
    {
      "term": "Important term",
      "meaning": "A clear explanation written in your own words."
    }
  ],
  "questions": [
    {
      "question": "A useful study question.",
      "answer": "The answer written in your own words."
    }
  ]
}

SUMMARY REQUIREMENTS:

1. SHORT SUMMARY

Write 1 to 2 paragraphs.

Explain the overall subject and its most important ideas.

Do not copy sentences from the notes.

2. DETAILED SUMMARY

Write several clear paragraphs.

Explain the main concepts, processes, relationships,
purposes, examples, and important facts.

Use different wording from the notes.

3. KEY POINTS

Generate between 5 and 12 important points.

Each point must be a rewritten explanation.

Do not copy complete sentences from the notes.

4. IMPORTANT TERMS

Generate up to 12 meaningful academic terms.

Explain each term clearly in your own words.

The explanations must be based only on the notes.

5. QUESTIONS

Generate up to 10 useful study questions.

Answers must be written in your own words.

6. AVOID REPETITION.

7. DO NOT USE MARKDOWN.

8. RETURN JSON ONLY.

9. NEVER SAY THAT YOU ARE AN AI.

10. NEVER REFER TO THE NOTES AS "THE NOTES".

11. NEVER COPY A SENTENCE VERBATIM FROM THE SOURCE.

STUDY NOTES:

${studyNotes}
`;

  const raw =
    await generateJson(prompt);

  const parsed =
    parseJson(raw, "summary");

  if (
    !parsed ||
    typeof parsed !== "object"
  ) {
    throw new Error(
      "The AI returned an invalid summary."
    );
  }

  if (
    typeof parsed.shortSummary !==
      "string" ||
    typeof parsed.detailedSummary !==
      "string" ||
    !Array.isArray(parsed.keyPoints) ||
    !Array.isArray(
      parsed.importantTerms
    ) ||
    !Array.isArray(parsed.questions)
  ) {
    throw new Error(
      "The AI returned an incomplete summary."
    );
  }

  console.log(
    "AI summary created successfully."
  );

  return JSON.stringify(parsed);
}

/* =========================================================
   Q&A
========================================================= */

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

/* =========================================================
   GLOSSARY
========================================================= */

export async function generateGlossary(
  text
) {
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

/* =========================================================
   SECTIONS
========================================================= */

export async function generateSections(
  text
) {
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