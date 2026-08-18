import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 15000,
});

try {
  console.log("Connecting to Neon...");

  await client.connect();

  const result = await client.query("SELECT NOW()");

  console.log("SUCCESS!");
  console.log("Database time:", result.rows[0]);

  await client.end();
} catch (error) {
  console.error("DATABASE CONNECTION FAILED");
  console.error(error);
}