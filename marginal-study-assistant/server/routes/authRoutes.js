import express from "express";
import crypto from "node:crypto";

import db from "../db.js";
import {
  hashPassword,
  verifyPassword,
  issueSession,
  clearSession,
  requireAuth,
} from "../auth.js";
import { sendPasswordResetCode } from "../services/emailService.js";

const router = express.Router();

const RESET_CODE_TTL_MINUTES = 10;
const RESET_CODE_MAX_ATTEMPTS = 5;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashResetCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

function generateResetCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

function serializeUser(row) {
  return {
    id: Number(row.id),
    email: row.email,
  };
}

router.get("/me", requireAuth, (req, res) => {
  res.json({
    success: true,
    data: { id: req.user.id, email: req.user.email },
  });
});

router.post("/signup", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!email || !email.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "A valid email is required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    const existing = await db.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existing.rows[0]) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const passwordHash = await hashPassword(password);

    const result = await db.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email`,
      [email, passwordHash]
    );

    const user = result.rows[0];

    await issueSession(res, user);

    res.status(201).json({
      success: true,
      data: serializeUser(user),
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      success: false,
      message: "Could not create your account.",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    const result = await db.query(
      "SELECT id, email, password_hash FROM users WHERE email = $1",
      [email]
    );

    const user = result.rows[0];

    const passwordOk = user
      ? await verifyPassword(password, user.password_hash)
      : false;

    if (!user || !passwordOk) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    await issueSession(res, user);

    res.json({
      success: true,
      data: serializeUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Could not sign you in.",
    });
  }
});

router.post("/logout", async (req, res) => {
  try {
    await clearSession(req, res);
    res.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Could not sign you out.",
    });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);

    const result = await db.query(
      "SELECT id, email FROM users WHERE email = $1",
      [email]
    );

    const user = result.rows[0];

    // Always respond with success to avoid leaking which emails are registered.
    if (!user) {
      return res.json({ success: true });
    }

    const code = generateResetCode();
    const expiresAt = new Date(
      Date.now() + RESET_CODE_TTL_MINUTES * 60000
    );

    await db.query(
      `INSERT INTO password_reset_codes (user_id, code_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, hashResetCode(code), expiresAt]
    );

    await sendPasswordResetCode(user.email, code);

    res.json({ success: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Could not send the verification code.",
    });
  }
});

router.post("/verify-reset-code", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const code = String(req.body?.code || "").trim();

    const userResult = await db.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired code.",
      });
    }

    const codeResult = await db.query(
      `SELECT id, code_hash, expires_at, attempts
       FROM password_reset_codes
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id]
    );

    const record = codeResult.rows[0];

    if (
      !record ||
      new Date(record.expires_at).getTime() <= Date.now() ||
      record.attempts >= RESET_CODE_MAX_ATTEMPTS
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired code.",
      });
    }

    if (record.code_hash !== hashResetCode(code)) {
      await db.query(
        "UPDATE password_reset_codes SET attempts = attempts + 1 WHERE id = $1",
        [record.id]
      );

      return res.status(400).json({
        success: false,
        message: "Invalid or expired code.",
      });
    }

    await db.query(
      "UPDATE password_reset_codes SET verified_at = NOW() WHERE id = $1",
      [record.id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Verify reset code error:", error);
    res.status(500).json({
      success: false,
      message: "Could not verify the code.",
    });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const code = String(req.body?.code || "").trim();
    const password = String(req.body?.password || "");

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    const userResult = await db.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired code.",
      });
    }

    const codeResult = await db.query(
      `SELECT id, code_hash, expires_at, verified_at
       FROM password_reset_codes
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id]
    );

    const record = codeResult.rows[0];

    const codeIsValid =
      record &&
      new Date(record.expires_at).getTime() > Date.now() &&
      (record.verified_at || record.code_hash === hashResetCode(code));

    if (!codeIsValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired code.",
      });
    }

    const passwordHash = await hashPassword(password);

    await db.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
      passwordHash,
      user.id,
    ]);

    await db.query("DELETE FROM password_reset_codes WHERE user_id = $1", [
      user.id,
    ]);

    // Invalidate existing sessions so old logins can't linger past a reset.
    await db.query("DELETE FROM sessions WHERE user_id = $1", [user.id]);

    res.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Could not reset your password.",
    });
  }
});

export default router;