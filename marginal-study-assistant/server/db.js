import pg from "pg";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Pool } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({
  path: path.join(__dirname, ".env"),
});

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is required. Set it in server/.env."
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  ssl:
    process.env.DATABASE_SSL === "false"
      ? false
      : { rejectUnauthorized: false },

  max: Number(process.env.DATABASE_POOL_MAX) || 10,

  idleTimeoutMillis: 30000,

  connectionTimeoutMillis: 10000,
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function initDb() {
  console.log("Initializing PostgreSQL database...");

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id BIGSERIAL PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user
      ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS password_reset_codes (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      verified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_password_reset_codes_user
      ON password_reset_codes(user_id);

    CREATE INDEX IF NOT EXISTS idx_password_reset_codes_expires
      ON password_reset_codes(expires_at);

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

  await query(
    "DELETE FROM sessions WHERE expires_at <= NOW()"
  );

  console.log("PostgreSQL database initialized successfully.");
  
}

export async function closeDb() {
  await pool.end();
}

export default pool;