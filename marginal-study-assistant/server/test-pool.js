import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

console.log("DATABASE_URL found:", !!process.env.DATABASE_URL);
console.log("DATABASE_SSL:", process.env.DATABASE_SSL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
});

try {
  console.log("Connecting with PostgreSQL Pool...");

  const result = await pool.query("SELECT NOW() AS current_time");

  console.log("POOL SUCCESS!");
  console.log("Database time:", result.rows[0].current_time);

  await pool.end();
} catch (error) {
  console.error("POOL CONNECTION FAILED");
  console.error(error);

  try {
    await pool.end();
  } catch {}
}