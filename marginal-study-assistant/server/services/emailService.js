import nodemailer from "nodemailer";

const requiredEmailConfig = [
  "EMAIL_HOST",
  "EMAIL_PORT",
  "EMAIL_USER",
  "EMAIL_PASSWORD",
  "EMAIL_FROM",
];

function getTransporter() {
  const missing = requiredEmailConfig.filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(`Email service is not configured. Missing: ${missing.join(", ")}`);
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: String(process.env.EMAIL_SECURE).toLowerCase() === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}

export async function sendPasswordResetCode(email, code) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM;

  await transporter.sendMail({
    from,
    to: email,
    subject: "Your Marginal password reset code",
    text: `Your Marginal password reset code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f4f7fb;padding:32px;color:#17212b"><div style="max-width:520px;margin:auto;background:#fff;border:1px solid #dce3ec;border-radius:16px;padding:32px"><h1 style="margin:0 0 12px">Reset your Marginal password</h1><p style="line-height:1.6">Use the verification code below to continue resetting your password.</p><div style="font-size:32px;font-weight:800;letter-spacing:8px;text-align:center;padding:20px;background:#f1f5fb;border-radius:12px;margin:24px 0">${code}</div><p style="line-height:1.6">This code expires in 10 minutes. If you did not request a password reset, you can ignore this email.</p></div></body></html>`,
  });
}
