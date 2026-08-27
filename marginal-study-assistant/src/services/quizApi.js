import { apiPost } from "./api";

export async function generateQuiz({
  documentId,
  questionCount = 10,
  questionType = "mixed",
  difficulty = "mixed",
}) {
  const id = Number(documentId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(
      "Please select a valid document before starting the quiz."
    );
  }

  const count = Number(questionCount);

  if (
    !Number.isInteger(count) ||
    count < 10 ||
    count > 100
  ) {
    throw new Error(
      "Quiz question count must be between 10 and 100."
    );
  }

  return apiPost("/api/quiz/generate", {
    documentId: id,
    questionCount: count,
    questionType,
    difficulty,
  });
}