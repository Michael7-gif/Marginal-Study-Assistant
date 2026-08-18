const PROGRESS_KEY = "studydesk_progress";

const DEFAULT_PROGRESS = {
  quizzes: [],
  documents: [],
  studySessions: [],
  activities: [],
};

function createId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function emptyProgress() {
  return {
    quizzes: [],
    documents: [],
    studySessions: [],
    activities: [],
  };
}


export function getProgress() {
  try {
    const saved = localStorage.getItem(PROGRESS_KEY);

    if (!saved) {
      return emptyProgress();
    }

    const parsed = JSON.parse(saved);

    return {
      quizzes: Array.isArray(parsed.quizzes)
        ? parsed.quizzes
        : [],

      documents: Array.isArray(parsed.documents)
        ? parsed.documents
        : [],

      studySessions: Array.isArray(parsed.studySessions)
        ? parsed.studySessions
        : [],

      activities: Array.isArray(parsed.activities)
        ? parsed.activities
        : [],
    };
  } catch (error) {
    console.error(
      "Could not load study progress:",
      error
    );

    return emptyProgress();
  }
}


export function saveProgress(progress) {
  try {
    const safeProgress = {
      quizzes: Array.isArray(progress?.quizzes)
        ? progress.quizzes
        : [],

      documents: Array.isArray(progress?.documents)
        ? progress.documents
        : [],

      studySessions: Array.isArray(progress?.studySessions)
        ? progress.studySessions
        : [],

      activities: Array.isArray(progress?.activities)
        ? progress.activities
        : [],
    };

    localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify(safeProgress)
    );

    window.dispatchEvent(
      new CustomEvent("progressUpdated")
    );

    return safeProgress;
  } catch (error) {
    console.error(
      "Could not save study progress:",
      error
    );

    return null;
  }
}


export function recordStudyActivity({
  type = "study",
  title = "Study activity",
  description = "",
}) {
  const progress = getProgress();

  const activity = {
    id: createId(),
    type,
    title,
    description,
    date: new Date().toISOString(),
  };

  progress.activities.unshift(activity);

  progress.activities = progress.activities.slice(
    0,
    50
  );

  saveProgress(progress);

  return activity;
}


export function recordDocumentStudied(document) {
  if (!document) {
    return null;
  }

  const progress = getProgress();

  const documentId =
    document.id ??
    document.documentId ??
    document.name ??
    "unknown-document";

  const existingIndex =
    progress.documents.findIndex(
      (item) =>
        String(item.documentId ?? item.id) ===
        String(documentId)
    );

  const now = new Date().toISOString();

  const documentData = {
    documentId,
    id: documentId,

    documentName:
      document.name ||
      document.documentName ||
      "Untitled Document",

    name:
      document.name ||
      document.documentName ||
      "Untitled Document",

    pageCount:
      Number(document.pageCount) || 0,

    completed:
      existingIndex >= 0
        ? Boolean(
            progress.documents[existingIndex]
              .completed
          )
        : false,

    progressPercentage:
      existingIndex >= 0
        ? Number(
            progress.documents[existingIndex]
              .progressPercentage || 0
          )
        : 0,

    studiedAt: now,
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    progress.documents[existingIndex] = {
      ...progress.documents[existingIndex],
      ...documentData,
    };
  } else {
    progress.documents.push(documentData);
  }

  progress.activities.unshift({
    id: createId(),
    type: "document",
    title: documentData.documentName,
    description: "Studied document",
    date: now,
  });

  progress.activities =
    progress.activities.slice(0, 50);

  saveProgress(progress);

  return documentData;
}


export function saveDocumentProgress({
  documentId,
  documentName = "Untitled Document",
  pageCount = 0,
  completed = false,
  progressPercentage = 0,
}) {
  const progress = getProgress();

  if (
    documentId === undefined ||
    documentId === null
  ) {
    console.warn(
      "saveDocumentProgress: documentId is required."
    );

    return null;
  }

  const safePercentage = Math.max(
    0,
    Math.min(
      100,
      Number(progressPercentage) || 0
    )
  );

  const existingIndex =
    progress.documents.findIndex(
      (document) =>
        String(document.documentId) ===
        String(documentId)
    );

  const now = new Date().toISOString();

  const documentData = {
    id: documentId,
    documentId,

    name: documentName,
    documentName,

    pageCount:
      Number(pageCount) || 0,

    completed: Boolean(completed),

    progressPercentage:
      safePercentage,

    updatedAt: now,

    ...(existingIndex >= 0
      ? {
          studiedAt:
            progress.documents[
              existingIndex
            ].studiedAt || now,
        }
      : {
          studiedAt: now,
        }),
  };

  if (existingIndex >= 0) {
    progress.documents[existingIndex] = {
      ...progress.documents[existingIndex],
      ...documentData,
    };
  } else {
    progress.documents.push(documentData);
  }

  saveProgress(progress);

  return documentData;
}


export function saveQuizResult({
  score = 0,
  totalQuestions = 0,
  difficulty = "mixed",
  questionType = "mixed",
  documentName = "Untitled Document",
  documentId = null,
}) {
  const progress = getProgress();

  const safeScore = Math.max(
    0,
    Number(score) || 0
  );

  const safeTotalQuestions = Math.max(
    0,
    Number(totalQuestions) || 0
  );

  const safeScoreClamped = Math.min(
    safeScore,
    safeTotalQuestions
  );

  const percentage =
    safeTotalQuestions > 0
      ? Math.round(
          (safeScoreClamped /
            safeTotalQuestions) *
            100
        )
      : 0;

  const completedAt =
    new Date().toISOString();

  const quizResult = {
    id: createId(),

    documentId,

    documentName:
      documentName ||
      "Untitled Document",

    score: safeScoreClamped,

    totalQuestions:
      safeTotalQuestions,

    percentage,

    difficulty:
      difficulty || "mixed",

    questionType:
      questionType || "mixed",

    date: completedAt,

    completedAt,
  };

  progress.quizzes.unshift(
    quizResult
  );

  progress.activities.unshift({
    id: createId(),

    type: "quiz",

    title:
      documentName ||
      "Untitled Document",

    description:
      `Quiz completed — ${percentage}%`,

    date: completedAt,
  });

  progress.activities =
    progress.activities.slice(0, 50);

  saveProgress(progress);

  return quizResult;
}


export function recordQuizResult({
  document,
  score,
  totalQuestions,
  questionType,
  difficulty,
}) {
  return saveQuizResult({
    documentId:
      document?.id ??
      document?.documentId ??
      null,

    documentName:
      document?.name ||
      document?.documentName ||
      "Untitled Document",

    score,
    totalQuestions,
    questionType,
    difficulty,
  });
}


export function saveStudySession({
  documentId = null,
  documentName = "Untitled Document",
  duration = 0,
}) {
  const progress = getProgress();

  const safeDuration = Math.max(
    0,
    Number(duration) || 0
  );

  const date =
    new Date().toISOString();

  const session = {
    id: createId(),

    documentId,

    documentName,

    duration: safeDuration,

    date,

    startedAt: date,

    completedAt: date,
  };

  progress.studySessions.unshift(
    session
  );

  progress.activities.unshift({
    id: createId(),

    type: "study",

    title: documentName,

    description:
      safeDuration > 0
        ? `Studied for ${safeDuration} minutes`
        : "Study session completed",

    date,
  });

  progress.activities =
    progress.activities.slice(0, 50);

  saveProgress(progress);

  return session;
}


export function getProgressStats() {
  const progress = getProgress();

  const quizzes =
    Array.isArray(progress.quizzes)
      ? progress.quizzes
      : [];

  const documents =
    Array.isArray(progress.documents)
      ? progress.documents
      : [];

  const studySessions =
    Array.isArray(progress.studySessions)
      ? progress.studySessions
      : [];

  const activities =
    Array.isArray(progress.activities)
      ? progress.activities
      : [];

  const totalQuizzes =
    quizzes.length;

  const totalQuestions =
    quizzes.reduce(
      (total, quiz) =>
        total +
        Number(
          quiz.totalQuestions || 0
        ),
      0
    );

  const correctAnswers =
    quizzes.reduce(
      (total, quiz) =>
        total +
        Number(quiz.score || 0),
      0
    );

  const averageScore =
    totalQuestions > 0
      ? Math.round(
          (correctAnswers /
            totalQuestions) *
            100
        )
      : 0;

  const totalStudySessions =
    studySessions.length;

  const totalStudyMinutes =
    studySessions.reduce(
      (total, session) =>
        total +
        Number(session.duration || 0),
      0
    );

  const totalDocuments =
    documents.length;

  const completedDocuments =
    documents.filter(
      (document) =>
        document.completed === true
    ).length;

  return {
    quizzes,
    documents,
    studySessions,
    activities,

    totalQuizzes,

    totalQuestions,

    correctAnswers,

    averageScore,

    totalStudySessions,

    totalStudyMinutes,

    totalDocuments,

    completedDocuments,

    documentsStudied:
      totalDocuments,

    quizzesCompleted:
      totalQuizzes,

    questionsAnswered:
      totalQuestions,
  };
}


export function getRecentActivities(
  limit = 10
) {
  const progress = getProgress();

  return progress.activities
    .slice(0, Math.max(0, Number(limit) || 10));
}


export function clearProgress() {
  try {
    localStorage.removeItem(
      PROGRESS_KEY
    );

    window.dispatchEvent(
      new CustomEvent("progressUpdated")
    );

    return true;
  } catch (error) {
    console.error(
      "Could not clear progress:",
      error
    );

    return false;
  }
}

export default {
  getProgress,
  saveProgress,

  recordStudyActivity,
  recordDocumentStudied,

  saveDocumentProgress,

  saveQuizResult,
  recordQuizResult,

  saveStudySession,

  getProgressStats,
  getRecentActivities,

  clearProgress,
};