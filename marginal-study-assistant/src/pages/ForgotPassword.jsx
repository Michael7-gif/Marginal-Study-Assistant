import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { requestPasswordReset, resetPassword, verifyPasswordResetCode } from "../services/authService";
import "./Auth.css";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function clearFeedback() {
    setError("");
    setMessage("");
  }

  async function requestCode(event) {
    event.preventDefault();
    clearFeedback();
    setBusy(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const result = await requestPasswordReset(normalizedEmail);
      setEmail(normalizedEmail);
      setMessage(result.message || "A verification code has been sent to your email.");
      setStep("code");
    } catch (err) {
      setError(err?.message || "Could not send the verification code.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event) {
    event.preventDefault();
    clearFeedback();
    setBusy(true);

    try {
      await verifyPasswordResetCode(email, code);
      setStep("password");
      setMessage(" Create your new password.");
    } catch (err) {
      setError(err?.message || "Could not verify the code.");
    } finally {
      setBusy(false);
    }
  }

  async function updatePassword(event) {
    event.preventDefault();
    clearFeedback();

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setBusy(true);

    try {
      await resetPassword(email, code, password);
      navigate("/login", {
        replace: true,
        state: { message: "Your password has been changed successfully. Please sign in." },
      });
    } catch (err) {
      setError(err?.message || "Could not reset your password.");
    } finally {
      setBusy(false);
    }
  }

  function renderEmailStep() {
    return (
      <form className="auth-form" onSubmit={requestCode}>
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required />
        </label>
        {error && <div className="auth-error">{error}</div>}
        <button type="submit" className="auth-button" disabled={busy}>{busy ? "Sending code…" : "Send verification code"}</button>
      </form>
    );
  }

  function renderCodeStep() {
    return (
      <form className="auth-form" onSubmit={verifyCode}>
        <label>
          6-digit verification code
          <input className="auth-code-input" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" autoComplete="one-time-code" required />
        </label>
        {message && <div className="auth-success">{message}</div>}
        {error && <div className="auth-error">{error}</div>}
        <button type="submit" className="auth-button" disabled={busy || code.length !== 6}>{busy ? "Verifying…" : "Verify code"}</button>
        <button type="button" className="auth-secondary-button" disabled={busy} onClick={() => { setStep("email"); clearFeedback(); }}>Use a different email</button>
      </form>
    );
  }

  function renderPasswordStep() {
    return (
      <form className="auth-form" onSubmit={updatePassword}>
        <label>
          New password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete="new-password" minLength={8} required />
        </label>
        <label>
          Confirm new password
          <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter your new password again" autoComplete="new-password" minLength={8} required />
        </label>
        {message && <div className="auth-success">{message}</div>}
        {error && <div className="auth-error">{error}</div>}
        <button type="submit" className="auth-button" disabled={busy}>{busy ? "Changing password…" : "Change password"}</button>
      </form>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand"><div className="auth-mark">M</div><strong>Marginal</strong></div>
        <h1>{step === "email" ? "Forgot your password?" : step === "code" ? "Check your email" : "Create a new password"}</h1>
        <p>{step === "email" ? "Enter your account email and we’ll send you a 6-digit verification code." : step === "code" ? `Enter the code sent to ${email}.` : "Choose a new password for your Marginal account."}</p>
        {step === "email" ? renderEmailStep() : step === "code" ? renderCodeStep() : renderPasswordStep()}
        <div className="auth-switch"><Link to="/login">Back to sign in</Link></div>
      </div>
    </div>
  );
}
