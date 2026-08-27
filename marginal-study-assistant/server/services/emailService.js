import nodemailer from "nodemailer";

function getTransporter() {
  if (!process.env.EMAIL_USER) {
    throw new Error("EMAIL_USER is not configured.");
  }

  if (!process.env.EMAIL_PASSWORD) {
    throw new Error("EMAIL_PASSWORD is not configured.");
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp-relay.brevo.com",
    port: Number(process.env.EMAIL_PORT || 587),
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
  });
}

export async function sendPasswordResetCode(email, code) {
  const transporter = getTransporter();

  const from =
    process.env.EMAIL_FROM ||
    `Marginal Study Assistant <${process.env.EMAIL_USER}>`;

  try {
    await transporter.verify();

    const info = await transporter.sendMail({
      from,
      to: email,
      subject: "Your Marginal password reset code",
      text: `Your Marginal password reset code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
      html: `
        <!doctype html>
        <html>
          <body style="font-family:Arial,sans-serif;background:#f4f7fb;padding:32px;color:#17212b">
            <div style="max-width:520px;margin:auto;background:#fff;border:1px solid #dce3ec;border-radius:16px;padding:32px">
              <h1 style="margin:0 0 12px">Reset your Marginal password</h1>

              <p style="line-height:1.6">
                Use the verification code below to continue resetting your password.
              </p>

              <div style="font-size:32px;font-weight:800;letter-spacing:8px;text-align:center;padding:20px;background:#f1f5fb;border-radius:12px;margin:24px 0">
                ${code}
              </div>

              <p style="line-height:1.6">
                This code expires in 10 minutes.
              </p>

              <p style="line-height:1.6">
                If you did not request a password reset, you can ignore this email.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    console.log(
      `Password reset email sent successfully: ${info.messageId}`
    );

    return info;
  } catch (error) {
    console.error("Brevo email error:", error);
    throw new Error(
      error?.message || "Could not send password reset email."
    );
  }
}