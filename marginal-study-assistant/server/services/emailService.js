export async function sendPasswordResetCode(email, code) {
  if (!process.env.BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is not configured.");
  }

  const senderEmail = "mikelchuks41@gmail.com";
  const senderName = "Marginal Study Assistant";

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [
          {
            email,
          },
        ],
        subject: "Your Marginal password reset code",
        textContent: `Your Marginal password reset code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
        htmlContent: `
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
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Brevo email error:", data);

      throw new Error(
        data?.message || "Could not send password reset email."
      );
    }

    console.log(
      `Password reset email sent successfully: ${data?.messageId || "unknown"}`
    );

    return data;
  } catch (error) {
    console.error("Brevo email error:", error);

    throw new Error(
      error?.message || "Could not send password reset email."
    );
  }
}