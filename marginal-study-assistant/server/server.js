import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { initDb } from "./db.js";
import progressRoutes from "./routes/progressRoutes.js";
import qaRoutes from "./routes/qaRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import glossaryRoutes from "./routes/glossaryRoutes.js";
import sectionsRoutes from "./routes/sectionsRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({
  path: path.join(__dirname, ".env"),
});

const app = express();
const PORT = Number(process.env.PORT) || 5000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      console.error(`CORS blocked origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(
  express.json({
    limit: "20mb",
  })
);

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Marginal backend is running.",
  });
});

app.use("/api/progress", progressRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/qa", qaRoutes);
app.use("/api/glossary", glossaryRoutes);
app.use("/api/sections", sectionsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);

app.use((error, req, res, next) => {
  console.error("Unhandled backend error:", error);

  res.status(500).json({
    success: false,
    message: error?.message || "Internal server error.",
  });
});

async function startServer() {
  try {
    await initDb();

    app.listen(PORT, () => {
      console.log(`Marginal backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start Marginal backend:", error);
    process.exit(1);
  }
}

startServer();