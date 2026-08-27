import crypto from "node:crypto";
import db from "./db.js";

const COOKIE_NAME = "marginal_session";
const SESSION_DAYS = 7;

function cookieOptions(maxAge) {
  const isProduction = process.env.NODE_ENV === "production";

  return [
    "Path=/",
    "HttpOnly",
    `SameSite=${isProduction ? "None" : "Lax"}`,
    `Max-Age=${maxAge}`,
    isProduction ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");

    crypto.scrypt(
      String(password),
      salt,
      64,
      { N: 16384, r: 8, p: 1 },
      (err, derivedKey) => {
        if (err) return reject(err);

        resolve(`${salt}:${derivedKey.toString("hex")}`);
      }
    );
  });
}

export function verifyPassword(password, stored) {
  return new Promise((resolve, reject) => {
    const [salt, hashHex] = String(stored || "").split(":");

    if (!salt || !hashHex) {
      return resolve(false);
    }

    crypto.scrypt(
      String(password),
      salt,
      64,
      { N: 16384, r: 8, p: 1 },
      (err, derivedKey) => {
        if (err) return reject(err);

        const expected = Buffer.from(hashHex, "hex");

        resolve(
          expected.length === derivedKey.length &&
            crypto.timingSafeEqual(expected, derivedKey)
        );
      }
    );
  });
}

function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function issueSession(res, user) {
  const token = crypto.randomBytes(32).toString("hex");

  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 86400000
  );

  await db.query(
    `
      INSERT INTO sessions (
        token_hash,
        user_id,
        expires_at
      )
      VALUES ($1, $2, $3)
    `,
    [hashToken(token), user.id, expiresAt]
  );

  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; ${cookieOptions(
      SESSION_DAYS * 86400
    )}`
  );
}

export async function clearSession(req, res) {
  const token =
    parseCookies(req.headers.cookie || "")[COOKIE_NAME];

  if (token) {
    await db.query(
      "DELETE FROM sessions WHERE token_hash = $1",
      [hashToken(token)]
    );
  }

  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; ${cookieOptions(0)}`
  );
}

function parseCookies(header) {
  return Object.fromEntries(
    header
      .split(";")
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");

        if (index < 0) {
          return [part.trim(), ""];
        }

        return [
          part.slice(0, index).trim(),
          decodeURIComponent(part.slice(index + 1).trim()),
        ];
      })
  );
}

export async function requireAuth(req, res, next) {
  try {
    const token =
      parseCookies(req.headers.cookie || "")[COOKIE_NAME];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "You must be signed in.",
      });
    }

    const result = await db.query(
      `
        SELECT
          s.user_id,
          s.expires_at,
          u.email
        FROM sessions s
        JOIN users u
          ON u.id = s.user_id
        WHERE s.token_hash = $1
      `,
      [hashToken(token)]
    );

    const session = result.rows[0];

    if (
      !session ||
      new Date(session.expires_at).getTime() <= Date.now()
    ) {
      await db.query(
        "DELETE FROM sessions WHERE token_hash = $1",
        [hashToken(token)]
      );

      return res.status(401).json({
        success: false,
        message:
          "Your session has expired. Please sign in again.",
      });
    }

    req.user = {
      id: Number(session.user_id),
      email: session.email,
    };

    next();
  } catch (error) {
    console.error("Auth error:", error);

    return res.status(401).json({
      success: false,
      message: "Authentication failed.",
    });
  }
}