import db from "../db.js";





export async function initProgressTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS study_progress_documents (
      id BIGSERIAL PRIMARY KEY,

      user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

      document_id BIGINT NOT NULL
        REFERENCES documents(id)
        ON DELETE CASCADE,

      studied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      UNIQUE(user_id, document_id)
    );

    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id BIGSERIAL PRIMARY KEY,

      user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

      document_id BIGINT
        REFERENCES documents(id)
        ON DELETE SET NULL,

      document_name TEXT NOT NULL DEFAULT 'Untitled Document',

      score INTEGER NOT NULL DEFAULT 0,

      total_questions INTEGER NOT NULL DEFAULT 0,

      percentage INTEGER NOT NULL DEFAULT 0,

      question_type TEXT NOT NULL DEFAULT 'Mixed',

      difficulty TEXT NOT NULL DEFAULT 'Mixed',

      completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS study_activities (
      id BIGSERIAL PRIMARY KEY,

      user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

      type TEXT NOT NULL,

      title TEXT NOT NULL DEFAULT 'Study activity',

      description TEXT NOT NULL DEFAULT '',

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_progress_documents_user
      ON study_progress_documents(user_id);

    CREATE INDEX IF NOT EXISTS idx_progress_documents_document
      ON study_progress_documents(document_id);

    CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user
      ON quiz_attempts(user_id);

    CREATE INDEX IF NOT EXISTS idx_quiz_attempts_completed
      ON quiz_attempts(completed_at);

    CREATE INDEX IF NOT EXISTS idx_study_activities_user
      ON study_activities(user_id);

    CREATE INDEX IF NOT EXISTS idx_study_activities_created
      ON study_activities(created_at);
  `);

  console.log("Progress tables initialized successfully.");
}




export async function recordDocumentStudied(
  userId,
  document
) {
  if (!userId || !document?.id) {
    return;
  }

  const documentId = Number(document.id);

  if (!Number.isFinite(documentId)) {
    return;
  }

  await db.query(
    `
      INSERT INTO study_progress_documents (
        user_id,
        document_id,
        studied_at
      )
      VALUES ($1, $2, NOW())

      ON CONFLICT (user_id, document_id)
      DO UPDATE SET
        studied_at = NOW()
    `,
    [
      Number(userId),
      documentId,
    ]
  );

  await recordStudyActivity(
    Number(userId),
    {
      type: "document",

      title:
        document.name ||
        "Untitled Document",

      description:
        "Studied document",
    }
  );
}




export async function recordQuizResult({
  userId,
  document,
  score,
  totalQuestions,
  questionType,
  difficulty,
}) {
  if (!userId) {
    throw new Error(
      "userId is required to record a quiz result."
    );
  }

  const safeScore = Math.max(
    0,
    Number(score) || 0
  );

  const safeTotalQuestions = Math.max(
    0,
    Number(totalQuestions) || 0
  );

  const percentage =
    safeTotalQuestions > 0
      ? Math.round(
          (safeScore /
            safeTotalQuestions) *
            100
        )
      : 0;

  const documentId =
    document?.id &&
    Number.isFinite(Number(document.id))
      ? Number(document.id)
      : null;

  const documentName =
    document?.name ||
    "Untitled Document";

  const normalizedQuestionType =
    questionType ||
    "Mixed";

  const normalizedDifficulty =
    difficulty ||
    "Mixed";

  const result = await db.query(
    `
      INSERT INTO quiz_attempts (
        user_id,
        document_id,
        document_name,
        score,
        total_questions,
        percentage,
        question_type,
        difficulty,
        completed_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        NOW()
      )
      RETURNING
        id,
        document_id,
        document_name,
        score,
        total_questions,
        percentage,
        question_type,
        difficulty,
        completed_at
    `,
    [
      Number(userId),
      documentId,
      documentName,
      safeScore,
      safeTotalQuestions,
      percentage,
      normalizedQuestionType,
      normalizedDifficulty,
    ]
  );

  await recordStudyActivity(
    Number(userId),
    {
      type: "quiz",

      title: documentName,

      description:
        `Quiz completed — ${percentage}%`,
    }
  );

  return serializeQuizAttempt(
    result.rows[0]
  );
}




export async function recordStudyActivity(
  userId,
  {
    type,
    title,
    description,
  } = {}
) {
  if (!userId) {
    throw new Error(
      "userId is required to record study activity."
    );
  }

  const result = await db.query(
    `
      INSERT INTO study_activities (
        user_id,
        type,
        title,
        description,
        created_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        NOW()
      )
      RETURNING
        id,
        type,
        title,
        description,
        created_at
    `,
    [
      Number(userId),

      String(type || "study"),

      String(
        title ||
        "Study activity"
      ),

      String(
        description || ""
      ),
    ]
  );

  return serializeActivity(
    result.rows[0]
  );
}




export async function getProgress(userId) {
  if (!userId) {
    throw new Error(
      "userId is required."
    );
  }

  const [
    documentsResult,
    quizzesResult,
    activitiesResult,
  ] = await Promise.all([
    db.query(
      `
        SELECT
          p.document_id,
          d.name,
          d.page_count,
          p.studied_at
        FROM study_progress_documents p

        JOIN documents d
          ON d.id = p.document_id

        WHERE p.user_id = $1

        ORDER BY p.studied_at DESC
      `,
      [Number(userId)]
    ),

    db.query(
      `
        SELECT
          id,
          document_id,
          document_name,
          score,
          total_questions,
          percentage,
          question_type,
          difficulty,
          completed_at
        FROM quiz_attempts

        WHERE user_id = $1

        ORDER BY completed_at DESC
      `,
      [Number(userId)]
    ),

    db.query(
      `
        SELECT
          id,
          type,
          title,
          description,
          created_at
        FROM study_activities

        WHERE user_id = $1

        ORDER BY created_at DESC

        LIMIT 50
      `,
      [Number(userId)]
    ),
  ]);

  return {
    documents:
      documentsResult.rows.map(
        serializeProgressDocument
      ),

    quizAttempts:
      quizzesResult.rows.map(
        serializeQuizAttempt
      ),

    activities:
      activitiesResult.rows.map(
        serializeActivity
      ),
  };
}




export async function getProgressStats(
  userId
) {
  if (!userId) {
    throw new Error(
      "userId is required."
    );
  }

  const result = await db.query(
    `
      SELECT
        (
          SELECT COUNT(*)
          FROM study_progress_documents
          WHERE user_id = $1
        ) AS documents_studied,

        (
          SELECT COUNT(*)
          FROM quiz_attempts
          WHERE user_id = $1
        ) AS quizzes_completed,

        (
          SELECT COALESCE(
            SUM(total_questions),
            0
          )
          FROM quiz_attempts
          WHERE user_id = $1
        ) AS questions_answered,

        (
          SELECT COALESCE(
            ROUND(
              AVG(percentage)
            ),
            0
          )
          FROM quiz_attempts
          WHERE user_id = $1
        ) AS average_score
    `,
    [Number(userId)]
  );

  const row = result.rows[0];

  return {
    documentsStudied:
      Number(
        row.documents_studied
      ) || 0,

    quizzesCompleted:
      Number(
        row.quizzes_completed
      ) || 0,

    questionsAnswered:
      Number(
        row.questions_answered
      ) || 0,

    averageScore:
      Number(
        row.average_score
      ) || 0,
  };
}




export async function clearProgress(
  userId
) {
  if (!userId) {
    throw new Error(
      "userId is required."
    );
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
        DELETE FROM study_activities
        WHERE user_id = $1
      `,
      [Number(userId)]
    );

    await client.query(
      `
        DELETE FROM quiz_attempts
        WHERE user_id = $1
      `,
      [Number(userId)]
    );

    await client.query(
      `
        DELETE FROM study_progress_documents
        WHERE user_id = $1
      `,
      [Number(userId)]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}




function serializeProgressDocument(
  row
) {
  return {
    id: Number(row.document_id),

    name:
      row.name ||
      "Untitled Document",

    pageCount:
      Number(row.page_count) || 0,

    studiedAt:
      row.studied_at,
  };
}


function serializeQuizAttempt(
  row
) {
  return {
    id: Number(row.id),

    documentId:
      row.document_id === null
        ? null
        : Number(row.document_id),

    documentName:
      row.document_name ||
      "Untitled Document",

    score:
      Number(row.score) || 0,

    totalQuestions:
      Number(
        row.total_questions
      ) || 0,

    percentage:
      Number(row.percentage) || 0,

    questionType:
      row.question_type ||
      "Mixed",

    difficulty:
      row.difficulty ||
      "Mixed",

    completedAt:
      row.completed_at,
  };
}


function serializeActivity(
  row
) {
  return {
    id: Number(row.id),

    type:
      row.type,

    title:
      row.title ||
      "Study activity",

    description:
      row.description ||
      "",

    date:
      row.created_at,
  };
}